---
phase: 39-card-authoring
verified: 2026-03-12T19:20:00Z
status: human_needed
score: 14/14 must-haves verified
re_verification: false
human_verification:
  - test: "Verify card authoring flow end-to-end in the browser"
    expected: |
      1. Selecting a deck shows the mail-client layout: narrow card list on the left (w-60), editor area on the right.
      2. Clicking 'New Card' opens the editor pre-filled with the template (heading, code block, math block).
      3. Filling in title, tags (Enter to add chips, X or Backspace to remove), difficulty select, language field all work.
      4. The filename below the title updates as the title is typed (e.g. 'my-card.md'). After first save it freezes.
      5. MDEditor shows split-pane live preview on desktop (>= 1024 px wide) and Edit/Preview toggle tabs on mobile.
      6. All 8 toolbar buttons insert correct markdown: bold, italic, code, math ($$...$$), heading, list, link, image URL.
      7. KaTeX math blocks ($$ ... $$) render visually in the preview pane.
      8. Saving a card shows a toast 'Card saved'. The card appears in the card list on the left.
      9. Clicking an existing card in the list loads its content and metadata into the editor.
      10. Deleting a card shows a confirmation dialog (danger variant). After confirming, the card is removed and a toast appears.
      11. The card count in the sidebar and header updates after create/delete operations.
      12. Toggling dark mode switches the MDEditor color scheme (data-color-mode attribute).
      13. Switching the app language to Italian updates all labels (card.newButton, card.meta.*, etc.).
    why_human: "Visual rendering, responsive layout, real-time MDEditor behaviour, KaTeX math display, toast notifications, and dark mode switching cannot be verified programmatically."
---

# Phase 39: Card Authoring Verification Report

**Phase Goal:** Card authoring — frontmatter parsing, validation, CardContext, and full card authoring UI (list, metadata form, markdown editor with toolbar and preview)
**Verified:** 2026-03-12T19:20:00Z
**Status:** human_needed — all automated checks pass, one human verification block required (visual/interactive behaviour)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | gray-matter / yaml can parse frontmatter from a card markdown string and return typed CardFrontmatter + body | VERIFIED | `frontmatter.ts` uses `yaml.parse` via regex split; 4 `parseCard` tests pass |
| 2 | yaml can serialize CardFrontmatter + body back into a valid markdown string with YAML frontmatter | VERIFIED | `serializeCard` in `frontmatter.ts`; round-trip test passes |
| 3 | `generateCardTemplate()` produces a valid markdown string with frontmatter (title, tags, language from locale, no difficulty) and example body | VERIFIED | Template function verified by 3 dedicated tests |
| 4 | `slugify()` converts titles to valid filenames | VERIFIED | 6 unit tests pass (including spaces, special chars, leading/trailing hyphens) |
| 5 | `validateCardTitle()` rejects empty/too-long titles and returns i18n error keys | VERIFIED | 4 unit tests pass |
| 6 | CardContext provides cards list, selectedCard, CRUD operations, and refreshCards for the selected deck | VERIFIED | `CardContext.tsx` 229 lines; exports `CardProvider`, `useCard`; full CRUD implemented |
| 7 | User can see a list of cards in the selected deck (card titles, tag badges, difficulty labels) | VERIFIED | `CardListPanel.tsx` renders card rows with title, up to 2 tag badges, difficulty label with color-coded text |
| 8 | User can click 'New Card' and see the editor pre-filled with frontmatter template and example body | VERIFIED | `DeckDetailPanel.handleNewCard` calls `selectCard(null)` + `setIsCreatingNew(true)`; `CardEditor` useEffect detects `isCreatingNew` and calls `generateCardTemplate(locale)` |
| 9 | User can edit markdown content with a live preview (side-by-side on desktop, toggle on mobile) | VERIFIED (human gate) | `MDEditor` with `preview={isDesktop ? 'live' : mobilePreview}` and responsive `useIsDesktop()` hook; needs human confirmation |
| 10 | User can use 8 toolbar buttons to insert formatting (bold, italic, code, math, heading, list, link, image) | VERIFIED (human gate) | `toolbarCommands` array in `CardEditor` contains all 8: `commands.bold`, `commands.italic`, `commands.code`, `mathCommand`, `commands.title1`, `commands.unorderedListCommand`, `commands.link`, `imageUrlCommand` — needs human confirmation of button function |
| 11 | User can set card metadata (title, tags via chips, difficulty select, language input) in a form above the editor | VERIFIED (human gate) | `MetadataForm.tsx` renders all four fields; `TagInput.tsx` handles chip add/remove with Enter/Backspace; needs human confirmation |
| 12 | User can save a card and receive toast confirmation | VERIFIED (human gate) | `CardContext.saveCard` calls `toast.success(t('card.saveSuccess'))`; `CardContext.createCard` calls `toast.success(t('card.createSuccess'))` — needs human confirmation of toast display |
| 13 | User can delete a card with confirmation dialog and receive toast feedback | VERIFIED (human gate) | `CardEditor` renders `ConfirmDialog` with variant="danger"; `deleteCard` calls `toast.success(t('card.deleteSuccess'))` |
| 14 | Filename derives from title (slugified) until first save, then freezes | VERIFIED | `CardEditor` `derivedFilename` computed from `slugify(frontmatter.title)` when `!hasBeenSaved`; after save, `currentFilename` is set and `hasBeenSaved = true` |

