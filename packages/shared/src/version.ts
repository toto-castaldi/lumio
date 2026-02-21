/**
 * Lumio Version - Single Source of Truth
 *
 * Version will be derived from .planning/STATE.md in Phase 21.
 * For now, this is a static placeholder.
 */
export const VERSION = "1.6.2";

/**
 * Build info popolate a build time dalla CI.
 * In sviluppo locale usa valori di default.
 */
export const BUILD_INFO = {
  version: VERSION,
  buildNumber: process.env.BUILD_NUMBER || "dev",
  gitSha: process.env.COMMIT_SHA || process.env.GIT_SHA || "local",
  buildDate: process.env.BUILD_DATE || new Date().toISOString(),
} as const;

export type BuildInfo = typeof BUILD_INFO;

/**
 * Stringa formattata per display
 */
export function getVersionString(): string {
  return `v${BUILD_INFO.version}`;
}

/**
 * Stringa completa per debug
 */
export function getFullVersionString(): string {
  return `v${BUILD_INFO.version} (${BUILD_INFO.buildNumber}-${BUILD_INFO.gitSha.slice(0, 7)})`;
}
