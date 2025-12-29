// LLM Provider types
export type LLMProvider = 'openai' | 'anthropic';

// Sync status for repositories
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

// Platform types
export type Platform = 'web' | 'mobile';

// Quality rating for AI-generated questions
export type QualityRating = -2 | -1 | 0 | 1 | 2;

// User profile (stored in public.users table)
export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// User API Key (stored in public.user_api_keys table)
export interface UserApiKey {
  id: string;
  userId: string;
  provider: LLMProvider;
  isValid: boolean;
  isPreferred: boolean;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Authentication state for the application
export type AuthState =
  | 'loading'      // Initial load, checking session
  | 'logged_out'   // No session, need to login
  | 'needs_api_key' // Logged in but no API key configured
  | 'ready';       // Logged in with API key, ready to use

// Authenticated user (from Supabase auth)
export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}
