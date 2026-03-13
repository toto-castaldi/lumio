# Phase 39: Card Authoring - Research

**Researched:** 2026-03-12
**Domain:** Markdown editor integration, frontmatter parsing, card CRUD operations
**Confidence:** HIGH

## Summary

Phase 39 builds on the fully operational deck management layer (Phase 38) and the edge function API (Phase 37) to add card-level CRUD with a markdown editor, live preview, metadata form, and toolbar. The foundational API layer (`commitFile`, `deleteFile`, `getFile`, `listFiles`) already exists in `api.ts` and requires zero backend changes -- this phase is entirely frontend.

The primary integration is `@uiw/react-md-editor` v4, which provides a textarea-based markdown editor with built-in toolbar command system, split-pane live preview (`preview="live"`), and `data-color-mode` support for dark theme. Frontmatter parsing/serialization uses `gray-matter` (standard in the JS/markdown ecosystem, 4.0.3). KaTeX math rendering in preview uses `katex` + a custom `code` component in `previewOptions` (the approach documented by the library itself -- not rehype plugins).

**Primary recommendation:** Use `@uiw/react-md-editor` v4 with its built-in toolbar commands for 6 of 8 buttons, two custom commands for math block and image URL, `gray-matter` for frontmatter extraction/serialization, and a `CardContext` for card state management (parallel to existing `DeckContext` pattern).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Split-pane on desktop (editor left, preview right); Edit/Preview toggle tabs on narrow screens
- Card list panel as narrow left panel alongside editor (mail client pattern)
- 8 toolbar buttons: bold, italic, code block, math block (KaTeX), heading, list, link, image URL
- Leverage @uiw/react-md-editor built-in toolbar API
- Tags input: chip/badge pattern (type, Enter to add, X to remove)
- Difficulty: 3-level labeled select (Easy/Medium/Hard mapped to 1/3/5)
- Language: free text input, default from app locale
- Difficulty default: unset, user must explicitly choose before saving
- Card deletion: reuse ConfirmDialog with danger variant
- Filename from slugified title, updates until first save
- Pre-filled frontmatter template with defaults; template body includes example content
- Manual save only (no autosave), wait for server response (no optimistic updates)
- Toast feedback on save success/error (EDIT-03)
- Save commits via `commitFile()` in api.ts

### Claude's Discretion
- Metadata form placement (above editor, collapsible panel, or other)
- "New Card" button placement (top of card list, in deck header, or floating)
- Loading state design during save/load operations
- Empty state when deck has no cards (CTA design)
- Exact responsive breakpoint for split-pane to toggle tabs transition
- Card list panel width and resize behavior
- Unsaved changes warning (navigate away with edits)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CARD-01 | User can create a new card with markdown content in a deck | `commitFile()` API exists, frontmatter template generation via gray-matter stringify, filename slugification |
| CARD-02 | User can edit an existing card's markdown content | `getFile()` loads content + SHA, `commitFile()` with SHA updates, gray-matter parses frontmatter from loaded content |
| CARD-03 | User can delete a card with confirmation dialog | `deleteFile()` API exists, ConfirmDialog component reusable with danger variant |
| CARD-04 | User can set card metadata via structured form (title, tags, difficulty, language) | gray-matter stringify merges form data into frontmatter, CardFrontmatter type from @lumio/shared |
| CARD-05 | New card starts with pre-filled template (frontmatter + placeholder body) | Template generation function combining default frontmatter + example markdown body |
| CARD-06 | User can see list of cards within a deck | `listFiles()` API exists, card list panel component with title/tags/difficulty display |
| EDIT-01 | Markdown editor with live preview (split-pane or toggle) | @uiw/react-md-editor `preview="live"` for desktop, controlled `preview` prop toggled for mobile |
| EDIT-02 | Toolbar with buttons for bold, italic, code block, math block, heading, list | 6 built-in commands + 2 custom commands (math, image URL) via editor commands API |
| EDIT-03 | User receives toast feedback on successful save or error | react-hot-toast already installed and wired, same pattern as DeckContext |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @uiw/react-md-editor | 4.0.11 | Markdown editor with toolbar + live preview | Planned in roadmap, widely used React markdown editor with built-in command system |
| gray-matter | 4.0.3 | YAML frontmatter parsing and serialization | De facto standard for frontmatter in JS (used by Gatsby, Astro, Vite, etc.) |
| katex | 0.16.38 | Math/LaTeX rendering in preview | KaTeX is the standard for browser-side math rendering; Lumio mobile already uses it |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hot-toast | 2.5.2 | Toast notifications | Save success/error feedback (EDIT-03) |
| @lumio/shared | workspace | CardFrontmatter type | Type-safe frontmatter handling |
| react-router | 7.x | Navigation | Route guards for unsaved changes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gray-matter | Manual regex frontmatter parsing | gray-matter handles edge cases (multiline values, special chars, arrays) that hand-rolled regex misses |
| katex direct | rehype-katex + remark-math plugins | Direct katex import with custom code component is simpler and matches @uiw/react-md-editor's documented KaTeX example |
| CardContext | Extend DeckContext | Separate context keeps card state isolated, avoids bloating DeckContext; follows existing pattern |

