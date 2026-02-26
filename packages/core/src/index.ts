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
  getUserId,
} from './supabase/auth';

// Export repository functions
export {
  addRepository,
  deleteRepository,
  getUserRepositories,
  getUserStats,
  getRepositoryCards,
  updateRepositoryToken,
} from './supabase/repositories';

// Export card assets functions
export {
  getCardAssets,
  getCardAssetsBatch,
  getAssetSignedUrl,
  getAssetSignedUrls,
  transformCardContentImages,
} from './supabase/assets';

// Export study functions
export {
  getPlatformConfig,
  generateQuiz,
  getStudyCards,
  validateAnswer,
  // Batch mode (Milestone 12)
  getPreGeneratedQuestion,
  voteQuestion,
  getStudyCardsWithQuestions,
  // Study sessions (Phase 15)
  saveStudySession,
  getStudyHistory,
} from './supabase/study';

// Export markdown configuration and utilities
export {
  remarkPlugins,
  rehypePlugins,
  markdownConfig,
  parseGitHubUrl,
  toGitHubRawUrl,
  createImageUrlTransformer,
  isImageUrl,
  SUPPORTED_IMAGE_EXTENSIONS,
} from './markdown';

// Export Deck class for card filtering
export { Deck } from './deck';

// Export CardView class for image URL transformation
export { CardView } from './card';

// Export SRS functions (Phase 23)
export { sm2, newSM2Item } from './srs';
