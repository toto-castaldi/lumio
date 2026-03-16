# Milestones: Lumio

## v3.1 Deck Discovery (Shipped: 2026-03-16)

**Delivered:** End-to-end deck discovery pipeline — from deck.yaml metadata authoring in the deck builder, through Docora webhook indexing into a fulltext-searchable deck_index table, to a Discovery tab in the Android app where users search, browse by tag, and subscribe to shared decks with a single tap.

**Phases completed:** 41-44 (8 plans total)

**Key accomplishments:**

- deck_index table with weighted tsvector/GIN fulltext search (name > tags > description) and immutable wrapper function for generated column
- search_decks RPC with prefix matching for search-as-you-type, tag filtering, and card_count computed at query time
- Subfolder-aware study RPCs: transparent subfolder_path filtering on 7 JOINs across get_study_cards_for_session and get_due_card_count
- docora-webhook deck.yaml detection, parsing (parseYaml wrapper), and idempotent deck_index upsert/delete
- deck-commit commit_yaml action with server-enforced author, language validation, and lightweight YAML serialization
- DeckMetadataForm in deck builder with collapsible UI, dirty tracking, YAML load/save, EN/IT i18n
- Discovery tab (4th bottom tab, compass icon) with search-as-you-type, tag chip bar, optimistic subscribe/unsubscribe
- Shared deck entries in Repos screen with display_name enrichment from deck_index

**Stats:**

- 52 files changed (+7,691 / -78 lines)
- 4 phases, 8 plans, 17 tasks
- 4 days (2026-03-13 to 2026-03-16)

**Git range:** `2cca21a` → `734b67d` (31 commits)

**What's next:** v3.2 TBD

---

## v3.0 Deck Builder Web (Shipped: 2026-03-13)

**Delivered:** React SPA deck builder at deck.lumio.toto-castaldi.com where authenticated users create decks and flashcards in markdown, committed via edge function to a shared Git repo, synced by Docora for AI question generation.

**Phases completed:** 36-40 (10 plans total)

**Key accomplishments:**

- Vite 7 + React 19 + Tailwind 4 SPA with Supabase dual-auth (Google OAuth + email/password), i18n IT/EN, and dark mode
- deck-commit edge function with 8 GitHub API actions and UUID-prefix user path isolation
- Deck management UI: sidebar list with inline create/rename, delete confirmation, localStorage-backed sort
- Card authoring: markdown editor with live preview, 8-button toolbar, metadata form, frontmatter parse/serialize
- Typed client API module for all edge function operations with centralized error handling
- Production deploy at deck.lumio.toto-castaldi.com with SSL, Nginx SPA config, and CI/CD pipeline

**Stats:**

- 105 files changed (+17,984 / -1,722 lines)
- ~28,600 lines of TypeScript/CSS in apps/deck-builder
- 5 phases, 10 plans
- 3 days (2026-03-11 to 2026-03-13)

**Git range:** `defb602` → `22d03ab` (66 commits)

**What's next:** v3.1 Deck Discovery (fulltext search for public repos/decks in mobile app)

---

## v2.3 Dashboard Polish (Shipped: 2026-03-05)

**Delivered:** Compact, visually coherent dashboard with 2x2 stat card grid, verbose localized relative time, and circular icon-only study button.

**Phases completed:** 34-35 (2 plans total)

**Key accomplishments:**

- Dashboard 2x2 stat card grid: Repository, Cards, Last Studied, Due Today side-by-side at half width
- Verbose localized relative time for Last Studied in both IT and EN ("ieri", "2 giorni fa", "yesterday", "2 days ago")
- Last Studied card made non-tappable (removed study history navigation from dashboard)
- Circular 60px play button replacing rectangular text CTA for study sessions
- i18n cleanup: 24 verbose time keys added, unused button text keys removed

**Stats:**

- 15 files changed (+911 / -110 lines)
- 2 phases, 2 plans, 4 tasks
- 1 day (2026-03-05)

