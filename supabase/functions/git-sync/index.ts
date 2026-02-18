import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import ignore from "npm:ignore@5.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Types
type SyncStatus = "pending" | "syncing" | "synced" | "error" | "failed";

interface Repository {
  id: string;
  // user_id rimosso - repository ora condivisi
  url: string;
  name: string;
  description?: string;
  is_private: boolean;
  docora_repository_id?: string;
  lumioignore_content?: string;
  format_version: number;
  sync_status: SyncStatus;
  sync_error_message?: string;
  sync_error_type?: string;
  is_auth_error: boolean;
  sync_failed_at?: string;
  created_at: string;
  updated_at: string;
}

interface UserRepository {
  id: string;
  user_id: string;
  repository_id: string;
  created_at: string;
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
// LUMIOIGNORE FILTERING
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
    console.error('[git-sync] Failed to parse .lumioignore:', error);
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

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

/**
 * Create a Supabase client with user's auth context (for auth.getUser())
 */
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
 * Add a new repository to Lumio (Shared Repository Architecture)
 *
 * Se il repository esiste già nel sistema:
 * - Crea solo il link utente-repository
 * - L'utente vede subito tutte le card esistenti
 *
 * Se il repository non esiste:
 * - Lo registra su Docora per il monitoring
 * - Crea il repository e il link utente-repository
 * - Le card arriveranno via webhook
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
  const { repo } = parsed;

  // Validate: private repos require access token
  if (isPrivate && !accessToken) {
    throw new Error("Private repositories require an access token");
  }

  // 1. Check if repository already exists in the system (using SECURITY DEFINER function)
  const { data: existingRepo } = await supabase.rpc('find_repository_by_url', { p_url: url });

  if (existingRepo) {
    // Repository exists - check if user already has it
    const { data: hasLink } = await supabase.rpc('check_user_repository_exists', {
      p_user_id: userId,
      p_repository_id: existingRepo.id,
    });

    if (hasLink) {
      throw new Error("This repository is already added to your account");
    }

    // Create link for this uuser 
    const { error: linkError } = await supabase.rpc('insert_user_repository', {
      p_user_id: userId,
      p_repository_id: existingRepo.id,
    });

    if (linkError) {
      throw new Error(`Failed to add repository: ${linkError.message}`);
    }

    // Return existing repository (user now has access to all existing cards)
    return existingRepo;
  }

