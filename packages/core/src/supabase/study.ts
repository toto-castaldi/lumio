import { getSupabaseUrl, getSupabaseAnonKey } from './client';
import { getAccessToken } from './auth';
import type {
  Card,
  QuizQuestion,
  ValidationResponse,
  PlatformConfig,
} from '@lumio/shared';

/**
 * Get the llm-proxy Edge Function URL
 */
function getLlmProxyUrl(): string {
  const supabaseUrl = getSupabaseUrl();
  return `${supabaseUrl}/functions/v1/llm-proxy`;
}

/**
 * Get the git-sync Edge Function URL
 */
function getGitSyncUrl(): string {
  const supabaseUrl = getSupabaseUrl();
  return `${supabaseUrl}/functions/v1/git-sync`;
}

/**
 * Make an authenticated request to the llm-proxy Edge Function
 */
async function callLlmProxy<T>(
  action: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(getLlmProxyUrl(), {
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
      apikey: getSupabaseAnonKey(),
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
 * Get platform-level AI configuration
 * Returns the provider, model, and system prompt configured for the platform
 */
export async function getPlatformConfig(): Promise<PlatformConfig> {
  const response = await callLlmProxy<{
    success: boolean;
    config: PlatformConfig;
  }>('get_platform_config');

  return response.config;
}

/**
 * Generate a quiz question for a card using AI
 * Uses platform-configured provider, model, and system prompt
 * @param cardContent - The card content (markdown)
 * @param userId - Optional user ID for image fetching
 * @param repositoryId - Optional repository ID for image fetching
 */
export async function generateQuiz(
  cardContent: string,
  userId?: string,
  repositoryId?: string
): Promise<QuizQuestion> {
  const response = await callLlmProxy<{ success: boolean; quiz: QuizQuestion }>(
    'generate_quiz',
    { cardContent, userId, repositoryId }
  );

  return response.quiz;
}

/**
 * Get all cards for the current user across all repositories
 * Used for study sessions
 */
export async function getStudyCards(): Promise<Card[]> {
  const response = await callGitSync<{
    success: boolean;
    cards: Record<string, unknown>[];
  }>('get_all_cards');

  return response.cards.map(mapCard);
}

/**
 * Validate a user's answer using AI (Step 2)
 * Uses platform-configured provider and model
 * @param cardContent - The card content (markdown)
 * @param question - The quiz question that was asked
 * @param userAnswer - The user's answer (A, B, C, or D)
 * @param correctAnswer - The correct answer (A, B, C, or D)
 * @param userId - Optional user ID for image fetching
 * @param repositoryId - Optional repository ID for image fetching
 */
export async function validateAnswer(
  cardContent: string,
  question: string,
  userAnswer: string,
  correctAnswer: string,
  userId?: string,
  repositoryId?: string
): Promise<ValidationResponse> {
  const response = await callLlmProxy<{
    success: boolean;
    validation: ValidationResponse;
  }>('validate_answer', {
    cardContent,
    question,
    userAnswer,
    correctAnswer,
    userId,
    repositoryId,
  });

  return response.validation;
}
