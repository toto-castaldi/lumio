import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Types
type SyncStatus = "pending" | "syncing" | "synced" | "error";
type TokenStatus = "valid" | "invalid" | "not_required";

interface Repository {
  id: string;
  user_id: string;
  url: string;
  name: string;
  description?: string;
  is_private: boolean;
  encrypted_access_token?: string;
  token_status: TokenStatus;
  token_error_message?: string;
  format_version: number;
  last_commit_sha?: string;
  last_synced_at?: string;
  sync_status: SyncStatus;
  sync_error_message?: string;
  card_count: number;
  created_at: string;
  updated_at: string;
}

// Sanitized repository for API responses (no sensitive data)
interface SafeRepository {
  id: string;
  user_id: string;
  url: string;
  name: string;
  description?: string;
  is_private: boolean;
  token_status: TokenStatus;
  token_error_message?: string;
  format_version: number;
  last_commit_sha?: string;
  last_synced_at?: string;
  sync_status: SyncStatus;
  sync_error_message?: string;
  card_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Sanitize repository for API response - removes sensitive data
 * SECURITY: Never expose encrypted_access_token to clients
 */
function sanitizeRepository(repo: Repository): SafeRepository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { encrypted_access_token, ...safeRepo } = repo;
  return safeRepo;
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

interface GitHubRepoInfo {
  name: string;
  description: string | null;
  default_branch: string;
}

interface GitHubContent {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
  sha: string;
}

interface GitHubCommit {
  sha: string;
}

interface GitHubTreeItem {
  path: string;
  type: string;
  sha: string;
}

interface ParsedCard {
  filePath: string;
  rawContent: string;  // Original file content (frontmatter + body)
  title: string;
  content: string;     // Parsed body without frontmatter
  tags: string[];
  difficulty: number;
  language: string;
  contentHash: string;
}

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function createUserSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
}

function createServiceSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getUserId(
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized");
  }
  return user.id;
}

// =============================================================================
// ENCRYPTION UTILITIES (AES-256-GCM) - Same as llm-proxy
// =============================================================================

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits for GCM

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyBase64 = Deno.env.get("ENCRYPTION_KEY");
  if (!keyBase64) {
    throw new Error("ENCRYPTION_KEY environment variable not set");
  }

  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

  if (keyBytes.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (256 bits) base64 encoded");
  }

  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptToken(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encodedText
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function decryptToken(encryptedBase64: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// =============================================================================
// GITHUB API
// =============================================================================

/**
 * Fetch from GitHub API with optional authentication
 * @param path - API path (e.g., /repos/owner/repo)
 * @param token - Optional GitHub PAT for private repos
 */
async function fetchGitHub(path: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Lumio-App/1.0",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(`https://api.github.com${path}`, { headers });
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // Support various GitHub URL formats
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/,
    /github\.com\/([^\/]+)\/([^\/]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(".git", "") };
    }
  }
  return null;
}

async function getRepoInfo(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubRepoInfo> {
  const response = await fetchGitHub(`/repos/${owner}/${repo}`, token);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Repository not found");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(`GitHub authentication failed: ${response.status}`);
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }
  return await response.json();
}

async function getLatestCommit(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<GitHubCommit> {
  const response = await fetchGitHub(
    `/repos/${owner}/${repo}/commits/${branch}`,
    token
  );
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`GitHub authentication failed: ${response.status}`);
    }
    throw new Error(`Failed to get latest commit: ${response.status}`);
  }
  return await response.json();
}

async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  token?: string
): Promise<string> {
  if (token) {
    // For private repos, use GitHub API with authentication
    const response = await fetchGitHub(
      `/repos/${owner}/${repo}/contents/${path}`,
      token
    );
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(`GitHub authentication failed: ${response.status}`);
      }
      throw new Error(`Failed to fetch file: ${path}`);
    }
    const data = await response.json();
    // GitHub API returns content as base64
    if (data.encoding === "base64" && data.content) {
      return atob(data.content.replace(/\n/g, ""));
    }
    throw new Error(`Unexpected encoding for file: ${path}`);
  } else {
    // For public repos, use raw.githubusercontent.com (faster, no rate limit)
    const response = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${path}`);
    }
    return await response.text();
  }
}

async function getRepoTree(
  owner: string,
  repo: string,
  sha: string,
  token?: string
): Promise<GitHubTreeItem[]> {
  const response = await fetchGitHub(
    `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
    token
  );
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`GitHub authentication failed: ${response.status}`);
    }
    throw new Error(`Failed to get repository tree: ${response.status}`);
  }
  const data = await response.json();
  return data.tree || [];
}