**Score: 14/14 truths verified** (8 fully automated, 6 confirmed structurally with human gate for interactive behaviour)

---

### Required Artifacts

#### Plan 39-01 Artifacts

| Artifact | Min Lines | Actual Lines | Status | Details |
|----------|-----------|--------------|--------|---------|
| `apps/deck-builder/src/lib/frontmatter.ts` | — | 79 | VERIFIED | Exports `parseCard`, `serializeCard`, `generateCardTemplate`; uses `yaml` (replaced gray-matter for browser compatibility) |
| `apps/deck-builder/src/lib/card-validation.ts` | — | 40 | VERIFIED | Exports `slugify`, `validateCardTitle`, `MAX_CARD_TITLE_LENGTH` |
| `apps/deck-builder/src/lib/__tests__/frontmatter.test.ts` | — | 95 | VERIFIED | 8 tests, all pass |
| `apps/deck-builder/src/lib/__tests__/card-validation.test.ts` | — | 47 | VERIFIED | 10 tests, all pass |
| `apps/deck-builder/src/contexts/CardContext.tsx` | — | 229 | VERIFIED | Exports `CardProvider`, `useCard`; implements `cards`, `selectedCard`, `loading`, `saving`, `selectCard`, `createCard`, `saveCard`, `deleteCard`, `refreshCards` |

#### Plan 39-02 Artifacts

| Artifact | Min Lines | Actual Lines | Status | Details |
|----------|-----------|--------------|--------|---------|
| `apps/deck-builder/src/components/TagInput.tsx` | 30 | 92 | VERIFIED | Chip add (Enter), remove (X button), Backspace-last; auto-sanitize to lowercase/hyphenated |
| `apps/deck-builder/src/components/MetadataForm.tsx` | 50 | 143 | VERIFIED | Collapsible; title input with validation, TagInput, difficulty select (Easy/Medium/Hard), language input; all i18n |
| `apps/deck-builder/src/components/CardListPanel.tsx` | 40 | 129 | VERIFIED | Card rows, 2-tag badges, difficulty labels (color-coded), empty/loading states, New Card button |
| `apps/deck-builder/src/components/CardEditor.tsx` | 100 | 379 | VERIFIED | MDEditor + 8 toolbar commands + KaTeX preview + responsive + save/delete flow with SHA tracking |
| `apps/deck-builder/src/components/DeckDetailPanel.tsx` | — | 270 | VERIFIED | Mail-client layout: deck header + `CardListPanel` + `CardEditor`; desktop side-by-side, mobile stack with back button |
| `apps/deck-builder/src/i18n/en.ts` | contains "card:" | yes | VERIFIED | `card:` section at line 94; 46 keys covering card CRUD, metadata labels, difficulty labels, editor tabs, toolbar tooltips, validation errors, toasts |
| `apps/deck-builder/src/i18n/it.ts` | contains "card:" | yes | VERIFIED | `card:` section at line 94; full Italian translation of all 46 keys |

---

### Key Link Verification

