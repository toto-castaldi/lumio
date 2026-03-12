# Phase 38: Deck Management - Research

**Researched:** 2026-03-12
**Domain:** React SPA CRUD UI with Git-backed storage via edge functions
**Confidence:** HIGH

## Summary

Phase 38 replaces the placeholder Sidebar and DashboardPage with a working deck management UI. The user can create, view, rename, and delete decks -- all operations flow through the existing `api.ts` module which calls the `deck-commit` edge function. The edge function commits to GitHub via its Contents API.

The critical technical insight is that **Git has no concept of empty directories**. A "deck" is a directory in the Git repo, created implicitly when its first file is committed. The current edge function supports `list_decks`, `commit_file`, `delete_file`, `list_files`, and `get_file` -- but has no explicit `create_deck`, `rename_deck`, or `delete_deck` actions. Creating a deck means committing a placeholder file (e.g., `.gitkeep` or a metadata file) into the new directory. Renaming a deck means creating files at the new path and deleting from the old. Deleting a deck means deleting all files within it. These are multi-step operations that need careful handling.

**Primary recommendation:** Add `create_deck`, `rename_deck`, and `delete_deck` actions to the edge function to encapsulate the Git complexity server-side. The client API module gets three new typed functions. The UI adds a DeckContext for shared state between Sidebar and main content area.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Each deck in sidebar shows: name + card count badge
- Sorted by most recently modified (last-edited deck on top)
- Selecting a deck shows detail view in main content area
- Main area shows: deck name heading, card count, creation info, action buttons (rename/delete), plus card list placeholder for Phase 39
- Validate deck name: only letters, numbers, spaces, and hyphens allowed (Git directory path)
- After creating a new deck, auto-select it and show its (empty) detail view
- Toast notification on success and on error for all CRUD operations
- Hover icons on sidebar deck rows: pencil (rename) and trash (delete) appear on hover/focus
- Rename: inline editing -- deck name becomes editable text field, Enter to save, Escape to cancel (VS Code file rename style)
- Same validation rules for rename as for create
- Delete: confirmation dialog
- Wait for server response before updating UI (no optimistic updates) -- show brief loading state during edge function call
- Edge function commits to Git, typically ~1s response time

### Claude's Discretion
- Selected deck highlight style in sidebar (background highlight, accent bar, or other)
- Create deck interaction pattern (inline input in sidebar vs small modal dialog)
- "+ New Deck" button placement (top vs bottom of sidebar)
- Loading state design (skeleton placeholders vs spinner)
- Empty state design when user has zero decks (CTA vs minimal)
- Delete confirmation dialog style (simple confirm vs type-to-confirm)
- Exact spacing, typography, icon choices within Lumio brand

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DECK-01 | User can create a new deck (creates directory in shared Git repo) | New `create_deck` edge function action + `createDeck()` in api.ts; deck name validation regex; placeholder file pattern for Git directory creation |
| DECK-02 | User can rename an existing deck | New `rename_deck` edge function action + `renameDeck()` in api.ts; inline editing component pattern; validation rules |
| DECK-03 | User can delete a deck with confirmation dialog | New `delete_deck` edge function action + `deleteDeck()` in api.ts; confirmation dialog component; recursive file deletion server-side |
| DECK-04 | User can see list of their own decks only | Existing `listDecks()` already scoped to authenticated user's `/{userId}/` directory; DeckContext for shared state |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.1.0 | UI framework | Already in project |
| react-router | ^7.13.1 | Client routing | Already in project |
| Tailwind CSS | ^4.2.1 | Styling | Already in project |
| react-hot-toast | ^2.5.2 | Toast notifications | Already in project, used in auth pages |
| @supabase/supabase-js | ^2.45.0 | Auth + edge function invocation | Already in project |
| Vitest | ^4.0.0 | Testing | Already in project |