**Installation:**
```bash
cd apps/deck-builder && pnpm add @uiw/react-md-editor@^4.0.11 gray-matter@^4.0.3 katex@^0.16.38
pnpm add -D @types/katex
```

**Note:** gray-matter depends on `js-yaml` internally for YAML parsing. No separate install needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    CardListPanel.tsx       # Narrow left panel: card rows with title/tags/difficulty
    CardEditor.tsx          # Main editor: metadata form + MDEditor + save button
    MetadataForm.tsx        # Structured form: title, tags chips, difficulty select, language
    TagInput.tsx            # Reusable chip/badge tag input component
  contexts/
    CardContext.tsx          # Card list state, CRUD operations, selected card
  lib/
    frontmatter.ts          # Parse/serialize frontmatter with gray-matter, template generator
    card-validation.ts      # validateCardTitle() and pre-save validation
  pages/
    DashboardPage.tsx       # Updated: renders card authoring UI when deck selected
```

### Pattern 1: CardContext (parallels DeckContext)
**What:** React context that manages card list, selected card, loading state, and CRUD operations for the currently selected deck.
**When to use:** Whenever the DeckDetailPanel (now card authoring view) is mounted.
**Key design:** CardContext subscribes to `selectedDeck` from DeckContext. When deck changes, it fetches the card list via `listFiles()`. Exposes: `cards`, `selectedCard`, `loadCard()`, `saveCard()`, `deleteCard()`, `createCard()`.

```typescript
// Card state shape
interface CardState {
  name: string;       // filename e.g. "my-card.md"
  path: string;       // full path e.g. "{userId}/{deckName}/my-card.md"
  sha: string;        // GitHub blob SHA (needed for update/delete)
  title: string;      // extracted from frontmatter
  tags: string[];     // extracted from frontmatter
  difficulty?: number; // extracted from frontmatter
}

interface CardContextType {
  cards: CardState[];
  selectedCard: CardState | null;
  loading: boolean;
  selectCard: (card: CardState | null) => void;
  createCard: (title: string) => Promise<void>;
  saveCard: (path: string, content: string, sha?: string) => Promise<void>;
  deleteCard: (path: string, sha: string) => Promise<void>;
  refreshCards: () => Promise<void>;
}
```

### Pattern 2: Frontmatter Extraction from File List
**What:** When listing cards, extract title/tags/difficulty from each file's content for display in the card list panel.
**When to use:** On deck selection and after any card CRUD operation.
**Key design:** `listFiles()` only returns filenames, not content. Two approaches:
1. **Lazy approach (recommended):** Only fetch full content when a card is selected for editing. For the card list, derive title from filename (strip `.md`, de-slugify). Tags/difficulty shown only after a card has been loaded at least once.
2. **Eager approach:** Fetch all card contents on deck load. Expensive for large decks.

**Recommendation:** Start with lazy approach. The card list shows filename-derived titles. Once a card is opened, cache its frontmatter metadata for richer display. This matches how the DeckContext handles card counts (lightweight).

### Pattern 3: Frontmatter + Body Separation
**What:** gray-matter splits markdown into `{ data: object, content: string }`. On save, gray-matter `stringify()` merges them back.
**When to use:** Every card load and save operation.

```typescript
import matter from 'gray-matter';
import type { CardFrontmatter } from '@lumio/shared';