// =============================================================================
// MARKDOWN PARSING
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
      arrayValues.push(trimmedLine.substring(2).trim().replace(/^["']|["']$/g, ""));
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
  if (typeof frontmatter.description !== "string" || !frontmatter.description) {
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

// =============================================================================
// LUMIOIGNORE SUPPORT
// =============================================================================

/**
 * Parse .lumioignore file content into a list of patterns
 * Supports:
 * - Exact file paths (e.g., "cards/draft.md")
 * - Directory patterns (e.g., "drafts/")
 * - Glob patterns with * (e.g., "*.draft.md", "wip/*")
 * - Comments starting with #
 * - Empty lines are ignored
 */
function parseLumioIgnore(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

/**
 * Check if a file path matches any of the ignore patterns
 */
function isIgnored(filePath: string, ignorePatterns: string[]): boolean {
  for (const pattern of ignorePatterns) {
    // Directory pattern (ends with /)
    if (pattern.endsWith("/")) {
      if (filePath.startsWith(pattern) || filePath.startsWith(pattern.slice(0, -1))) {
        return true;
      }
    }
    // Glob pattern with *
    else if (pattern.includes("*")) {
      const regexPattern = pattern
        .replace(/\./g, "\\.")
        .replace(/\*/g, ".*");
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(filePath)) {
        return true;
      }
      // Also check just the filename for patterns like "*.draft.md"
      const fileName = filePath.split("/").pop() || "";
      if (regex.test(fileName)) {
        return true;
      }
    }
    // Exact match
    else if (filePath === pattern) {
      return true;
    }
  }
  return false;
}

/**
 * Fetch .lumioignore file from repository if it exists
 */
async function fetchLumioIgnore(
  owner: string,
  repo: string,
  token?: string
): Promise<string[]> {
  try {
    const content = await getFileContent(owner, repo, ".lumioignore", token);
    return parseLumioIgnore(content);
  } catch {
    // .lumioignore doesn't exist, return empty array
    return [];
  }
}

// =============================================================================
// IMAGE ASSETS SUPPORT
// =============================================================================

// Supported image extensions
const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];

// Regex to find image references in markdown
const IMAGE_REGEX = /!\[[^\]]*\]\(([^)]+)\)/g;

/**
 * Resolve a relative path against a base directory
 * e.g., resolveRelativePath("cards/exercise.md", "../assets/image.png") => "assets/image.png"
 */
function resolveRelativePath(cardFilePath: string, imagePath: string): string {
  // Get the directory of the card file
  const cardDir = cardFilePath.includes("/")
    ? cardFilePath.substring(0, cardFilePath.lastIndexOf("/"))
    : "";

  // If imagePath starts with /, it's absolute from repo root
  if (imagePath.startsWith("/")) {
    return imagePath.substring(1);
  }

  // If imagePath starts with ./, remove it
  if (imagePath.startsWith("./")) {
    imagePath = imagePath.substring(2);
  }

  // If no ../, just combine paths
  if (!imagePath.startsWith("../")) {
    return cardDir ? `${cardDir}/${imagePath}` : imagePath;
  }

  // Handle ../ by going up directories
  const cardParts = cardDir.split("/").filter(p => p);
  const imageParts = imagePath.split("/");

  let upCount = 0;
  for (const part of imageParts) {
    if (part === "..") {
      upCount++;
    } else {
      break;
    }
  }

  // Remove the ../ parts from image path
  const remainingImageParts = imageParts.slice(upCount);

  // Go up in card directory
  const remainingCardParts = cardParts.slice(0, cardParts.length - upCount);

  // Combine
  const resolvedParts = [...remainingCardParts, ...remainingImageParts];
  return resolvedParts.join("/");
}

/**
 * Extract all image references from markdown content
 * Returns only relative paths (ignores external URLs)
 * cardFilePath is used to resolve relative paths like ../assets/image.png
 */
function extractImageReferences(content: string, cardFilePath: string): string[] {
  const images: string[] = [];
  let match;
  // Reset regex state
  IMAGE_REGEX.lastIndex = 0;
  while ((match = IMAGE_REGEX.exec(content)) !== null) {
    let imagePath = match[1];
    // Remove any title/alt text after space (e.g., "image.png 'title'")
    imagePath = imagePath.split(/\s+/)[0];
    // Ignore external URLs
    if (!imagePath.startsWith("http://") && !imagePath.startsWith("https://")) {
      // Resolve relative path against card file location
      imagePath = resolveRelativePath(cardFilePath, imagePath);
      // Only include if it has a supported extension
      const ext = imagePath.toLowerCase().split(".").pop();
      if (ext && SUPPORTED_IMAGE_EXTENSIONS.includes(`.${ext}`)) {
        images.push(imagePath);
      }
    }
  }
  return [...new Set(images)]; // Remove duplicates
}

/**
 * Get MIME type from file extension
 */
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

/**
 * Download image from GitHub repository
 * Uses GitHub API for private repos, raw.githubusercontent.com for public
 */
async function downloadImage(
  owner: string,
  repo: string,
  imagePath: string,
  token?: string
): Promise<{ content: Uint8Array; mimeType: string } | null> {
  try {
    if (token) {
      // Private repo: use GitHub API with authentication
      const response = await fetchGitHub(
        `/repos/${owner}/${repo}/contents/${imagePath}`,
        token
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (data.encoding === "base64" && data.content) {
        // Decode base64 content
        const binary = atob(data.content.replace(/\n/g, ""));
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        const mimeType = getMimeType(imagePath);
        return { content: bytes, mimeType };
      }
    } else {
      // Public repo: use raw.githubusercontent.com
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${imagePath}`;
      const response = await fetch(rawUrl);
      if (!response.ok) return null;
      const mimeType = response.headers.get("content-type") || getMimeType(imagePath);
      const buffer = await response.arrayBuffer();
      return { content: new Uint8Array(buffer), mimeType };
    }
  } catch (error) {
    console.warn(`Failed to download image ${imagePath}:`, error);
    return null;
  }
  return null;
}

/**
 * Calculate SHA-256 hash of content
 */
async function hashImageContent(content: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", content);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Upload image to Supabase Storage
 * Returns the storage path
 */
async function uploadImageToStorage(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  repoId: string,
  imageContent: Uint8Array,
  mimeType: string,
  contentHash: string
): Promise<string> {
  // Extension from mime type
  const ext = mimeType.split("/")[1]?.replace("svg+xml", "svg") || "bin";

  // Path: user_id/repo_id/hash.ext
  const storagePath = `${userId}/${repoId}/${contentHash}.${ext}`;

  // Check if already exists (deduplication)
  const { data: existing } = await serviceClient.storage
    .from("card-assets")
    .list(`${userId}/${repoId}`, { search: `${contentHash}.${ext}` });

  if (!existing || existing.length === 0) {
    // Upload new file
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

/**
 * Process all images in a card's content
 * Downloads images from GitHub and uploads to Supabase Storage
 */
async function processCardImages(
  serviceClient: ReturnType<typeof createClient>,
  cardId: string,
  rawContent: string,
  cardFilePath: string,
  owner: string,
  repo: string,
  userId: string,
  repoId: string,
  accessToken?: string
): Promise<{ processed: number; errors: string[] }> {
  const imageRefs = extractImageReferences(rawContent, cardFilePath);
  const errors: string[] = [];
  let processed = 0;

  for (const imagePath of imageRefs) {
    try {
      // Download image from GitHub
      const image = await downloadImage(owner, repo, imagePath, accessToken);
      if (!image) {
        errors.push(`${imagePath}: download failed`);
        continue;
      }

      // Hash the content
      const contentHash = await hashImageContent(image.content);

      // Upload to Supabase Storage
      const storagePath = await uploadImageToStorage(
        serviceClient,
        userId,
        repoId,
        image.content,
        image.mimeType,
        contentHash
      );

      // Save mapping in card_assets table
      await serviceClient.from("card_assets").upsert(
        {
          card_id: cardId,
          original_path: imagePath,
          storage_path: storagePath,
          content_hash: contentHash,
          mime_type: image.mimeType,
          size_bytes: image.content.length,
        },
        {
          onConflict: "card_id,original_path",
        }
      );

      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${imagePath}: ${message}`);
    }
  }

  return { processed, errors };
}

/**
 * Delete orphaned assets (assets whose cards have been deleted)
 */
async function cleanupOrphanAssets(
  serviceClient: ReturnType<typeof createClient>,
  repoId: string
): Promise<number> {
  // Get all assets for this repo that don't have a valid card
  const { data: orphans } = await serviceClient
    .from("card_assets")
    .select("id, storage_path, card_id")
    .filter("card_id", "not.in", `(SELECT id FROM cards WHERE repository_id = '${repoId}')`);

  if (!orphans || orphans.length === 0) return 0;

  let deleted = 0;
  for (const orphan of orphans) {
    try {
      // Delete from storage
      await serviceClient.storage
        .from("card-assets")
        .remove([orphan.storage_path]);

      // Delete record
      await serviceClient.from("card_assets").delete().eq("id", orphan.id);
      deleted++;
    } catch {
      // Ignore errors, continue with next
    }
  }

  return deleted;
}

// =============================================================================
// REPOSITORY OPERATIONS
// =============================================================================

async function importRepository(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  url: string,
  isPrivate: boolean = false,
  accessToken?: string
): Promise<Repository> {
  // Parse URL
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error("Invalid GitHub URL. Please use format: https://github.com/owner/repo");
  }
  const { owner, repo } = parsed;

  // Validate: private repos require access token
  if (isPrivate && !accessToken) {
    throw new Error("Private repositories require an access token");
  }

  // Check if already exists
  const { data: existing } = await supabase
    .from("repositories")
    .select("id")
    .eq("user_id", userId)
    .eq("url", url)
    .single();

  if (existing) {
    throw new Error("This repository is already added to your account");
  }

  // Get repo info (with token for private repos)
  const repoInfo = await getRepoInfo(owner, repo, accessToken);

  // Get latest commit
  const latestCommit = await getLatestCommit(owner, repo, repoInfo.default_branch, accessToken);

  // Fetch and validate README.md
  let readmeContent: string;
  try {
    readmeContent = await getFileContent(owner, repo, "README.md", accessToken);
  } catch {
    throw new Error("Repository must have a README.md file in the root directory");
  }

  const { frontmatter: deckFrontmatter } = parseFrontmatter(readmeContent);
  const deckMeta = validateDeckFrontmatter(deckFrontmatter);

  // Encrypt token for private repos
  let encryptedToken: string | null = null;
  if (isPrivate && accessToken) {
    encryptedToken = await encryptToken(accessToken);
  }

  // Insert repository with syncing status
  const { data: repoData, error: insertError } = await supabase
    .from("repositories")
    .insert({
      user_id: userId,
      url: url,
      name: repoInfo.name,
      description: deckMeta.description,
      is_private: isPrivate,
      encrypted_access_token: encryptedToken,
      token_status: isPrivate ? "valid" : "not_required",
      format_version: deckMeta.lumio_format_version,
      last_commit_sha: latestCommit.sha,
      sync_status: "syncing",
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Fetch .lumioignore patterns (if file exists)
  const ignorePatterns = await fetchLumioIgnore(owner, repo, accessToken);

  // Get all markdown files, excluding ignored files
  const tree = await getRepoTree(owner, repo, latestCommit.sha, accessToken);
  const mdFiles = tree.filter(
    (item) =>
      item.type === "blob" &&
      item.path.endsWith(".md") &&
      !isIgnored(item.path, ignorePatterns)
  );

  // Parse and import cards
  const cards: ParsedCard[] = [];
  const errors: string[] = [];

  for (const file of mdFiles) {
    try {
      const rawContent = await getFileContent(owner, repo, file.path, accessToken);
      const { frontmatter, body } = parseFrontmatter(rawContent);
      const cardMeta = validateCardFrontmatter(frontmatter, file.path);
      const contentHash = await hashContent(rawContent);

      cards.push({
        filePath: file.path,
        rawContent: rawContent,
        title: cardMeta.title,
        content: body.trim(),
        tags: cardMeta.tags,
        difficulty: cardMeta.difficulty,
        language: cardMeta.language,
        contentHash,
      });
    } catch (error) {
      errors.push(
        `${file.path}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Use service client for card insertion
  const serviceClient = createServiceSupabaseClient();

  // Insert cards and get their IDs for image processing
  if (cards.length > 0) {
    const { data: insertedCards, error: cardsError } = await serviceClient
      .from("cards")
      .insert(
        cards.map((card) => ({
          repository_id: repoData.id,
          file_path: card.filePath,
          content_hash: card.contentHash,
          raw_content: card.rawContent,
          title: card.title,
          content: card.content,
          tags: card.tags,
          difficulty: card.difficulty,
          language: card.language,
          is_active: true,
        }))
      )
      .select("id, file_path, raw_content");

    if (cardsError) throw cardsError;

    // Process images for each card
    if (insertedCards) {
      for (const insertedCard of insertedCards) {
        const result = await processCardImages(
          serviceClient,
          insertedCard.id,
          insertedCard.raw_content,
          insertedCard.file_path,
          owner,
          repo,
          userId,
          repoData.id,
          accessToken
        );
        if (result.errors.length > 0) {
          // Add image errors to the sync errors
          errors.push(...result.errors.map((e) => `img: ${e}`));
        }
      }
    }
  }

  // Update repository status
  // Build detailed error message if any cards were skipped
  let syncErrorMessage: string | null = null;
  if (errors.length > 0) {
    // Limit to first 5 errors to avoid overly long messages
    const displayErrors = errors.slice(0, 5);
    const remaining = errors.length - displayErrors.length;
    syncErrorMessage = displayErrors.join("; ");
    if (remaining > 0) {
      syncErrorMessage += `; ... e altri ${remaining} errori`;
    }
  }

  const { data: updatedRepo, error: updateError } = await supabase
    .from("repositories")
    .update({
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
      card_count: cards.length,
      sync_error_message: syncErrorMessage,
    })
    .eq("id", repoData.id)
    .select()
    .single();

  if (updateError) throw updateError;

  return updatedRepo;
}

async function deleteRepository(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  repositoryId: string
): Promise<void> {
  // Verify ownership
  const { data: repo } = await supabase
    .from("repositories")
    .select("id")
    .eq("id", repositoryId)
    .eq("user_id", userId)
    .single();

  if (!repo) {
    throw new Error("Repository not found or access denied");
  }

  // Delete repository (cards will cascade)
  const { error } = await supabase
    .from("repositories")
    .delete()
    .eq("id", repositoryId);

  if (error) throw error;
}

async function syncRepository(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  repositoryId: string
): Promise<Repository> {
  // Get repository
  const { data: repo, error: fetchError } = await supabase
    .from("repositories")
    .select("*")
    .eq("id", repositoryId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !repo) {
    throw new Error("Repository not found or access denied");
  }

  const parsed = parseGitHubUrl(repo.url);
  if (!parsed) {
    throw new Error("Invalid repository URL");
  }
  const { owner, repo: repoName } = parsed;

  // Decrypt token for private repos
  let accessToken: string | undefined;
  if (repo.is_private && repo.encrypted_access_token) {
    try {
      accessToken = await decryptToken(repo.encrypted_access_token);
    } catch {
      // Token decryption failed, mark as invalid
      await supabase
        .from("repositories")
        .update({
          token_status: "invalid",
          token_error_message: "Failed to decrypt access token",
          sync_status: "error",
        })
        .eq("id", repositoryId);
      throw new Error("Failed to decrypt access token");
    }
  }

  // Update status to syncing
  await supabase
    .from("repositories")
    .update({ sync_status: "syncing" })
    .eq("id", repositoryId);

  try {
    // Get latest commit
    const repoInfo = await getRepoInfo(owner, repoName, accessToken);
    const latestCommit = await getLatestCommit(owner, repoName, repoInfo.default_branch, accessToken);

    // Fetch .lumioignore patterns (if file exists)
    const ignorePatterns = await fetchLumioIgnore(owner, repoName, accessToken);

    // Get all markdown files, excluding ignored files
    const tree = await getRepoTree(owner, repoName, latestCommit.sha, accessToken);
    const mdFiles = tree.filter(
      (item) =>
        item.type === "blob" &&
        item.path.endsWith(".md") &&
        !isIgnored(item.path, ignorePatterns)
    );

    // Parse cards
    const cards: ParsedCard[] = [];
    const errors: string[] = [];

    for (const file of mdFiles) {
      try {
        const rawContent = await getFileContent(owner, repoName, file.path, accessToken);
        const { frontmatter, body } = parseFrontmatter(rawContent);
        const cardMeta = validateCardFrontmatter(frontmatter, file.path);
        const contentHash = await hashContent(rawContent);

        cards.push({
          filePath: file.path,
          rawContent: rawContent,
          title: cardMeta.title,
          content: body.trim(),
          tags: cardMeta.tags,
          difficulty: cardMeta.difficulty,
          language: cardMeta.language,
          contentHash,
        });
      } catch (error) {
        errors.push(
          `${file.path}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Use service client for card operations
    const serviceClient = createServiceSupabaseClient();

    // Delete existing cards (card_assets will cascade automatically)
    await serviceClient.from("cards").delete().eq("repository_id", repositoryId);

    // Clean up orphan assets in storage
    // (assets are deleted from card_assets table by CASCADE, but we need to remove files from storage)
    const { data: oldAssets } = await serviceClient
      .from("card_assets")
      .select("storage_path")
      .eq("card_id", repositoryId); // This won't match after cascade, so we skip cleanup here
    // Note: Orphan storage files will be cleaned up by a scheduled job

    // Insert new cards and process images
    if (cards.length > 0) {
      const { data: insertedCards, error: cardsError } = await serviceClient
        .from("cards")
        .insert(
          cards.map((card) => ({
            repository_id: repositoryId,
            file_path: card.filePath,
            content_hash: card.contentHash,
            raw_content: card.rawContent,
            title: card.title,
            content: card.content,
            tags: card.tags,
            difficulty: card.difficulty,
            language: card.language,
            is_active: true,
          }))
        )
        .select("id, file_path, raw_content");

      if (cardsError) throw cardsError;

      // Process images for each card
      if (insertedCards) {
        for (const insertedCard of insertedCards) {
          const result = await processCardImages(
            serviceClient,
            insertedCard.id,
            insertedCard.raw_content,
            insertedCard.file_path,
            owner,
            repoName,
            repo.user_id,
            repositoryId,
            accessToken
          );
          if (result.errors.length > 0) {
            // Add image errors to the sync errors
            errors.push(...result.errors.map((e) => `img: ${e}`));
          }
        }
      }
    }

    // Build detailed error message if any cards were skipped
    let syncErrorMessage: string | null = null;
    if (errors.length > 0) {
      // Limit to first 5 errors to avoid overly long messages
      const displayErrors = errors.slice(0, 5);
      const remaining = errors.length - displayErrors.length;
      syncErrorMessage = displayErrors.join("; ");
      if (remaining > 0) {
        syncErrorMessage += `; ... e altri ${remaining} errori`;
      }
    }

    // Update repository (reset token error if sync succeeded)
    const { data: updatedRepo, error: updateError } = await supabase
      .from("repositories")
      .update({
        last_commit_sha: latestCommit.sha,
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
        card_count: cards.length,
        sync_error_message: syncErrorMessage,
        token_status: repo.is_private ? "valid" : "not_required",
        token_error_message: null,
      })
      .eq("id", repositoryId)
      .select()
      .single();

    if (updateError) throw updateError;

    return updatedRepo;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Sync failed";
    const isAuthError = errorMessage.includes("authentication failed");

    // Update status to error
    await supabase
      .from("repositories")
      .update({
        sync_status: "error",
        sync_error_message: errorMessage,
        // Mark token as invalid if auth error on private repo
        ...(isAuthError && repo.is_private
          ? { token_status: "invalid", token_error_message: errorMessage }
          : {}),
      })
      .eq("id", repositoryId);

    throw error;
  }
}

async function checkUpdates(): Promise<{ updated: number; errors: number }> {
  const serviceClient = createServiceSupabaseClient();

  // Get all repositories that need checking (exclude those with invalid tokens)
  const { data: repos, error } = await serviceClient
    .from("repositories")
    .select("*")
    .in("sync_status", ["synced", "pending"])
    .or("token_status.eq.valid,token_status.eq.not_required");

  if (error) throw error;
  if (!repos || repos.length === 0) {
    return { updated: 0, errors: 0 };
  }

  let updated = 0;
  let errors = 0;

  for (const repo of repos) {
    try {
      const parsed = parseGitHubUrl(repo.url);
      if (!parsed) continue;

      // Decrypt token for private repos
      let accessToken: string | undefined;
      if (repo.is_private && repo.encrypted_access_token) {
        try {
          accessToken = await decryptToken(repo.encrypted_access_token);
        } catch {
          // Token decryption failed, mark as invalid and skip
          await serviceClient
            .from("repositories")
            .update({
              token_status: "invalid",
              token_error_message: "Failed to decrypt access token",
              sync_status: "error",
            })
            .eq("id", repo.id);
          errors++;
          continue;
        }
      }

      const repoInfo = await getRepoInfo(parsed.owner, parsed.repo, accessToken);
      const latestCommit = await getLatestCommit(
        parsed.owner,
        parsed.repo,
        repoInfo.default_branch,
        accessToken
      );

      // Check if commit changed
      if (latestCommit.sha !== repo.last_commit_sha) {
        // Re-sync this repository
        await serviceClient
          .from("repositories")
          .update({ sync_status: "syncing" })
          .eq("id", repo.id);

        // Fetch .lumioignore patterns (if file exists)
        const ignorePatterns = await fetchLumioIgnore(parsed.owner, parsed.repo, accessToken);

        // Get all markdown files, excluding ignored files
        const tree = await getRepoTree(parsed.owner, parsed.repo, latestCommit.sha, accessToken);
        const mdFiles = tree.filter(
          (item) =>
            item.type === "blob" &&
            item.path.endsWith(".md") &&
            !isIgnored(item.path, ignorePatterns)
        );

        // Parse cards
        const cards: ParsedCard[] = [];
        for (const file of mdFiles) {
          try {
            const rawContent = await getFileContent(parsed.owner, parsed.repo, file.path, accessToken);
            const { frontmatter, body } = parseFrontmatter(rawContent);
            const cardMeta = validateCardFrontmatter(frontmatter, file.path);
            const contentHash = await hashContent(rawContent);

            cards.push({
              filePath: file.path,
              rawContent: rawContent,
              title: cardMeta.title,
              content: body.trim(),
              tags: cardMeta.tags,
              difficulty: cardMeta.difficulty,
              language: cardMeta.language,
              contentHash,
            });
          } catch {
            // Skip invalid cards
          }
        }

        // Delete and re-insert cards (card_assets will cascade automatically)
        await serviceClient.from("cards").delete().eq("repository_id", repo.id);

        if (cards.length > 0) {
          const { data: insertedCards } = await serviceClient
            .from("cards")
            .insert(
              cards.map((card) => ({
                repository_id: repo.id,
                file_path: card.filePath,
                content_hash: card.contentHash,
                raw_content: card.rawContent,
                title: card.title,
                content: card.content,
                tags: card.tags,
                difficulty: card.difficulty,
                language: card.language,
                is_active: true,
              }))
            )
            .select("id, file_path, raw_content");

          // Process images for each card
          if (insertedCards) {
            for (const insertedCard of insertedCards) {
              await processCardImages(
                serviceClient,
                insertedCard.id,
                insertedCard.raw_content,
                insertedCard.file_path,
                parsed.owner,
                parsed.repo,
                repo.user_id,
                repo.id,
                accessToken
              );
            }
          }
        }

        // Update repository
        await serviceClient
          .from("repositories")
          .update({
            last_commit_sha: latestCommit.sha,
            sync_status: "synced",
            last_synced_at: new Date().toISOString(),
            card_count: cards.length,
            token_status: repo.is_private ? "valid" : "not_required",
            token_error_message: null,
          })
          .eq("id", repo.id);

        updated++;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const isAuthError = errorMessage.includes("authentication failed");

      errors++;
      await serviceClient
        .from("repositories")
        .update({
          sync_status: "error",
          sync_error_message: errorMessage,
          ...(isAuthError && repo.is_private
            ? { token_status: "invalid", token_error_message: errorMessage }
            : {}),
        })
        .eq("id", repo.id);
    }
  }

  return { updated, errors };
}

async function getStats(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ repositoryCount: number; cardCount: number }> {
  // Get repository count
  const { count: repoCount, error: repoError } = await supabase
    .from("repositories")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (repoError) throw repoError;

  // Get card count (sum of card_count from repositories)
  const { data: repos, error: cardError } = await supabase
    .from("repositories")
    .select("card_count")
    .eq("user_id", userId);

  if (cardError) throw cardError;

  const cardCount = repos?.reduce((sum, r) => sum + (r.card_count || 0), 0) || 0;

  return {
    repositoryCount: repoCount || 0,
    cardCount,
  };
}

async function getRepositories(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Repository[]> {
  const { data, error } = await supabase
    .from("repositories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

interface Card {
  id: string;
  repository_id: string;
  file_path: string;
  content_hash: string;
  raw_content: string;
  title: string;
  content: string;
  tags: string[];
  difficulty: number;
  language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

async function getCards(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  repositoryId: string
): Promise<Card[]> {
  // First verify the repository belongs to the user
  const { data: repo, error: repoError } = await supabase
    .from("repositories")
    .select("id")
    .eq("id", repositoryId)
    .eq("user_id", userId)
    .single();

  if (repoError || !repo) {
    throw new Error("Repository not found or access denied");
  }

  // Get cards for this repository
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("repository_id", repositoryId)
    .eq("is_active", true)
    .order("title", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Validate a GitHub token without saving it
 * Used to verify token before adding a private repository
 */
async function validateGitHubToken(
  url: string,
  accessToken: string
): Promise<{ valid: boolean; repoName?: string; error?: string }> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    return { valid: false, error: "Invalid GitHub URL" };
  }

  try {
    const repoInfo = await getRepoInfo(parsed.owner, parsed.repo, accessToken);
    return { valid: true, repoName: repoInfo.name };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("authentication failed")) {
      return { valid: false, error: "Invalid token or insufficient permissions" };
    }
    if (message.includes("not found")) {
      return { valid: false, error: "Repository not found or token lacks access" };
    }
    return { valid: false, error: message };
  }
}

/**
 * Update the access token for an existing private repository
 */
async function updateRepositoryToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  repositoryId: string,
  accessToken: string
): Promise<Repository> {
  // Get repository
  const { data: repo, error: fetchError } = await supabase
    .from("repositories")
    .select("*")
    .eq("id", repositoryId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !repo) {
    throw new Error("Repository not found or access denied");
  }

  if (!repo.is_private) {
    throw new Error("Cannot update token for public repository");
  }

  // Validate new token
  const validation = await validateGitHubToken(repo.url, accessToken);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid token");
  }

  // Encrypt and save new token
  const encryptedToken = await encryptToken(accessToken);

  const { data: updatedRepo, error: updateError } = await supabase
    .from("repositories")
    .update({
      encrypted_access_token: encryptedToken,
      token_status: "valid",
      token_error_message: null,
      sync_status: "pending", // Trigger re-sync
    })
    .eq("id", repositoryId)
    .select()
    .single();

  if (updateError) throw updateError;

  return updatedRepo;
}

/**
 * Get ALL cards for a user across all their repositories
 * Used for study sessions
 */
async function getAllCards(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Card[]> {
  // Get all user's repositories
  const { data: repos, error: repoError } = await supabase
    .from("repositories")
    .select("id")
    .eq("user_id", userId);

  if (repoError) throw repoError;
  if (!repos || repos.length === 0) return [];

  const repoIds = repos.map(r => r.id);

  // Get all active cards from user's repositories
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .in("repository_id", repoIds)
    .eq("is_active", true)
    .order("title", { ascending: true });

  if (error) throw error;
  return data || [];
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Service role action (for scheduled jobs)
    if (action === "check_updates") {
      const result = await checkUpdates();
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // All other actions require user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const supabase = createUserSupabaseClient(authHeader);
    const userId = await getUserId(supabase);

    switch (action) {
      case "add_repository": {
        const { url, isPrivate, accessToken } = body;
        if (!url) {
          return new Response(
            JSON.stringify({ error: "Missing repository URL" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        if (isPrivate && !accessToken) {
          return new Response(
            JSON.stringify({ error: "Private repositories require an access token" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const repository = await importRepository(supabase, userId, url, isPrivate || false, accessToken);
        return new Response(
          JSON.stringify({ success: true, repository: sanitizeRepository(repository) }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "validate_token": {
        const { url, accessToken } = body;
        if (!url || !accessToken) {
          return new Response(
            JSON.stringify({ error: "Missing url or accessToken" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const validation = await validateGitHubToken(url, accessToken);
        return new Response(
          JSON.stringify({ success: true, ...validation }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "update_token": {
        const { repositoryId, accessToken } = body;
        if (!repositoryId || !accessToken) {
          return new Response(
            JSON.stringify({ error: "Missing repositoryId or accessToken" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const updatedRepo = await updateRepositoryToken(supabase, userId, repositoryId, accessToken);
        return new Response(
          JSON.stringify({ success: true, repository: sanitizeRepository(updatedRepo) }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "delete_repository": {
        const { repositoryId } = body;
        if (!repositoryId) {
          return new Response(
            JSON.stringify({ error: "Missing repositoryId" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        await deleteRepository(supabase, userId, repositoryId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "sync_repository": {
        const { repositoryId } = body;
        if (!repositoryId) {
          return new Response(
            JSON.stringify({ error: "Missing repositoryId" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const repository = await syncRepository(supabase, userId, repositoryId);
        return new Response(
          JSON.stringify({ success: true, repository: sanitizeRepository(repository) }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "get_stats": {
        const stats = await getStats(supabase, userId);
        return new Response(JSON.stringify({ success: true, stats }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "get_repositories": {
        const repositories = await getRepositories(supabase, userId);
        return new Response(
          JSON.stringify({ success: true, repositories: repositories.map(sanitizeRepository) }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "get_cards": {
        const { repositoryId } = body;
        if (!repositoryId) {
          return new Response(
            JSON.stringify({ error: "Missing repositoryId" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const cards = await getCards(supabase, userId, repositoryId);
        return new Response(
          JSON.stringify({ success: true, cards }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      case "get_all_cards": {
        const allCards = await getAllCards(supabase, userId);
        return new Response(
          JSON.stringify({ success: true, cards: allCards }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