**Git range:** `26a12aa` → `f9db8c2` (9 commits: 3 feat + 1 fix + 2 test + 2 docs + 1 chore)

**What's next:** TBD

---

## v2.2 Session Limits (Shipped: 2026-03-05)

**Delivered:** Session card limit enforcement end-to-end — RPC caps cards to user-chosen limit with overdue-first priority, dashboard counter reflects session-limited count, and "Auto" label replaces infinity symbol.

**Phases completed:** 32-33 (2 plans total)

**Key accomplishments:**

- RPC `get_study_cards_for_session` enforces total card cap with overdue-first priority (IF/ELSE plpgsql branching for NULL vs capped p_limit)
- RPC `get_due_card_count` returns session-aware count via LEAST(total, p_limit) for dashboard
- Dashboard counter reflects session-limited card count, not total backlog (reactive via useStudySettings)
- CardsPerSession type renamed from 'all' to 'auto' with backward-compatible AsyncStorage migration
- Settings selector shows "Auto" with sparkles icon replacing "All cards" / infinity symbol

**Stats:**

- 10 files changed (+318 / -20 lines)
- 2 phases, 2 plans, 4 tasks
- 2 days (2026-03-04 to 2026-03-05)

**Git range:** `153e1d9` → `eccc6a1` (4 feat commits)

**What's next:** TBD

---

## v1.1 Lumio Native (Shipped: 2026-02-08)

**Delivered:** Complete migration from dual PWA apps to a single native Android application with landing page and CI/CD pipeline.

**Phases completed:** 1-5 (20 plans total)

**Key accomplishments:**

- Native Android app with Expo SDK 54, Google OAuth, and SecureStore for encrypted auth tokens
- Dashboard with study statistics, repository management with PAT support, and system-aware dark mode
- Quiz study flow with 4-option multiple choice, haptic feedback, card preview with markdown/LaTeX/code rendering
- Bilingual landing page with APK download, CI/CD pipeline for automated release builds
- Legacy PWA apps removed (11,826 lines of dead code cleaned up)

**Stats:**

- 234 files changed (+24,569 / -11,384 lines)
- 5,019 lines of TypeScript/JS (4,538 Android app + 481 landing page)
- 5 phases, 20 plans, 33 requirements
- 11 days from 2026-01-29 to 2026-02-08

**Git range:** `v1.0.1` → `v1.1.3` (28 feat + 6 fix commits)

**What's next:** v2 enhancements — push notifications, offline mode, Google Play Store distribution

---

## v1.2 Polish & UX (Shipped: 2026-02-09)

**Delivered:** Polished user experience with native card rendering, brand identity, configurable study sessions, and full IT/EN internationalization.

**Phases completed:** 6-9 (9 plans total)

**Key accomplishments:**

- Native card preview with markdown, syntax highlighting, and KaTeX math (replaced WebView)
- Lumio logo integrated across Login screen, Dashboard header, and landing page
- Configurable cards-per-session (10/20/50/All) with persistent settings and progress tracking
- Full IT/EN internationalization with ~85 translated strings and reactive language toggle
- Dynamic version display from @lumio/shared with tap-to-copy in Settings

**Stats:**

- 65 files changed (+7,052 / -251 lines)
- 5,960 lines of code (5,506 Android app + 454 landing page)
- 4 phases, 9 plans, 12 requirements
- 1 day (2026-02-09)

**Git range:** `v1.1` → `docs(phase-09)` (14 feat commits)

**What's next:** v1.3 enhancements

---


## v1.3 Bugfix & UX Polish (Shipped: 2026-02-10)

**Delivered:** Fixed branding inconsistencies, simplified study experience, and corrected data display bugs across the app.

**Phases completed:** 10-12 (4 plans total)

**Key accomplishments:**