// Parse: raw markdown -> frontmatter + body
function parseCard(raw: string): { frontmatter: CardFrontmatter; body: string } {
  const { data, content } = matter(raw);
  return {
    frontmatter: data as CardFrontmatter,
    body: content,
  };
}

// Serialize: frontmatter + body -> raw markdown
function serializeCard(frontmatter: CardFrontmatter, body: string): string {
  return matter.stringify(body, frontmatter);
}
```

### Pattern 4: MDEditor Dark Mode Integration
**What:** @uiw/react-md-editor uses `data-color-mode` attribute (not CSS classes) for theming.
**When to use:** On every render of the editor component.
**Key design:** Read `isDark` from `useTheme()` and pass `data-color-mode` prop to MDEditor.

```typescript
import { useTheme } from '../contexts/ThemeContext';

// Inside component:
const { isDark } = useTheme();

<MDEditor
  data-color-mode={isDark ? 'dark' : 'light'}
  value={body}
  onChange={(val) => setBody(val || '')}
  preview="live"
  height={500}
/>
```

### Pattern 5: KaTeX Math Rendering in Preview
**What:** Custom `code` component in `previewOptions` detects `language-math` class and renders with `katex.renderToString()`.
**When to use:** Always -- math blocks are a core feature of Lumio cards.

```typescript
import katex from 'katex';
import 'katex/dist/katex.css';

const previewOptions = {
  components: {
    code: ({ children, className, ...props }: any) => {
      if (typeof children === 'string' && /language-math/.test(className || '')) {
        return (
          <code
            dangerouslySetInnerHTML={{
              __html: katex.renderToString(children, { throwOnError: false }),
            }}
          />
        );
      }
      return <code className={className} {...props}>{children}</code>;
    },
  },
};
```

### Pattern 6: Responsive Editor Layout
**What:** Switch between split-pane (desktop) and toggle tabs (mobile).
**When to use:** Based on viewport width.
**Key design:** Use a media query hook or Tailwind's `lg` breakpoint (1024px, consistent with existing Layout.tsx sidebar breakpoint). On desktop: `preview="live"`. On mobile: controlled `preview` state toggling between `"edit"` and `"preview"`.

```typescript
const [isDesktop, setIsDesktop] = useState(
  () => window.matchMedia('(min-width: 1024px)').matches
);
// ... matchMedia listener

<MDEditor
  preview={isDesktop ? 'live' : editorMode}
  // editorMode toggles between 'edit' and 'preview'
/>
```

### Anti-Patterns to Avoid
- **Storing full card content in context for all cards:** Fetching all card bodies on deck load is slow for large decks. Only fetch on selection.
- **Parsing frontmatter with regex:** gray-matter handles YAML edge cases (quoted strings, multiline, arrays). Regex will break.
- **Autosaving / debounced commits:** Explicitly out of scope. Each save = one GitHub commit. Autosave would flood the repo with commits.
- **Optimistic UI updates:** Locked decision -- wait for server response before updating state.
- **Building custom markdown editor:** @uiw/react-md-editor provides everything needed. Building a custom textarea + preview is months of work.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter parsing | Regex-based `---` splitter | gray-matter | Handles edge cases: multiline values, special characters, nested arrays, empty frontmatter |
| Markdown editor + preview | Custom textarea + marked/remark | @uiw/react-md-editor | Includes toolbar, keyboard shortcuts, split-pane, syntax highlighting, scroll sync |
| Math rendering | Custom LaTeX parser | katex | Battle-tested, handles all LaTeX math syntax, error-tolerant mode |
| Slug generation | Custom regex chain | Simple `toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')` | This IS simple enough to hand-roll (3 lines), but be consistent |
| Tag input with chips | Custom from scratch | Extract TagInput component | Not a library -- extract as reusable component with keyboard handling |

**Key insight:** The markdown editor is the most complex UI component in this phase. @uiw/react-md-editor eliminates 90% of the complexity. The remaining 10% is wiring frontmatter, card state, and the metadata form.

## Common Pitfalls

