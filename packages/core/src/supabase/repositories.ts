import { getSupabaseUrl } from './client';
import { getAccessToken } from './auth';
import type { Repository, Card, UserStats } from '@lumio/shared';

/**
 * Get the git-sync Edge Function URL
 */
function getGitSyncUrl(): string {
  const supabaseUrl = getSupabaseUrl();
  return `${supabaseUrl}/functions/v1/git-sync`;
}

/**
 * Make an authenticated request to the git-sync Edge Function
 */
async function callGitSync<T>(
  action: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(getGitSyncUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...body }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

/**
 * Map database repository to frontend Repository type
 */
function mapRepository(dbRepo: Record<string, unknown>): Repository {
  return {
    id: dbRepo.id as string,
    userId: dbRepo.user_id as string,
    url: dbRepo.url as string,
    name: dbRepo.name as string,
    description: dbRepo.description as string | undefined,
    isPrivate: dbRepo.is_private as boolean,
    formatVersion: dbRepo.format_version as number,
    lastCommitSha: dbRepo.last_commit_sha as string | undefined,
    lastSyncedAt: dbRepo.last_synced_at as string | undefined,
    syncStatus: dbRepo.sync_status as Repository['syncStatus'],
    syncErrorMessage: dbRepo.sync_error_message as string | undefined,
    cardCount: dbRepo.card_count as number,
    createdAt: dbRepo.created_at as string,
    updatedAt: dbRepo.updated_at as string,
  };
}

/**
 * Add a new repository from a GitHub URL
 * The repository will be validated and cards will be imported
 * @param url - GitHub repository URL (e.g., https://github.com/user/repo)
 */
export async function addRepository(url: string): Promise<Repository> {
  const response = await callGitSync<{
    success: boolean;
    repository: Record<string, unknown>;
  }>('add_repository', { url });

  return mapRepository(response.repository);
}

/**
 * Delete a repository
 * This will also delete all associated cards (cascade)
 * @param repositoryId - UUID of the repository to delete
 */
export async function deleteRepository(repositoryId: string): Promise<void> {
  await callGitSync('delete_repository', { repositoryId });
}

/**
 * Manually sync a repository
 * This will re-fetch all cards from the GitHub repository
 * @param repositoryId - UUID of the repository to sync
 */
export async function syncRepository(repositoryId: string): Promise<Repository> {
  const response = await callGitSync<{
    success: boolean;
    repository: Record<string, unknown>;
  }>('sync_repository', { repositoryId });

  return mapRepository(response.repository);
}

/**
 * Get all repositories for the current user
 */
export async function getUserRepositories(): Promise<Repository[]> {
  const response = await callGitSync<{
    success: boolean;
    repositories: Record<string, unknown>[];
  }>('get_repositories');

  return response.repositories.map(mapRepository);
}

/**
 * Get repository and card counts for the current user
 * Used for dashboard statistics
 */
export async function getUserStats(): Promise<UserStats> {
  const response = await callGitSync<{
    success: boolean;
    stats: UserStats;
  }>('get_stats');

  return response.stats;
}

/**
 * Map database card to frontend Card type
 */
function mapCard(dbCard: Record<string, unknown>): Card {
  return {
    id: dbCard.id as string,
    repositoryId: dbCard.repository_id as string,
    filePath: dbCard.file_path as string,
    contentHash: dbCard.content_hash as string,
    rawContent: dbCard.raw_content as string,
    title: dbCard.title as string,
    content: dbCard.content as string,
    tags: dbCard.tags as string[],
    difficulty: dbCard.difficulty as number,
    language: dbCard.language as string,
    isActive: dbCard.is_active as boolean,
    createdAt: dbCard.created_at as string,
    updatedAt: dbCard.updated_at as string,
  };
}

/**
 * Get all cards for a repository
 * @param repositoryId - UUID of the repository
 */
export async function getRepositoryCards(repositoryId: string): Promise<Card[]> {
  const response = await callGitSync<{
    success: boolean;
    cards: Record<string, unknown>[];
  }>('get_cards', { repositoryId });

  return response.cards.map(mapCard);
}
