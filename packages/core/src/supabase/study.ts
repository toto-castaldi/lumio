import { getSupabaseUrl, getSupabaseAnonKey } from './client';
import { getAccessToken } from './auth';
import type {
  LLMProvider,
  Card,
  QuizQuestion,
  AvailableModelsResponse,
  StudyPreferences,
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
 * Get available LLM models for the current user
 * Returns all providers with their models and whether the user has configured them
 */
export async function getAvailableModels(): Promise<AvailableModelsResponse> {
  const response = await callLlmProxy<AvailableModelsResponse & { success: boolean }>(
    'get_available_models'
  );

  return {
    success: response.success,
    providers: response.providers,
  };
}

/**
 * Generate a quiz question for a card using AI
 * @param provider - LLM provider to use
 * @param modelId - Model ID to use
 * @param cardContent - The card content (markdown)
 * @param systemPrompt - Optional custom system prompt
 */
export async function generateQuiz(
  provider: LLMProvider,
  modelId: string,
  cardContent: string,
  systemPrompt?: string
): Promise<QuizQuestion> {
  const response = await callLlmProxy<{ success: boolean; quiz: QuizQuestion }>(
    'generate_quiz',
    { provider, modelId, cardContent, systemPrompt }
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
 * Get study preferences for the current user
 * Returns the custom prompt if set, or the default prompt
 */
export async function getStudyPreferences(): Promise<StudyPreferences> {
  const response = await callLlmProxy<{
    success: boolean;
    systemPrompt: string;
    isCustom: boolean;
  }>('get_study_preferences');

  return {
    systemPrompt: response.systemPrompt,
    isCustom: response.isCustom,
  };
}

/**
 * Save custom study preferences
 * @param systemPrompt - The custom system prompt
 */
export async function saveStudyPreferences(systemPrompt: string): Promise<void> {
  await callLlmProxy('save_study_preferences', { systemPrompt });
}

/**
 * Reset study preferences to default
 */
export async function resetStudyPreferences(): Promise<void> {
  await callLlmProxy('reset_study_preferences');
}

/**
 * Get the default system prompt
 */
export async function getDefaultPrompt(): Promise<string> {
  const response = await callLlmProxy<{
    success: boolean;
    defaultPrompt: string;
  }>('get_default_prompt');

  return response.defaultPrompt;
}