### Supporting (no new dependencies needed)
This phase requires NO new npm dependencies. Everything is built with the existing stack.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom DeckContext | Zustand/Jotai | Overkill for 1 shared state (deck list + selection); context pattern matches existing AuthContext/I18nContext/ThemeContext |
| Custom confirmation dialog | @headlessui/react dialog | Adds dependency for one dialog; a simple custom modal with the existing Tailwind tokens is sufficient |
| Inline SVG icons | lucide-react | Project pattern is inline SVGs (see Header.tsx, Sidebar.tsx, AvatarDropdown.tsx); adding icon library contradicts established convention |

## Architecture Patterns

### Recommended Project Structure
```
src/
  contexts/
    DeckContext.tsx        # NEW: shared deck state (list, selection, CRUD operations)
  components/
    Sidebar.tsx            # MODIFY: replace placeholder with deck list + create/rename/delete UI
    Layout.tsx             # MODIFY: minor -- pass deck selection if needed
    DeckDetailPanel.tsx    # NEW: main content area showing selected deck info
    ConfirmDialog.tsx      # NEW: reusable confirmation dialog component
  pages/
    DashboardPage.tsx      # MODIFY: renders DeckDetailPanel or empty state based on selection
  lib/
    api.ts                 # MODIFY: add createDeck(), renameDeck(), deleteDeck()
  i18n/
    en.ts                  # MODIFY: add deck CRUD translation keys
    it.ts                  # MODIFY: add deck CRUD translation keys
supabase/functions/
  deck-commit/index.ts     # MODIFY: add create_deck, rename_deck, delete_deck actions
```

### Pattern 1: DeckContext for Shared State
**What:** A React context that holds the deck list, selected deck, and CRUD operation functions. Both Sidebar and DashboardPage consume it.
**When to use:** When multiple components need the same data (sidebar shows list, main area shows detail of selected deck).
**Example:**
```typescript
// Matches existing AuthContext/I18nContext/ThemeContext pattern
interface DeckContextType {
  decks: DeckEntry[];
  selectedDeck: DeckEntry | null;
  loading: boolean;
  selectDeck: (deck: DeckEntry | null) => void;
  createDeck: (name: string) => Promise<void>;
  renameDeck: (oldName: string, newName: string) => Promise<void>;
  deleteDeck: (name: string) => Promise<void>;
  refreshDecks: () => Promise<void>;
}
```

### Pattern 2: Edge Function Actions for Deck Operations
**What:** Server-side actions that encapsulate the Git complexity of directory operations. The client never needs to know about `.gitkeep` files or multi-file moves.
**When to use:** Always -- keep Git implementation details on the server.

**Create deck:** Commits a `.gitkeep` file into `{userId}/{deckName}/.gitkeep` to create the directory.
**Rename deck:** Lists all files in old directory, creates them at new path, deletes from old path -- all in sequence or via Git Tree API for atomicity.
**Delete deck:** Lists all files in the directory and deletes them all.

**Why server-side:** These are multi-step Git operations. Doing them client-side would require multiple round-trips and risk partial failures. The edge function can handle the complexity atomically.

### Pattern 3: Inline Editing (VS Code Style)
**What:** Deck name in sidebar becomes an editable input field on pencil icon click. Enter saves, Escape cancels.
**When to use:** For rename operations, as specified by user decision.
**Key behaviors:**
- `onFocus`: select all text
- `onBlur`: cancel (revert to original name)
- `onKeyDown Enter`: validate and save
- `onKeyDown Escape`: cancel
- Show inline validation error below the input

### Pattern 4: Toast Pattern (existing)
**What:** Use `react-hot-toast` for operation feedback.
**When to use:** After every CRUD operation (success or error), as specified by user decision.
**Example:**
```typescript
import toast from 'react-hot-toast';
// Success
toast.success(t('deck.createSuccess'));
// Error
toast.error(err instanceof Error ? err.message : t('common.error'));
```

