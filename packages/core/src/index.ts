// Re-export everything from shared
export * from '@lumio/shared';

// Export Supabase client
export {
  createSupabaseClient,
  getSupabaseClient,
  getSupabaseUrl,
  getSupabaseAnonKey,
  type StorageAdapter,
  type CreateSupabaseClientOptions,
} from './supabase/client';

// Export auth functions
export {
  signInWithGoogle,
  signOut,
  getSession,
  getCurrentUser,
  onAuthStateChange,
  getAccessToken,
} from './supabase/auth';

// Export API keys functions
export {
  testApiKey,
  getUserApiKeys,
  saveApiKey,
  deleteApiKey,
  setPreferredProvider,
  hasValidApiKey,
  getPreferredProvider,
} from './supabase/api-keys';

// Export repository functions
export {
  addRepository,
  deleteRepository,
  syncRepository,
  getUserRepositories,
  getUserStats,
  getRepositoryCards,
} from './supabase/repositories';

// Export study functions
export {
  getAvailableModels,
  generateQuiz,
  getStudyCards,
  getStudyPreferences,
  saveStudyPreferences,
  resetStudyPreferences,
  getDefaultPrompt,
} from './supabase/study';
