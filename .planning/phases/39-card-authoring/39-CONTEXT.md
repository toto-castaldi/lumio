# Phase 39: Card Authoring - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create, edit, and delete flashcards within a deck using a markdown editor with live preview, formatting toolbar, and structured metadata form. Cards are committed to the shared Git repo via the existing `deck-commit` edge function. Docora syncs and generates AI questions from committed cards. No autosave, no image upload, no WYSIWYG — markdown + preview is the editor model.

</domain>

<decisions>
## Implementation Decisions

### Editor layout
- Split-pane on desktop: editor on left, live preview on right (side-by-side)
- On narrow screens (tablet/mobile): fall back to Edit/Preview toggle tabs instead of split-pane
- Card list panel stays visible as a narrow left panel alongside the editor (mail client pattern) — clicking a card opens it in the editor area, card list remains for navigation
- Editor fills the remaining main content area after the card list panel

### Toolbar
- 8 toolbar buttons: bold, italic, code block, math block (KaTeX), heading, list, link, image URL (embed external URL, no upload)
- @uiw/react-md-editor provides built-in toolbar support — leverage its toolbar API

### Metadata form
- Placement: Claude's discretion (inline above editor, collapsible, or other)
- Tags input: chip/badge pattern — type a tag, press Enter to add as chip, click X to remove
- Difficulty: 3-level labeled select — Easy / Medium / Hard (mapped to 1 / 3 / 5 in frontmatter)
- Language: free text input (any language code: en, it, fr, de, etc.), not restricted to IT/EN
- Language default: pre-filled from current app locale (e.g., app in IT → default "it")
- Difficulty default: unset — user must explicitly choose before saving

### Card list display
- Simple vertical list of card rows in a narrow left panel
- Each row shows: card title, tag badges, difficulty label (Easy/Medium/Hard)
- Clicking a card opens it in the editor area to the right
- "New Card" button placement: Claude's discretion

### Card deletion
- Reuse ConfirmDialog with danger variant — same pattern as deck deletion (Phase 38)
- Toast feedback on success and error

### New card defaults
- Filename generated from slugified title: "My First Card" → "my-first-card.md"
- Filename updates with title changes until first save
- Pre-filled frontmatter template with default language from app locale, difficulty unset, empty tags
- Template body includes example content: heading, paragraph, code block, and math block to show what's possible

### Save behavior
- Manual save only (no autosave) — user clicks Save button
- Wait for server response before updating UI (no optimistic updates) — same pattern as Phase 38
- Toast notification on successful save and on error (EDIT-03)
- Save commits the card file via `commitFile()` in api.ts

### Claude's Discretion
- Metadata form placement (above editor, collapsible panel, or other)
- "New Card" button placement (top of card list, in deck header, or floating)
- Loading state design during save/load operations
- Empty state when deck has no cards (CTA design)
- Exact responsive breakpoint for split-pane → toggle tabs transition
- Card list panel width and resize behavior
- Unsaved changes warning (navigate away with edits)

</decisions>

<specifics>
## Specific Ideas

- Mail client pattern: narrow card list on left, editor area on right — like VS Code's sidebar + editor split
- Inline rename from Phase 38 was VS Code-style — maintain that interaction consistency
- Card frontmatter must match Docora's `parseFrontmatter()` format exactly: `title: string, tags: string[], difficulty?: number, language?: string`
- Example template body should demonstrate markdown features available in the toolbar (code, math, heading, list)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `api.ts`: `commitFile()`, `deleteFile()`, `getFile()`, `listFiles()` — full card CRUD API layer already exists
- `ConfirmDialog.tsx`: Reusable danger confirmation dialog — reuse for card delete
- `DeckContext.tsx`: Already fetches card counts via `listFiles()`, has `refreshDecks()` for state updates
- `validation.ts`: `validateDeckName()` pattern — can add `validateCardTitle()` similarly
- `@lumio/shared`: `CardFrontmatter` type (`title`, `tags[]`, `difficulty?`, `language?`) already defined
- `react-hot-toast`: Already installed and wired for toast notifications

### Established Patterns
- Tailwind CSS with `lumio-*` custom color tokens (lumio-bg, lumio-surface, lumio-border, lumio-text, lumio-text-secondary)
- React context pattern for shared state (AuthContext, DeckContext, I18nContext, ThemeContext)
- react-router for navigation
- i18n keys in `en.ts` / `it.ts` with nested objects
- Inline SVG icons (no icon library)
- Wait for server response, then update UI + toast (no optimistic updates)

### Integration Points
- `DeckDetailPanel.tsx`: Has a "Card list placeholder" section ready to be replaced with actual card list
- `DeckContext.tsx`: Card counts already tracked — may need to expose card list state or create a new CardContext
- `api.ts`: All edge function calls centralized here — no new edge functions needed
- i18n: New keys needed for card CRUD labels, editor UI, toolbar tooltips, metadata form, toasts

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 39-card-authoring*
*Context gathered: 2026-03-12*
