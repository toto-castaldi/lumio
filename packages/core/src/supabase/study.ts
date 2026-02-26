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
  StudySession,
  SaveStudySessionOptions,
  CardReviewSchedule,
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

// =============================================================================
// STUDY SESSIONS (Phase 15 - Study Stats)
// =============================================================================

/**
 * Map database study session row to StudySession type
 */
function mapStudySession(row: Record<string, unknown>): StudySession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    repositoryName: row.repository_name as string | null,
    correctCount: row.correct_count as number,
    totalCount: row.total_count as number,
    skippedCount: row.skipped_count as number,
    durationSeconds: row.duration_seconds as number,
    completedAt: row.completed_at as string,
    createdAt: row.created_at as string,
  };
}

/**
 * Save a completed study session to the database
 * @param options - Session result data
 */
export async function saveStudySession(
  options: SaveStudySessionOptions
): Promise<StudySession> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const userId = await getUserId();
  if (!userId) {
    throw new Error('User ID not found');
  }

  const supabaseUrl = getSupabaseUrl();
  const response = await fetch(`${supabaseUrl}/rest/v1/study_sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: getSupabaseAnonKey(),
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      repository_name: options.repositoryName ?? null,
      correct_count: options.correctCount,
      total_count: options.totalCount,
      skipped_count: options.skippedCount,
      duration_seconds: options.durationSeconds,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save study session');
  }

  const [row] = await response.json();
  return mapStudySession(row);
}

/**
 * Get the user's study session history
 * Returns the most recent sessions, limited by platform_config study_history_limit
 * @param limit - Override the default limit (optional, falls back to platform_config)
 */
export async function getStudyHistory(
  limit?: number
): Promise<StudySession[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  // Fetch the configured limit from platform_config if not overridden
  let effectiveLimit = limit;
  if (!effectiveLimit) {
    const supabaseUrl = getSupabaseUrl();
    const configResponse = await fetch(
      `${supabaseUrl}/rest/v1/platform_config?key=eq.study_history_limit&select=value`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: getSupabaseAnonKey(),
        },
      }
    );
    if (configResponse.ok) {
      const configs = await configResponse.json();
      if (configs.length > 0) {
        effectiveLimit = Number(configs[0].value) || 10;
      }
    }
    if (!effectiveLimit) effectiveLimit = 10;
  }

  const supabaseUrl = getSupabaseUrl();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/study_sessions?select=*&order=completed_at.desc&limit=${effectiveLimit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch study history');
  }

  const rows = await response.json();
  return (rows as Record<string, unknown>[]).map(mapStudySession);
}

// =============================================================================
// SRS SCHEDULING (Phase 23 - Spaced Repetition)
// =============================================================================

/**
 * Study card with SRS info (returned by get_study_cards_for_session RPC)
 */
export interface SRSStudyCard extends StudyCard {
  isReview: boolean;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

/**
 * Map database row to SRSStudyCard type
 */
function mapSRSStudyCard(dbCard: Record<string, unknown>): SRSStudyCard {
  return {
    id: dbCard.card_id as string,
    repositoryId: dbCard.repository_id as string,
    filePath: dbCard.file_path as string,
    contentHash: '',  // Not provided by RPC
    rawContent: dbCard.raw_content as string,
    title: dbCard.title as string,
    content: dbCard.content as string,
    tags: dbCard.tags as string[],
    difficulty: dbCard.difficulty as number,
    language: '',  // Not provided by RPC
    isActive: true,
    createdAt: '',  // Not provided by RPC
    updatedAt: '',  // Not provided by RPC
    questionCount: Number(dbCard.question_count) || 0,
    isReview: dbCard.is_review as boolean,
    easeFactor: dbCard.ease_factor as number,
    intervalDays: dbCard.interval_days as number,
    repetitions: dbCard.repetitions as number,
  };
}

/**
 * Get the count of cards due for review today.
 * Returns 0 for users with no review history.
 */
export async function getDueCardCount(): Promise<number> {
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
    `${supabaseUrl}/rest/v1/rpc/get_due_card_count`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
      },
      body: JSON.stringify({ p_user_id: userId }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get due card count');
  }

  return response.json();
}

/**
 * Get priority-ordered cards for a study session.
 * Returns overdue cards first (most overdue first), then new cards.
 * Deletes stale schedule rows where content has changed (SRS-06).
 *
 * @param limit - Maximum cards to return (overdue cards bypass this cap)
 */
export async function getStudyCardsForSession(
  limit: number = 10
): Promise<SRSStudyCard[]> {
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
    `${supabaseUrl}/rest/v1/rpc/get_study_cards_for_session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
      },
      body: JSON.stringify({ p_user_id: userId, p_limit: limit }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get study cards for session');
  }

  const cards = await response.json();
  return (cards as Record<string, unknown>[]).map(mapSRSStudyCard);
}