### Pitfall 1: Stale SHA on Save (409 Conflict)
**What goes wrong:** User loads a card, someone else (or a background process) updates it, user saves with old SHA. GitHub API returns 409 Conflict.
**Why it happens:** The GitHub Contents API requires the current blob SHA for updates. Stale SHA = conflict.
**How to avoid:** On save error with status 409, show a toast explaining the conflict and offer to reload the card. For this single-user app, conflicts are rare but possible if the user has two tabs open.
**Warning signs:** Save fails intermittently but works after page refresh.

### Pitfall 2: gray-matter Browser Compatibility
**What goes wrong:** gray-matter uses Node.js `Buffer` internally, which doesn't exist in browsers.
**Why it happens:** gray-matter was designed for Node.js. In browser environments, the bundler (Vite) needs to polyfill or the import may fail.
**How to avoid:** Vite 7 handles this automatically for most cases. If `Buffer is not defined` errors appear, add `buffer` polyfill to Vite config: `define: { 'global.Buffer': ['buffer', 'Buffer'] }` and install `buffer` package. Test early in development.
**Warning signs:** Runtime error `Buffer is not defined` in browser console.

### Pitfall 3: MDEditor CSS Conflicts with Tailwind
**What goes wrong:** @uiw/react-md-editor ships its own CSS. Tailwind's reset styles can override editor internals (font sizes, padding, list styles).
**Why it happens:** Tailwind's preflight resets many element styles. MDEditor expects browser defaults for some elements inside its preview pane.
**How to avoid:** The editor's CSS should take precedence for elements inside `.wmde-markdown`. If issues arise, add targeted CSS overrides in `index.css` scoped to `.wmde-markdown` to restore expected styles.
**Warning signs:** Preview renders without proper heading sizes, list bullets, or code block styling.

### Pitfall 4: Forgetting to Track SHA After Save
**What goes wrong:** User creates a card (no SHA), saves successfully (gets new SHA), edits again, saves without the new SHA -- GitHub creates a duplicate or throws error.
**Why it happens:** After `commitFile()` returns a new SHA, the local state must be updated with this SHA for subsequent saves to work as updates.
**How to avoid:** After successful save, update the card's SHA in CardContext/local state from the response's `sha` field. This is critical for the create-then-edit flow.
**Warning signs:** Second save on a newly created card fails or creates an unexpected file.

### Pitfall 5: Filename Sync Before First Save
**What goes wrong:** User types title "My Card", filename becomes "my-card.md". User saves. User changes title to "New Title" -- filename should NOT change (already committed). But code still updates filename, causing a new file to be created instead of updating the existing one.
**Why it happens:** The CONTEXT specifies "filename updates with title changes until first save." After first save, filename must be frozen.
**How to avoid:** Track a `hasBeenSaved` flag (or check if SHA exists). If card has been saved, filename is immutable regardless of title changes.
**Warning signs:** Editing a saved card's title creates a duplicate file instead of updating the existing one.

### Pitfall 6: MDEditor Value Must Be String
**What goes wrong:** Passing `undefined` to MDEditor's `value` prop causes uncontrolled component behavior.
**Why it happens:** `onChange` callback returns `string | undefined`. If body state is initialized as `undefined`, the editor flickers between controlled and uncontrolled.
**How to avoid:** Always initialize body as empty string `''`. In onChange, use `setValue(val || '')`.
**Warning signs:** React warning about switching from uncontrolled to controlled input.

## Code Examples

### Card Template Generation
```typescript
import matter from 'gray-matter';
import type { CardFrontmatter } from '@lumio/shared';

export function generateCardTemplate(locale: string): string {
  const frontmatter: CardFrontmatter = {
    title: '',
    tags: [],
    language: locale,
    // difficulty intentionally omitted -- user must set explicitly
  };

  const body = `# Your Card Title

Write your content here using Markdown.

## Code Example

