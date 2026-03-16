# Phase 43: Deck Builder Metadata - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Metadata authoring UI in the deck builder web app. Deck authors can fill in display name, description, tags, and language via a form, save it as deck.yaml to the shared repo via commit_yaml, and have existing deck.yaml loaded when selecting a deck. This feeds the discovery pipeline (deck_index populated by docora-webhook).

</domain>

<decisions>
## Implementation Decisions

### Form placement & layout
- Collapsible section in DeckDetailPanel header, positioned between the deck name/actions row and the card list
- Collapsed by default when selecting a deck — card authoring is the primary task
- Same collapsible behavior on mobile (narrow viewport) — no separate mobile pattern
- New `DeckMetadataForm` component (separate from existing card `MetadataForm` — different data shape). Reuses `TagInput` for tags

### Save behavior
- Explicit "Save Metadata" button at the bottom of the form
- Button disabled until form is dirty (changes from loaded state) AND valid (required fields filled)
- Calls `commit_yaml` action via edge function on click
- Success/error feedback via react-hot-toast (consistent with deck create/rename/delete)
- Unsaved metadata changes discarded silently when switching to a different deck — no confirm dialog
- Client-side validation: save disabled when display_name or description is empty. Server validates language whitelist and tag limits

### Field UX details
- **Display name**: Text input, pre-filled from folder name when no deck.yaml exists, fully editable independently of folder name. Required (red asterisk)
- **Description**: Textarea with 3 visible rows, expandable by dragging. Required (red asterisk)
- **Tags**: Reuses existing TagInput component with same sanitization (lowercase, spaces→dashes, max 5 per Phase 42 validation). Optional
- **Language**: Dropdown select with 11 ISO 639-1 codes from Phase 42 whitelist (it, en, es, fr, de, pt, ja, zh, ko, ru, ar). Default: 'en'. Optional
- **Author**: Not shown in form — server-enforced from user profile (Phase 42 decision)
- Red asterisk indicator on required fields (display_name, description)

### Loading & error states
- Fetch existing deck.yaml on deck selection (parallel with card list fetch) via `getFile('{deckName}/deck.yaml')`
- If found: parse YAML, populate form fields
- If 404: show empty form (pre-fill display_name from folder name)
- While loading: disabled form with small spinner
- Fetch error (not 404): error toast, show empty form so user can still create metadata
- Save error: error toast, form stays dirty with values intact so user can fix and retry

### Claude's Discretion
- Exact spinner placement and styling
- YAML parsing approach on the client side (reuse existing frontmatter parser or lightweight approach)
- i18n key organization for new deck metadata strings
- Whether to add a `commitYaml` function to api.ts or extend the existing `invoke` pattern
- Dirty state tracking implementation (ref comparison, JSON diff, or simple changed flag)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TagInput` component (`src/components/TagInput.tsx`): Tag input with sanitization, Enter to add, Backspace to remove. Directly reusable for deck tags
- `DeckDetailPanel` (`src/components/DeckDetailPanel.tsx`): Target for integration — collapsible metadata section goes between header and card list area
- `api.ts` `getFile()`: Can fetch deck.yaml content. Needs new `commitYaml()` function wrapping the `commit_yaml` action
- `DeckContext`: Provides `selectedDeck` (name, path) — DeckMetadataForm reads from this
- `react-hot-toast`: Already configured at app root for success/error toasts
- `ConfirmDialog`: Available if needed but not used for metadata (silent discard on deck switch)

### Established Patterns
- Collapsible sections: Card `MetadataForm` uses `useState(false)` for collapsed state with chevron toggle button
- Form styling: `rounded-lg border border-lumio-border bg-lumio-surface` container, `lumio-bg` input backgrounds, `lumio-primary` focus rings
- Edge function calls: `invoke<T>({ action, ...params })` pattern in api.ts
- Toast pattern: `toast.success(t('key'))` / `toast.error(err.message)` in context callbacks
- i18n: Keys in `src/i18n/en.ts` and `src/i18n/it.ts`, accessed via `useI18n().t()`

### Integration Points
- `DeckDetailPanel` header section: Insert `DeckMetadataForm` between the stats row and the card list area
- `api.ts`: Add `commitYaml(deckName, metadata)` function using `commit_yaml` action
- `api.ts`: Use existing `getFile()` to fetch deck.yaml on deck selection
- `DeckContext` or local state: Manage metadata loading state and cached values per deck
- `i18n/en.ts` and `i18n/it.ts`: New keys for form labels, placeholders, save button, toasts

</code_context>

<specifics>
## Specific Ideas

- The form mirrors the card MetadataForm's collapsible pattern — both use the same chevron toggle, border, and surface styling for visual consistency
- Display name pre-filled from folder name is a convenience — folder "italian-vocab" becomes display_name "italian-vocab", user can change to "Italian Vocabulary"
- No category field — Phase 41 decided categories emerge from tags. Mobile chip bar (Phase 44) will show top 10 most-used tags dynamically

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 43-deck-builder-metadata*
*Context gathered: 2026-03-13*
