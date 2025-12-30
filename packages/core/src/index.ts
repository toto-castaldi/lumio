// Re-export everything from shared
export * from '@lumio/shared';

// Export Supabase client
export {
  createSupabaseClient,
  getSupabaseClient,
  getSupabaseUrl,
} from './supabase/client';

// Export auth functions
export {
  signInWithGoogle,
  signInWithDevUser,
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