\`\`\`typescript
const greeting = "Hello, Lumio!";
console.log(greeting);
\`\`\`

## Math Example

The quadratic formula:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

Inline math works too: $E = mc^2$
`;

  return matter.stringify(body, frontmatter);
}
```

### Slug Generation for Filenames
```typescript
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// "My First Card" -> "my-first-card"
// "Algoritmo SM-2" -> "algoritmo-sm-2"
```

### Tag Chip Input Pattern
```typescript
// TagInput component handles:
// - Text input with Enter to add
// - Validation: lowercase, no spaces (auto-convert)
// - X button on each chip to remove
// - Backspace on empty input removes last tag

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}
```

### Card Save Flow
```typescript
async function handleSave() {
  // 1. Validate required fields
  if (!frontmatter.title.trim()) { /* show error */ return; }
  if (frontmatter.difficulty === undefined) { /* show error */ return; }

  // 2. Serialize frontmatter + body
  const content = matter.stringify(body, frontmatter);

  // 3. Determine file path
  const filename = existingSha
    ? currentFilename           // frozen after first save
    : `${slugify(frontmatter.title)}.md`;
  const path = `${deckPath}/${filename}`;

  // 4. Commit via API
  try {
    const result = await commitFile(path, content, existingSha);
    // 5. Update local SHA for future saves
    setCurrentSha(result.sha);
    setCurrentFilename(filename);
    toast.success(t('card.saveSuccess'));
  } catch (err) {
    toast.error(err instanceof Error ? err.message : t('common.error'));
  }
}
```

### MDEditor Toolbar Configuration
```typescript
import MDEditor, { commands, ICommand } from '@uiw/react-md-editor';

// Custom math block command
const mathCommand: ICommand = {
  name: 'math',
  keyCommand: 'math',
  buttonProps: { 'aria-label': 'Insert math block', title: t('editor.toolbar.math') },
  icon: (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
      {/* Sum/sigma icon */}
      <path d="M..." />
    </svg>
  ),
  execute: (state, api) => {
    const selected = state.selectedText;
    if (selected) {
      api.replaceSelection(`$$\n${selected}\n$$`);
    } else {
      api.replaceSelection('$$\nx^2 + y^2 = z^2\n$$');
    }
  },
};

// Custom image URL command
const imageUrlCommand: ICommand = {
  name: 'imageUrl',
  keyCommand: 'imageUrl',
  buttonProps: { 'aria-label': 'Insert image URL', title: t('editor.toolbar.image') },
  icon: (/* image icon SVG */),
  execute: (state, api) => {
    api.replaceSelection(`![${state.selectedText || 'alt text'}](https://)`);
  },
};