  // 2. Repository doesn't exist - register with Docora and create it
  let docoraRepo: DocoraRepository;
  try {
    docoraRepo = await docoraAddRepository(url, accessToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to register with Docora: ${message}`);
  }

  // Insert new repository via SECURITY DEFINER function
  const { data: newRepo, error: insertError } = await supabase.rpc('insert_repository', {
    p_url: url,
    p_name: docoraRepo.name || repo,
    p_is_private: isPrivate,
    p_docora_repository_id: docoraRepo.repository_id,
    p_format_version: 1,
    p_sync_status: "pending",
    p_sync_error_message: "In attesa di ricevere le carte",
  });

  if (insertError) {
    // Try to cleanup Docora registration
    try {
      await docoraDeleteRepository(docoraRepo.repository_id);
    } catch {
      // Ignore cleanup errors
    }
    throw insertError;
  }

  // 3. Create link for this user
  const { error: linkError } = await supabase.rpc('insert_user_repository', {
    p_user_id: userId,
    p_repository_id: newRepo.id,
  });

  if (linkError) {
    // Cleanup: delete repository if link creation fails
    try {
      await docoraDeleteRepository(docoraRepo.repository_id);
    } catch {
      // Ignore cleanup errors
    }
    throw new Error(`Failed to link repository: ${linkError.message}`);
  }

  return newRepo;
}

/**
 * Delete a repository from user's library (Shared Repository Architecture)
 *
 * - Rimuove il link utente-repository
 * - Se nessun altro utente ha il repository, lo elimina completamente
 * - Unregister da Docora solo se il repository viene eliminato
 */
async function deleteRepository(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  repositoryId: string
): Promise<void> {
  // 1. Verify user has this repository
  const { data: userRepo } = await supabase
    .from("user_repositories")
    .select("id")
    .eq("user_id", userId)
    .eq("repository_id", repositoryId)
    .single();

  if (!userRepo) {
    throw new Error("Repository not found or access denied");
  }

  // 2. Remove user's link to repository
  const { error: deleteError } = await supabase
    .from("user_repositories")
    .delete()
    .eq("user_id", userId)
    .eq("repository_id", repositoryId);

  if (deleteError) {
    throw new Error(`Failed to remove repository: ${deleteError.message}`);
  }

  // 3. Check if any other users have this repository
  const { count } = await supabase
    .from("user_repositories")
    .select("*", { count: "exact", head: true })
    .eq("repository_id", repositoryId);

  // 4. If no other users, delete repository completely
  if (count === 0) {
    // Get docora_repository_id for cleanup
    const { data: repo } = await supabase
      .from("repositories")
      .select("docora_repository_id")
      .eq("id", repositoryId)
      .single();

    // Unregister from Docora
    if (repo?.docora_repository_id) {
      try {
        await docoraDeleteRepository(repo.docora_repository_id);
      } catch (error) {
        // Log but don't fail
        console.warn("Failed to unregister from Docora:", error);
      }
    }

    // Delete repository (cards will cascade)
    const { error } = await supabase
      .from("repositories")
      .delete()
      .eq("id", repositoryId);

    if (error) {
      console.warn("Failed to delete orphan repository:", error);
    }
  }
}

/**
 * Get statistics for user's repositories (Shared Repository Architecture)
 * Card count now applies .lumioignore filter for consistency with Studio view
 */
async function getStats(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ repositoryCount: number; cardCount: number }> {
  // Get user's repository links with lumioignore_content
  const { data: userRepos, error: repoError } = await supabase
    .from("user_repositories")
    .select(`
      repository_id,
      repository:repositories(id, lumioignore_content)
    `)
    .eq("user_id", userId);

  if (repoError) throw repoError;

  const repositoryCount = userRepos?.length || 0;

  if (repositoryCount === 0) {
    return { repositoryCount: 0, cardCount: 0 };
  }

  // Build map of repository ID -> ignore filter
  const repoIgnoreFilters = new Map<string, IgnoreFilter | null>();
  for (const ur of userRepos!) {
    const repo = ur.repository as { id: string; lumioignore_content: string | null } | null;
    if (repo) {
      repoIgnoreFilters.set(repo.id, createIgnoreFilter(repo.lumioignore_content));
    }
  }

  // Get all cards from linked repositories
  const repoIds = userRepos!.map(r => r.repository_id);
  const { data: allCards, error: cardError } = await supabase
    .from("cards")
    .select("id, repository_id, file_path")
    .in("repository_id", repoIds)
    .eq("is_active", true);

  if (cardError) throw cardError;

  // Filter cards by .lumioignore
  let cardCount = 0;
  for (const card of allCards || []) {
    const ignoreFilter = repoIgnoreFilters.get(card.repository_id);
    if (!isCardIgnored(card.file_path, ignoreFilter)) {
      cardCount++;
    }
  }

  return {
    repositoryCount,
    cardCount,
  };
}

/**
 * Get all repositories for user (Shared Repository Architecture)
 */
async function getRepositories(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Repository[]> {
  // Join user_repositories with repositories
  const { data, error } = await supabase
    .from("user_repositories")
    .select(`
      repository:repositories(*)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Extract repositories from the join result
  return (data || [])
    .map(d => d.repository as Repository)
    .filter(r => r !== null);
}

/**
 * Get cards for a specific repository (Shared Repository Architecture)
 */
async function getCards(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  repositoryId: string
): Promise<Card[]> {
  // Verify user has access to this repository
  const { data: userRepo, error: repoError } = await supabase
    .from("user_repositories")
    .select("id")
    .eq("user_id", userId)
    .eq("repository_id", repositoryId)
    .single();

  if (repoError || !userRepo) {
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
 * Get ALL cards for a user across all their repositories (Shared Repository Architecture)
 * Used for study sessions
 */
async function getAllCards(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Card[]> {
  // Get all user's repository links
  const { data: userRepos, error: repoError } = await supabase
    .from("user_repositories")
    .select("repository_id")
    .eq("user_id", userId);

  if (repoError) throw repoError;
  if (!userRepos || userRepos.length === 0) return [];

  const repoIds = userRepos.map(r => r.repository_id);

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

    // Create Supabase client with user's auth context
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
