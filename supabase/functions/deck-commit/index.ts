import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// ENVIRONMENT
// =============================================================================

const GITHUB_PAT = () => Deno.env.get("GITHUB_PAT")!;
const GITHUB_OWNER = () => Deno.env.get("GITHUB_REPO_OWNER")!;
const GITHUB_REPO = () => Deno.env.get("GITHUB_REPO_NAME")!;

// =============================================================================
// SUPABASE CLIENT (same pattern as git-sync)
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
// PATH VALIDATION (must stay in sync with deck-commit-path.test.ts)
// =============================================================================

/**
 * Validate that a file path belongs to the authenticated user.
 * Enforces:
 * - Path starts with {userId}/
 * - No path traversal (..)
 * - Only .md files allowed
 * Returns the normalized path (leading slash stripped).
 */
function validateUserPath(userId: string, filePath: string): string {
  const normalized = filePath.startsWith("/") ? filePath.slice(1) : filePath;

  // Check path traversal BEFORE user prefix check to prevent bypass
  if (normalized.includes("..")) {
    throw new Error("Access denied: path traversal not allowed");
  }

  if (!normalized.startsWith(`${userId}/`)) {
    throw new Error("Access denied: cannot write outside your directory");
  }

  if (!normalized.endsWith(".md")) {
    throw new Error("Only .md files are supported");
  }

  return normalized;
}

/**
 * Validate a directory path for list operations.
 * Looser than validateUserPath: does not require .md extension.
 */
function validateUserDirectoryPath(userId: string, dirPath: string): string {
  const normalized = dirPath.startsWith("/") ? dirPath.slice(1) : dirPath;

  if (normalized.includes("..")) {
    throw new Error("Access denied: path traversal not allowed");
  }

  // Must be the user's root or a subdirectory of it
  const trimmed = normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;

  if (trimmed !== userId && !trimmed.startsWith(`${userId}/`)) {
    throw new Error("Access denied: cannot list outside your directory");
  }

  return trimmed;
}

// =============================================================================
// DECK NAME VALIDATION (must stay in sync with apps/deck-builder/src/lib/validation.ts)
// =============================================================================

const DECK_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9 -]*$/;
const MAX_DECK_NAME_LENGTH = 50;
const RESERVED_DECK_NAMES = [".", "..", ".git"];

/**
 * Validate a deck name server-side. Returns error message if invalid, null if valid.
 */
function validateDeckName(name: string): string | null {
  if (name.length === 0) {
    return "Deck name cannot be empty";
  }
  if (name.length > MAX_DECK_NAME_LENGTH) {
    return `Deck name must be ${MAX_DECK_NAME_LENGTH} characters or less`;
  }
  if (RESERVED_DECK_NAMES.includes(name)) {
    return "Reserved name not allowed";
  }
  if (!DECK_NAME_REGEX.test(name)) {
    return "Deck name must start with a letter or number and contain only letters, numbers, spaces, and hyphens";
  }
  return null;
}

// =============================================================================
// LANGUAGE WHITELIST & YAML SERIALIZATION
// =============================================================================

const LANGUAGE_WHITELIST = ["it", "en", "es", "fr", "de", "pt", "ja", "zh", "ko", "ru", "ar"];

interface DeckYamlMetadata {
  display_name: string;
  description: string;
  author: string;
  language: string;
  tags: string[];
}

function serializeYaml(metadata: DeckYamlMetadata): string {
  let yaml = '';
  yaml += `display_name: ${metadata.display_name}\n`;
  yaml += `description: ${metadata.description}\n`;
  yaml += `author: ${metadata.author}\n`;
  yaml += `language: ${metadata.language}\n`;
  if (metadata.tags.length > 0) {
    yaml += 'tags:\n';
    for (const tag of metadata.tags) {
      yaml += `  - ${tag}\n`;
    }
  } else {
    yaml += 'tags:\n';
  }
  return yaml;
}

// =============================================================================
// CONTENT ENCODING
// =============================================================================

/**
 * UTF-8 safe base64 encoding for GitHub API.
 * Standard btoa() only handles Latin-1; this handles full Unicode.
 */
function encodeContent(content: string): string {
  return btoa(unescape(encodeURIComponent(content)));
}