// Toolbar configuration (8 buttons as specified)
const editorCommands = [
  commands.bold,
  commands.italic,
  commands.code,       // inline code
  mathCommand,         // custom: $$ math block $$
  commands.title1,     // heading
  commands.unorderedListCommand,
  commands.link,
  imageUrlCommand,     // custom: external image URL
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @uiw/react-md-editor v3.x | v4.0.11 | 2024 | Minor API updates, same command system |
| rehype-katex plugin chain | Direct katex import with custom code component | N/A | Simpler setup, fewer dependencies |
| gray-matter 4.x | gray-matter 4.0.3 (stable) | 2023 | Mature, no breaking changes expected |
| Tailwind CSS 3.x | Tailwind CSS 4.2 with @theme | 2025 | CSS custom properties instead of tailwind.config.js |

**Deprecated/outdated:**
- `@uiw/react-md-editor` v3.x: v4 is current. v3 had different default exports in some cases.
- Manual textarea + marked.js: Inferior to integrated editor component.

## Open Questions

1. **gray-matter Browser Buffer polyfill**
   - What we know: gray-matter uses Buffer internally. Vite 7 may auto-polyfill.
   - What's unclear: Whether Vite 7 + React polyfills Buffer automatically or needs explicit config.
   - Recommendation: Install and test immediately in Wave 0. If Buffer error, add `buffer` polyfill to vite.config.ts.

2. **MDEditor CSS conflicts with Tailwind 4 preflight**
   - What we know: Tailwind resets element styles. MDEditor relies on some browser defaults in its preview pane.
   - What's unclear: Exact conflicts with Tailwind 4's preflight in this project.
   - Recommendation: Test after installing MDEditor. If preview formatting is broken, add targeted CSS overrides in index.css for `.wmde-markdown` scope.

3. **Card list panel width in mail-client layout**
   - What we know: User wants mail-client pattern (narrow list + editor). Exact width is Claude's discretion.
   - What's unclear: Optimal width that shows title + tags without truncation.
   - Recommendation: Start with ~240px (w-60), similar to existing sidebar (w-64). Allow natural truncation with `truncate` class.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 + jsdom |
| Config file | `apps/deck-builder/vitest.config.ts` |
| Quick run command | `cd apps/deck-builder && pnpm test` |
| Full suite command | `cd apps/deck-builder && pnpm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CARD-01 | Create card with frontmatter template | unit | `cd apps/deck-builder && pnpm vitest run src/lib/__tests__/frontmatter.test.ts -x` | No - Wave 0 |
| CARD-02 | Edit card (parse + serialize round-trip) | unit | `cd apps/deck-builder && pnpm vitest run src/lib/__tests__/frontmatter.test.ts -x` | No - Wave 0 |
| CARD-03 | Delete card (API call verification) | unit | `cd apps/deck-builder && pnpm vitest run src/lib/__tests__/card-validation.test.ts -x` | No - Wave 0 |
| CARD-04 | Metadata form produces valid frontmatter | unit | `cd apps/deck-builder && pnpm vitest run src/lib/__tests__/frontmatter.test.ts -x` | No - Wave 0 |
| CARD-05 | Template generation with defaults | unit | `cd apps/deck-builder && pnpm vitest run src/lib/__tests__/frontmatter.test.ts -x` | No - Wave 0 |
| CARD-06 | Card list from file entries | unit | `cd apps/deck-builder && pnpm vitest run src/lib/__tests__/card-validation.test.ts -x` | No - Wave 0 |
| EDIT-01 | Editor split/toggle modes | manual-only | N/A (visual UI behavior) | N/A |
| EDIT-02 | Toolbar commands insert correct markdown | manual-only | N/A (textarea interaction) | N/A |
| EDIT-03 | Toast on save/error | manual-only | N/A (integration) | N/A |

### Sampling Rate
- **Per task commit:** `cd apps/deck-builder && pnpm test`
- **Per wave merge:** `cd apps/deck-builder && pnpm test && pnpm typecheck`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/frontmatter.test.ts` -- covers CARD-01, CARD-02, CARD-04, CARD-05 (parse, serialize, template, round-trip)
- [ ] `src/lib/__tests__/card-validation.test.ts` -- covers CARD-03, CARD-06 (validateCardTitle, slugify)
- [ ] Install dependencies: `pnpm add @uiw/react-md-editor gray-matter katex && pnpm add -D @types/katex`
- [ ] Verify gray-matter works in browser (Buffer polyfill check)

## Sources

### Primary (HIGH confidence)
- npm registry: `@uiw/react-md-editor` v4.0.11, `gray-matter` v4.0.3, `katex` v0.16.38 (verified via `npm view`)
- [GitHub - uiwjs/react-md-editor](https://github.com/uiwjs/react-md-editor) - Toolbar commands, preview modes, custom command API, data-color-mode
- [GitHub - jonschlinkert/gray-matter](https://github.com/jonschlinkert/gray-matter) - Frontmatter parsing/serialization API
- Existing codebase: `api.ts`, `DeckContext.tsx`, `ConfirmDialog.tsx`, `validation.ts`, `index.css` (directly read)
- `packages/shared/src/types/index.ts` - CardFrontmatter interface definition
- `docs/CARD-FORMAT-SPEC.md` - Canonical card format specification

### Secondary (MEDIUM confidence)
- [npm - @uiw/react-md-editor](https://www.npmjs.com/package/@uiw/react-md-editor) - Version and basic API
- [MDEditor demo site](https://uiwjs.github.io/react-md-editor/) - Live preview of features
- [GitHub - remarkjs/remark-math](https://github.com/remarkjs/remark-math) - KaTeX integration patterns
- [DEV Community - Creating a Markdown Editor](https://dev.to/promathieuthiry/creating-a-markdown-editor-with-uiwreact-md-editor-5foe) - Custom command examples

### Tertiary (LOW confidence)
- gray-matter browser polyfill requirement: based on general knowledge of Node.js polyfilling in Vite; needs validation in Wave 0

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via npm registry, version numbers confirmed, API patterns confirmed from official docs
- Architecture: HIGH - Follows established project patterns (DeckContext, ConfirmDialog, api.ts), all integration points verified by reading existing code
- Pitfalls: HIGH - SHA tracking, frontmatter edge cases, and filename sync are well-documented patterns; gray-matter browser compat is MEDIUM (needs validation)

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (30 days -- stable libraries, no rapid changes expected)