### Anti-Patterns to Avoid
- **Optimistic updates:** User explicitly decided against this. Wait for server response, show loading state.
- **Client-side Git operations:** Never have the client manage `.gitkeep` files or multi-file moves. Keep that in the edge function.
- **Prop drilling deck state:** Use DeckContext, don't pass deck list and handlers through Layout as props.
- **State in URL for deck selection:** Not needed -- this is a single-page dashboard, not a multi-page flow. URL routing for deck selection can be Phase 39+.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom toast system | `react-hot-toast` (already installed) | Already used throughout auth pages; consistent UX |
| Form validation | Custom validation logic spread across components | Centralized `validateDeckName()` utility | Single source of truth for Git-safe name rules |
| Confirmation dialogs | Multiple inline confirm patterns | Reusable `ConfirmDialog` component | Will be reused in Phase 39 for card deletion |
| Click-outside detection | Custom mousedown listeners | Reuse pattern from AvatarDropdown.tsx | Already proven in the codebase |

**Key insight:** The deck name validation regex (`/^[a-zA-Z0-9 -]+$/`) must be shared between client (for instant feedback) and server (for security). Define it once in the edge function and mirror it in the client validation utility.

## Common Pitfalls

### Pitfall 1: Git Empty Directory Problem
**What goes wrong:** Creating a "deck" means creating a Git directory, but Git does not track empty directories. `list_decks` returns directories that have at least one file. If you create a deck and don't put a file in it, it won't appear.
**Why it happens:** Git fundamentally tracks files, not directories.
**How to avoid:** The `create_deck` edge function action must commit a `.gitkeep` placeholder file into the new directory. This is the standard Git convention.
**Warning signs:** Newly created deck doesn't appear in list after refresh.

### Pitfall 2: Rename is Not Atomic in GitHub Contents API
**What goes wrong:** GitHub Contents API has no "rename" or "move" operation. Renaming a deck requires: (1) list all files in old directory, (2) create each file at new path, (3) delete each file at old path. If step 3 fails partway, you have duplicated files.
**Why it happens:** GitHub Contents API operates on individual files.
**How to avoid:** Handle in the edge function with proper error handling. For a single-user tool, the risk is acceptable -- partial failure leaves the old directory intact. Consider using the Git Trees API for atomic operations if the deck contains many files, but for Phase 38 (decks are mostly empty or have few files), sequential operations are fine.
**Warning signs:** After rename, both old and new deck names appear in the list.

### Pitfall 3: `.gitkeep` Must Be Excluded from Card Counts
**What goes wrong:** When counting cards in a deck (for the badge), the `.gitkeep` file gets counted as a card.
**Why it happens:** `listFiles()` returns all files including `.gitkeep`.
**How to avoid:** Filter out `.gitkeep` when counting cards. Either do this in the edge function's `list_files` response or in the client. Recommendation: handle in client since `list_files` is a generic operation.

### Pitfall 4: Deck Name Validation Must Match Git Path Rules
**What goes wrong:** User enters a deck name with special characters that breaks the Git path or causes URL encoding issues in the GitHub API.
**Why it happens:** GitHub Contents API uses the path in the URL, so characters like `/`, `?`, `#`, `%` cause issues.
**How to avoid:** Strict validation: only `[a-zA-Z0-9 -]` allowed. Spaces in deck names are fine (GitHub API handles URL encoding). Also validate: not empty, not just spaces/hyphens, reasonable max length (e.g., 50 chars), no reserved names (`.`, `..`, `.git`).
**Warning signs:** API errors with status 422 from GitHub.

### Pitfall 5: Race Condition on Rapid Operations
**What goes wrong:** User creates a deck, then immediately tries to create another before the first completes. Or double-clicks delete.
**Why it happens:** No optimistic updates means the UI shows a loading state, but the button might still be clickable.
**How to avoid:** Disable action buttons during loading state. The DeckContext `loading` flag should disable create/rename/delete buttons globally while any operation is in progress.

### Pitfall 6: Edge Function Path Validation -- `.gitkeep` Is Not `.md`
**What goes wrong:** The existing `validateUserPath()` requires `.md` extension. Creating a `.gitkeep` file will fail validation.
**Why it happens:** The validation was designed for card files only.
**How to avoid:** The new `create_deck` action should bypass the `.md` validation and use `validateUserDirectoryPath()` instead, or have its own validation that allows `.gitkeep`. Since the action is server-side and the path is constructed server-side (not user-provided), this is safe.

