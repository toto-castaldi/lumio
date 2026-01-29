# Coding Conventions

**Analysis Date:** 2026-01-29

## Naming Patterns

**Files:**
- React components: PascalCase with `.tsx` extension (e.g., `CardPreviewDialog.tsx`, `LoginPage.tsx`)
- Utility/lib files: camelCase with `.ts` extension (e.g., `utils.ts`)
- Context files: PascalCase with context suffix (e.g., `AuthContext.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useRealtimeStats.ts`)
- UI components from Radix UI: lowercase with extension (e.g., `button.tsx`, `dialog.tsx`)

**Functions:**
- Regular functions: camelCase (e.g., `mapRepository()`, `callGitSync()`, `getActiveCards()`)
- React components (functional): PascalCase (e.g., `AuthProvider()`, `LoginPage()`, `CardPreviewDialog()`)
- Custom hooks: camelCase with `use` prefix (e.g., `useAuth()`, `useRealtimeStats()`)
- Exported async functions: camelCase (e.g., `signInWithGoogle()`, `addRepository()`, `getCurrentUser()`)

**Variables:**
- Constants: camelCase (e.g., `defaultRedirectTo`, `ignoreFilter`, `supabaseUrl`)
- State variables: camelCase (e.g., `user`, `state`, `activeCards`)
- Type names in templates: camelCase when describing generic types (e.g., `dbRepo`, `assetMap`)
- Private/internal: Private class members prefixed with `#` or accessed via `private` keyword

**Types:**
- Interfaces: PascalCase with optional suffix (e.g., `AuthContextType`, `ButtonProps`, `MarkdownRendererProps`)
- Type aliases: PascalCase (e.g., `AuthState`, `SyncStatus`, `StudyState`)
- Type imports: `import type { SomeType }` (explicit type imports used throughout)
- Branded types used for discriminated unions (e.g., `AuthState = 'loading' | 'logged_out' | 'ready'`)

## Code Style

**Formatting:**
- No explicit linting config file (eslint.config.* or .eslintrc* not found in repo root)
- Projects declare ESLint in devDependencies but no centralized config detected
- TypeScript strict mode enabled in `tsconfig.base.json` with `"strict": true`

**Linting:**
- ESLint configured per app (web, mobile) with:
  - `@eslint/js` ^9.15.0
  - `typescript-eslint` ^8.15.0
  - `eslint-plugin-react-hooks` ^5.0.0
  - `eslint-plugin-react-refresh` ^0.4.14
- Packages (shared, core) use basic ESLint with TypeScript support
- Lint command: `pnpm lint` or app-specific `eslint .` or `eslint src/`

**Indentation & Formatting:**
- 2-space indentation (inferred from codebase)
- JSX multiline props on new lines (e.g., `CardPreviewDialog` component)
- Template strings used for complex string composition

## Import Organization

**Order:**
1. Built-in modules (e.g., `import path from 'path'`)
2. React core imports (e.g., `import { useState, useEffect }`)
3. React router (e.g., `import { useNavigate }`)
4. Third-party packages (e.g., `react-markdown`, `@radix-ui/*`, `sonner`)
5. Internal monorepo packages (e.g., `@lumio/core`, `@lumio/shared`)
6. Local relative imports (e.g., `@/components/ui/button`, `./CardPreviewDialog`)
7. Type imports separated: `import type { SomeType }`

**Path Aliases:**
- Web app: `@/*` → `./src/*` (configured in `tsconfig.json`)
- Mobile app: Uses relative imports
- Packages (core, shared): Standard relative imports

**Examples:**
```typescript
// From CardPreviewDialog.tsx
import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Card, Repository } from '@lumio/core';
import { CardView, getSupabaseUrl } from '@lumio/core';
import { MarkdownRenderer } from '@/components/markdown';

// From StudyPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getPreGeneratedQuestion,
  getStudyCardsWithQuestions,
  getUserRepositories,
  voteQuestion,
  Deck,
  type StudyCard,
  type Repository,
  type ShuffledQuestion,
  type QuestionVote,
} from '@lumio/core';
```

## Error Handling

**Patterns:**
- Try-catch blocks for async operations that might throw
- Destructured error returns from async functions: `const { data, error } = await fetch()`
- Check for error before using data: `if (error) throw error;` or `if (!response.ok) throw new Error()`
- Early returns for null/undefined checks
- Null coalescing for safe defaults: `field || fallback`
- Console error/warn for non-critical failures (warnings logged for async issues)