#### Plan 39-01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `frontmatter.ts` | `@lumio/shared CardFrontmatter` | `import type` | WIRED | Line 2: `import type { CardFrontmatter } from '@lumio/shared'` |
| `frontmatter.ts` | `yaml` (replaced gray-matter) | `import { parse, stringify }` | WIRED | Line 1: `import { parse as yamlParse, stringify as yamlStringify } from 'yaml'` — gray-matter replaced due to browser Buffer incompatibility |
| `CardContext.tsx` | `lib/api.ts` | `listFiles, commitFile, deleteFile` | WIRED | Lines 11-12: `import * as api from '../lib/api'`; all three functions called |
| `CardContext.tsx` | `DeckContext.tsx` | `useDeck()` for selectedDeck | WIRED | Line 13: `import { useDeck } from './DeckContext'`; used at line 74 |

#### Plan 39-02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `CardEditor.tsx` | `@uiw/react-md-editor` | `MDEditor` component with commands API | WIRED | Line 2: `import MDEditor, { commands, type ICommand } from '@uiw/react-md-editor'` |
| `CardEditor.tsx` | `lib/frontmatter.ts` | `parseCard, serializeCard, generateCardTemplate` | WIRED | Line 10: `import { parseCard, serializeCard, generateCardTemplate } from '../lib/frontmatter'` |
| `CardEditor.tsx` | `CardContext.tsx` | `useCard()` for save/delete/create | WIRED | Line 6: `import { useCard }` used at line 89 |
| `CardListPanel.tsx` | `CardContext.tsx` | `useCard()` for cards list and selection | WIRED | Line 2: `import { useCard }`; used at line 20 |
| `MetadataForm.tsx` | `TagInput.tsx` | `TagInput` component for tags field | WIRED | Line 5: `import TagInput from './TagInput'`; rendered at line 94 |
| `DeckDetailPanel.tsx` | `CardListPanel.tsx` | Renders in flex layout | WIRED | Line 7: `import CardListPanel from './CardListPanel'`; rendered in mail-client layout |

**Note on gray-matter key link:** Plan 39-01 specified `pattern: "import matter from 'gray-matter'"`. The implementation replaced gray-matter with the `yaml` package due to browser Buffer incompatibility (documented in fix commit `5eaa7ef`). The underlying requirement (frontmatter parse/serialize) is fully satisfied by the `yaml` implementation. This is an approved deviation, not a gap.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CARD-01 | 39-01, 39-02 | User can create a new card with markdown content in a deck | SATISFIED | `CardContext.createCard` + `CardEditor` new card flow with `generateCardTemplate` |
| CARD-02 | 39-01, 39-02 | User can edit an existing card's markdown content | SATISFIED | `CardEditor` loads via `getFile`, edits in MDEditor, saves via `saveCard` |
| CARD-03 | 39-02 | User can delete a card with confirmation dialog | SATISFIED | `CardEditor` `ConfirmDialog` + `deleteCard` with toast |
| CARD-04 | 39-01, 39-02 | User can set card metadata via structured form (title, tags, difficulty, language) | SATISFIED | `MetadataForm.tsx` with `TagInput.tsx`; all four fields wired |
| CARD-05 | 39-01, 39-02 | New card starts with pre-filled template (frontmatter + placeholder body) | SATISFIED | `generateCardTemplate(locale)` called in `CardEditor` on `isCreatingNew` |
| CARD-06 | 39-01, 39-02 | User can see list of cards within a deck | SATISFIED | `CardListPanel.tsx` renders card rows from `useCard().cards` |
| EDIT-01 | 39-02 | Markdown editor with live preview (split-pane or toggle) | SATISFIED | MDEditor `preview='live'` on desktop, controlled toggle on mobile |
| EDIT-02 | 39-02 | Toolbar with buttons for bold, italic, code block, math block, heading, list | SATISFIED | 8-command `toolbarCommands` array in `CardEditor`; includes 2 custom commands (math, image) |
| EDIT-03 | 39-02 | User receives toast feedback on successful save or error | SATISFIED | `CardContext.saveCard`, `createCard`, `deleteCard` all call `toast.success` / `toast.error` |

**All 9 phase 39 requirements satisfied.**