// =============================================================================
// GITHUB API HELPERS
// =============================================================================

interface GitHubFileInfo {
  name: string;
  path: string;
  sha: string;
  content?: string;
  size: number;
  type: string;
}

interface GitHubCommitResult {
  sha: string;
  commit_sha: string;
}

/**
 * Make an authenticated request to the GitHub Contents API.
 */
async function githubFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER()}/${GITHUB_REPO()}/contents/${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${GITHUB_PAT()}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(options.headers as Record<string, string> || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Get a file from the GitHub repo.
 * Returns file info + decoded content, or null if the file doesn't exist.
 */
async function getFile(
  path: string
): Promise<{ content: string; sha: string; name: string; path: string } | null> {
  const response = await githubFetch(path);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `GitHub API error (${response.status}): ${error.message || "Unknown error"}`
    );
  }

  const data = await response.json();

  // Decode base64 content (GitHub returns base64-encoded file content)
  // GitHub uses standard base64 with possible newlines
  const rawContent = data.content?.replace(/\n/g, "") || "";
  const decoded = decodeURIComponent(escape(atob(rawContent)));

  return {
    content: decoded,
    sha: data.sha,
    name: data.name,
    path: data.path,
  };
}

/**
 * Create or update a file in the GitHub repo.
 * If sha is provided, it's an update (GitHub requires the current blob SHA).
 * If sha is omitted, it's a create.
 */
