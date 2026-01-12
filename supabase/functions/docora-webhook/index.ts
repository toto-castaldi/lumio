import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface DocoraFile {
  path: string;
  sha: string;
  size: number;
  content: string;
  content_encoding?: "base64";
}

interface DocoraChunk {
  id: string;
  index: number;
  total: number;
}

interface DocoraWebhookPayload {
  repository: DocoraRepository;
  file: DocoraFile;
  chunk?: DocoraChunk;
  commit_sha: string;
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
  if (!clientAuthKey) {
    console.error("DOCORA_CLIENT_AUTH_KEY not configured");
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

  return signature === computedSignature;
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

function validateDeckFrontmatter(
  frontmatter: Record<string, unknown>
): DeckFrontmatter {
  if (typeof frontmatter.lumio_format_version !== "number") {
    throw new Error(
      "Invalid deck: missing or invalid lumio_format_version in README.md"
    );
  }
  if (frontmatter.lumio_format_version !== 1) {
    throw new Error(
      `Unsupported format version: ${frontmatter.lumio_format_version}. Only version 1 is supported.`
    );
  }
  if (
    typeof frontmatter.description !== "string" ||
    !frontmatter.description
  ) {
    throw new Error("Invalid deck: missing description in README.md");
  }
  return {
    lumio_format_version: frontmatter.lumio_format_version,
    description: frontmatter.description,
  };
}

function validateCardFrontmatter(
  frontmatter: Record<string, unknown>,
  filePath: string
): CardFrontmatter {
  if (typeof frontmatter.title !== "string" || !frontmatter.title) {
    throw new Error(`Invalid card ${filePath}: missing title`);
  }
  if (!Array.isArray(frontmatter.tags) || frontmatter.tags.length === 0) {
    throw new Error(`Invalid card ${filePath}: missing or empty tags`);
  }

  const difficulty =
    typeof frontmatter.difficulty === "number" ? frontmatter.difficulty : 3;
  if (difficulty < 1 || difficulty > 5) {
    throw new Error(`Invalid card ${filePath}: difficulty must be 1-5`);
  }

  return {
    title: frontmatter.title,
    tags: frontmatter.tags.map((t) => String(t).toLowerCase()),
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
 * Upload image to Supabase Storage
 */
async function uploadImageToStorage(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  repoId: string,
  imageContent: Uint8Array,
  mimeType: string,
  contentHash: string
): Promise<string> {
  const ext = mimeType.split("/")[1]?.replace("svg+xml", "svg") || "bin";
  const storagePath = `${userId}/${repoId}/${contentHash}.${ext}`;

  // Check if already exists (deduplication)
  const { data: existing } = await serviceClient.storage
    .from("card-assets")
    .list(`${userId}/${repoId}`, { search: `${contentHash}.${ext}` });

  if (!existing || existing.length === 0) {
    const { error } = await serviceClient.storage
      .from("card-assets")
      .upload(storagePath, imageContent, {
        contentType: mimeType,
        upsert: false,
      });

    if (error && !error.message.includes("already exists")) {
      throw error;
    }
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
  // Store this chunk
  await serviceClient.from("webhook_chunks").upsert(
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

  // Check if all chunks received
  const { data: chunks } = await serviceClient
    .from("webhook_chunks")
    .select("chunk_index, content")
    .eq("chunk_id", chunk.id)
    .order("chunk_index", { ascending: true });

  if (!chunks || chunks.length !== chunk.total) {
    // Not all chunks received yet
    return null;
  }

  // All chunks received - assemble content
  const assembledContent = chunks.map((c) => c.content).join("");

  // Clean up chunks
  await serviceClient.from("webhook_chunks").delete().eq("chunk_id", chunk.id);

  return assembledContent;
}

// =============================================================================
// REPOSITORY LOOKUP
// =============================================================================

interface LumioRepository {
  id: string;
  user_id: string;
  url: string;
  name: string;
  description?: string;
  is_private: boolean;
  docora_repository_id: string;
  format_version: number;
  sync_status: string;
  sync_error_message?: string;
  card_count: number;
}

async function findRepositoryByDocoraId(
  serviceClient: ReturnType<typeof createClient>,
  docoraRepositoryId: string
): Promise<LumioRepository | null> {
  const { data, error } = await serviceClient
    .from("repositories")
    .select("*")
    .eq("docora_repository_id", docoraRepositoryId)
    .single();

  if (error || !data) {
    return null;
  }

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
  const { repository, file, chunk, commit_sha } = payload;

  // Find Lumio repository by Docora ID
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

  // Decode content
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

  // Handle different file types
  const filePath = file.path;
  const fileName = filePath.split("/").pop() || "";

  // README.md - validate deck format
  if (fileName.toLowerCase() === "readme.md") {
    try {
      const { frontmatter } = parseFrontmatter(content);
      const deckMeta = validateDeckFrontmatter(frontmatter);

      // Update repository with deck metadata
      await serviceClient
        .from("repositories")
        .update({
          description: deckMeta.description,
          format_version: deckMeta.lumio_format_version,
          sync_status: "synced",
          sync_error_message: null,
        })
        .eq("id", repo.id);

      return { success: true, message: "README.md validated and processed" };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Invalid README.md";

      // Mark repo as error
      await serviceClient
        .from("repositories")
        .update({
          sync_status: "error",
          sync_error_message: errorMessage,
        })
        .eq("id", repo.id);

      return { success: false, message: errorMessage };
    }
  }

  // Image files - store as asset (no card association until card arrives)
  if (isImageFile(filePath)) {
    try {
      const binary = atob(file.content);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      const contentHash = await hashBinaryContent(bytes);
      const mimeType = getMimeType(filePath);

      await uploadImageToStorage(
        serviceClient,
        repo.user_id,
        repo.id,
        bytes,
        mimeType,
        contentHash
      );

      return { success: true, message: `Image stored: ${filePath}` };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return { success: false, message: `Failed to store image: ${errorMessage}` };
    }
  }

  // Markdown card files
  if (filePath.endsWith(".md")) {
    try {
      const { frontmatter, body } = parseFrontmatter(content);
      const cardMeta = validateCardFrontmatter(frontmatter, filePath);
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
        // Check if it's a duplicate
        if (insertError.code === "23505") {
          return {
            success: false,
            message: `Card already exists: ${filePath}`,
          };
        }
        throw insertError;
      }

      // Process images referenced in the card
      const imageRefs = extractImageReferences(content);
      for (const imagePath of imageRefs) {
        // Check if image exists in storage by looking for assets with this path
        // This creates the card_assets mapping
        // Images were uploaded separately, we just need to link them
        // For now, we'll rely on the image webhook having been processed first
      }

      // Update card count
      await serviceClient.rpc("increment_card_count", {
        repo_id: repo.id,
      });

      return { success: true, message: `Card created: ${filePath}` };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return { success: false, message: `Failed to create card: ${errorMessage}` };
    }
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
  const { repository, file, chunk } = payload;

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

  // README.md
  if (fileName.toLowerCase() === "readme.md") {
    try {
      const { frontmatter } = parseFrontmatter(content);
      const deckMeta = validateDeckFrontmatter(frontmatter);

      await serviceClient
        .from("repositories")
        .update({
          description: deckMeta.description,
          format_version: deckMeta.lumio_format_version,
          sync_status: "synced",
          sync_error_message: null,
        })
        .eq("id", repo.id);

      return { success: true, message: "README.md updated" };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Invalid README.md";

      await serviceClient
        .from("repositories")
        .update({
          sync_status: "error",
          sync_error_message: errorMessage,
        })
        .eq("id", repo.id);

      return { success: false, message: errorMessage };
    }
  }

  // Image files
  if (isImageFile(filePath)) {
    try {
      const binary = atob(file.content);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      const contentHash = await hashBinaryContent(bytes);
      const mimeType = getMimeType(filePath);

      await uploadImageToStorage(
        serviceClient,
        repo.user_id,
        repo.id,
        bytes,
        mimeType,
        contentHash
      );

      return { success: true, message: `Image updated: ${filePath}` };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return { success: false, message: `Failed to update image: ${errorMessage}` };
    }
  }

  // Markdown card files
  if (filePath.endsWith(".md")) {
    try {
      const { frontmatter, body } = parseFrontmatter(content);
      const cardMeta = validateCardFrontmatter(frontmatter, filePath);
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

        if (insertError) throw insertError;

        // Update card count
        await serviceClient.rpc("increment_card_count", { repo_id: repo.id });

        return { success: true, message: `Card created (was new): ${filePath}` };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return { success: false, message: `Failed to update card: ${errorMessage}` };
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
      // Decrement card count
      await serviceClient.rpc("decrement_card_count", { repo_id: repo.id });
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

    // Validate headers presence
    if (!appId || !signature || !timestamp) {
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
      return new Response(JSON.stringify({ error: "Invalid app ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Get raw body for HMAC verification
    const rawBody = await req.text();

    // Verify HMAC signature
    const isValid = await verifyHmacSignature(rawBody, timestamp, signature);
    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Parse payload
    const payload: DocoraWebhookPayload = JSON.parse(rawBody);

    // Get action from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[pathParts.length - 1]; // Last part: create, update, delete

    const serviceClient = createServiceSupabaseClient();

    let result: { success: boolean; message: string };

    switch (action) {
      case "create":
        result = await handleCreate(serviceClient, payload);
        break;
      case "update":
        result = await handleUpdate(serviceClient, payload);
        break;
      case "delete":
        result = await handleDelete(serviceClient, payload);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
    }

    const status = result.success ? 200 : 400;
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", message);

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
