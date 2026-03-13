import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import ignore from "npm:ignore@5.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-docora-app-id, x-docora-signature, x-docora-timestamp",
};

// =============================================================================
// TYPES
// =============================================================================

interface DocoraRepository {
  repository_id: string;
  github_url: string;
  owner: string;
  name: string;
}

interface DocoraChunk {
  id: string;
  index: number;
  total: number;
}

interface DocoraFile {
  path: string;
  sha: string;
  size: number;
  content: string;
  content_encoding?: "base64";
  chunk?: DocoraChunk;  // Chunk info is INSIDE file object
}

interface DocoraWebhookPayload {
  repository: DocoraRepository;
  file: DocoraFile;
  commit_sha: string;
  timestamp: string;
}

interface DocoraErrorPayload {
  repository: DocoraRepository;
  error_type: string;
  error_message: string;
  timestamp: string;
}

interface CardFrontmatter {
  title: string;
  tags: string[];
  difficulty?: number;
  language?: string;
}

interface DeckFrontmatter {
  lumio_format_version: number;
  description: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LANGUAGE_WHITELIST = ["it", "en", "es", "fr", "de", "pt", "ja", "zh", "ko", "ru", "ar"];

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function createServiceSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// =============================================================================
// HMAC VERIFICATION
// =============================================================================

async function verifyHmacSignature(
  body: string,
  timestamp: string,
  signature: string
): Promise<boolean> {
  const clientAuthKey = Deno.env.get("DOCORA_CLIENT_AUTH_KEY");
  console.log("[verifyHmac] Key configured:", !!clientAuthKey);
  if (!clientAuthKey) {
    console.error("[verifyHmac] DOCORA_CLIENT_AUTH_KEY not configured");
    return false;
  }

  // Message format: {timestamp}.{body}
  const message = `${timestamp}.${body}`;
  const encoder = new TextEncoder();

  // Import key for HMAC-SHA256
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(clientAuthKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Compute signature
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );

  // Convert to hex string with sha256= prefix
  const computedSignature =
    "sha256=" +
    Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  console.log("[verifyHmac] Received sig:", signature?.substring(0, 30) + "...");
  console.log("[verifyHmac] Computed sig:", computedSignature.substring(0, 30) + "...");
  console.log("[verifyHmac] Match:", signature === computedSignature);
  return signature === computedSignature;
}

// =============================================================================
// LUMIOIGNORE FILTERING & CLEANUP
// =============================================================================

type IgnoreFilter = ReturnType<typeof ignore>;

/**
 * Create ignore filter from .lumioignore content
 * Replicates the logic from packages/core/src/deck/Deck.ts
 */
function createIgnoreFilter(lumioignoreContent: string | null | undefined): IgnoreFilter | null {
  if (!lumioignoreContent) {
    return null;
  }

  try {
    const ig = ignore();
    // Split content by lines, filter empty lines and comments
    const patterns = lumioignoreContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    if (patterns.length === 0) {
      return null;
    }

    ig.add(patterns);
    return ig;
  } catch (error) {
    console.error('[Webhook] Failed to parse .lumioignore:', error);
    return null;
  }
}

/**
 * Check if a card should be ignored based on its file path
 */
function isCardIgnored(filePath: string, ignoreFilter: IgnoreFilter | null): boolean {
  if (!ignoreFilter) {
    return false;
  }
  return ignoreFilter.ignores(filePath);
}

/**
 * Cleanup questions for cards that are now ignored by .lumioignore
 * This handles the race condition where cards are created before .lumioignore arrives
 */
async function cleanupIgnoredCardQuestions(
  serviceClient: ReturnType<typeof createClient>,
  repositoryId: string,
  lumioignoreContent: string
): Promise<void> {
  const ignoreFilter = createIgnoreFilter(lumioignoreContent);
  if (!ignoreFilter) {
    console.log("[Webhook] No valid patterns in .lumioignore, skipping cleanup");
    return;
  }

  // Load all cards from this repository
  const { data: cards, error: cardsError } = await serviceClient
    .from("cards")
    .select("id, file_path")
    .eq("repository_id", repositoryId)
    .eq("is_active", true);

  if (cardsError) {
    console.error("[Webhook] Failed to load cards for cleanup:", cardsError.message);
    return;
  }

  if (!cards || cards.length === 0) {
    console.log("[Webhook] No cards to check for cleanup");
    return;
  }

  // Find cards that are now ignored
  const ignoredCardIds = cards
    .filter(card => isCardIgnored(card.file_path, ignoreFilter))
    .map(card => card.id);

  if (ignoredCardIds.length === 0) {
    console.log("[Webhook] No cards matched by .lumioignore patterns");
    return;
  }

  console.log(`[Webhook] Found ${ignoredCardIds.length} cards matching .lumioignore patterns`);

  // Delete questions for these cards
  const { error: deleteError, count } = await serviceClient
    .from("card_questions")
    .delete()
    .in("card_id", ignoredCardIds);

  if (deleteError) {
    console.error("[Webhook] Failed to cleanup ignored card questions:", deleteError.message);
  } else {
    console.log(`[Webhook] Cleaned up ${count || 0} questions for ignored cards`);
  }
}

// =============================================================================
// MARKDOWN PARSING (reused from git-sync)
// =============================================================================

function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlContent = match[1];
  const body = match[2];