## Code Examples

### Deck Name Validation
```typescript
// src/lib/validation.ts
const DECK_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9 -]*$/;
const MAX_DECK_NAME_LENGTH = 50;
const RESERVED_NAMES = ['.', '..', '.git'];

export function validateDeckName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'deck.validation.empty';
  if (trimmed.length > MAX_DECK_NAME_LENGTH) return 'deck.validation.tooLong';
  if (RESERVED_NAMES.includes(trimmed)) return 'deck.validation.reserved';
  if (!DECK_NAME_REGEX.test(trimmed)) return 'deck.validation.invalidChars';
  return null; // valid
}
```

### API Module Extensions
```typescript
// New functions to add to src/lib/api.ts

/** Create a new deck directory for the authenticated user */
export async function createDeck(name: string): Promise<DeckEntry> {
  const data = await invoke<{ deck: DeckEntry }>({ action: 'create_deck', name });
  return data.deck;
}

/** Rename an existing deck */
export async function renameDeck(oldName: string, newName: string): Promise<DeckEntry> {
  const data = await invoke<{ deck: DeckEntry }>({ action: 'rename_deck', old_name: oldName, new_name: newName });
  return data.deck;
}

/** Delete a deck and all its contents */
export async function deleteDeck(name: string): Promise<void> {
  await invoke<{ success: true }>({ action: 'delete_deck', name });
}
```

### Edge Function -- create_deck Action
```typescript
// New case in deck-commit/index.ts switch statement
case "create_deck": {
  const { name } = body;
  if (!name || typeof name !== 'string') {
    return errorResponse("Missing required field: name", 400);
  }
  // Validate deck name (letters, numbers, spaces, hyphens)
  if (!/^[a-zA-Z0-9][a-zA-Z0-9 -]*$/.test(name.trim())) {
    return errorResponse("Invalid deck name", 400);
  }
  const deckPath = `${userId}/${name.trim()}`;
  // Check if deck already exists
  const existing = await listDirectory(deckPath);
  if (existing.length > 0) {
    return errorResponse("Deck already exists", 409);
  }
  // Create .gitkeep to establish directory
  await commitFile(`${deckPath}/.gitkeep`, '', `[deck-builder] Create deck: ${name.trim()}`);
  return jsonResponse({ success: true, deck: { name: name.trim(), path: deckPath } });
}
```

### Toast Usage Pattern (from existing codebase)
```typescript
import toast from 'react-hot-toast';

// Pattern used throughout auth pages:
try {
  await someOperation();
  toast.success(t('deck.createSuccess'));
} catch (err) {
  toast.error(err instanceof Error ? err.message : t('common.error'));
}
```

