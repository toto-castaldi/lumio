# Phase 43: Deck Builder Metadata - Research

**Researched:** 2026-03-13
**Domain:** Deck builder web app (Vite/React SPA) -- metadata authoring form + API integration
**Confidence:** HIGH

## Summary

This phase adds a metadata authoring form to the deck builder web app, allowing deck authors to set display name, description, tags, and language for their decks. The form saves data as `deck.yaml` via the existing `commit_yaml` edge function action (built in Phase 42) and loads existing `deck.yaml` when a deck is selected.

The codebase is well-established with clear patterns: collapsible form sections (MetadataForm for cards), tag input (TagInput component), API layer (api.ts with invoke pattern), and i18n (en.ts/it.ts). The primary implementation challenge is a **path validation gap**: the existing `get_file` edge function action enforces `.md`-only extensions via `validateUserPath()`, so fetching `deck.yaml` requires either a new `get_yaml` server action or relaxing the path validation. This is the most critical finding.

**Primary recommendation:** Add a `get_yaml` action to the deck-commit edge function that constructs the path from `deck_name` (like `commit_yaml` does), avoiding `validateUserPath()`. Then build a `DeckMetadataForm` component following the card `MetadataForm` pattern, with a `commitYaml()` API function and a `getDeckYaml()` API function.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Collapsible section in DeckDetailPanel header, positioned between the deck name/actions row and the card list
- Collapsed by default when selecting a deck -- card authoring is the primary task
- Same collapsible behavior on mobile (narrow viewport) -- no separate mobile pattern
- New `DeckMetadataForm` component (separate from existing card MetadataForm -- different data shape). Reuses `TagInput` for tags
- Explicit "Save Metadata" button at the bottom of the form
- Button disabled until form is dirty AND valid (required fields filled)
- Calls `commit_yaml` action via edge function on click
- Success/error feedback via react-hot-toast
- Unsaved metadata changes discarded silently when switching to a different deck -- no confirm dialog
- Client-side validation: save disabled when display_name or description is empty. Server validates language whitelist and tag limits
- Display name: Text input, pre-filled from folder name when no deck.yaml exists, fully editable. Required (red asterisk)
- Description: Textarea with 3 visible rows, expandable by dragging. Required (red asterisk)
- Tags: Reuses existing TagInput component. Optional. Max 5 (server-enforced)
- Language: Dropdown select with 11 ISO 639-1 codes. Default: 'en'. Optional
- Author: Not shown in form -- server-enforced from user profile
- Red asterisk indicator on required fields
- Fetch existing deck.yaml on deck selection (parallel with card list fetch) via getFile
- If found: parse YAML, populate form fields. If 404: show empty form (pre-fill display_name from folder name)
- While loading: disabled form with small spinner
- Fetch error (not 404): error toast, show empty form
- Save error: error toast, form stays dirty

### Claude's Discretion
- Exact spinner placement and styling
- YAML parsing approach on the client side (reuse existing frontmatter parser or lightweight approach)
- i18n key organization for new deck metadata strings
- Whether to add a `commitYaml` function to api.ts or extend the existing `invoke` pattern
- Dirty state tracking implementation (ref comparison, JSON diff, or simple changed flag)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DKBL-01 | User can set deck metadata (display name, description, category, tags) via a form in the deck builder | DeckMetadataForm component with collapsible section pattern; TagInput reuse; language dropdown with LANGUAGE_WHITELIST; client-side validation |
| DKBL-02 | User can save deck metadata as deck.yaml in the deck folder | `commitYaml()` API function calling `commit_yaml` edge function action; server handles YAML serialization and author enforcement |
| DKBL-03 | Deck builder loads existing deck.yaml when selecting a deck | New `get_yaml` edge function action (or `getDeckYaml()` API function); parallel fetch on deck selection; YAML parse with existing `yaml` package |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.1.0 | UI framework | Already in use |
| yaml | 2.8.2 | YAML parsing on client | Already in deck-builder dependencies, used in frontmatter.ts |
| react-hot-toast | 2.5.2 | Toast notifications | Already configured at app root |
| @supabase/supabase-js | 2.45.0 | Edge function invocation | Already in use via api.ts invoke pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tailwindcss | 4.2.1 | Styling | All UI components, using lumio-* design tokens |
| vitest | 4.0.0 | Testing | Unit tests for api functions and YAML parsing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `yaml` npm package | Manual string parsing | yaml package already available and proven; manual parsing error-prone for edge cases |
| Separate DeckMetadataForm | Extending existing MetadataForm | Different data shapes (CardFrontmatter vs DeckYamlMetadata); separate component is cleaner |

