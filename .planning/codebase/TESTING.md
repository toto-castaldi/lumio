# Testing Patterns

**Analysis Date:** 2026-01-29

## Test Framework

**Status:** Not detected

**Runner:**
- No test runner configured (jest, vitest, etc. not in package.json)
- No test config files found (`jest.config.*`, `vitest.config.*`)

**Assertion Library:**
- Not applicable (no test framework installed)

**Run Commands:**
- `pnpm test` (monorepo root): Executes test scripts across all packages
- Individual app/package testing: Not configured
- Coverage: Not configured

## Test File Organization

**Location:**
- No test files found in codebase (searched for `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`)
- Testing infrastructure not yet implemented
- All test functionality would need to be added

**Naming:**
- Recommended pattern: `*.test.ts` or `*.test.tsx` (standard convention)
- Co-location preferred for UI components

**Structure:**
```
Expected layout for tests (not currently present):
apps/web/src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx
├── pages/
│   ├── LoginPage.tsx
│   └── LoginPage.test.tsx
└── hooks/
    ├── useAuth.ts
    └── useAuth.test.ts

packages/core/src/
├── supabase/
│   ├── auth.ts
│   └── auth.test.ts
└── card/
    ├── CardView.ts
    └── CardView.test.ts
```

## Test Structure

**Suite Organization:**
- Not established (no test files exist)
- Recommended: Use describe blocks for functional grouping

**Patterns:**
- Setup: Not applicable
- Teardown: Not applicable
- Assertion: Not applicable

**Recommended Testing Structure:**
```typescript
describe('CardView', () => {
  describe('transformImageUrls', () => {
    test('should transform relative image URLs to Supabase Storage URLs', () => {
      // Arrange
      const card = { /* ... */ };
      const repository = { /* ... */ };
      const cardView = new CardView(card, repository, 'https://supabase.com');

      // Act
      const result = cardView.getContent();

      // Assert
      expect(result).toContain('storage/v1/object/public/card-assets');
    });

    test('should skip external URLs', () => {
      // Arrange: Card with external image URL
      // Act
      // Assert: URL unchanged
    });
  });
});
```

## Mocking

**Framework:**
- No mocking framework configured
- Recommendation: Use Jest or Vitest mocks/spies

**Patterns:**
- Not established yet
- Will need to mock:
  - Supabase client methods (database queries, auth)
  - HTTP fetch calls (Edge Functions)
  - Local storage / session storage
  - React context providers
  - Async function resolvers

**What to Mock:**
- External API calls (Supabase, git-sync Edge Functions)
- Authentication state and user data
- File system operations (reading .lumioignore files)
- Date/time operations for token expiry calculations

**What NOT to Mock:**
- Pure utility functions (path resolution, regex operations)
- Type definitions and interfaces
- React hooks behavior (useMemo, useCallback) - let them run
- Markdown rendering logic (test with real react-markdown)

**Example (Recommended Pattern):**
```typescript
// Mocking Supabase client
jest.mock('@lumio/core', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({
        data: [{ id: '1', title: 'Card' }],
        error: null,
      }),
    })),
  })),
}));

// Mocking Edge Function calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, repositories: [] }),
  })
);
```

## Fixtures and Factories

**Test Data:**
- Not established yet
- Recommendation: Create factory functions for common test objects

**Recommended Pattern:**
```typescript
// factories/cardFactory.ts
export function createCard(overrides?: Partial<Card>): Card {
  return {
    id: 'card-1',
    repositoryId: 'repo-1',
    filePath: 'cards/example.md',
    contentHash: 'abc123',
    rawContent: '# Title\n\nContent',
    title: 'Title',
    content: 'Content',
    tags: ['javascript'],
    difficulty: 1,
    language: 'javascript',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createRepository(overrides?: Partial<Repository>): Repository {
  return {
    id: 'repo-1',
    url: 'https://github.com/user/repo',
    name: 'repo',
    description: 'Test repo',
    isPrivate: false,
    formatVersion: 1,
    syncStatus: 'synced',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
```

**Location:**
- Recommended: `tests/factories/` or `__fixtures__/` directories
- Currently: Not implemented

## Coverage

**Requirements:**
- Not enforced (no coverage config detected)
- Recommendation: Aim for >80% coverage for critical paths:
  - Authentication flows
  - Data transformations (CardView, Deck filtering)
  - Error handling in async functions