No orphaned requirements: all requirements listed for Phase 39 in REQUIREMENTS.md (CARD-01 through CARD-06, EDIT-01 through EDIT-03) are claimed and implemented by Plans 39-01 and 39-02.

---

### Anti-Patterns Found

No blockers or warnings found. Scan of all 9 key created/modified files found:

- No TODO, FIXME, or PLACEHOLDER comments
- No empty handler stubs (`onClick={() => {}}` or similar)
- No API routes returning static empty arrays
- No state that exists but is never rendered

The one "anti-pattern candidate" noted: `CardContext.createCard` contains a `return prev;` comment block (lines 136-141) that looks odd but is intentional — it uses a `setTimeout` micro-task pattern to auto-select the newly created card after `refreshCards` completes. This is a documented architectural decision, not a stub.

---

### Human Verification Required

#### 1. Complete Card Authoring UI — End-to-End

**Test:** Start dev server (`cd apps/deck-builder && pnpm dev`), open http://localhost:5173, log in, select a deck.

**Expected:**
1. Mail-client layout visible: narrow card list on left (fixed width), editor area on right.
2. Click "New Card" — editor pre-fills with template (code block, math block visible in body area).
3. Type a title — filename display below updates in real time (e.g., typing "My Card" shows "my-card.md").
4. Add tags via Enter, remove with X or Backspace. Tags appear as chips.
5. Select difficulty from dropdown; verify Easy/Medium/Hard map to 1/3/5.
6. Language field is pre-populated from locale.
7. MDEditor shows split-pane on desktop (>= 1024 px); edit and preview side by side.
8. Each of the 8 toolbar buttons inserts correct markdown (bold `**`, italic `*`, backtick code, `$$...$$` math block, `# ` heading, `- ` list, `[](url)` link, `![alt](https://)` image).
9. Math block (`$$ x^2 $$`) renders via KaTeX in the preview pane.
10. Click Save — toast "Card saved" appears; card appears in left panel.
11. Click the saved card in the list — content and metadata load into the editor; filename is now frozen.
12. Edit content and save again — filename does NOT change.
13. Create and then delete a second card — confirm dialog appears (danger styling), delete removes card from list, toast "Card deleted" appears.
14. Card count in sidebar and header header updates after each create/delete.
15. Toggle dark mode — MDEditor switches color scheme.
16. Switch app language to Italian — all card UI labels update ("Nuova Card", "Salva", "Metadati", etc.).
17. Resize browser to mobile width — Edit/Preview toggle tabs appear above editor; card list and editor display one at a time with a back button.

**Why human:** Visual rendering, KaTeX math display, MDEditor toolbar insertion behaviour, toast display timing, responsive breakpoint behaviour, and dark mode CSS switching cannot be verified programmatically.

---

### Summary

Phase 39 goal is structurally achieved. All 14 observable truths are verified at code level:

- **Utility layer (Plan 39-01):** `frontmatter.ts` (79 lines, yaml-based), `card-validation.ts` (40 lines), and their 18 unit tests all pass. `CardContext.tsx` (229 lines) wires CRUD operations to the API layer and integrates with `DeckContext`.

- **UI layer (Plan 39-02):** `TagInput.tsx` (92 lines), `MetadataForm.tsx` (143 lines), `CardListPanel.tsx` (129 lines), `CardEditor.tsx` (379 lines), and `DeckDetailPanel.tsx` (270 lines) all exist, are substantive, and are correctly wired. The MDEditor is configured with 8 toolbar commands, KaTeX preview, responsive split/toggle, dark mode support, and full save/delete flow with SHA tracking.

- **i18n:** Both `en.ts` and `it.ts` contain the full `card:` section with 46 keys each, covering all user-facing strings.

- **Tests:** 100/100 tests pass. TypeScript compiles with no errors. All 7 commits from both plans verified in git log.

- **Key deviation:** gray-matter was replaced with the `yaml` package (commit `5eaa7ef`) due to browser `Buffer` incompatibility. The fix is correct and complete; no residual issue.

The only remaining gate is human verification of interactive/visual behaviour (Task 3 of Plan 39-02, which is already marked as a `checkpoint:human-verify` in the plan).

---

_Verified: 2026-03-12T19:20:00Z_
_Verifier: Claude (gsd-verifier)_
