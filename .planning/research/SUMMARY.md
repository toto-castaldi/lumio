# Research Summary: Lumio v3.0 Deck Builder Web App

**Domain:** React SPA deck builder for flashcard platform with markdown editing and GitHub-backed storage
**Researched:** 2026-03-11
**Overall confidence:** HIGH

## Executive Summary

Lumio v3.0 adds a React SPA at `deck.lumio.toto-castaldi.com` where authenticated users create decks and flashcards in markdown. Content is committed via a new Supabase edge function to a shared GitHub repository, then Docora syncs it and generates AI questions through the same pipeline already used for user-owned GitHub repos. The deck builder is a content authoring tool only -- studying happens exclusively in the Android app.

The stack is straightforward and well-proven: Vite 7 + React 19 + react-router 7 (Library Mode) + Tailwind CSS 4 for the SPA, `@uiw/react-md-editor` for markdown editing, and `@supabase/supabase-js` for shared auth and DB access. The web app creates its own Supabase client (not via `@lumio/core`) because the mobile client's configuration (`detectSessionInUrl: false`) is incompatible with browser OAuth redirect handling. No new backend infrastructure is needed beyond one new edge function (`deck-commit`) that wraps the GitHub Contents API with `fetch()` -- no Octokit dependency required.

The critical integration point is the commit-to-study pipeline: user writes markdown -> edge function commits to GitHub -> Docora monitors repo -> fires webhook -> `docora-webhook` parses frontmatter and inserts cards -> question generator creates AI quizzes -> card appears in mobile app. This pipeline already exists and works for user-owned repos. The deck builder simply provides a browser-based frontend for creating the same markdown files.

The main risks are: (1) GitHub API rate limits under concurrent usage (mitigated by debouncing saves), (2) card format compatibility between the deck builder and the existing `docora-webhook` parser (frontmatter YAML must match exactly), (3) Google OAuth configuration for the new web domain (authorized JavaScript origins must be updated in Google Cloud Console), and (4) the shared repo growing large over time with many users (GitHub handles millions of files per repo, so this is not an immediate concern).

## Key Findings

**Stack:** Vite 7 + React 19 + react-router 7 + Tailwind CSS 4 + @uiw/react-md-editor 4 + @supabase/supabase-js 2 + direct GitHub REST API calls via fetch() in a new Deno edge function.

**Architecture:** Clean separation -- SPA handles UI/auth, edge function handles GitHub API calls (PAT is server-side secret), Docora pipeline handles sync/AI generation unchanged. Path-based user isolation: `/{user_id}/{deck_name}/` in the shared repo.

**Critical pitfall:** Card content format must exactly match what `docora-webhook` expects (YAML frontmatter + markdown body). If the deck builder produces slightly different frontmatter, cards will fail to parse or have missing metadata. The deck builder must assemble frontmatter programmatically from a structured form, never expose raw YAML to users.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Project scaffolding + Auth** - Set up `apps/deck-builder` with Vite/React/Tailwind, implement Supabase auth (login/logout, protected routes, OAuth callback). This is the foundation everything else depends on.
   - Addresses: Authentication, responsive layout shell, i18n setup
   - Avoids: Building features before auth works

2. **Edge function + GitHub integration** - Build the `deck-commit` edge function with GitHub Contents API wrapper. Create/register the shared repo with Docora. Test the commit-to-sync pipeline end-to-end.
   - Addresses: The critical backend infrastructure
   - Avoids: Building UI without a working backend

3. **Deck CRUD + Card list** - Deck creation/listing/deletion UI. Card listing within a deck. Navigation between decks and cards.
   - Addresses: Core CRUD operations
   - Avoids: Editor complexity before navigation works

4. **Card editor + preview** - Markdown editor with `@uiw/react-md-editor`, frontmatter form, save-to-GitHub flow, live preview.
   - Addresses: The primary user action (creating cards)
   - Avoids: Building the most complex UI component without stable CRUD beneath it

5. **Deploy + CI/CD** - nginx server block for `deck.lumio.toto-castaldi.com`, SSL certificate, GitHub Actions deploy job, production Supabase configuration (OAuth redirect URLs, Google Cloud Console authorized origins).
   - Addresses: Production readiness
   - Avoids: Manual deployment

**Phase ordering rationale:**
- Auth first because all other features require an authenticated user (user_id drives repo path scoping)
- Edge function before UI because CRUD operations depend on the commit pipeline working
- Deck navigation before card editor because the editor lives inside the deck/card hierarchy
- Deploy last because it is a one-time infrastructure task that does not block development (local dev works with `vite dev`)

**Research flags for phases:**
- Phase 2: May need research spike on shared repo registration with Docora (new pattern -- one repo for all users, not one repo per user)
- Phase 4: Standard patterns, unlikely to need additional research (editor library is well-documented)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified on npm. Vite 7, react-router 7, Tailwind 4, @uiw/react-md-editor 4 all current and stable. |
| Features | HIGH | Feature scope is well-defined by PROJECT.md milestone description. Table stakes are clear. Anti-features identified. |
| Architecture | HIGH | Follows existing edge function patterns. GitHub Contents API is well-documented. SPA architecture is standard. |
| Pitfalls | HIGH | Critical risks identified: card format compatibility, OAuth domain config, GitHub API as the only file write path. All have mitigations. |

## Gaps to Address

- **Shared repo + Docora registration:** The current system registers one repo per user via the git-sync edge function. The deck builder uses a single shared repo for all users. Verify that Docora can be registered once for this repo and that the `docora-webhook` correctly handles card upserts for files in `/{user_id}/` subdirectories.

- **Card content compatibility:** The deck builder must produce markdown files that exactly match the parsing expectations of `docora-webhook`. Validate the frontmatter format (title, tags, difficulty, language fields) by examining the webhook's `parseFrontmatter()` function.

- **Google OAuth for the new domain:** Must update Google Cloud Console to add `deck.lumio.toto-castaldi.com` to authorized JavaScript origins. Without this, Google sign-in will fail on the web app. This is a production configuration task, not a code change.

- **Markdown preview fidelity:** The web editor preview should match what the Android app renders. The Android app uses `react-native-marked` with `remark-gfm`, `remark-math`, `rehype-katex`, `rehype-highlight`. The web editor's preview uses `@uiw/react-md-editor`'s built-in renderer which supports GFM but may not have identical KaTeX/syntax highlighting. Acceptable for v3.0 -- exact parity is a polish concern.

## Sources

- Lumio codebase analysis: `package.json`, `pnpm-workspace.yaml`, `packages/core/`, `packages/shared/`, `supabase/functions/`, `.github/workflows/ci-deploy.yml`
- [Vite npm](https://www.npmjs.com/package/vite) - v7.3.1
- [react-router npm](https://www.npmjs.com/package/react-router) - v7.13.1
- [@uiw/react-md-editor npm](https://www.npmjs.com/package/@uiw/react-md-editor) - v4.0.11
- [Tailwind CSS npm](https://www.npmjs.com/package/tailwindcss) - v4.2.1
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) - v2.99.0
- [GitHub REST API - Repository Contents](https://docs.github.com/en/rest/repos/contents)
- [Supabase Edge Functions - Dependencies](https://supabase.com/docs/guides/functions/dependencies)
- [Supabase Auth Architecture](https://supabase.com/docs/guides/auth/architecture)
- [Vite Static Deploy Guide](https://vite.dev/guide/static-deploy)

---
*Research completed: 2026-03-11*
*Ready for roadmap: yes*
