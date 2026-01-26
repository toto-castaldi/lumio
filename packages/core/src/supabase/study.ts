import { getSupabaseUrl, getSupabaseAnonKey } from './client';
import { getAccessToken, getUserId } from './auth';
import type {
  Card,
  QuizQuestion,
  ValidationResponse,
  PlatformConfig,
  ShuffledQuestion,
  GetQuestionResponse,
  VoteQuestionResponse,
  QuestionVote,
  StudyCard,
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
 * @param repositoryId - Optional repository ID for image fetching
 */
export async function generateQuiz(
  cardContent: string,
  repositoryId?: string
): Promise<QuizQuestion> {
  const response = await callLlmProxy<{ success: boolean; quiz: QuizQuestion }>(
    'generate_quiz',
    { cardContent, repositoryId }
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
 * @param repositoryId - Optional repository ID for image fetching
 */
export async function validateAnswer(
  cardContent: string,
  question: string,
  userAnswer: string,
  correctAnswer: string,
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
    repositoryId,
  });

  return response.validation;
}

// =============================================================================
// PRE-GENERATED QUESTIONS (Milestone 12 - Batch Mode)
// =============================================================================

/**
 * Map database card with question count to StudyCard type
 */
function mapStudyCard(dbCard: Record<string, unknown>): StudyCard {
  return {
    id: dbCard.card_id as string,
    repositoryId: dbCard.repository_id as string,
    filePath: dbCard.file_path as string,
    contentHash: '', // Not provided by RPC
    rawContent: dbCard.raw_content as string,
    title: dbCard.title as string,
    content: dbCard.content as string,
    tags: dbCard.tags as string[],
    difficulty: dbCard.difficulty as number,
    language: '', // Not provided by RPC
    isActive: true,
    createdAt: '', // Not provided by RPC
    updatedAt: '', // Not provided by RPC
    questionCount: Number(dbCard.question_count) || 0,
  };
}

/**
 * Get a pre-generated question for a card
 * Returns a shuffled question or null if no questions available
 * @param cardId - The card ID to get a question for
 */
export async function getPreGeneratedQuestion(
  cardId: string
): Promise<ShuffledQuestion | null> {
  const response = await callLlmProxy<GetQuestionResponse>('get_question', {
    cardId,
  });

  if (response.fallbackRequired || !response.question) {
    return null;
  }

  return response.question;
}

/**
 * Vote on a pre-generated question
 * @param questionId - The question ID to vote on
 * @param vote - The vote value ('like' or 'dislike')
 */
export async function voteQuestion(
  questionId: string,
  vote: QuestionVote
): Promise<{ voteId: string; currentVoteScore: number }> {
  const response = await callLlmProxy<VoteQuestionResponse>('vote_question', {
    questionId,
    vote,
  });

  if (!response.success || !response.voteId) {
    throw new Error(response.error || 'Failed to vote');
  }

  return {
    voteId: response.voteId,
    currentVoteScore: response.currentVoteScore ?? 0,
  };
}

/**
 * Get cards that have at least one pre-generated question
 * Only these cards are available for study in batch mode
 */
export async function getStudyCardsWithQuestions(): Promise<StudyCard[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const userId = await getUserId();
  if (!userId) {
    throw new Error('User ID not found');
  }

  // Call the RPC function directly via Supabase
  const supabaseUrl = getSupabaseUrl();
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_study_cards_with_questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: getSupabaseAnonKey(),
    },
    body: JSON.stringify({ p_user_id: userId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get study cards');
  }

  const cards = await response.json();
  return (cards as Record<string, unknown>[]).map(mapStudyCard);
}
