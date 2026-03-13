# Phase 38: Deck Management - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create, view, rename, and delete their own decks in the web app. The sidebar deck list replaces the Phase 36 placeholder. The main content area shows deck details when a deck is selected. Card editing is Phase 39 — this phase only manages decks as containers.

</domain>

<decisions>
## Implementation Decisions

### Deck list in sidebar
- Each deck shows: name + card count badge
- Sorted by most recently modified (last-edited deck on top)
- Selecting a deck shows its detail view in the main content area
- Main area shows: deck name heading, card count, creation info, action buttons (rename/delete), plus a card list placeholder for Phase 39

### Create deck flow
- Validate deck name with inline error message (deck names become Git directory paths — only letters, numbers, spaces, and hyphens allowed)
- After creating a new deck, auto-select it and show its (empty) detail view
- Toast notification on success and on error

### Rename & delete interactions
- Hover icons on each deck row in sidebar: pencil (rename) and trash (delete) appear on hover/focus
- Rename: inline editing — deck name becomes editable text field, Enter to save, Escape to cancel (like VS Code file rename)
- Same validation rules as create (valid Git directory name characters)
- Delete: confirmation dialog (style is Claude's discretion — simple confirm or type-to-confirm based on risk level)
- Toast notification on success and on error for both operations

### Feedback & loading
- Toast notifications on all CRUD operations (create, rename, delete) — both success and error
- Wait for server response before updating UI (no optimistic updates) — show brief loading state during edge function call
- Edge function commits to Git, typically ~1s response time

### Claude's Discretion
- Selected deck highlight style in sidebar (background highlight, accent bar, or other)
- Create deck interaction pattern (inline input in sidebar vs small modal dialog)
- "+ New Deck" button placement (top vs bottom of sidebar)
- Loading state design (skeleton placeholders vs spinner)
- Empty state design when user has zero decks (CTA vs minimal)
- Delete confirmation dialog style (simple confirm vs type-to-confirm)
- Exact spacing, typography, icon choices within Lumio brand

</decisions>

<specifics>
## Specific Ideas

- Main area when deck selected = combination of deck details panel (name, card count, actions) AND card list placeholder for Phase 39
- Inline rename should feel like VS Code's file rename — click pencil icon, name becomes editable, Enter/Escape
- Deck operations go through the existing `api.ts` module which calls the `deck-commit` edge function

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api.ts`: Already has `listDecks()`, `commitFile()`, `deleteFile()`, `listFiles()`, `getFile()` — typed functions for deck-commit edge function
- `Sidebar.tsx`: Placeholder component ready to be populated with deck list
- `DashboardPage.tsx`: Placeholder main content ready to become deck detail view
- `AuthContext.tsx`: `useAuth()` hook provides `user` for deck ownership
- `I18nContext.tsx`: `useI18n()` with `t()` function for translations
- `ThemeContext.tsx`: Dark mode support already wired

### Established Patterns
- Tailwind CSS with `lumio-*` custom color tokens (lumio-bg, lumio-surface, lumio-border, lumio-text, lumio-text-secondary)
- React context pattern for shared state (AuthContext, I18nContext, ThemeContext)
- react-router for navigation
- i18n keys in `en.ts` / `it.ts` with nested objects

### Integration Points
- `Sidebar.tsx` needs deck list state and CRUD handlers
- `Layout.tsx` orchestrates sidebar and main content — may need deck selection state lifted here or in a new DeckContext
- `api.ts` provides the data layer — no new edge functions needed
- i18n: new keys needed for deck CRUD labels, toasts, validation messages, empty states

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-deck-management*
*Context gathered: 2026-03-12*