**View Coverage:**
- Command: `pnpm test --coverage` (would require Jest/Vitest configuration)
- Configuration file: `jest.config.js` or `vitest.config.ts` needs to be created

## Test Types

**Unit Tests:**
- Scope: Individual functions and classes
- Priority modules to test:
  - `packages/core/src/supabase/auth.ts`: Auth token management, refresh logic
  - `packages/core/src/card/CardView.ts`: Image URL transformation, relative path resolution
  - `packages/core/src/deck/Deck.ts`: .lumioignore filtering logic
  - `packages/core/src/supabase/repositories.ts`: Data mapping functions
  - `apps/web/src/lib/utils.ts`: Class name utilities
  - `apps/web/src/components/markdown/MarkdownRenderer.tsx`: Component rendering with plugins

**Integration Tests:**
- Scope: Supabase client interactions
- Test flows:
  - Complete authentication flow (sign in → get user → logout)
  - Repository CRUD operations (add → get → delete)
  - Card fetching and filtering with active cards
  - Asset signing and image URL transformation end-to-end

**E2E Tests:**
- Framework: Not configured (could use Cypress, Playwright, or Selenium)
- Critical paths to test:
  - Login flow with Google OAuth
  - Repository import and card viewing
  - Study mode with question generation and voting
  - Settings and repository management

## Common Patterns

**Async Testing:**
- Recommended pattern with async/await:
```typescript
test('should fetch repositories for authenticated user', async () => {
  const { repositories } = await getUserRepositories();
  expect(repositories).toHaveLength(2);
});
```

- With promises:
```typescript
test('should fetch repositories', () => {
  return getUserRepositories().then(({ repositories }) => {
    expect(repositories).toHaveLength(2);
  });
});
```

- Critical functions requiring testing:
  - `signInWithGoogle()`: Handles OAuth redirects
  - `getCurrentUser()`: Auth state initialization
  - `addRepository()`: Network request + database interaction
  - `getPreGeneratedQuestion()`: Study mode flow
  - `voteQuestion()`: User interaction with voting

**Error Testing:**
- Expected patterns based on codebase error handling:
```typescript
test('should throw error if not authenticated', async () => {
  jest.spyOn(auth, 'getAccessToken').mockResolvedValue(null);

  await expect(callGitSync('action')).rejects.toThrow('Not authenticated');
});

test('should return null if signed URL creation fails', async () => {
  mockSupabaseError('Failed to create URL');

  const result = await getAssetSignedUrl('path');
  expect(result).toBeNull();
});

test('should continue with current token if refresh fails', async () => {
  mockTokenRefreshError();

  const token = await getAccessToken();
  expect(token).toBe(mockCurrentToken);
});
```

- Error types in codebase:
  - Auth errors: Not authenticated, session invalid
  - Network errors: Request failed, Supabase connection
  - Data errors: Invalid structure, missing fields
  - File parse errors: .lumioignore syntax errors

## Test Coverage Gaps (High Priority)

**Authentication System:**
- Files: `packages/core/src/supabase/auth.ts`, `apps/web/src/contexts/AuthContext.tsx`
- What's not tested: Token refresh timing, session expiry edge cases, OAuth callback handling
- Risk: Silent auth failures, users unexpectedly logged out
- Priority: High

**Image URL Transformation:**
- Files: `packages/core/src/card/CardView.ts`
- What's not tested: Complex relative path resolution, special characters, malformed markdown
- Risk: Broken images in card preview, storage URL generation failure
- Priority: High

**Card Filtering Logic:**
- Files: `packages/core/src/deck/Deck.ts`
- What's not tested: .lumioignore pattern matching, edge cases in path matching
- Risk: Wrong cards filtered/included, data integrity issues
- Priority: Medium

**React Components:**
- Files: `apps/web/src/pages/*.tsx`, `apps/web/src/components/*.tsx`
- What's not tested: User interactions, conditional rendering, state transitions
- Risk: UI bugs, broken user flows
- Priority: Medium

**API Integration:**
- Files: `packages/core/src/supabase/repositories.ts`
- What's not tested: Edge Functions communication, error recovery, data consistency
- Risk: Repository sync failures, data loss
- Priority: High

**Markdown Rendering:**
- Files: `apps/web/src/components/markdown/MarkdownRenderer.tsx`
- What's not tested: Plugin behavior, special cases (math formulas, code blocks)
- Risk: Content not rendering correctly
- Priority: Low (external dependency tested)

---

*Testing analysis: 2026-01-29*