**Examples:**
```typescript
// From AuthContext.tsx - try-catch for async
try {
  const currentUser = await getCurrentUser();
  setUser(currentUser);
  setState(currentUser ? 'ready' : 'logged_out');
} catch (error) {
  console.error('Auth check failed:', error);
  setState('logged_out');
}

// From repositories.ts - destructured error check
const { data, error } = await supabase
  .from('card_assets')
  .select('*')
  .eq('card_id', cardId);

if (error) throw error;

// From auth.ts - graceful degradation
if (error) {
  console.error('Failed to refresh session:', error);
  return session.access_token; // Return current token even if refresh fails
}

// From assets.ts - graceful null returns
if (error || !data) {
  console.warn('Failed to create signed URL:', error?.message);
  return null;
}
```

## Logging

**Framework:** `console` object (no centralized logger detected)

**Patterns:**
- `console.error()`: For recoverable errors during operation (auth refresh, session failures)
- `console.warn()`: For graceful degradation scenarios (failed signed URL creation)
- Contextual prefixes used: e.g., `[Deck] Failed to parse .lumioignore:`
- No logging in happy path
- Logged at point of detection, not re-logged further up the chain

**Usage locations:**
- `packages/core/src/supabase/auth.ts`: Session refresh failure
- `packages/core/src/supabase/assets.ts`: Signed URL creation failures
- `packages/core/src/deck/Deck.ts`: .lumioignore parsing errors
- `apps/web/src/pages/LoginPage.tsx`: Google login errors
- `apps/web/src/contexts/AuthContext.tsx`: Initial auth check failures

## Comments

**When to Comment:**
- JSDoc/TSDoc for all exported functions and classes
- Inline comments explaining complex logic (path resolution, regex patterns, filtering logic)
- Type definitions documented with purpose and parameters
- Business logic intent documented (e.g., "Check if token is expired or will expire in next 60 seconds")
- No comments for obvious code

**JSDoc/TSDoc:**
- All public functions have JSDoc headers
- Parameters documented with `@param` tag
- Return types documented with `@returns` tag
- Complex logic documented with block comments above implementation

**Examples:**
```typescript
/**
 * Sign in with Google OAuth
 * @param redirectTo - URL to redirect after successful login
 */
export async function signInWithGoogle(redirectTo?: string) {
  // ...
}

/**
 * Get the access token for the current session
 * Only refreshes if the token is expired or about to expire
 * @returns Access token string or null
 */
export async function getAccessToken(): Promise<string | null> {
  // ...
}

/**
 * CardView class for stateless image URL transformation
 *
 * Transforms relative image paths in card content to absolute Supabase Storage URLs.
 * This is a stateless approach - URLs are resolved at display time based on:
 * - Repository id
 * - Original image path in markdown
 */
export class CardView {
  // ...
}
```

## Function Design

**Size:**
- Small, focused functions (average 20-50 lines)
- Private helper methods for complex operations (e.g., `resolveRelativePath()`, `createIgnoreFilter()`)
- Compound async functions break work into logical steps with clear variable names

**Parameters:**
- Object parameters with type interfaces for multiple arguments (e.g., `AddRepositoryOptions`)
- Explicit types for all function parameters
- Optional parameters use `?` notation and provide defaults or null checks

**Return Values:**
- Explicit return types declared on all functions
- Async functions return Promises with typed generic arguments
- Null returns for "not found" scenarios (e.g., `getCurrentUser(): Promise<AuthUser | null>`)
- Tuple/Map returns for batch operations
- Discriminated unions for result types (success/error scenarios)

**Examples:**
```typescript
// Single object parameter with interface
export async function addRepository(options: AddRepositoryOptions): Promise<Repository>

// Batch operation with Map return
export async function getCardAssetsBatch(cardIds: string[]): Promise<Map<string, CardAsset[]>>

// Nullable return
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!user) return null;
  return { id: user.id, email: user.email || '', /* ... */ };
}

// Function with optional parameter and default
export async function getAssetSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string | null>
```

## Module Design

**Exports:**
- Barrel file pattern used: `packages/core/src/index.ts` re-exports from submodules
- Named exports preferred over default exports
- Type exports use `export type { TypeName }` pattern
- Private functions/classes not exported (no `export` keyword)

**Barrel Files:**
- `packages/core/src/index.ts`: Central re-export point for all core functions
- Organized by functional area (auth, repositories, assets, study, markdown, Deck, CardView)
- Enables clean imports: `import { SignInWithGoogle, Deck } from '@lumio/core'`

**Example:**
```typescript
// packages/core/src/index.ts
export * from '@lumio/shared';
export { createSupabaseClient, getSupabaseClient } from './supabase/client';
export { signInWithGoogle, signOut, getCurrentUser, onAuthStateChange } from './supabase/auth';
export { addRepository, deleteRepository, getUserRepositories } from './supabase/repositories';
export { Deck } from './deck';
export { CardView } from './card';
```

---

*Convention analysis: 2026-01-29*
