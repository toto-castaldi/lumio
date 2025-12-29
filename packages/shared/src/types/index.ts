// LLM Provider types
export type LLMProvider = 'openai' | 'anthropic';

// Sync status for repositories
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

// Platform types
export type Platform = 'web' | 'mobile';

// Quality rating for AI-generated questions
export type QualityRating = -2 | -1 | 0 | 1 | 2;

// User type placeholder
export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}
