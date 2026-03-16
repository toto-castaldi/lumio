import { getSupabaseUrl, getSupabaseAnonKey } from './client';
import { getAccessToken, getUserId } from './auth';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Search result from the search_decks RPC.
 * Matches the RETURNS TABLE columns from the migration.
 */
export interface DeckSearchResult {
  id: string;
  repository_id: string;
  subfolder_path: string;
  display_name: string;
  description: string;
  tags: string[];
  author: string;
  language: string;
  card_count: number;
  rank: number;
}

/**
 * User deck subscription enriched with display_name from deck_index.
 * Used by the Repos screen to show human-readable deck names.
 */
export interface DeckSubscription {
  repository_id: string;
  subfolder_path: string;
  display_name: string;
}

// =============================================================================
// LANGUAGE FLAGS
// =============================================================================

/** ISO 639-1 code to flag emoji mapping */
const LANGUAGE_FLAGS: Record<string, string> = {
  it: '\u{1F1EE}\u{1F1F9}', // IT
  en: '\u{1F1EC}\u{1F1E7}', // GB
  es: '\u{1F1EA}\u{1F1F8}', // Spain
  fr: '\u{1F1EB}\u{1F1F7}', // France
  de: '\u{1F1E9}\u{1F1EA}', // Germany
  pt: '\u{1F1E7}\u{1F1F7}', // Brazil
  ja: '\u{1F1EF}\u{1F1F5}', // Japan
  zh: '\u{1F1E8}\u{1F1F3}', // China
  ko: '\u{1F1F0}\u{1F1F7}', // Korea
  ru: '\u{1F1F7}\u{1F1FA}', // Russia
};

/**
 * Get the flag emoji for a language code.
 * Falls back to globe emoji for unknown codes.
 */
export function getLanguageFlag(languageCode: string): string {
  return LANGUAGE_FLAGS[languageCode.toLowerCase()] || '\u{1F30D}';
}

// =============================================================================
// SEARCH
// =============================================================================

/**
 * Search published decks via the search_decks RPC.
 *
 * @param query - Free-text search query (optional)
 * @param tag - Filter by tag (optional)
 * @param limit - Max results (default 20)
 * @param offset - Pagination offset (default 0)
 */
export async function searchDecks(
  query?: string,
  tag?: string,
  limit = 20,
  offset = 0
): Promise<DeckSearchResult[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const supabaseUrl = getSupabaseUrl();
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/search_decks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: getSupabaseAnonKey(),
    },
    body: JSON.stringify({
      p_query: query || null,
      p_tag: tag || null,
      p_limit: limit,
      p_offset: offset,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to search decks');
  }

  const rows = await response.json();
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    repository_id: row.repository_id as string,
    subfolder_path: row.subfolder_path as string,
    display_name: row.display_name as string,
    description: row.description as string,
    tags: row.tags as string[],
    author: row.author as string,
    language: row.language as string,
    card_count: Number(row.card_count),
    rank: row.rank as number,
  }));
}

// =============================================================================
// SUBSCRIPTIONS
// =============================================================================

/**
 * Subscribe to a deck by inserting a user_repositories row with subfolder_path.
 * Handles 409 conflict (duplicate) silently — user may have tapped twice quickly.
 */
export async function subscribeToDeck(
  repositoryId: string,
  subfolderPath: string
): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const userId = await getUserId();
  if (!userId) {
    throw new Error('User ID not found');
  }

  const supabaseUrl = getSupabaseUrl();
  const response = await fetch(`${supabaseUrl}/rest/v1/user_repositories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: getSupabaseAnonKey(),
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      repository_id: repositoryId,
      subfolder_path: subfolderPath,
    }),
  });

  // 409 = duplicate subscription, treat as success
  if (response.status === 409) {
    return;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to subscribe to deck');
  }
}

/**
 * Unsubscribe from a deck by deleting the user_repositories row.
 */
export async function unsubscribeFromDeck(
  repositoryId: string,
  subfolderPath: string
): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const userId = await getUserId();
  if (!userId) {
    throw new Error('User ID not found');
  }

  const supabaseUrl = getSupabaseUrl();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_repositories?user_id=eq.${userId}&repository_id=eq.${repositoryId}&subfolder_path=eq.${encodeURIComponent(subfolderPath)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to unsubscribe from deck');
  }
}

// =============================================================================
// USER SUBSCRIPTIONS WITH DISPLAY NAME ENRICHMENT
// =============================================================================

/**
 * Title-case a string: capitalize first letter of each word.
 * Used as fallback when deck_index has no matching display_name.
 */
function titleCase(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Get all deck subscriptions for the current user, enriched with display_name
 * from deck_index. Falls back to title-cased subfolder_path for orphaned subs.
 *
 * Two-step approach: user_repositories has no FK to deck_index, so PostgREST
 * cannot embed. We fetch both tables and join client-side.
 */
export async function getUserDeckSubscriptions(): Promise<DeckSubscription[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const supabaseUrl = getSupabaseUrl();

  // Step 1: Get user's deck subscriptions (only those with subfolder_path)
  const subsResponse = await fetch(
    `${supabaseUrl}/rest/v1/user_repositories?subfolder_path=not.is.null&select=repository_id,subfolder_path`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
      },
    }
  );

  if (!subsResponse.ok) {
    const error = await subsResponse.json();
    throw new Error(error.message || 'Failed to load subscriptions');
  }

  const subscriptions = (await subsResponse.json()) as Array<{
    repository_id: string;
    subfolder_path: string;
  }>;

  if (subscriptions.length === 0) {
    return [];
  }

  // Step 2: Fetch all deck display names from deck_index
  const indexResponse = await fetch(
    `${supabaseUrl}/rest/v1/deck_index?select=repository_id,subfolder_path,display_name`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
      },
    }
  );

  if (!indexResponse.ok) {
    const error = await indexResponse.json();
    throw new Error(error.message || 'Failed to load deck index');
  }

  const deckEntries = (await indexResponse.json()) as Array<{
    repository_id: string;
    subfolder_path: string;
    display_name: string;
  }>;

  // Step 3: Build lookup map keyed by "repository_id:subfolder_path"
  const lookup = new Map<string, string>();
  for (const entry of deckEntries) {
    lookup.set(`${entry.repository_id}:${entry.subfolder_path}`, entry.display_name);
  }

  // Step 4: Enrich subscriptions with display_name
  return subscriptions.map((sub) => {
    const key = `${sub.repository_id}:${sub.subfolder_path}`;
    const displayName = lookup.get(key);

    return {
      repository_id: sub.repository_id,
      subfolder_path: sub.subfolder_path,
      display_name: displayName || titleCase(sub.subfolder_path.replace(/\/$/, '')),
    };
  });
}
