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
  docora_repository_id?: string;
  format_version: number;
  sync_status: SyncStatus;
  sync_error_message?: string;
  card_count: number;
  created_at: string;
  updated_at: string;
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
// DOCORA API CLIENT
// =============================================================================

const DOCORA_API_URL = Deno.env.get("DOCORA_API_URL") || "https://api.docora.toto-castaldi.com";
const DOCORA_TOKEN_AUTHENTICATION = Deno.env.get("DOCORA_TOKEN_AUTHENTICATION");

interface DocoraRepository {
  repository_id: string;
  github_url: string;
  owner: string;
  name: string;
  status: string;
}

/**
 * Register a repository with Docora for monitoring
 * Docora will start watching the repo and send webhooks for file changes
 */
async function docoraAddRepository(
  githubUrl: string,
  githubToken?: string
): Promise<DocoraRepository> {
  if (!DOCORA_TOKEN_AUTHENTICATION) {
    throw new Error("DOCORA_TOKEN_AUTHENTICATION not configured");
  }

  const response = await fetch(`${DOCORA_API_URL}/api/repositories`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DOCORA_TOKEN_AUTHENTICATION}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      github_url: githubUrl,
      github_token: githubToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Docora API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Unregister a repository from Docora monitoring
 */
async function docoraDeleteRepository(docoraRepositoryId: string): Promise<void> {
  if (!DOCORA_TOKEN_AUTHENTICATION) {
    throw new Error("DOCORA_TOKEN_AUTHENTICATION not configured");
  }

  const response = await fetch(`${DOCORA_API_URL}/api/repositories/${docoraRepositoryId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${DOCORA_TOKEN_AUTHENTICATION}`,
    },
  });

  // 404 is ok - repository might already be deleted
  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Docora API error (${response.status}): ${errorText}`);
  }
}

// =============================================================================
// URL PARSING
// =============================================================================

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

// =============================================================================
// REPOSITORY OPERATIONS
// =============================================================================

/**
 * Add a new repository to Lumio
 * - Registers with Docora for monitoring
 * - Saves docora_repository_id for webhook correlation
 * - Cards will be synced when Docora sends webhooks
 */
async function addRepository(
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

  // Register with Docora for monitoring
  // Docora will validate the repo exists and start watching it
  let docoraRepo: DocoraRepository;
  try {
    docoraRepo = await docoraAddRepository(url, accessToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to register with Docora: ${message}`);
  }

  // Insert repository with pending status
  // Actual card sync will happen when Docora sends webhooks
  const { data: repoData, error: insertError } = await supabase
    .from("repositories")
    .insert({
      user_id: userId,
      url: url,
      name: docoraRepo.name || repo,
      description: null, // Will be set when README.md arrives via webhook
      is_private: isPrivate,
      docora_repository_id: docoraRepo.repository_id,
      format_version: 1, // Will be validated when README.md arrives
      sync_status: "pending",
      sync_error_message: "Waiting for initial sync from Docora",
      card_count: 0,
    })
    .select()
    .single();

  if (insertError) {
    // Try to cleanup Docora registration
    try {
      await docoraDeleteRepository(docoraRepo.repository_id);
    } catch {
      // Ignore cleanup errors
    }
    throw insertError;
  }

  return repoData;
}

/**
 * Delete a repository from Lumio
 * - Unregisters from Docora monitoring
 * - Deletes all associated cards (cascade)
 */
async function deleteRepository(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  repositoryId: string
): Promise<void> {
  // Get repository (verify ownership and get docora_repository_id)
  const { data: repo } = await supabase
    .from("repositories")
    .select("id, docora_repository_id")
    .eq("id", repositoryId)
    .eq("user_id", userId)
    .single();

  if (!repo) {
    throw new Error("Repository not found or access denied");
  }

  // Unregister from Docora
  if (repo.docora_repository_id) {
    try {
      await docoraDeleteRepository(repo.docora_repository_id);
    } catch (error) {
      // Log but don't fail - we still want to delete the local repo
      console.warn("Failed to unregister from Docora:", error);
    }
  }

  // Delete repository (cards will cascade)
  const { error } = await supabase
    .from("repositories")
    .delete()
    .eq("id", repositoryId);

  if (error) throw error;
}

/**
 * Get statistics for user's repositories
 */
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

/**
 * Get all repositories for user
 */
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

/**
 * Get cards for a specific repository
 */
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

        const repository = await addRepository(supabase, userId, url, isPrivate || false, accessToken);
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