  // Simple YAML parser for our specific use case
  const frontmatter: Record<string, unknown> = {};
  const lines = yamlContent.split("\n");
  let currentKey = "";
  let inArray = false;
  let arrayValues: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for array item
    if (trimmedLine.startsWith("- ") && inArray) {
      arrayValues.push(
        trimmedLine.substring(2).trim().replace(/^["']|["']$/g, "")
      );
      continue;
    }

    // If we were in an array, save it
    if (inArray && currentKey) {
      frontmatter[currentKey] = arrayValues;
      inArray = false;
      arrayValues = [];
    }

    // Check for key-value pair
    const kvMatch = trimmedLine.match(/^([^:]+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim();

      if (!value) {
        // Could be start of an array
        currentKey = key;
        inArray = true;
        arrayValues = [];
      } else {
        // Direct value
        let parsedValue: unknown = value.replace(/^["']|["']$/g, "");
        // Try to parse as number
        if (/^\d+$/.test(value)) {
          parsedValue = parseInt(value, 10);
        }
        frontmatter[key] = parsedValue;
      }
    }
  }

  // Handle final array
  if (inArray && currentKey) {
    frontmatter[currentKey] = arrayValues;
  }

  return { frontmatter, body };
}

/**
 * Parse pure YAML content (no frontmatter delimiters) by wrapping
 * in --- delimiters and delegating to parseFrontmatter()
 */
function parseYaml(content: string): Record<string, unknown> {
  const wrapped = `---\n${content}\n---\n`;
  const { frontmatter } = parseFrontmatter(wrapped);
  return frontmatter;
}

/**
 * Extract deck metadata from frontmatter (no validation - just parsing with defaults)
 */
function extractDeckMetadata(
  frontmatter: Record<string, unknown>
): DeckFrontmatter {
  return {
    lumio_format_version:
      typeof frontmatter.lumio_format_version === "number"
        ? frontmatter.lumio_format_version
        : 1,
    description:
      typeof frontmatter.description === "string"
        ? frontmatter.description
        : "",
  };
}

/**
 * Extract card metadata from frontmatter (no validation - just parsing with defaults)
 */
function extractCardMetadata(
  frontmatter: Record<string, unknown>,
  filePath: string
): CardFrontmatter {
  // Use filename without extension as fallback title
  const fileName = filePath.split("/").pop() || filePath;
  const fallbackTitle = fileName.replace(/\.md$/i, "");

  // Extract title with fallback
  const title =
    typeof frontmatter.title === "string" && frontmatter.title
      ? frontmatter.title
      : fallbackTitle;

  // Extract tags with fallback to empty array
  const tags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.map((t) => String(t).toLowerCase())
    : [];

  // Extract difficulty with bounds clamping
  let difficulty = 3;
  if (typeof frontmatter.difficulty === "number") {
    difficulty = Math.max(1, Math.min(5, frontmatter.difficulty));
  }

  return {
    title,
    tags,
    difficulty,
    language:
      typeof frontmatter.language === "string" ? frontmatter.language : "en",
  };
}

// =============================================================================
// CONTENT HASHING
// =============================================================================

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashBinaryContent(content: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", content);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// =============================================================================
// IMAGE HANDLING
// =============================================================================

const SUPPORTED_IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
];
const IMAGE_REGEX = /!\[[^\]]*\]\(([^)]+)\)/g;

function isImageFile(path: string): boolean {
  const ext = "." + path.toLowerCase().split(".").pop();
  return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
}

function getMimeType(path: string): string {
  const ext = path.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

function extractImageReferences(content: string): string[] {
  const images: string[] = [];
  const seen = new Set<string>();
  let match;
  IMAGE_REGEX.lastIndex = 0;

  while ((match = IMAGE_REGEX.exec(content)) !== null) {
    let path = match[1];
    path = path.split(/\s+/)[0]; // Remove title/alt text

    if (!path.startsWith("http://") && !path.startsWith("https://")) {
      if (!seen.has(path)) {
        seen.add(path);
        images.push(path);
      }
    }
  }

  return images;
}

/**
 * Upload image to Supabase Storage using original file path
 * Storage path: {repoId}/{originalPath}
 * Repository condivisi - non più per-utente
 */
async function uploadImageToStorage(
  serviceClient: ReturnType<typeof createClient>,
  repoId: string,
  originalPath: string,
  imageContent: Uint8Array,
  mimeType: string
): Promise<string> {
  // Use original path for stateless resolution
  // e.g., "assets/diagram.png" -> "{repoId}/assets/diagram.png"
  const storagePath = `${repoId}/${originalPath}`;

  // Upload with upsert to handle updates
  const { error } = await serviceClient.storage
    .from("card-assets")
    .upload(storagePath, imageContent, {
      contentType: mimeType,
      upsert: true,
    });

  if (error && !error.message.includes("already exists")) {
    throw error;
  }

  return storagePath;
}

// =============================================================================
// CHUNK HANDLING
// =============================================================================

/**
 * Store a chunk and return assembled content if all chunks received
 */
async function handleChunk(
  serviceClient: ReturnType<typeof createClient>,
  repositoryId: string,
  filePath: string,
  chunk: DocoraChunk,
  content: string
): Promise<string | null> {
  console.log(`[handleChunk] Storing chunk ${chunk.index + 1}/${chunk.total} for ${filePath} (chunk_id: ${chunk.id})`);

  // Store this chunk
  const { error: upsertError } = await serviceClient.from("webhook_chunks").upsert(
    {
      chunk_id: chunk.id,
      repository_id: repositoryId,
      file_path: filePath,
      chunk_index: chunk.index,
      total_chunks: chunk.total,
      content: content,
      received_at: new Date().toISOString(),
    },
    { onConflict: "chunk_id,chunk_index" }
  );

  if (upsertError) {
    console.error(`[handleChunk] Upsert ERROR: ${upsertError.message} (code: ${upsertError.code})`);
    return null;
  }
  console.log(`[handleChunk] Chunk stored successfully`);

  // Check if all chunks received
  const { data: chunks, error: selectError } = await serviceClient
    .from("webhook_chunks")
    .select("chunk_index, content")
    .eq("chunk_id", chunk.id)
    .order("chunk_index", { ascending: true });

  if (selectError) {
    console.error(`[handleChunk] Select ERROR: ${selectError.message}`);
    return null;
  }

  console.log(`[handleChunk] Found ${chunks?.length || 0} chunks out of ${chunk.total} needed`);

  if (!chunks || chunks.length !== chunk.total) {
    // Not all chunks received yet
    return null;
  }

  console.log(`[handleChunk] All ${chunk.total} chunks received! Assembling...`);

  // All chunks received - assemble content
  const assembledContent = chunks.map((c) => c.content).join("");
  console.log(`[handleChunk] Assembled content length: ${assembledContent.length}`);

  // Clean up chunks
  await serviceClient.from("webhook_chunks").delete().eq("chunk_id", chunk.id);
  console.log(`[handleChunk] Chunks cleaned up`);

  return assembledContent;
}

// =============================================================================
// REPOSITORY LOOKUP
// =============================================================================

interface LumioRepository {
  id: string;
  // user_id rimosso - repository ora condivisi
  url: string;
  name: string;
  description?: string;
  is_private: boolean;
  docora_repository_id: string;
  format_version: number;
  sync_status: string;
  sync_error_message?: string;
  sync_error_type?: string;
  is_auth_error?: boolean;
  sync_failed_at?: string;
}

async function findRepositoryByDocoraId(
  serviceClient: ReturnType<typeof createClient>,
  docoraRepositoryId: string
): Promise<LumioRepository | null> {
  console.log("[findRepositoryByDocoraId] Looking for:", docoraRepositoryId);
  const { data, error } = await serviceClient
    .from("repositories")
    .select("*")
    .eq("docora_repository_id", docoraRepositoryId)
    .single();

  if (error) {
    console.log("[findRepositoryByDocoraId] Error:", error.message, error.code);
  }
  if (!data) {
    console.log("[findRepositoryByDocoraId] No data found");
  }

  if (error || !data) {
    return null;
  }

  console.log("[findRepositoryByDocoraId] Found:", data.id, data.name);
  return data;
}

// =============================================================================
// WEBHOOK HANDLERS
// =============================================================================

/**
 * Handle CREATE webhook - new file detected
 */
async function handleCreate(
  serviceClient: ReturnType<typeof createClient>,
  payload: DocoraWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const { repository, file, commit_sha } = payload;
  const chunk = file.chunk;  // Chunk info is inside file object
  console.log("[handleCreate] Starting with docora_id:", repository.repository_id);

  // Find Lumio repository by Docora ID
  const repo = await findRepositoryByDocoraId(
    serviceClient,
    repository.repository_id
  );
  console.log("[handleCreate] Found repo:", repo ? repo.id : "NOT FOUND");
  if (!repo) {
    return {
      success: false,
      message: `Repository not found: ${repository.repository_id}`,
    };
  }

  const filePath = file.path;
  const fileName = filePath.split("/").pop() || "";

  // =========================================================================
  // IMAGES - Handle BEFORE generic content decoding (binary files, not UTF-8)
  // =========================================================================
  if (isImageFile(filePath)) {
    try {
      console.log(`[Image Debug] Path: ${filePath}, chunk: ${chunk ? `${chunk.index + 1}/${chunk.total}` : 'none'}`);

      let imageBase64: string;

      // Handle chunked images (large files sent in multiple parts)
      if (chunk) {
        const assembled = await handleChunk(
          serviceClient,
          repo.id,
          file.path,
          chunk,
          file.content
        );
        if (!assembled) {
          // Not all chunks received yet
          console.log(`[Image Debug] Chunk ${chunk.index + 1}/${chunk.total} received, waiting for more...`);
          return {
            success: true,
            message: `Image chunk ${chunk.index + 1}/${chunk.total} received`,
          };
        }
        // All chunks assembled
        console.log(`[Image Debug] All ${chunk.total} chunks assembled, total length: ${assembled.length}`);
        imageBase64 = assembled;
      } else {
        // Single-part image
        imageBase64 = file.content;
      }

      // Decode base64 to binary using standard base64 decoding
      console.log(`[Image Debug] Decoding base64, length: ${imageBase64.length}`);

      // Clean base64 string (remove whitespace)
      const cleanBase64 = imageBase64.replace(/[\r\n\s]/g, '');
      console.log(`[Image Debug] Clean base64 length: ${cleanBase64.length}`);

      // Use standard base64 decoding from Deno std library
      const { decode: decodeBase64 } = await import("https://deno.land/std@0.177.0/encoding/base64.ts");
      const bytes = decodeBase64(cleanBase64);
      console.log(`[Image Debug] Decoded bytes length: ${bytes.length}, first 10 bytes: ${Array.from(bytes.slice(0, 10)).join(',')}`);

      const mimeType = getMimeType(filePath);

      await uploadImageToStorage(
        serviceClient,
        repo.id,
        filePath,
        bytes,
        mimeType
      );

      return { success: true, message: `Image stored: ${filePath}` };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const stack = err instanceof Error ? err.stack : "";
      console.error(`[Image Debug] Error storing image: ${errorMessage}`);
      console.error(`[Image Debug] Stack: ${stack}`);
      return { success: false, message: `Failed to store image: ${errorMessage}` };
    }
  }

  // =========================================================================
  // TEXT FILES - Decode content as UTF-8
  // =========================================================================
  let content: string;
  if (file.content_encoding === "base64") {
    // Handle chunked files
    if (chunk) {
      const assembled = await handleChunk(
        serviceClient,
        repo.id,
        file.path,
        chunk,
        file.content
      );
      if (!assembled) {
        return {
          success: true,
          message: `Chunk ${chunk.index + 1}/${chunk.total} received`,
        };
      }
      // Decode assembled base64
      const binary = atob(assembled);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      content = new TextDecoder("utf-8").decode(bytes);
    } else {
      // Single base64 encoded file
      const binary = atob(file.content);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      content = new TextDecoder("utf-8").decode(bytes);
    }
  } else {
    content = file.content;
  }

  // Log recovery if repo was previously in failed state
  if (repo.sync_status === 'failed') {
    console.log(`[handleCreate] RECOVERY: repo ${repo.id} transitioning from failed -> synced`);
  }

  // README.md - extract deck metadata (no validation)
  if (fileName.toLowerCase() === "readme.md") {
    const { frontmatter } = parseFrontmatter(content);
    const deckMeta = extractDeckMetadata(frontmatter);

    // Update repository with deck metadata and clear any error state
    await serviceClient
      .from("repositories")
      .update({
        description: deckMeta.description,
        format_version: deckMeta.lumio_format_version,
        sync_status: "synced",
        sync_error_message: null,
        sync_error_type: null,
        is_auth_error: false,
        sync_failed_at: null,
      })
      .eq("id", repo.id);

    return { success: true, message: "README.md processed" };
  }

  // .lumioignore - store content for card filtering and cleanup orphan questions
  if (fileName.toLowerCase() === ".lumioignore") {
    // 1. Save the content
    await serviceClient
      .from("repositories")
      .update({
        lumioignore_content: content,
      })
      .eq("id", repo.id);

    // 2. Cleanup questions for cards that are now ignored (handles race condition)
    await cleanupIgnoredCardQuestions(serviceClient, repo.id, content);

    return { success: true, message: ".lumioignore saved and cleanup completed" };
  }

  // deck.yaml - parse and upsert deck metadata into deck_index
  if (fileName === "deck.yaml") {
    const yamlData = parseYaml(content);
    const displayName = typeof yamlData.display_name === "string" ? yamlData.display_name.trim() : "";
    const description = typeof yamlData.description === "string" ? yamlData.description.trim() : "";

    // Skip silently if required fields missing (per locked decision)
    if (!displayName || !description) {
      console.log(`[handleCreate] deck.yaml missing required fields, skipping: ${filePath}`);
      return { success: true, message: `deck.yaml skipped (missing required fields): ${filePath}` };
    }

    // Derive subfolder_path from file path (always has trailing /)
    const subfolderPath = filePath.substring(0, filePath.lastIndexOf("/") + 1);

    // Normalize tags: lowercase, spaces to dashes, max 5
    const rawTags = Array.isArray(yamlData.tags) ? yamlData.tags.map(String) : [];
    const tags = rawTags
      .map((t: string) => t.toLowerCase().replace(/\s+/g, "-"))
      .slice(0, 5);

    // Language: whitelist with 'en' default
    const language = typeof yamlData.language === "string" && LANGUAGE_WHITELIST.includes(yamlData.language)
      ? yamlData.language
      : "en";

    // Author: use as-is from YAML (webhook doesn't enforce -- that's commit_yaml's job)
    const author = typeof yamlData.author === "string" ? yamlData.author.trim() : "";

    // Upsert into deck_index (handles both create and out-of-order webhook delivery)
    const { error: upsertError } = await serviceClient
      .from("deck_index")
      .upsert(
        {
          repository_id: repo.id,
          subfolder_path: subfolderPath,
          display_name: displayName,
          description,
          tags,
          author,
          language,
        },
        { onConflict: "repository_id,subfolder_path" }
      );

    if (upsertError) {
      console.error(`[handleCreate] deck_index upsert error:`, upsertError.message);
      return { success: false, message: `Failed to index deck: ${upsertError.message}` };
    }

    // Clear error state (follows established pattern)
    await serviceClient
      .from("repositories")
      .update({
        sync_status: "synced",
        sync_error_message: null,
        sync_error_type: null,
        is_auth_error: false,
        sync_failed_at: null,
      })
      .eq("id", repo.id);

    return { success: true, message: `deck.yaml indexed: ${filePath}` };
  }

  // Markdown card files
  if (filePath.endsWith(".md")) {
    const { frontmatter, body } = parseFrontmatter(content);
    const cardMeta = extractCardMetadata(frontmatter, filePath);
    const contentHash = await hashContent(content);

    // Insert card
    const { data: insertedCard, error: insertError } = await serviceClient
      .from("cards")
      .insert({
        repository_id: repo.id,
        file_path: filePath,
        content_hash: contentHash,
        raw_content: content,
        title: cardMeta.title,
        content: body.trim(),
        tags: cardMeta.tags,
        difficulty: cardMeta.difficulty,
        language: cardMeta.language,
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError) {
      // Check if it's a duplicate - still return success (Docora did its job)
      if (insertError.code === "23505") {
        return {
          success: true,
          message: `Card already exists: ${filePath}`,
        };
      }
      // Log error but return success (Docora notification received)
      console.error(`[handleCreate] DB error for ${filePath}:`, insertError);
      return { success: true, message: `Card received: ${filePath}` };
    }

    // Mark repository as synced and clear any error state (auto-recovery)
    await serviceClient
      .from("repositories")
      .update({
        sync_status: "synced",
        sync_error_message: null,
        sync_error_type: null,
        is_auth_error: false,
        sync_failed_at: null,
      })
      .eq("id", repo.id);

    return { success: true, message: `Card created: ${filePath}` };
  }

  // Other files - ignore
  return { success: true, message: `Ignored file type: ${filePath}` };
}

/**
 * Handle UPDATE webhook - file modified
 */
async function handleUpdate(
  serviceClient: ReturnType<typeof createClient>,
  payload: DocoraWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const { repository, file } = payload;
  const chunk = file.chunk;  // Chunk info is inside file object

  // Find Lumio repository
  const repo = await findRepositoryByDocoraId(
    serviceClient,
    repository.repository_id
  );
  if (!repo) {
    return {
      success: false,
      message: `Repository not found: ${repository.repository_id}`,
    };
  }

  // Log recovery if repo was previously in failed state
  if (repo.sync_status === 'failed') {
    console.log(`[handleUpdate] RECOVERY: repo ${repo.id} transitioning from failed -> synced`);
  }

  // Decode content
  let content: string;
  if (file.content_encoding === "base64") {
    if (chunk) {
      const assembled = await handleChunk(
        serviceClient,
        repo.id,
        file.path,
        chunk,
        file.content
      );
      if (!assembled) {
        return {
          success: true,
          message: `Chunk ${chunk.index + 1}/${chunk.total} received`,
        };
      }
      const binary = atob(assembled);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      content = new TextDecoder("utf-8").decode(bytes);
    } else {
      const binary = atob(file.content);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      content = new TextDecoder("utf-8").decode(bytes);
    }
  } else {
    content = file.content;
  }

  const filePath = file.path;
  const fileName = filePath.split("/").pop() || "";

  // README.md - extract deck metadata (no validation)
  if (fileName.toLowerCase() === "readme.md") {
    const { frontmatter } = parseFrontmatter(content);
    const deckMeta = extractDeckMetadata(frontmatter);

    // Update repository with deck metadata and clear any error state
    await serviceClient
      .from("repositories")
      .update({
        description: deckMeta.description,
        format_version: deckMeta.lumio_format_version,
        sync_status: "synced",
        sync_error_message: null,
        sync_error_type: null,
        is_auth_error: false,
        sync_failed_at: null,
      })
      .eq("id", repo.id);

    return { success: true, message: "README.md updated" };
  }

  // .lumioignore - update content for card filtering and cleanup orphan questions
  if (fileName.toLowerCase() === ".lumioignore") {
    // 1. Update the content
    await serviceClient
      .from("repositories")
      .update({
        lumioignore_content: content,
      })
      .eq("id", repo.id);

    // 2. Cleanup questions for cards that are now ignored
    await cleanupIgnoredCardQuestions(serviceClient, repo.id, content);

    return { success: true, message: ".lumioignore updated and cleanup completed" };
  }

  // deck.yaml - parse and upsert deck metadata into deck_index
  if (fileName === "deck.yaml") {
    const yamlData = parseYaml(content);
    const displayName = typeof yamlData.display_name === "string" ? yamlData.display_name.trim() : "";
    const description = typeof yamlData.description === "string" ? yamlData.description.trim() : "";

    // Skip silently if required fields missing (per locked decision)
    if (!displayName || !description) {
      console.log(`[handleUpdate] deck.yaml missing required fields, skipping: ${filePath}`);
      return { success: true, message: `deck.yaml skipped (missing required fields): ${filePath}` };
    }

    // Derive subfolder_path from file path (always has trailing /)
    const subfolderPath = filePath.substring(0, filePath.lastIndexOf("/") + 1);

    // Normalize tags: lowercase, spaces to dashes, max 5
    const rawTags = Array.isArray(yamlData.tags) ? yamlData.tags.map(String) : [];
    const tags = rawTags
      .map((t: string) => t.toLowerCase().replace(/\s+/g, "-"))
      .slice(0, 5);

    // Language: whitelist with 'en' default
    const language = typeof yamlData.language === "string" && LANGUAGE_WHITELIST.includes(yamlData.language)
      ? yamlData.language
      : "en";

    // Author: use as-is from YAML (webhook doesn't enforce -- that's commit_yaml's job)
    const author = typeof yamlData.author === "string" ? yamlData.author.trim() : "";

    // Upsert into deck_index (handles both update and out-of-order webhook delivery)
    const { error: upsertError } = await serviceClient
      .from("deck_index")
      .upsert(
        {
          repository_id: repo.id,
          subfolder_path: subfolderPath,
          display_name: displayName,
          description,
          tags,
          author,
          language,
        },
        { onConflict: "repository_id,subfolder_path" }
      );

    if (upsertError) {
      console.error(`[handleUpdate] deck_index upsert error:`, upsertError.message);
      return { success: false, message: `Failed to index deck: ${upsertError.message}` };
    }

    // Clear error state (follows established pattern)
    await serviceClient
      .from("repositories")
      .update({
        sync_status: "synced",
        sync_error_message: null,
        sync_error_type: null,
        is_auth_error: false,
        sync_failed_at: null,
      })
      .eq("id", repo.id);

    return { success: true, message: `deck.yaml indexed: ${filePath}` };
  }

  // Image files
  if (isImageFile(filePath)) {
    try {
      const binary = atob(file.content);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      const mimeType = getMimeType(filePath);

      await uploadImageToStorage(
        serviceClient,
        repo.id,
        filePath,
        bytes,
        mimeType
      );

      // Mark repository as synced and clear any error state (auto-recovery)
      await serviceClient
        .from("repositories")
        .update({
          sync_status: "synced",
          sync_error_message: null,
          sync_error_type: null,
          is_auth_error: false,
          sync_failed_at: null,
        })
        .eq("id", repo.id);

      return { success: true, message: `Image updated: ${filePath}` };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return { success: false, message: `Failed to update image: ${errorMessage}` };
    }
  }

  // Markdown card files
  if (filePath.endsWith(".md")) {
    const { frontmatter, body } = parseFrontmatter(content);
    const cardMeta = extractCardMetadata(frontmatter, filePath);
    const contentHash = await hashContent(content);

    // Find existing card
    const { data: existingCard } = await serviceClient
      .from("cards")
      .select("id")
      .eq("repository_id", repo.id)
      .eq("file_path", filePath)
      .single();

    if (existingCard) {
      // Update existing card
      await serviceClient
        .from("cards")
        .update({
          content_hash: contentHash,
          raw_content: content,
          title: cardMeta.title,
          content: body.trim(),
          tags: cardMeta.tags,
          difficulty: cardMeta.difficulty,
          language: cardMeta.language,
          is_active: true,
        })
        .eq("id", existingCard.id);

      // Delete old assets and re-link
      await serviceClient
        .from("card_assets")
        .delete()
        .eq("card_id", existingCard.id);

      // Mark repository as synced and clear any error state (auto-recovery)
      await serviceClient
        .from("repositories")
        .update({
          sync_status: "synced",
          sync_error_message: null,
          sync_error_type: null,
          is_auth_error: false,
          sync_failed_at: null,
        })
        .eq("id", repo.id);

      return { success: true, message: `Card updated: ${filePath}` };
    } else {
      // Card doesn't exist - treat as create
      const { error: insertError } = await serviceClient
        .from("cards")
        .insert({
          repository_id: repo.id,
          file_path: filePath,
          content_hash: contentHash,
          raw_content: content,
          title: cardMeta.title,
          content: body.trim(),
          tags: cardMeta.tags,
          difficulty: cardMeta.difficulty,
          language: cardMeta.language,
          is_active: true,
        });

      if (insertError) {
        // Log error but return success (Docora notification received)
        console.error(`[handleUpdate] DB error for ${filePath}:`, insertError);
        return { success: true, message: `Card received: ${filePath}` };
      }

      // Mark repository as synced and clear any error state (auto-recovery)
      await serviceClient
        .from("repositories")
        .update({
          sync_status: "synced",
          sync_error_message: null,
          sync_error_type: null,
          is_auth_error: false,
          sync_failed_at: null,
        })
        .eq("id", repo.id);

      return { success: true, message: `Card created (was new): ${filePath}` };
    }
  }

  return { success: true, message: `Ignored file type: ${filePath}` };
}

/**
 * Handle DELETE webhook - file removed
 */
async function handleDelete(
  serviceClient: ReturnType<typeof createClient>,
  payload: DocoraWebhookPayload
): Promise<{ success: boolean; message: string }> {
  const { repository, file } = payload;

  // Find Lumio repository
  const repo = await findRepositoryByDocoraId(
    serviceClient,
    repository.repository_id
  );
  if (!repo) {
    return {
      success: false,
      message: `Repository not found: ${repository.repository_id}`,
    };
  }

  const filePath = file.path;
  const fileName = filePath.split("/").pop() || "";

  // .lumioignore - clear content when deleted
  if (fileName.toLowerCase() === ".lumioignore") {
    await serviceClient
      .from("repositories")
      .update({
        lumioignore_content: null,
      })
      .eq("id", repo.id);

    return { success: true, message: ".lumioignore deleted" };
  }

  // Markdown card files
  if (filePath.endsWith(".md")) {
    const { data: deletedCard } = await serviceClient
      .from("cards")
      .delete()
      .eq("repository_id", repo.id)
      .eq("file_path", filePath)
      .select("id")
      .single();

    if (deletedCard) {
      return { success: true, message: `Card deleted: ${filePath}` };
    }

    return { success: true, message: `Card not found: ${filePath}` };
  }

  // Image files - we don't delete images from storage on file delete
  // because they might be referenced by other cards (deduplication)
  if (isImageFile(filePath)) {
    return { success: true, message: `Image delete ignored: ${filePath}` };
  }

  return { success: true, message: `Ignored file type: ${filePath}` };
}

/**
 * Handle SYNC_FAILED webhook - Docora reports a sync failure for a repository
 */
async function handleSyncFailed(
  serviceClient: ReturnType<typeof createClient>,
  payload: DocoraErrorPayload
): Promise<{ success: boolean; message: string }> {
  const { repository, error_type, error_message } = payload;

  // Find Lumio repository by Docora ID
  const repo = await findRepositoryByDocoraId(
    serviceClient,
    repository.repository_id
  );

  // Unknown repos: ignore silently, return 200 OK (per locked decision)
  if (!repo) {
    console.log("[handleSyncFailed] Unknown repository, ignoring:", repository.repository_id);
    return { success: true, message: "Unknown repository, ignored" };
  }

  // Determine if this is an auth error (check if error_type contains "auth")
  const isAuthError = error_type.toLowerCase().includes("auth");

  // Update repository with failure details (idempotent -- always overwrite per locked decision)
  const { error: updateError } = await serviceClient
    .from("repositories")
    .update({
      sync_status: "failed",
      sync_error_type: error_type,
      sync_error_message: error_message,
      is_auth_error: isAuthError,
      sync_failed_at: new Date().toISOString(),
    })
    .eq("id", repo.id);

  if (updateError) {
    console.error("[handleSyncFailed] DB update error:", updateError.message);
    return { success: false, message: `Failed to store error: ${updateError.message}` };
  }

  console.log(`[handleSyncFailed] Stored failure for repo ${repo.id}: type=${error_type}, is_auth=${isAuthError}`);
  return { success: true, message: `Sync failure recorded: ${error_type}` };
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    // Get Docora headers
    const appId = req.headers.get("x-docora-app-id");
    const signature = req.headers.get("x-docora-signature");
    const timestamp = req.headers.get("x-docora-timestamp");

    console.log("[docora-webhook] Received request");
    console.log("[docora-webhook] Headers:", { appId, signature: signature?.substring(0, 20) + "...", timestamp });

    // Validate headers presence
    if (!appId || !signature || !timestamp) {
      console.log("[docora-webhook] ERROR: Missing headers");
      return new Response(
        JSON.stringify({ error: "Missing Docora headers" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Validate app ID
    const expectedAppId = Deno.env.get("DOCORA_APP_ID");
    if (expectedAppId && appId !== expectedAppId) {
      console.log("[docora-webhook] ERROR: Invalid app ID", { expected: expectedAppId, received: appId });
      return new Response(JSON.stringify({ error: "Invalid app ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Get raw body for HMAC verification
    const rawBody = await req.text();
    console.log("[docora-webhook] Body length:", rawBody.length);

    // Verify HMAC signature
    const isValid = await verifyHmacSignature(rawBody, timestamp, signature);
    console.log("[docora-webhook] HMAC valid:", isValid);
    if (!isValid) {
      console.log("[docora-webhook] ERROR: Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Get action from URL path (before parsing payload, since sync_failed has different shape)
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[pathParts.length - 1]; // Last part: create, update, delete, sync_failed
    console.log("[docora-webhook] Action:", action, "Path parts:", pathParts);

    // Parse payload (sync_failed has a different shape than file-based payloads)
    const parsedBody = JSON.parse(rawBody);
    const payload: DocoraWebhookPayload = parsedBody;
    const fileChunk = payload.file?.chunk;
    console.log("[docora-webhook] Payload:", {
      repository_id: payload.repository?.repository_id,
      file_path: payload.file?.path,
      commit_sha: payload.commit_sha,
      has_chunk: !!fileChunk,
      chunk_info: fileChunk ? `${fileChunk.index + 1}/${fileChunk.total} (id: ${fileChunk.id})` : 'none',
    });

    const serviceClient = createServiceSupabaseClient();

    let result: { success: boolean; message: string };

    switch (action) {
      case "create":
        console.log("[docora-webhook] Calling handleCreate");
        result = await handleCreate(serviceClient, payload);
        break;
      case "update":
        console.log("[docora-webhook] Calling handleUpdate");
        result = await handleUpdate(serviceClient, payload);
        break;
      case "delete":
        console.log("[docora-webhook] Calling handleDelete");
        result = await handleDelete(serviceClient, payload);
        break;
      case "sync_failed":
        console.log("[docora-webhook] Calling handleSyncFailed");
        result = await handleSyncFailed(serviceClient, parsedBody as DocoraErrorPayload);
        break;
      default:
        console.log("[docora-webhook] ERROR: Unknown action:", action);
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
    }

    console.log("[docora-webhook] Result:", result);
    const status = result.success ? 200 : 400;
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[docora-webhook] EXCEPTION:", message, error);

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