**Installation:** No new packages needed. All dependencies already present.

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    DeckMetadataForm.tsx    # NEW: collapsible metadata form
  lib/
    api.ts                  # MODIFIED: add commitYaml() and getDeckYaml()
    __tests__/
      api.test.ts           # MODIFIED: add tests for new API functions
  i18n/
    en.ts                   # MODIFIED: add deckMeta.* keys
    it.ts                   # MODIFIED: add deckMeta.* keys
supabase/
  functions/
    deck-commit/
      index.ts              # MODIFIED: add get_yaml action
```

### Pattern 1: Collapsible Section (from existing MetadataForm)
**What:** A collapsible form section with chevron toggle, border, and surface styling
**When to use:** For secondary content in DeckDetailPanel
**Example:**
```typescript
// Source: apps/deck-builder/src/components/MetadataForm.tsx
const [collapsed, setCollapsed] = useState(true); // collapsed by default per locked decision

return (
  <div className="rounded-lg border border-lumio-border bg-lumio-surface">
    <button
      type="button"
      onClick={() => setCollapsed(!collapsed)}
      className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-lumio-text hover:bg-lumio-border/20"
    >
      <span>{t('deckMeta.metadata')}</span>
      <svg
        className={`h-4 w-4 text-lumio-text-secondary transition-transform ${collapsed ? '' : 'rotate-180'}`}
        // ... chevron SVG
      />
    </button>
    {!collapsed && (
      <div className="space-y-4 border-t border-lumio-border px-4 pb-4 pt-3">
        {/* Form fields */}
      </div>
    )}
  </div>
);
```

### Pattern 2: API Invoke Pattern (from existing api.ts)
**What:** Thin wrapper functions calling the `invoke<T>()` helper
**When to use:** For new edge function actions
**Example:**
```typescript
// Source: apps/deck-builder/src/lib/api.ts
export async function commitYaml(
  deckName: string,
  metadata: { display_name: string; description: string; tags: string[]; language: string },
): Promise<CommitResult> {
  const data = await invoke<{ sha: string; commit_sha: string }>({
    action: 'commit_yaml',
    deck_name: deckName,
    ...metadata,
  });
  return { sha: data.sha, commit_sha: data.commit_sha };
}
```

### Pattern 3: Toast Feedback (from DeckContext)
**What:** Success/error toasts with i18n keys
**When to use:** After save/load operations
**Example:**
```typescript
// Source: apps/deck-builder/src/contexts/DeckContext.tsx
try {
  await api.commitYaml(deckName, metadata);
  toast.success(t('deckMeta.saveSuccess'));
} catch (err) {
  toast.error(err instanceof Error ? err.message : t('common.error'));
}
```

### Pattern 4: Dirty State Tracking
**What:** Compare current form values to loaded values to determine if save button should be enabled
**When to use:** For the save button disabled state
**Recommendation:** Use JSON.stringify comparison of current vs. loaded state. Simple, reliable, no external dependency.
```typescript
const loadedRef = useRef<string>('');
const currentJson = JSON.stringify({ display_name, description, tags, language });
const isDirty = currentJson !== loadedRef.current;
const isValid = display_name.trim().length > 0 && description.trim().length > 0;
const canSave = isDirty && isValid;
```

### Anti-Patterns to Avoid
- **Using `getFile()` for deck.yaml:** The existing `get_file` edge function action validates `.md` extension only. deck.yaml will be rejected with "Only .md files are supported". Must use a new action.
- **Building YAML on the client:** The server already has `serializeYaml()` in commit_yaml. Client should send structured data, not YAML strings.
- **Storing metadata in DeckContext:** Metadata is per-deck and only needed when viewing the detail panel. Keep it local to `DeckMetadataForm` component state to avoid polluting context.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing | Custom string parser | `yaml` package's `parse()` (already imported) | Edge cases with special chars, multi-line strings |
| Tag sanitization | Custom tag logic | Existing `TagInput` component | Already handles lowercase, spaces-to-dashes, dedup |
| Toast notifications | Custom notification system | `react-hot-toast` (already configured) | Consistent with rest of app |
| YAML serialization | Client-side YAML builder | Server's `commit_yaml` action | Server handles serialization, author injection, validation |

**Key insight:** The server-side `commit_yaml` action handles all the hard work (YAML serialization, author resolution, validation, tag normalization). The client just needs to send structured data and parse the response.

## Common Pitfalls

### Pitfall 1: get_file Rejects .yaml Files
**What goes wrong:** Calling `api.getFile('{deckName}/deck.yaml')` returns a 403 error because `validateUserPath()` only allows `.md` files.
**Why it happens:** Path validation in deck-commit was designed for card files only. The `commit_yaml` action bypasses this by constructing paths internally, but `get_file` uses the strict validator.
**How to avoid:** Add a new `get_yaml` action to deck-commit that takes `deck_name`, constructs `${userId}/${deckName}/deck.yaml` internally (like `commit_yaml`), and calls the internal `getFile()` GitHub helper directly.
**Warning signs:** 403 error with message "Only .md files are supported" when trying to load metadata.

### Pitfall 2: Race Condition on Deck Switch
**What goes wrong:** User switches decks rapidly. The metadata fetch for deck A completes after switching to deck B, populating the form with deck A's data.
**Why it happens:** Async fetch without cancellation when deck changes.
**How to avoid:** Use an AbortController or stale-closure check pattern (track `selectedDeck.name` at fetch start, compare on completion). The existing `CardContext` uses a `let cancelled = false` pattern in its useEffect.
**Warning signs:** Form shows metadata from a previously selected deck.

### Pitfall 3: 404 vs Error Confusion
**What goes wrong:** A deck with no deck.yaml returns 404 from get_yaml. If treated as an error, users see error toasts for every new deck.
**Why it happens:** 404 is the expected case for new decks.
**How to avoid:** Distinguish 404 (show empty form, pre-fill display_name from folder name) from other errors (show toast + empty form). The edge function returns different status codes: 404 for not found, 500 for server errors.
**Warning signs:** Error toasts appearing when selecting newly created decks.

### Pitfall 4: Stale SHA on Save
**What goes wrong:** User loads metadata, another process updates the deck.yaml (e.g., from a different tab), then user saves. GitHub rejects the commit because the SHA doesn't match.
**Why it happens:** The SHA from the initial load is outdated.
**How to avoid:** The `commit_yaml` server action already handles this: it fetches the current SHA from GitHub internally before committing (`const existing = await getFile(yamlPath)`). The client does NOT need to track or send SHA. This is already correctly implemented.
**Warning signs:** None expected -- server handles it.

### Pitfall 5: i18n Key Misalignment
**What goes wrong:** Missing translations in it.ts cause fallback to key names showing in UI.
**Why it happens:** Adding keys to en.ts but forgetting it.ts.
**How to avoid:** Always add keys to both en.ts and it.ts in the same task. The i18n test (`__tests__/i18n.test.ts`) likely checks key parity.
**Warning signs:** Raw key strings like "deckMeta.displayName" visible in UI.

## Code Examples

### Fetching deck.yaml (New get_yaml Action on Server)
```typescript
// In supabase/functions/deck-commit/index.ts, new case in switch:
case "get_yaml": {
  const { deck_name } = body;
  if (!deck_name || typeof deck_name !== "string") {
    return new Response(
      JSON.stringify({ error: "Missing required field: deck_name" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
  const trimmedDeckName = deck_name.trim();
  const deckNameError = validateDeckName(trimmedDeckName);
  if (deckNameError) {
    return new Response(
      JSON.stringify({ error: deckNameError }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
  const yamlPath = `${userId}/${trimmedDeckName}/deck.yaml`;
  const file = await getFile(yamlPath);
  if (!file) {
    return new Response(
      JSON.stringify({ error: "File not found" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
    );
  }
  return new Response(
    JSON.stringify({ success: true, content: file.content, sha: file.sha }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
}
```

### Client API Functions
```typescript
// In apps/deck-builder/src/lib/api.ts:
export interface DeckMetadata {
  display_name: string;
  description: string;
  tags: string[];
  language: string;
}

/** Fetch deck.yaml content for a deck */
export async function getDeckYaml(deckName: string): Promise<{ content: string; sha: string } | null> {
  try {
    const data = await invoke<{ content: string; sha: string }>({
      action: 'get_yaml', deck_name: deckName,
    });
    return { content: data.content, sha: data.sha };
  } catch (err) {
    if (err instanceof Error && err.message === 'File not found') return null;
    throw err;
  }
}

/** Save deck metadata as deck.yaml */
export async function commitYaml(deckName: string, metadata: DeckMetadata): Promise<CommitResult> {
  const data = await invoke<{ sha: string; commit_sha: string }>({
    action: 'commit_yaml',
    deck_name: deckName,
    ...metadata,
  });
  return { sha: data.sha, commit_sha: data.commit_sha };
}
```

### YAML Parsing on Client
```typescript
// In DeckMetadataForm component:
import { parse as yamlParse } from 'yaml';

function parseDeckYaml(content: string): DeckMetadata {
  const data = yamlParse(content) ?? {};
  return {
    display_name: typeof data.display_name === 'string' ? data.display_name : '',
    description: typeof data.description === 'string' ? data.description : '',
    tags: Array.isArray(data.tags) ? data.tags.filter((t: unknown): t is string => typeof t === 'string') : [],
    language: typeof data.language === 'string' ? data.language : 'en',
  };
}
```

### Language Dropdown
```typescript
// ISO 639-1 codes matching server's LANGUAGE_WHITELIST
const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'it', label: 'Italiano' },
  { value: 'es', label: 'Espanol' },
  { value: 'fr', label: 'Francais' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Portugues' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
] as const;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| get_file for all files | get_file restricted to .md only | Phase 37 (original deck-commit) | deck.yaml needs separate action |
| Manual YAML string building (server) | serializeYaml() helper | Phase 42 | Client sends structured data, not YAML |
| Category field in metadata | No category -- categories emerge from tags | Phase 41 decision | No category dropdown needed in form |

**Deprecated/outdated:**
- None relevant to this phase

## Open Questions

1. **Error message handling for getDeckYaml 404**
   - What we know: The `invoke` helper throws on data-level errors (`data?.error`). The edge function returns `{ error: "File not found" }` with status 404. The Supabase client may surface this differently than a 200 with error in body.
   - What's unclear: Whether the Supabase `functions.invoke()` translates HTTP 404 into `error` or into `data.error`. Need to verify.
   - Recommendation: Handle both paths in `getDeckYaml()`. Check if error message contains "File not found" or if data is null with 404-like error. Test empirically.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.0.0 |
| Config file | apps/deck-builder/vitest.config.ts |
| Quick run command | `pnpm --filter @lumio/deck-builder test` |
| Full suite command | `pnpm --filter @lumio/deck-builder test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DKBL-01 | Form fields render and accept input | manual-only | N/A (component rendering requires React test utils not in current config) | N/A |
| DKBL-02 | commitYaml API function sends correct payload | unit | `pnpm --filter @lumio/deck-builder exec -- npx vitest run src/lib/__tests__/api.test.ts` | Exists (needs new tests) |
| DKBL-03 | getDeckYaml API function handles 404 and success | unit | `pnpm --filter @lumio/deck-builder exec -- npx vitest run src/lib/__tests__/api.test.ts` | Exists (needs new tests) |

### Sampling Rate
- **Per task commit:** `pnpm --filter @lumio/deck-builder test`
- **Per wave merge:** `pnpm --filter @lumio/deck-builder test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/api.test.ts` -- add tests for `commitYaml()` and `getDeckYaml()` functions
- [ ] No new test files needed -- extend existing api.test.ts

*(Existing test infrastructure covers all phase requirements with extensions)*

## Sources

### Primary (HIGH confidence)
- `apps/deck-builder/src/lib/api.ts` -- existing invoke pattern, getFile, commitFile functions
- `apps/deck-builder/src/components/MetadataForm.tsx` -- collapsible section pattern, form styling
- `apps/deck-builder/src/components/TagInput.tsx` -- tag input component, sanitization logic
- `apps/deck-builder/src/components/DeckDetailPanel.tsx` -- integration point, layout structure
- `apps/deck-builder/src/contexts/DeckContext.tsx` -- deck selection, toast pattern
- `apps/deck-builder/src/lib/frontmatter.ts` -- yaml package import, parsing pattern
- `supabase/functions/deck-commit/index.ts` -- commit_yaml action, get_file .md validation, validateUserPath
- `apps/deck-builder/src/i18n/en.ts` / `it.ts` -- i18n key structure
- `apps/deck-builder/package.json` -- yaml 2.8.2 dependency confirmed

### Secondary (MEDIUM confidence)
- `supabase/functions/docora-webhook/index.ts` -- deck.yaml expected format and field names

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, verified in package.json and source files
- Architecture: HIGH - all patterns observed directly in existing codebase
- Pitfalls: HIGH - get_file .md restriction verified by reading validateUserPath() source code line-by-line

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable codebase, no external dependency changes expected)