async function commitFile(
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<GitHubCommitResult> {
  const body: Record<string, string> = {
    message,
    content: encodeContent(content),
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await githubFetch(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `GitHub API error (${response.status}): ${error.message || "Unknown error"}`
    );
  }

  const data = await response.json();
  return {
    sha: data.content.sha,
    commit_sha: data.commit.sha,
  };
}

/**
 * Delete a file from the GitHub repo. Requires the current blob SHA.
 */
async function deleteFile(
  path: string,
  sha: string,
  message: string
): Promise<void> {
  const response = await githubFetch(path, {
    method: "DELETE",
    body: JSON.stringify({ message, sha }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `GitHub API error (${response.status}): ${error.message || "Unknown error"}`
    );
  }
}

/**
 * List files/directories at a given path in the GitHub repo.
 */
async function listDirectory(
  path: string
): Promise<GitHubFileInfo[]> {
  const response = await githubFetch(path);

  if (response.status === 404) {
    // Directory doesn't exist yet -- return empty list
    return [];
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `GitHub API error (${response.status}): ${error.message || "Unknown error"}`
    );
  }

  const data = await response.json();

  // GitHub returns an array for directories, an object for files
  if (!Array.isArray(data)) {
    throw new Error("Path is a file, not a directory");
  }

  return data.map((item: GitHubFileInfo) => ({
    name: item.name,
    path: item.path,
    sha: item.sha,
    type: item.type,
    size: item.size,
  }));
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

    // All actions require user authentication
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

    // Create Supabase client with user's auth context
    const supabase = createUserSupabaseClient(authHeader);
    const userId = await getUserId(supabase);

    switch (action) {
      // -----------------------------------------------------------------
      // commit_file: Create or update a markdown file
      // -----------------------------------------------------------------
      case "commit_file": {
        const { path, content, sha, message } = body;
        if (!path || content === undefined) {
          return new Response(
            JSON.stringify({ error: "Missing required fields: path, content" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const normalizedPath = validateUserPath(userId, path);
        const commitMessage =
          message ||
          (sha
            ? `[deck-builder] Update ${normalizedPath}`
            : `[deck-builder] Create ${normalizedPath}`);

        const result = await commitFile(
          normalizedPath,
          content,
          commitMessage,
          sha
        );

        return new Response(
          JSON.stringify({
            success: true,
            sha: result.sha,
            commit_sha: result.commit_sha,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // -----------------------------------------------------------------
      // delete_file: Remove a markdown file (requires SHA)
      // -----------------------------------------------------------------
      case "delete_file": {
        const { path, sha } = body;
        if (!path || !sha) {
          return new Response(
            JSON.stringify({ error: "Missing required fields: path, sha" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const normalizedPath = validateUserPath(userId, path);
        await deleteFile(
          normalizedPath,
          sha,
          `[deck-builder] Delete ${normalizedPath}`
        );

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // -----------------------------------------------------------------
      // get_file: Retrieve file content and SHA
      // -----------------------------------------------------------------
      case "get_file": {
        const { path } = body;
        if (!path) {
          return new Response(
            JSON.stringify({ error: "Missing required field: path" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const normalizedPath = validateUserPath(userId, path);
        const file = await getFile(normalizedPath);

        if (!file) {
          return new Response(
            JSON.stringify({ error: "File not found" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 404,
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            content: file.content,
            sha: file.sha,
            name: file.name,
            path: file.path,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // -----------------------------------------------------------------
      // list_files: List files in a user's directory
      // -----------------------------------------------------------------
      case "list_files": {
        const { path } = body;
        if (!path) {
          return new Response(
            JSON.stringify({ error: "Missing required field: path" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const normalizedPath = validateUserDirectoryPath(userId, path);
        const files = await listDirectory(normalizedPath);

        return new Response(
          JSON.stringify({ success: true, files }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // -----------------------------------------------------------------
      // list_decks: List user's deck directories (always scoped to user)
      // -----------------------------------------------------------------
      case "list_decks": {
        const files = await listDirectory(userId);
        const decks = files
          .filter((f) => f.type === "dir")
          .map((f) => ({ name: f.name, path: f.path }));

        return new Response(
          JSON.stringify({ success: true, decks }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // -----------------------------------------------------------------
      // create_deck: Create a new deck directory via .gitkeep
      // -----------------------------------------------------------------
      case "create_deck": {
        const { name } = body;
        if (!name || typeof name !== "string") {
          return new Response(
            JSON.stringify({ error: "Missing required field: name" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const trimmedName = name.trim();

        // Validate deck name
        const nameError = validateDeckName(trimmedName);
        if (nameError) {
          return new Response(
            JSON.stringify({ error: nameError }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const deckPath = `${userId}/${trimmedName}`;

        // Check if deck already exists
        const existingFiles = await listDirectory(deckPath);
        if (existingFiles.length > 0) {
          return new Response(
            JSON.stringify({ error: "Deck already exists" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 409,
            }
          );
        }

        // Commit .gitkeep to establish the deck directory
        await commitFile(
          `${deckPath}/.gitkeep`,
          "",
          `[deck-builder] Create deck: ${trimmedName}`
        );

        return new Response(
          JSON.stringify({
            success: true,
            deck: { name: trimmedName, path: deckPath },
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // -----------------------------------------------------------------
      // rename_deck: Move all files from old deck path to new deck path
      // -----------------------------------------------------------------
      case "rename_deck": {
        const { old_name, new_name } = body;
        if (!old_name || typeof old_name !== "string" || !new_name || typeof new_name !== "string") {
          return new Response(
            JSON.stringify({ error: "Missing required fields: old_name, new_name" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const trimmedNewName = new_name.trim();

        // Validate new deck name
        const newNameError = validateDeckName(trimmedNewName);
        if (newNameError) {
          return new Response(
            JSON.stringify({ error: newNameError }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const oldPath = `${userId}/${old_name.trim()}`;
        const newPath = `${userId}/${trimmedNewName}`;

        // Check old deck exists
        const oldFiles = await listDirectory(oldPath);
        if (oldFiles.length === 0) {
          return new Response(
            JSON.stringify({ error: "Deck not found" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 404,
            }
          );
        }

        // Check new deck does NOT exist
        const newFiles = await listDirectory(newPath);
        if (newFiles.length > 0) {
          return new Response(
            JSON.stringify({ error: "Deck already exists" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 409,
            }
          );
        }

        // Move each file sequentially (GitHub Contents API can conflict with concurrent ops)
        for (const file of oldFiles) {
          const fileData = await getFile(file.path);
          if (fileData) {
            await commitFile(
              `${newPath}/${file.name}`,
              fileData.content,
              `[deck-builder] Rename deck: ${old_name.trim()} -> ${trimmedNewName}`
            );
            await deleteFile(
              file.path,
              file.sha,
              `[deck-builder] Rename deck: ${old_name.trim()} -> ${trimmedNewName}`
            );
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            deck: { name: trimmedNewName, path: newPath },
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // -----------------------------------------------------------------
      // delete_deck: Remove all files in a deck directory
      // -----------------------------------------------------------------
      case "delete_deck": {
        const { name: deckName } = body;
        if (!deckName || typeof deckName !== "string") {
          return new Response(
            JSON.stringify({ error: "Missing required field: name" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const deletePath = `${userId}/${deckName.trim()}`;

        // List all files in the deck
        const deckFiles = await listDirectory(deletePath);
        if (deckFiles.length === 0) {
          return new Response(
            JSON.stringify({ error: "Deck not found" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 404,
            }
          );
        }

        // Delete each file sequentially
        for (const file of deckFiles) {
          await deleteFile(
            file.path,
            file.sha,
            `[deck-builder] Delete deck: ${deckName.trim()}`
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // -----------------------------------------------------------------
      // commit_yaml: Validate metadata and write deck.yaml
      // -----------------------------------------------------------------
      case "commit_yaml": {
        const {
          deck_name,
          display_name: reqDisplayName,
          description: reqDescription,
          tags: reqTags,
          language: reqLanguage,
        } = body;

        // Validate deck_name
        if (!deck_name || typeof deck_name !== "string") {
          return new Response(
            JSON.stringify({ error: "Missing required field: deck_name" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }
        const trimmedDeckName = deck_name.trim();
        const deckNameError = validateDeckName(trimmedDeckName);
        if (deckNameError) {
          return new Response(
            JSON.stringify({ error: deckNameError }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // Validate display_name
        if (!reqDisplayName || typeof reqDisplayName !== "string" || reqDisplayName.trim().length === 0) {
          return new Response(
            JSON.stringify({ error: "Missing required field: display_name" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // Validate description
        if (!reqDescription || typeof reqDescription !== "string" || reqDescription.trim().length === 0) {
          return new Response(
            JSON.stringify({ error: "Missing required field: description" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // Validate language (default to "en" if not provided)
        const lang = reqLanguage && typeof reqLanguage === "string" ? reqLanguage.trim() : "en";
        if (!LANGUAGE_WHITELIST.includes(lang)) {
          return new Response(
            JSON.stringify({
              error: `Invalid language: ${lang}. Must be one of: ${LANGUAGE_WHITELIST.join(", ")}`,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // Normalize tags: filter to strings, lowercase slugs, max 5
        const normalizedTags: string[] = Array.isArray(reqTags)
          ? reqTags
              .filter((t: unknown): t is string => typeof t === "string")
              .map((t: string) => t.toLowerCase().replace(/\s+/g, "-"))
              .slice(0, 5)
          : [];

        // Resolve author from user profile (server-enforced, client value ignored)
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("display_name, email")
          .eq("id", userId)
          .single();

        if (profileError || !profile) {
          return new Response(
            JSON.stringify({ error: "Could not resolve user profile" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
            }
          );
        }

        const author = profile.display_name?.trim()
          || (profile.email || "").split("@")[0];

        // Serialize YAML
        const yamlContent = serializeYaml({
          display_name: reqDisplayName.trim(),
          description: reqDescription.trim(),
          author,
          language: lang,
          tags: normalizedTags,
        });

        // Build file path and check for existing file
        const yamlPath = `${userId}/${trimmedDeckName}/deck.yaml`;
        const existing = await getFile(yamlPath);

        const commitMessage = existing
          ? `[deck-builder] Update deck.yaml for ${trimmedDeckName}`
          : `[deck-builder] Create deck.yaml for ${trimmedDeckName}`;

        const result = await commitFile(yamlPath, yamlContent, commitMessage, existing?.sha);

        return new Response(
          JSON.stringify({
            success: true,
            sha: result.sha,
            commit_sha: result.commit_sha,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // -----------------------------------------------------------------
      // Unknown action
      // -----------------------------------------------------------------
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

    // Map specific errors to appropriate status codes
    let status = 500;
    if (message === "Unauthorized") {
      status = 401;
    } else if (message.startsWith("Access denied:") || message === "Only .md files are supported") {
      status = 403;
    }

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
