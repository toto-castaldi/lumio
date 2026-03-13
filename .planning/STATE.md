---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Deck Builder Web
status: completed
stopped_at: Completed 40-01-PLAN.md
last_updated: "2026-03-13T07:43:32.053Z"
last_activity: 2026-03-13 — Plan 40-01 deploy & CI/CD complete, v3.0 shipped
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 10
  completed_plans: 10
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-11)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** v3.0 Deck Builder Web -- COMPLETE, all 5 phases shipped

## Current Position

Phase: 40 of 40 (Deploy & CI/CD) — fifth of 5 phases in v3.0
Plan: 1 of 1 complete
Status: v3.0 milestone COMPLETE
Last activity: 2026-03-13 — Plan 40-01 deploy & CI/CD complete

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 79 (70 across v1.1-v2.3 + 9 in v3.0)
- Total milestones shipped: 12 (11 through v2.3 + v3.0)
- Timeline: 35 days (2026-01-29 to 2026-03-05) + v3.0 (2026-03-11 to 2026-03-13)

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (66 entries).

- (36-01) Used vi.hoisted() for test mock functions to handle Vitest module hoisting correctly
- (36-01) Added vite-env.d.ts for import.meta.env type support in deck-builder
- (36-01) Default matchMedia mock in theme tests since jsdom does not implement matchMedia
- (36-02) Used inline Google SVG icon for brand recognition without adding an icon library dependency
- (36-02) Auto-submit OTP when 6th digit entered for faster verification UX
- (36-02) ResetPassword uses single component with step state (1 or 2) rather than two separate routes
- (36-03) Inline SVG icons for hamburger/sun/moon/monitor -- no icon library dependency
- (36-03) CSS transform transition for mobile sidebar slide-in animation
- (36-03) Sidebar auto-closes on route change via useLocation() effect
- (37-01) Path traversal check runs before user prefix check to prevent bypass via ../other-user
- (37-01) Separate validateUserDirectoryPath for list_files (no .md requirement) vs validateUserPath for file ops
- (37-01) list_decks always scoped to userId -- no path param needed, no validation needed
- (37-01) GitHub API env vars via lazy getters for Deno cold start compatibility
- (37-01) deck-commit deployed with --no-verify-jwt (auth handled internally via supabase.auth.getUser)
- (37-02) Extract clean typed objects from edge function responses (strip success field) for type-safe downstream usage
- (37-02) Private invoke<T> helper centralizes error handling -- single point of change for edge function calls
- (38-01) Server-side validateDeckName returns human-readable errors; client-side returns i18n keys
- (38-01) Sequential file operations for rename_deck to avoid GitHub Contents API conflicts
- (38-01) .gitkeep file creates empty deck directories in Git (Git does not track empty dirs)
- (38-02) localStorage-backed timestamps as client-side proxy for deck sort order (GitHub API has no directory timestamps)
- (38-02) localStorage-backed creation dates for DeckDetailPanel since Git directory creation is not tracked
- (38-02) DeckProvider inside ProtectedLayout, wrapping Layout+Outlet (needs auth, serves both Sidebar and pages)
- (38-02) Inline rename follows VS Code pattern: pencil triggers editable input, Enter/Escape/blur
- (39-01) gray-matter works in jsdom/Vite without Buffer polyfill -- no extra config needed
- (39-01) CardContext auto-selects newly created card via setTimeout micro-task after refreshCards
- (39-01) De-slugify filenames to titles with title case for CardState display
- (39-02) Replaced gray-matter with yaml package for browser compatibility (Buffer not available in browser)
- (39-02) Card count synced in sidebar and header after CRUD operations via DeckContext totalCards state
- (39-02) Responsive MDEditor: split-pane live preview on desktop, toggle tabs on mobile via matchMedia
- (39-02) Custom math and image toolbar commands using MDEditor commands API
- [Phase 40]: HTTP-only Nginx template checked into repo; Certbot adds SSL on server
- [Phase 40]: deploy-deck-builder parallels deploy-landing (both need lint-and-typecheck, not each other)
- [Phase 40]: No VITE_GOOGLE_WEB_CLIENT_ID env var needed -- Google OAuth uses Supabase server-side config

### Pending Todos

None.

### Blockers/Concerns

- Phase 37: Shared repo + Docora registration is a new pattern (one repo for all users). Verify Docora can handle `/{user_id}/` subdirectory structure.
- Phase 37: Card frontmatter format must exactly match what `docora-webhook` parseFrontmatter() expects.
- Phase 36: Google Cloud Console must be updated with `deck.lumio.toto-castaldi.com` as authorized JavaScript origin for OAuth.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Fix version consistency: sync root package.json, add APK upload to CI, show build ref v1.7+42.abc1234 in apps | 2026-02-23 | 8e265b7 | [1-fix-version-consistency-sync-root-packag](./quick/1-fix-version-consistency-sync-root-packag/) |
| 2 | Fix APK download: add create-release CI job with softprops/action-gh-release, create v1.7 release with lumio.apk | 2026-02-23 | d4036ea | [2-fix-apk-download-github-release-apk-is-o](./quick/2-fix-apk-download-github-release-apk-is-o/) |
| 3 | Fix APK version display: pass BUILD_NUMBER and GIT_SHA env vars to build-apk CI job | 2026-02-23 | 54b502f | [3-fix-apk-version-display-pass-build-numbe](./quick/3-fix-apk-version-display-pass-build-numbe/) |
| 4 | Fix version.ts: hardcode build metadata as string literals (not process.env) | 2026-02-23 | 353f6fa | [4-fix-version-ts-hardcode-build-number-and](./quick/4-fix-version-ts-hardcode-build-number-and/) |
| 5 | ho provato la registrazione utente con mail. come da screenshot che trovi nella cartella /home/toto/tmp/screenshot (ultimo file) la UI si comporta bene. Il problema è che NON ho ricevuto email | 2026-03-03 | a1bd90a | [5-ho-provato-la-registrazione-utente-con-m](./quick/5-ho-provato-la-registrazione-utente-con-m/) |
| 6 | Fix i18n countdown interpolation bug on OTP verification screens | 2026-03-03 | d771d4b | [6-fix-i18n-countdown-bug-on-email-verifica](./quick/6-fix-i18n-countdown-bug-on-email-verifica/) |
| 8 | Navigate to Login after successful password update | 2026-03-04 | 6870913 | [8-navigate-to-home-after-successful-passwo](./quick/8-navigate-to-home-after-successful-passwo/) |
| 9 | Use git tag version when higher than STATE.md | 2026-03-04 | 262e189 | [9-use-git-tag-version-when-higher-than-sta](./quick/9-use-git-tag-version-when-higher-than-sta/) |
| Phase 37 P01 | 3min | 1 tasks | 3 files |
| Phase 37 P02 | 2min | 2 tasks | 2 files |
| Phase 38 P01 | 4min | 2 tasks | 5 files |
| Phase 38 P02 | 5min | 3 tasks | 8 files |
| Phase 39 P01 | 4min | 2 tasks | 7 files |
| Phase 39 P02 | 8min | 3 tasks | 13 files |
| Phase 40 P01 | 3min | 2 tasks | 3 files |

## Session Continuity

Last session: 2026-03-13T07:43:32.047Z
Stopped at: Completed 40-01-PLAN.md
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-03-13 (Plan 40-01 complete -- v3.0 shipped)*