### Inline SVG Icons (project pattern)
```typescript
// Pencil icon (for rename) -- consistent with project's inline SVG approach
<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
</svg>

// Trash icon (for delete)
<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
</svg>

// Plus icon (for create)
<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
</svg>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GitHub Contents API for directory ops | GitHub Contents API (still current) | N/A | No "move" or "rename" API -- must create+delete |
| `.gitkeep` convention | Still standard | Long-standing Git convention | Only way to represent empty directories in Git |
| React Context for shared state | React Context (still standard for simple shared state) | React 19 confirms context is fine | No need for external state libraries for this scope |

**Deprecated/outdated:**
- None relevant to this phase. The stack is current (React 19, Vite 7, Tailwind 4).

## Open Questions

1. **Card count for sidebar badge**
   - What we know: `listFiles(deckPath)` returns files in a deck. Filter out `.gitkeep` for card count.
   - What's unclear: Should we fetch file counts for ALL decks on initial load? That's N+1 API calls (1 `listDecks` + N `listFiles`).
   - Recommendation: For Phase 38, show card count only for the selected deck (in the detail panel). Sidebar badge can show card count when deck data is loaded. Alternatively, enhance `list_decks` edge function to include file counts in the response to avoid N+1.

2. **"Most recently modified" sort order**
   - What we know: User wants decks sorted by last modification time.
   - What's unclear: GitHub Contents API does not return modification timestamps for directories. Only individual file commits have timestamps.
   - Recommendation: For Phase 38, sort alphabetically as a pragmatic default. To get true "last modified" order, the edge function would need to query Git commit history for each deck directory, which is expensive. Alternatively, accept alphabetical sort and defer last-modified sort to a future enhancement. Or maintain a client-side "last touched" timestamp in localStorage.

3. **Duplicate deck name detection**
   - What we know: The `create_deck` action should check if a deck already exists.
   - What's unclear: GitHub API returns 404 for non-existent directories, and the `listDirectory` function returns empty array for 404.
   - Recommendation: Check via `listDirectory(deckPath)` -- if it returns items, deck exists. Also check against the current deck list cached in DeckContext for instant client-side validation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.0 with jsdom |
| Config file | `apps/deck-builder/vitest.config.ts` |
| Quick run command | `cd apps/deck-builder && npx vitest run` |
| Full suite command | `cd apps/deck-builder && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DECK-01 | createDeck calls edge function with correct action/body | unit | `cd apps/deck-builder && npx vitest run src/lib/__tests__/api.test.ts` | Wave 0 (extend existing) |
| DECK-01 | Deck name validation rejects invalid names | unit | `cd apps/deck-builder && npx vitest run src/lib/__tests__/validation.test.ts` | Wave 0 |
| DECK-02 | renameDeck calls edge function with old/new names | unit | `cd apps/deck-builder && npx vitest run src/lib/__tests__/api.test.ts` | Wave 0 (extend existing) |
| DECK-03 | deleteDeck calls edge function with correct body | unit | `cd apps/deck-builder && npx vitest run src/lib/__tests__/api.test.ts` | Wave 0 (extend existing) |
| DECK-04 | listDecks already tested -- returns user's decks | unit | `cd apps/deck-builder && npx vitest run src/lib/__tests__/api.test.ts` | Exists |
| DECK-01 | Edge function create_deck creates .gitkeep | unit | manual (edge function testing is out of vitest scope) | manual-only |
| DECK-02 | Edge function rename_deck moves files | unit | manual | manual-only |
| DECK-03 | Edge function delete_deck removes all files | unit | manual | manual-only |

### Sampling Rate
- **Per task commit:** `cd apps/deck-builder && npx vitest run`
- **Per wave merge:** `cd apps/deck-builder && npx vitest run && cd apps/deck-builder && npx tsc --noEmit`
- **Phase gate:** Full suite green + typecheck before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/validation.test.ts` -- covers DECK-01/DECK-02 deck name validation
- [ ] Extend `src/lib/__tests__/api.test.ts` -- covers DECK-01/DECK-02/DECK-03 new API functions
- Note: Vitest config currently only includes `src/lib/__tests__/**/*.test.ts` -- component tests are not in scope (would need @testing-library/react, which is not installed). Unit tests for logic functions are sufficient.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `apps/deck-builder/src/` -- all existing components, contexts, API module, i18n files, test files
- Codebase inspection: `supabase/functions/deck-commit/index.ts` -- edge function with all 5 existing actions
- Codebase inspection: `apps/deck-builder/package.json` -- confirmed all dependency versions

### Secondary (MEDIUM confidence)
- GitHub Contents API -- no rename/move endpoint exists (verified via API documentation knowledge, consistent with codebase pattern of individual file operations)
- Git empty directory limitation -- fundamental Git behavior, well-documented

### Tertiary (LOW confidence)
- None -- all findings verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use
- Architecture: HIGH -- follows existing context pattern (AuthContext, I18nContext, ThemeContext), API module pattern proven
- Pitfalls: HIGH -- Git directory behavior is fundamental and well-understood; edge function source code inspected directly
- Edge function modifications: HIGH -- source code fully reviewed, modification points clear

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable stack, no fast-moving dependencies)
