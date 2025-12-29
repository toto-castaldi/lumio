// Version information - updated during CI/CD
export const VERSION = {
  version: '0.1.0',
  buildNumber: process.env.BUILD_NUMBER || 'dev',
  commitSha: process.env.COMMIT_SHA || 'local',
  buildDate: process.env.BUILD_DATE || new Date().toISOString(),
} as const;

export type AppVersion = typeof VERSION;

// Re-export all modules
export * from './types';
export * from './constants';
