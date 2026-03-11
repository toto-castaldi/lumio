# Feature Landscape

**Domain:** Markdown-based flashcard deck builder web application
**Researched:** 2026-03-11
**Overall confidence:** HIGH

## Context

Lumio v3.0 adds a React SPA at `deck.lumio.toto-castaldi.com` where authenticated users create decks and cards in markdown. Content is committed via edge function to a shared Git repo (`/{user_id}/{deck_name}/`), then Docora syncs it and generates AI questions -- the same pipeline used for user-owned GitHub repos. This is a content authoring tool, not a study tool (studying happens in the mobile app).

### Infrastructure Constraints

- **Auth:** Shared Supabase project (Google OAuth + email/password already exist)
- **Card format:** YAML frontmatter (title, tags, difficulty, language) + markdown body, parsed by `parseFrontmatter()` in docora-webhook
- **Repo structure:** `/{user_id}/{deck_name}/` in a single shared Git repo
- **Sync pipeline:** Edge function commits to GitHub API, Docora monitors repo, fires webhook, docora-webhook edge function parses and inserts cards into DB
- **Existing tables:** `repositories`, `cards`, `user_repositories`, `card_review_schedule`, `card_questions` -- deck builder content enters this same data model

## Table Stakes

Features users expect from any deck/card builder. Missing any of these makes the product feel broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Deck CRUD** | Core purpose of the app. Users must create, rename, and delete decks. | Low | Maps to directories in `/{user_id}/{deck_name}/` in the shared repo. Delete = remove all files in that directory via GitHub API. |
| **Card CRUD** | Core purpose. Users must create, edit, and delete cards within decks. | Med | Each card = one markdown file committed via GitHub API. Edit = update file content + new commit. Delete = delete file from repo. |
| **Markdown editor with live preview** | Markdown is the content format. Users need to see what they're writing. | Med | Split-pane or toggle editor/preview. Must render the same markdown features the mobile app supports: GFM, code highlighting, KaTeX math, images. Use `@uiw/react-md-editor` or similar to avoid building from scratch. |
| **YAML frontmatter form** | Card metadata (title, tags, difficulty, language) is structured. Raw YAML editing is hostile. | Low | Structured form fields that generate frontmatter automatically. Title is required, tags are optional chips/tokens, difficulty is 1-5 selector, language is dropdown. Never expose raw YAML to users. |
| **Authentication (shared with mobile)** | Users must log in to manage their content. Same accounts as mobile app. | Low | Supabase auth with same project. Google OAuth + email/password. Session management via `@supabase/supabase-js`. Already proven patterns in the codebase. |
| **Deck list / card list navigation** | Users need to browse their decks and drill into cards. | Low | Two-level navigation: decks list -> cards list -> card editor. Standard CRUD list pattern with create/edit/delete actions. |
| **Card content preview** | Before saving, users must verify their markdown renders correctly -- especially code blocks and math formulas. | Med | Live preview panel using same remark/rehype pipeline as mobile app. Must support `remark-gfm`, `remark-math`, `rehype-katex`, `rehype-highlight` (already in `packages/core`). |
| **Save confirmation / feedback** | Users need to know their content was saved successfully (commit completed). | Low | Toast notification on successful save. Error toast with message on failure. Loading state on save button during commit. |
| **Bilingual UI (IT/EN)** | Existing app is bilingual. Deck builder must match. | Low | Reuse i18n-js pattern from mobile app. New key set for deck builder screens. Same language detection logic. |
| **Responsive layout** | Must work on desktop (primary) and tablet. Phone users use the mobile app. | Med | Desktop-first design. Sidebar for deck list, main area for editor. Collapses to single-column on tablet. No mobile-phone optimization needed (that is the native app's job). |
| **User content isolation** | Each user sees and manages only their own decks/cards. | Low | Enforced by repo path structure (`/{user_id}/...`) and RLS policies. Edge function validates `auth.uid()` matches the user_id path segment. |
| **Delete confirmation** | Destructive actions need a safety net. | Low | Confirmation dialog before deleting decks or cards. "Are you sure? This cannot be undone." pattern. |

## Differentiators

Features that add value beyond the minimum. Not expected by users, but appreciated.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Autosave with debounce** | Reduces friction -- users never lose work. Content auto-saves after 2-3 seconds of inactivity. | Med | Debounce (2000ms) triggers GitHub API commit. Visual indicator ("Saving..." / "Saved" / "Unsaved changes"). Must handle rapid edits without creating excessive commits. Consider batching: save all changed fields in one commit. |
| **Deck card count display** | Users see how many cards each deck has at a glance. | Low | Count files in the deck directory. Can derive from card list or query `cards` table filtered by file_path prefix. |
| **Markdown toolbar** | Insert common markdown syntax with button clicks: bold, italic, code block, math block, heading, list, link, image. | Med | Standard toolbar above editor textarea. Particularly valuable for code fences (triple-backtick with language) and KaTeX blocks (`$$...$$`) since the syntax is non-trivial. |
| **Card template / scaffolding** | Pre-fill new cards with a standard frontmatter structure and example body. | Low | When user clicks "New Card", start with a template: frontmatter with title placeholder, empty tags, difficulty 3, language auto-detected from deck or user locale. Body with "Write your content here..." placeholder. |
| **Drag-and-drop card reordering** | Users can control the order cards appear in their deck. | Med | Maps to file naming convention (e.g., `01-topic.md`, `02-topic.md`). Visual drag-and-drop in the card list. Reorder triggers file renames via GitHub API. Defer to later -- ordering is not critical when Docora generates questions per-card. |
| **Tag autocomplete** | When adding tags to a card, suggest tags already used in the deck or across the user's decks. | Low | Query existing tags from the user's cards. Show dropdown suggestions as user types. Reduces typos and inconsistency. |
| **Bulk import from markdown files** | Upload one or more `.md` files to create multiple cards at once. | Med | File input that reads local `.md` files, parses frontmatter if present, creates cards in batch. Useful for users migrating from other systems. Single commit with multiple file creations. |
| **Dark mode** | Consistency with mobile app which already has dark mode. | Low | Use CSS variables or Tailwind dark mode. Theme toggle in header. Persist preference. System detection as default. |
| **Deck description** | Short text describing what the deck covers. | Low | Maps to a `_deck.yaml` or `README.md` file in the deck directory root with deck metadata. |
| **Sync status indicator** | Show whether Docora has synced the latest changes and AI questions are ready. | Med | Poll or subscribe to repository `sync_status` from the DB. Show badge: "Synced", "Syncing...", "Pending". Gives users confidence their content will appear in the mobile app. |
| **Keyboard shortcuts** | Power users expect Ctrl+S to save, Ctrl+B for bold, etc. | Low | Standard editor shortcuts. Minimal implementation cost if using a component like `@uiw/react-md-editor` which includes them. |

## Anti-Features

Features to explicitly NOT build. Each would add complexity without proportional value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **In-browser study/quiz mode** | The mobile app is the study experience. Building a second study interface fragments the UX and duplicates SM-2/quiz logic. The deck builder is a content authoring tool only. | Show a callout: "Open the Lumio app to study this deck." Link to mobile app download if needed. |
| **WYSIWYG / rich text editor** | WYSIWYG markdown editors (Tiptap, ProseMirror) add massive complexity, fight with code blocks and math notation, and produce inconsistent markdown output. Mochi and other markdown-first tools prove that markdown editing with preview works well. | Split-pane markdown + preview is the proven pattern. A toolbar for common syntax insertions covers the usability gap. |
| **Real-time collaboration** | Single developer, personal use case. Collaborative editing requires CRDT/OT, presence indicators, conflict resolution. Enormous complexity for zero current demand. | Each user manages their own content in their own path. No shared editing. |
| **Image upload in cards** | Storing images in the Git repo adds complexity (base64 encoding, large commits, binary handling via GitHub API). The mobile app already handles images via Supabase Storage for synced repos. | Markdown image syntax with external URLs (e.g., hosted images). Docora already handles image extraction from Git repos -- if images are needed, users can use a GitHub repo instead of the deck builder. |
| **Card versioning / history UI** | Git already provides full version history. Building a UI for version comparison and rollback is complex and rarely needed. | The shared repo is on GitHub. Advanced users can check commit history there. The deck builder always shows current content. |
| **Deck sharing / publishing** | v3.1 plans "Deck Discovery" for the mobile app. Building sharing in the deck builder prematurely couples authoring with discovery. | Defer to v3.1. The deck builder creates private user content. Discovery/search comes later. |
| **Offline support** | The mobile app explicitly does NOT support offline mode. A web-based editor requires connectivity to commit to GitHub. | Show clear error state if network is unavailable. Do not cache unsaved content locally beyond the current session (browser tab). |
| **Custom card templates with multiple fields** | Anki's template system (Front/Back fields, custom note types) is powerful but enormously complex. Lumio cards are single markdown documents with AI-generated questions. | One markdown body per card. The frontmatter covers metadata. AI generates questions from the content. |
| **Bulk export** | Users can already access their content via the Git repo. Export functionality duplicates what Git provides. | Link to the GitHub repo for users who want their raw files. |
| **Spaced repetition configuration** | SRS parameters (ease factor, intervals) are managed by the mobile app and server-side RPCs. The deck builder has no business touching scheduling. | Not shown in the deck builder at all. SRS is a study concern, not an authoring concern. |
| **Cloze deletion syntax** | Mochi and Anki use cloze deletions (`{{text}}`) for fill-in-the-blank cards. Lumio uses AI-generated multiple-choice questions from full content. Cloze deletion is a different paradigm. | Lumio's value is that users write knowledge (markdown) and AI generates quiz questions. No special card syntax needed. |
| **Card search / full-text search** | With the expected scale (single developer, personal decks), browsing the deck/card tree is sufficient. Full-text search adds indexing complexity. | Hierarchical navigation (deck list -> card list) is enough. Search can be added later if scale warrants it. |

## Feature Dependencies

```
Authentication ─────────────────────────────────────> All features
                                                        |
Deck CRUD ──────────────> Card CRUD ──────────────> Card editor (markdown + frontmatter)
    |                         |                         |
    |                         |                    Live preview (remark/rehype pipeline)
    |                         |                         |
    |                         |                    Markdown toolbar (convenience)
    |                         |
    |                    Autosave (debounce + commit)
    |                         |
    |                    Save confirmation (toast)
    |
Deck list ──────────────> Card list
    |                         |
    |                    Card count display
    |
Deck description

User content isolation ──> Edge function commit (/{user_id}/{deck_name}/ path)
    |
    └──────────────────> RLS policies

Bilingual UI ──────────> i18n key definitions
Dark mode ─────────────> CSS/Tailwind config

Sync status indicator ──> Repository sync_status column (existing)
Tag autocomplete ───────> Existing tags query
```

## MVP Recommendation

The MVP must prove the core loop: **create deck -> add cards with markdown -> content appears in mobile app for study**.

### Phase 1: Foundation + Auth
1. **Authentication** -- shared Supabase auth, login/logout, protected routes
2. **Responsive layout shell** -- sidebar + main area, responsive breakpoints
3. **Bilingual UI** -- i18n setup with IT/EN
4. **Dark mode** -- theme toggle, system detection

### Phase 2: Deck + Card CRUD
5. **Deck CRUD** -- create, rename, delete decks (maps to repo directories)
6. **Card CRUD** -- create, edit, delete cards (maps to markdown files via GitHub API commit)
7. **YAML frontmatter form** -- structured fields for title, tags, difficulty, language
8. **Deck/card list navigation** -- browse decks, drill into cards
9. **Delete confirmation** -- safety dialogs
10. **Save confirmation** -- toast feedback

### Phase 3: Editor Polish
11. **Markdown editor with live preview** -- split-pane or toggle, with remark/rehype rendering
12. **Card content preview** -- exact same rendering as mobile app
13. **Markdown toolbar** -- bold, italic, code, math, heading shortcuts
14. **Card template** -- pre-filled new card scaffold

### Defer to post-MVP:
- **Autosave** -- valuable but adds complexity to the commit flow. Manual save first.
- **Tag autocomplete** -- nice-to-have, not critical for first release
- **Drag-and-drop reorder** -- ordering is cosmetic since AI generates questions per-card
- **Sync status indicator** -- useful but requires polling/subscription infrastructure
- **Bulk import** -- edge case for first-time migration
- **Deck description** -- low priority metadata
- **Keyboard shortcuts** -- comes free if using `@uiw/react-md-editor`
- **Card count display** -- trivial to add but not MVP-blocking

## Infrastructure Integration Points

### Existing Infrastructure (reuse as-is)
| Component | How Deck Builder Uses It |
|-----------|-------------------------|
| Supabase Auth | Shared project, same Google OAuth + email/password flows |
| `repositories` table | Shared Git repo registered as a repository entry |
| `cards` table | Cards created by deck builder appear here after Docora sync |
| `user_repositories` table | Links user to the shared repo |
| `card_review_schedule` table | SM-2 scheduling applies to deck builder cards (handled by mobile app) |
| `card_questions` table | AI-generated questions for deck builder cards (handled by Docora pipeline) |
| `docora-webhook` edge function | Receives file change notifications, parses frontmatter, inserts cards |
| `@lumio/shared` package | TypeScript types, version info |
| `@lumio/core` package | Supabase client initialization, markdown rendering pipeline |

### New Infrastructure (must build)
| Component | Purpose |
|-----------|---------|
| `deck-commit` edge function | Accepts card content from web app, commits to GitHub API (create/update/delete files in `/{user_id}/{deck_name}/` path) |
| `apps/deck-builder` SPA | React app with Vite, Supabase auth, editor UI |
| Shared Git repo on GitHub | Single GitHub repo registered with Docora, contains all user content in `/{user_id}/` directories |
| CI/CD pipeline addition | Build and deploy to `deck.lumio.toto-castaldi.com` |

### Critical Integration: Commit -> Sync -> Cards Pipeline
1. User writes markdown in deck builder
2. Edge function commits file to shared Git repo via GitHub Contents API
3. Docora detects file change (monitoring the shared repo)
4. Docora fires webhook to `docora-webhook` edge function
5. `docora-webhook` parses frontmatter + body, upserts card in `cards` table
6. AI question generation runs on the new/updated card
7. Card appears in mobile app for study

**Latency expectation:** Steps 2-7 are asynchronous. User sees "Saved" immediately after step 2. Cards may take 30-120 seconds to appear in the mobile app depending on Docora sync interval.

## Card Markdown Format Reference

The deck builder must produce markdown files compatible with the existing `parseFrontmatter()` and `extractCardMetadata()` functions in `docora-webhook`:

```markdown
---
title: "Card Title Here"
tags:
  - javascript
  - async
difficulty: 3
language: en
---

# Card Content

Your markdown content here. Supports:

- **GFM** (tables, strikethrough, task lists)
- Code blocks with syntax highlighting
- KaTeX math: $E = mc^2$ and $$\int_0^1 f(x)dx$$
- Images via external URLs
```

**Frontmatter fields:**
- `title` (string, required) -- falls back to filename without extension if missing
- `tags` (string array, optional) -- lowercase, used for filtering
- `difficulty` (integer 1-5, optional) -- defaults to 3, clamped to bounds
- `language` (string, optional) -- defaults to "en"

## Sources

- [Mochi - Spaced repetition flashcards](https://mochi.cards/) -- markdown-first flashcard app with SRS, primary competitor reference
- [Mochi docs - Advanced formatting](https://mochi.cards/docs/markdown/advanced-formatting/) -- cloze deletion, KaTeX, card sides
- [@uiw/react-md-editor](https://github.com/uiwjs/react-md-editor) -- React markdown editor with preview, KaTeX support
- [Best Flashcard Apps: Anki vs RemNote vs Quizlet (2025)](https://notigo.ai/blog/best-flashcard-apps-students-anki-remnote-quizlet-2025) -- feature comparison across major players
- [GitHub API - Simpler commit authoring](https://github.blog/changelog/2021-09-13-a-simpler-api-for-authoring-commits/) -- createCommitOnBranch mutation for simplified commits
- [EasyMDE - Autosave with debounce](https://github.com/Ionaru/easy-markdown-editor) -- autosave implementation patterns
- [StackEdit - In-browser Markdown editor](https://stackedit.io/) -- scroll-sync split-pane UX reference
- [CRUD UX patterns for product design](https://medium.com/design-bootcamp/mastering-crud-operations-a-framework-for-seamless-product-design-2630affbc1e5) -- CRUD operation UX best practices
- [Best Anki Alternatives 2026](https://goodoff.co/blog/best-anki-alternatives-2026-flashcard-apps) -- modern flashcard app landscape
- Lumio codebase: `supabase/functions/docora-webhook/index.ts` (card parsing), `supabase/functions/git-sync/index.ts` (repo management), `supabase/migrations/` (data model)
