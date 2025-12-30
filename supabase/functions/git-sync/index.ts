import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Types
type SyncStatus = "pending" | "syncing" | "synced" | "error";

interface Repository {
  id: string;
  user_id: string;
  url: string;
  name: string;
  description?: string;
  is_private: boolean;
  format_version: number;
  last_commit_sha?: string;
  last_synced_at?: string;
  sync_status: SyncStatus;
  sync_error_message?: string;
  card_count: number;
  created_at: string;
  updated_at: string;
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
// GITHUB API
// =============================================================================

async function fetchGitHub(path: string): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Lumio-App/1.0",
    },
  });
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
  repo: string
): Promise<GitHubRepoInfo> {
  const response = await fetchGitHub(`/repos/${owner}/${repo}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Repository not found");
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }
  return await response.json();
}

async function getLatestCommit(
  owner: string,
  repo: string,
  branch: string
): Promise<GitHubCommit> {
  const response = await fetchGitHub(
    `/repos/${owner}/${repo}/commits/${branch}`
  );
  if (!response.ok) {
    throw new Error(`Failed to get latest commit: ${response.status}`);
  }
  return await response.json();
}

async function getFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const response = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${path}`);
  }
  return await response.text();
}

async function getRepoTree(
  owner: string,
  repo: string,
  sha: string
): Promise<GitHubTreeItem[]> {
  const response = await fetchGitHub(
    `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`
  );
  if (!response.ok) {
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
// REPOSITORY OPERATIONS
// =============================================================================

async function importRepository(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  url: string
): Promise<Repository> {
  // Parse URL
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error("Invalid GitHub URL. Please use format: https://github.com/owner/repo");
  }
  const { owner, repo } = parsed;

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

  // Get repo info
  const repoInfo = await getRepoInfo(owner, repo);

  // Get latest commit
  const latestCommit = await getLatestCommit(owner, repo, repoInfo.default_branch);

  // Fetch and validate README.md
  let readmeContent: string;
  try {
    readmeContent = await getFileContent(owner, repo, "README.md");
  } catch {
    throw new Error("Repository must have a README.md file in the root directory");
  }

  const { frontmatter: deckFrontmatter } = parseFrontmatter(readmeContent);
  const deckMeta = validateDeckFrontmatter(deckFrontmatter);

  // Insert repository with syncing status
  const { data: repoData, error: insertError } = await supabase
    .from("repositories")
    .insert({
      user_id: userId,
      url: url,
      name: repoInfo.name,
      description: deckMeta.description,
      is_private: false,
      format_version: deckMeta.lumio_format_version,
      last_commit_sha: latestCommit.sha,
      sync_status: "syncing",
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Get all markdown files
  const tree = await getRepoTree(owner, repo, latestCommit.sha);
  const mdFiles = tree.filter(
    (item) =>
      item.type === "blob" &&
      item.path.endsWith(".md") &&
      item.path.toLowerCase() !== "readme.md"
  );

  // Parse and import cards
  const cards: ParsedCard[] = [];
  const errors: string[] = [];

  for (const file of mdFiles) {
    try {
      const rawContent = await getFileContent(owner, repo, file.path);
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

  // Insert cards
  if (cards.length > 0) {
    const { error: cardsError } = await serviceClient
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
      );

    if (cardsError) throw cardsError;
  }

  // Update repository status
  const { data: updatedRepo, error: updateError } = await supabase
    .from("repositories")
    .update({
      sync_status: "synced",
      last_synced_at: new Date().toISOString(),
      card_count: cards.length,
      sync_error_message: errors.length > 0 ? `${errors.length} cards skipped` : null,
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

  // Update status to syncing
  await supabase
    .from("repositories")
    .update({ sync_status: "syncing" })
    .eq("id", repositoryId);

  try {
    // Get latest commit
    const repoInfo = await getRepoInfo(owner, repoName);
    const latestCommit = await getLatestCommit(owner, repoName, repoInfo.default_branch);

    // Get all markdown files
    const tree = await getRepoTree(owner, repoName, latestCommit.sha);
    const mdFiles = tree.filter(
      (item) =>
        item.type === "blob" &&
        item.path.endsWith(".md") &&
        item.path.toLowerCase() !== "readme.md"
    );

    // Parse cards
    const cards: ParsedCard[] = [];
    const errors: string[] = [];

    for (const file of mdFiles) {
      try {
        const rawContent = await getFileContent(owner, repoName, file.path);
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

    // Delete existing cards
    await serviceClient.from("cards").delete().eq("repository_id", repositoryId);

    // Insert new cards
    if (cards.length > 0) {
      const { error: cardsError } = await serviceClient
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
        );

      if (cardsError) throw cardsError;
    }

    // Update repository
    const { data: updatedRepo, error: updateError } = await supabase
      .from("repositories")
      .update({
        last_commit_sha: latestCommit.sha,
        sync_status: "synced",
        last_synced_at: new Date().toISOString(),
        card_count: cards.length,
        sync_error_message: errors.length > 0 ? `${errors.length} cards skipped` : null,
      })
      .eq("id", repositoryId)
      .select()
      .single();

    if (updateError) throw updateError;

    return updatedRepo;
  } catch (error) {
    // Update status to error
    await supabase
      .from("repositories")
      .update({
        sync_status: "error",
        sync_error_message: error instanceof Error ? error.message : "Sync failed",
      })
      .eq("id", repositoryId);

    throw error;
  }
}

async function checkUpdates(): Promise<{ updated: number; errors: number }> {
  const serviceClient = createServiceSupabaseClient();

  // Get all repositories that need checking
  const { data: repos, error } = await serviceClient
    .from("repositories")
    .select("*")
    .in("sync_status", ["synced", "pending"]);

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

      const repoInfo = await getRepoInfo(parsed.owner, parsed.repo);
      const latestCommit = await getLatestCommit(
        parsed.owner,
        parsed.repo,
        repoInfo.default_branch
      );

      // Check if commit changed
      if (latestCommit.sha !== repo.last_commit_sha) {
        // Re-sync this repository
        await serviceClient
          .from("repositories")
          .update({ sync_status: "syncing" })
          .eq("id", repo.id);

        // Get all markdown files
        const tree = await getRepoTree(parsed.owner, parsed.repo, latestCommit.sha);
        const mdFiles = tree.filter(
          (item) =>
            item.type === "blob" &&
            item.path.endsWith(".md") &&
            item.path.toLowerCase() !== "readme.md"
        );

        // Parse cards
        const cards: ParsedCard[] = [];
        for (const file of mdFiles) {
          try {
            const rawContent = await getFileContent(parsed.owner, parsed.repo, file.path);
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

        // Delete and re-insert cards
        await serviceClient.from("cards").delete().eq("repository_id", repo.id);

        if (cards.length > 0) {
          await serviceClient
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
            );
        }

        // Update repository
        await serviceClient
          .from("repositories")
          .update({
            last_commit_sha: latestCommit.sha,
            sync_status: "synced",
            last_synced_at: new Date().toISOString(),
            card_count: cards.length,
          })
          .eq("id", repo.id);

        updated++;
      }
    } catch {
      errors++;
      await serviceClient
        .from("repositories")
        .update({ sync_status: "error" })
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
        const { url } = body;
        if (!url) {
          return new Response(
            JSON.stringify({ error: "Missing repository URL" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const repository = await importRepository(supabase, userId, url);
        return new Response(
          JSON.stringify({ success: true, repository }),
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
          JSON.stringify({ success: true, repository }),
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
          JSON.stringify({ success: true, repositories }),
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