- Replaced default Expo icons with Lumio tri-color pie logo on launcher, adaptive icon, and splash screen
- Added "Lumio" brand text on Login screen and Dashboard header with theme-adaptive styling
- Simplified study flow: forward-only navigation, removed toast/prev/review/quit confirmation (-130 LOC)
- Fixed Android navbar overlap with safe area bottom insets on study screens
- Fixed dashboard "last studied" display with AsyncStorage persistence (replaces broken DB query)
- Fixed repository visibility icons: globe for public repos, lock for private

**Stats:**

- 22 files changed (+1,189 / -196 lines)
- 3 phases, 4 plans, 7 tasks
- 1 day (2026-02-10)

**Git range:** `v1.2` → `test(phase-12)` (5 feat + 2 fix commits)

**What's next:** TBD

---


## v1.4 Card Browse & Stats (Shipped: 2026-02-11)

**Delivered:** Card browsing within repositories, study session persistence with history viewing, and UX fixes for navbar overlap and settings styling.

**Phases completed:** 13-15 (4 plans total)

**Key accomplishments:**

- Fixed card preview navbar overlap with safe area bottom padding on Android
- Added ACCOUNT section with Google profile avatar to Settings screen
- Card browse: tap repo → scrollable card list → full card detail (markdown, code, LaTeX, images)
- Study session persistence with immutable study_sessions table and RLS policies
- Study history screen with score color-coding, pull-to-refresh, and tappable dashboard navigation

**Stats:**

- 33 files changed (+3,298 / -44 lines)
- 3 phases, 4 plans, 9 tasks
- 1 day (2026-02-11)

**Git range:** `v1.3` → `docs(phase-15)` (5 feat + 1 fix commits)

**What's next:** TBD

---


## v1.5 Study UX Fixes (Shipped: 2026-02-12)

**Delivered:** Fixed study screen layout waste and dark mode readability issues for a comfortable study experience in both themes.

**Phases completed:** 16 (1 plan total)

**Key accomplishments:**
- Next-card button pinned to screen bottom with absolute positioning — no wasted vertical space
- Dark mode contrast fixes: emerald-900/red-900 backgrounds for answer options (correct/incorrect)
- Dark mode-aware explanation panel backgrounds and borders for proper readability

**Stats:**
- 8 files changed (+203 / -21 lines)
- 1 phase, 1 plan, 2 tasks
- 1 day (2026-02-12)

**Git range:** `v1.4` → `c64e7c6` (2 fix commits + 1 docs commit)

**What's next:** TBD

---


## v1.6 Sync Error Handling (Shipped: 2026-02-21)

**Delivered:** Graceful sync failure handling end-to-end -- from Docora webhook to user-facing error display and in-app PAT token refresh.

**Phases completed:** 17-19 (4 plans total)

**Key accomplishments:**

- Webhook handler for Docora `sync_failed` events with HMAC validation, error storage, and auto-recovery on successful syncs
- Amber/red error indicators in repo list: auth errors (user-fixable) vs system errors (auto-recoverable)
- Bottom-sheet error modal with conditional PAT input for auth errors, info-only for system errors
- Edge function proxy for Docora PATCH token update with optimistic UI error clearing
- Full i18n support (IT/EN) for all sync error and token update strings

**Stats:**

- 16 files changed
- 3 phases, 4 plans, 6 tasks
- 2 days (2026-02-17 to 2026-02-18), validated 2026-02-21
- UAT: 10/10 tests passed, 17/17 automated verification checks

**Git range:** `v1.5` → `v1.6` (8 feat commits + 1 test commit)

**What's next:** TBD

---


## v1.7 GSD Versioning (Shipped: 2026-02-21)

**Delivered:** Replaced all legacy versioning infrastructure with a single source of truth: `.planning/STATE.md` drives version across APK, landing page, edge functions, and docs.

**Phases completed:** 20-22 (6 plans total)

**Key accomplishments:**

- Removed all legacy versioning tooling (husky, commitlint, commitizen, release-please, CHANGELOG, 53 git tags)
- Created `extract-version.cjs` pipeline: STATE.md -> version.ts -> all consumers at build time
- CI wired to derive APK versionName, edge function LUMIO_VERSION, and landing page version from STATE.md
- Landing page footer shows live version badge via CI-time sed injection
- Complete `docs/VERSIONING.md` documenting the GSD-based versioning flow
- Updated TECHNICAL-ARCHITECTURE.md to reflect current CI/CD state (gap closure)

**Stats:**

- 34 files changed (+1,846 / -1,974 lines) — net -128 lines (cleanup milestone)
- 3 phases, 6 plans
- 1 day (2026-02-21)

**Git range:** `d3e0057` → `0fc1cb3` (29 commits)

**Tech debt (non-blocking):**
- `COMMIT_SHA` fallback in version.ts is dead code (CI only sets `GIT_SHA`)
- Double-slicing of git SHA in `getFullVersionString()` is redundant

**What's next:** TBD

---


## v2.0 Spaced Repetition (Shipped: 2026-02-26)

**Delivered:** Transformed study from random card selection to intelligent spaced repetition with SM-2 algorithm, timezone-aware scheduling, and visible SRS indicators throughout the app.

**Phases completed:** 23-26 (8 plans total)

**Key accomplishments:**

- SM-2 spaced repetition algorithm (supermemo@2.0.23) with TDD test suite, 365-day interval cap, and EF 1.3-2.5 clamps
- card_review_schedule table with RLS, SECURITY DEFINER RPCs, and server-side SM-2 atomic write-back
- SRS-integrated study sessions: overdue-first ordering, fire-and-forget per-answer write-back, content-hash stale detection
- Dashboard "cards due today" counter with contextual colors (emerald at 0, amber when due) and useFocusEffect refresh
- Review/New badge pills during study sessions with inline semantic colors
- Timezone-aware RPCs (AT TIME ZONE), CHECK constraints for data integrity, history screen card count with relative dates

**Stats:**

- 52 files changed (+7,990 / -139 lines)
- 4 phases, 8 plans, 15 tasks
- 1 day (2026-02-26)
- 45 commits

**Git range:** `feef0d5` → `9cc4f4b` (13 feat + docs commits)

**Tech debt (non-blocking):**
- Orphaned client-side SM-2 exports (sm2(), newSM2Item(), types, constants) — server-side pivot made them unused by app code; test suite exercises them, tree-shaking removes from bundles
- 3 runtime verification items pending (EF floor, timezone flip, fresh user) — code-verified + CHECK constraints enforce correctness

**What's next:** TBD

---


## v2.1 Email Auth (Shipped: 2026-03-02)

**Delivered:** Email/password authentication with OTP verification, password reset, and account linking alongside existing Google OAuth.

**Phases completed:** 27-31 (10 plans total)

**Key accomplishments:**

- Email/password signup with 6-digit OTP verification via branded Lumio email templates
- Email login with progressive disclosure UX (Google OAuth prominent on top, email form below separator)
- Password reset flow with two-phase OTP-then-password screen pattern and global session invalidation
- Account linking: add Google to email account, add email/password to Google account, unlink methods with single-identity protection
- Provider-aware database trigger for email signups with display name from email prefix (initcap)
- 71 auth i18n keys in both IT and EN with DeepStringify compile-time validation

**Stats:**

- 52 files changed (+9,897 / -153 lines)
- 5 phases, 10 plans, 16 requirements (all satisfied)
- 4 days (2026-02-27 to 2026-03-02)
- 47 commits (16 feat + docs/fix/context)

**Git range:** `v2.0` → `v2.1` (bedcad0 → a0d3ca9)

**Tech debt (non-blocking):**
- ForgotPasswordScreen.tsx L89-93: dead else branch in error handling — both if/else paths set same `rateLimited` error message

**What's next:** TBD

---

