# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Spaced Repetition

**Shipped:** 2026-02-26
**Phases:** 4 | **Plans:** 8 | **Sessions:** ~4

### What Was Built
- SM-2 spaced repetition engine with server-side atomic write-back via SECURITY DEFINER RPCs
- SRS-integrated study sessions: overdue-first ordering, fire-and-forget per-answer persistence, content-hash stale detection
- Dashboard "cards due today" counter with contextual colors and useFocusEffect auto-refresh
- Review/New badge pills during study with semantic inline colors
- Timezone-aware RPCs (AT TIME ZONE) with fallback, CHECK constraints for EF/interval data integrity
- History screen card count display with relative dates and empty state CTA

### What Worked
- Research-first approach: thorough SM-2 vs FSRS analysis led to correct algorithm choice (binary quiz input invalidates FSRS advantage)
- Server-side SM-2 pivot (Phase 24) was the right call — atomic UPSERT prevents race conditions, reduces client complexity
- Gap closure pattern (24-03) caught the handleNext→handleAnswer timing bug before it shipped to users
- Milestone audit caught orphaned exports early — documented as tech debt, not a blocker
- CHECK constraints as safety net for data integrity (EF floor/ceiling, interval bounds)

### What Was Inefficient
- Client-side SM-2 implementation in Phase 23-01 was discarded when Phase 24 pivoted to server-side — could have been caught during research/planning
- Orphaned exports (sm2(), types, constants) remain in codebase — tree-shaking handles it, but adds noise to package APIs

### Patterns Established
- SECURITY DEFINER RPCs with `(select auth.uid())` pattern for Supabase performance
- Fire-and-forget write-back with single retry and dedup set for non-blocking persistence
- `useFocusEffect` for screen-return data refresh (replaces `useEffect`)
- AT TIME ZONE with BEGIN...EXCEPTION fallback for timezone-safe date comparisons
- Safety UPDATE before CHECK constraints to fix pre-existing violating rows in migrations

### Key Lessons
1. When the scoring input is binary (correct/wrong), simpler algorithms (SM-2) outperform ML-based ones (FSRS) that need granular feedback
2. Server-side computation for stateful operations (SRS scheduling) is almost always better than client-side — atomicity, no race conditions, single source of truth
3. Gap closure plans (small, focused fixes after verification) are extremely efficient — Phase 24-03 was 1 task, 1 file, 1 minute
4. Timezone bugs are best solved at the database level (AT TIME ZONE) rather than in application code

### Cost Observations
- Model mix: 80% opus, 20% sonnet (quality profile)
- Sessions: ~4 (research + 4 phases executed in single day)
- Notable: Entire v2.0 milestone (4 phases, 8 plans, 52 files) completed in 1 day — research + planning + execution + audit

---

## Milestone: v2.1 — Email Auth

**Shipped:** 2026-03-02
**Phases:** 5 | **Plans:** 10 | **Sessions:** ~5

### What Was Built
- Email/password signup with 6-digit OTP verification via branded Lumio email templates
- Email login with progressive disclosure UX (Google OAuth on top, email below separator)
- Password reset with two-phase OTP-then-password screen and global session invalidation
- Bidirectional account linking (Google ↔ email) with single-identity unlink protection
- Provider-aware database trigger for email signups (display_name from email prefix)
- 71 auth i18n keys in IT/EN with DeepStringify compile-time validation

### What Worked
- OTP over deep link was the right choice for Android — no deep link infrastructure needed, more reliable
- Progressive disclosure pattern reduces cognitive load on login screen
- Recovery state machine with AsyncStorage survives app restarts elegantly
- addPasswordModeRef pattern cleanly separates "add password" from "forgot password" OTP flows

### What Was Inefficient
- Dead else branch in ForgotPasswordScreen.tsx error handling — both paths set same error message (minor tech debt)
- Multiple quick tasks (5, 6, 8, 9) needed post-milestone for production issues — could benefit from more thorough UAT before shipping

### Patterns Established
- Provider-aware trigger using `raw_app_meta_data->>'provider'` with COALESCE default
- Guard pattern: `hasPreviousSignIn()` before `GoogleSignin.signOut()` for mixed-auth users
- Two-phase screen pattern: single component handles both OTP entry and action (password set, verification)
- Ref-based flow suppression (`addPasswordModeRef`) to prevent auth event handler interference

### Key Lessons
1. OTP is more reliable than deep links on Android — less infrastructure, fewer failure modes
2. Auth flows need extensive real-device testing — several quick fixes were needed post-ship
3. Provider-aware triggers with explicit detection are cleaner than implicit auth.users field checks
4. Global session invalidation on password change is a security best practice worth the UX cost

### Cost Observations
- Model mix: 80% opus, 20% sonnet (quality profile)
- Sessions: ~5 (4 days of development)
- Notable: 5 phases, 10 plans, 16 requirements — largest milestone since v1.1, all satisfied

---

## Milestone: v2.2 — Session Limits

**Shipped:** 2026-03-05
**Phases:** 2 | **Plans:** 2 | **Sessions:** ~2

### What Was Built
- RPC `get_study_cards_for_session` enforces total card cap with overdue-first priority (IF/ELSE plpgsql for NULL vs capped p_limit)
- RPC `get_due_card_count` returns session-aware count via LEAST(total, p_limit) for dashboard
- Dashboard counter reflects session-limited card count reactively via useStudySettings
- CardsPerSession type renamed from 'all' to 'auto' with backward-compatible AsyncStorage migration
- Settings selector shows "Auto" with sparkles icon

### What Worked
- Minimal milestone scope (2 phases, 5 requirements) — shipped in 2 days with zero deviations
- Nullable RPC parameter pattern (p_limit DEFAULT NULL) from Phase 32 reused immediately in Phase 33
- LEAST(total, p_limit) was simpler than duplicating query logic for the count RPC
- Audit passed cleanly: 5/5 requirements, 8/8 integration checks, 3/3 E2E flows

### What Was Inefficient
- Nothing notable — clean execution from start to finish

### Patterns Established
- Nullable RPC parameters: pass null from TS, PostgreSQL uses DEFAULT NULL for unlimited behavior
- AsyncStorage backward-compat migration: read old value, return new enum value silently
- LEAST-based capping for scalar count RPCs (simpler than IF/ELSE when only capping a result)

### Key Lessons
1. Small, focused milestones (2 phases) execute cleanly with near-zero overhead
2. Reusing RPC patterns across phases in the same milestone accelerates development
3. "Auto" as universal label (no translation needed) simplifies i18n

### Cost Observations
- Model mix: 80% opus, 20% sonnet (quality profile)
- Sessions: ~2 (2 days)
- Notable: Smallest milestone since v1.5 — 2 phases, 2 plans, 4 tasks, ~6 minutes total execution

---

## Milestone: v2.3 — Dashboard Polish

**Shipped:** 2026-03-05
**Phases:** 2 | **Plans:** 2 | **Sessions:** ~1

### What Was Built
- Dashboard 2x2 stat card grid with compact StatCard variant for half-width layout
- Verbose localized relative time for Last Studied in both IT and EN (24 new i18n keys)
- Last Studied card made non-tappable (removed study history navigation from dashboard)
- Circular 60px play button replacing rectangular text CTA for study sessions
- i18n cleanup: removed unused button text keys

### What Worked
- Minimal scope (2 phases, 4 requirements) — shipped same day as v2.2, zero deviations
- Compact StatCard prop is reusable for future half-width card layouts
- justNow threshold extension (5min) reduces jitter for "just studied" display
- Phase 35 UAT caught vertical centering and disabled state issues — fixed in single commit

### What Was Inefficient
- Nothing notable — clean execution, same-day completion

### Patterns Established
- compact StatCard prop: fontSize 18 value, wider skeleton — use for half-width cards
- Verbose relative time i18n: singular (oneMinuteAgo) vs plural (minutesAgo) key pattern
- Circular CTA: wrap TouchableOpacity in centering View container with generous vertical spacing

### Key Lessons
1. Pure UI polish milestones are fast and low-risk — 2 phases in ~4 minutes total execution
2. Keeping abbreviated time keys for backwards compat avoids breaking existing screens
3. UAT on UI changes catches visual issues (centering, disabled state) that code review misses

### Cost Observations
- Model mix: 80% opus, 20% sonnet (quality profile)
- Sessions: ~1 (same day as v2.2)
- Notable: Fastest milestone — 2 phases, 2 plans, 4 tasks, ~4 minutes total execution time

---

## Milestone: v3.0 — Deck Builder Web

**Shipped:** 2026-03-13
**Phases:** 5 | **Plans:** 10 | **Sessions:** ~5

### What Was Built
- React SPA deck builder at deck.lumio.toto-castaldi.com (Vite 7 + React 19 + Tailwind 4)
- Supabase dual-auth (Google OAuth + email/password) with responsive layout, i18n IT/EN, dark mode
- deck-commit edge function with 8 GitHub API actions and UUID-prefix user path isolation
- Deck management UI: sidebar list with inline create/rename, delete confirmation, localStorage-backed sort
- Card authoring: markdown editor with live preview, 8-button toolbar, metadata form, frontmatter parse/serialize
- Production deploy with SSL, Nginx SPA config, and CI/CD pipeline

### What Worked
- Shared Supabase project between web and mobile eliminated auth/user sync complexity
- Phase structure (scaffold → backend → deck CRUD → card CRUD → deploy) was clean sequential dependency chain with no rework
- Edge function consolidation: single `deck-commit` function handles all 8 actions — simpler deployment than multiple functions
- Typed client API module (`invoke<T>` helper) centralized error handling — zero per-call boilerplate
- Research-first phase approach caught gray-matter browser incompatibility before it became a blocker
- 3-day execution for 5 phases — fastest multi-phase milestone per plan count

### What Was Inefficient
- gray-matter initially used in Phase 39-01 had to be replaced with yaml package in 39-02 (Buffer not available in browser) — could have been caught in research
- localStorage as proxy for deck timestamps is a workaround for GitHub API not tracking directory timestamps — works but adds client-side state management
- Traceability table in REQUIREMENTS.md had stale "In Progress" status for AUTH-01 through AUTH-05 even after Phase 36 was complete

### Patterns Established
- Edge function action pattern: single function with `action` field dispatching to handlers (vs. separate functions per operation)
- `invoke<T>` typed helper for Supabase edge function calls with centralized error handling
- Provider nesting order for web: ThemeProvider > I18nProvider > AuthProvider > RouterProvider > DeckProvider > CardProvider
- VS Code-style inline rename pattern: pencil icon → editable input → Enter/Escape/blur to confirm/cancel
- Responsive MDEditor: split-pane desktop / toggle-tab mobile via matchMedia
- .gitkeep files for empty Git directories (Git doesn't track empty dirs)
- HTTP-only Nginx template in repo; Certbot adds SSL on production server

### Key Lessons
1. Shared backend (same Supabase project) across web and mobile dramatically simplifies auth and data sharing — one project, no sync
2. Single edge function with action routing is cleaner than multiple functions when actions share auth/validation logic
3. Browser compatibility for npm packages must be verified during research — gray-matter's Buffer dependency was a mid-phase surprise
4. localStorage-backed metadata (timestamps, sort order) works well enough as a client-side proxy when the API doesn't provide metadata
5. 5-phase sequential dependency chain executed in 3 days with zero deviations — clean scope definition is the biggest velocity multiplier

### Cost Observations
- Model mix: 80% opus, 20% sonnet (quality profile)
- Sessions: ~5 (3 days of development)
- Notable: 5 phases, 10 plans, ~28,600 LOC — second-largest milestone after v1.1, cleanest execution of any multi-phase milestone

---

## Milestone: v3.1 — Deck Discovery

**Shipped:** 2026-03-16
**Phases:** 4 | **Plans:** 8 | **Sessions:** ~3

### What Was Built
- deck_index table with weighted tsvector/GIN fulltext search and immutable wrapper function for generated column
- search_decks RPC with prefix matching for search-as-you-type, tag filtering, and card_count at query time
- Subfolder-aware study RPCs: transparent subfolder_path filtering on 7 JOINs (zero signature changes)
- docora-webhook deck.yaml detection, parsing (parseYaml reusing parseFrontmatter), and idempotent deck_index upsert/delete
- deck-commit commit_yaml action with server-enforced author and lightweight YAML serialization
- DeckMetadataForm in deck builder with collapsible UI, dirty tracking, YAML load/save, EN/IT i18n
- Discovery tab (4th bottom tab) with search-as-you-type, tag chip bar, optimistic subscribe/unsubscribe
- Shared deck entries in Repos screen with display_name enrichment from deck_index

### What Worked
- End-to-end pipeline approach: DB schema → webhook indexing → deck builder metadata → mobile discovery — each phase cleanly consumed the prior one's output
- Transparent subfolder filter pattern: added to 7 JOINs across 2 RPCs with zero signature changes — existing mobile code worked unchanged
- parseYaml wrapper reusing parseFrontmatter avoided adding a YAML library to the edge function
- Prefix matching fix found during device verification (search-as-you-type requires `:*` suffix, not websearch_to_tsquery)
- Optimistic UI with Set-based key tracking for subscribe/unsubscribe gives instant feedback

### What Was Inefficient
- websearch_to_tsquery chosen in Phase 41 had to be replaced with prefix matching in Phase 44 when device testing revealed partial typing didn't match — research didn't test search-as-you-type behavior
- Client-side join between user_repositories and deck_index is a workaround for PostgREST not supporting embedding without FK — adds 2 round trips

### Patterns Established
- Immutable tsvector wrapper: wrap generated column expression in IMMUTABLE SQL function when using STABLE functions
- COALESCE-based unique index: for nullable columns in unique constraints
- Transparent subfolder filter: `AND (ur.subfolder_path IS NULL OR c.file_path LIKE ur.subfolder_path || '%')` on every user_repositories JOIN
- Optimistic UI with Set<string> rollback: add key immediately, revert on error
- Debounced search via useRef setTimeout: 300ms on text, immediate on tag selection
- Prefix tsquery pattern: exact match all words except last, `:*` on last word

### Key Lessons
1. Search-as-you-type requires prefix matching (`:*`), not websearch_to_tsquery — test with partial input during research, not just complete words
2. When PostgREST can't embed (no FK), client-side join with Map lookup is clean and fast enough for small result sets
3. Transparent filter patterns (adding conditions to existing JOINs) are the cleanest way to extend RPCs without breaking callers
4. Idempotent operations (UPSERT, 409-as-success) simplify webhook and UI code simultaneously
5. Device verification catches real UX issues (search behavior, key collisions) that code review and unit tests miss

### Cost Observations
- Model mix: 80% opus, 20% sonnet (quality profile)
- Sessions: ~3 (4 days, with gap between Phase 43 and 44)
- Notable: 4 phases, 8 plans, 17 tasks — full end-to-end pipeline from DB to mobile UI in 4 days

---

## Milestone: v3.2 — Deck Management UX

**Shipped:** 2026-03-17
**Phases:** 2 | **Plans:** 3 | **Sessions:** ~1

### What Was Built
- Discovery tab promoted to 2nd nav position for better discoverability
- Platform repo lumio-decks hidden from repo list, stats, and manual add with info toast
- Atomic unsubscribe_deck RPC (SECURITY DEFINER, deletes card_review_schedule + user_repositories)
- SharedDeckListItem with swipe-to-unsubscribe, confirmation dialog, success toast
- Unified FlatList with discriminated union merging shared decks and personal repos
- Subfolder-aware card list filtering and CardDetail navigation for shared decks

### What Worked
- Small, focused milestone (2 phases) completed in a single day with zero blockers
- Wave-based execution: backend first (Wave 1), then UI (Wave 2) — clean dependency chain
- TypeScript compilation as quality gate caught 2 bugs auto-fixed during execution (property name casing, missing field)
- UI-SPEC created before implementation ensured consistent component design
- UAT on real device confirmed all 6 tests passed after seeding test data

### What Was Inefficient
- DB reset during UAT testing required Kong restart (502 from auth) — not obvious, cost 10 min debugging
- Test data seeding was manual SQL — could benefit from a seed script for shared deck test scenarios
- Migration not auto-applied to local Supabase — first unsubscribe attempt failed with "function not found"

### Patterns Established
- Discriminated union pattern for mixed FlatList data (kind: 'deck' | 'repo')
- Fallback entity construction for cross-user content browsing
- Atomic multi-table cleanup via SECURITY DEFINER RPC (delete dependent rows first, then parent)

### Key Lessons
- Always run `supabase db reset` or apply migrations before testing features that depend on new SQL functions
- Kong gateway may need restart after Supabase container restarts — check health endpoint, not just container status
- Small UX milestones (2 phases) with clear requirements are fastest to execute and verify

### Cost Observations
- Model mix: opus for executors (2), sonnet for verifier (1) and integration checker (1)
- Sessions: 1
- Notable: 2 phases, 3 plans, 6 tasks — full end-to-end from RPC to swipeable UI in single session

---

## Milestone: v3.3 — Shared Deck Parity

**Shipped:** 2026-03-17
**Phases:** 2 | **Plans:** 2

### What Was Built
- Fixed getCards() edge function (.single() → .limit(1), subfolder_path filtering)
- Wired subfolderPath through full client chain (CardListScreen → core → edge function)
- Fixed getStats() to include shared deck subscriptions in dashboard counts
- Verified study RPCs already handle shared deck cards correctly

### What Worked
- Bug analysis before milestone definition — identified all root causes upfront, no surprises during implementation
- Verification-only tasks (STUDY-01/STUDY-02) — confirmed existing code works without unnecessary changes
- Smallest milestone yet: 4 files changed, +227/-29 lines

### What Was Inefficient
- Nothing significant — clean bugfix milestone

### Patterns Established
- `.limit(1)` instead of `.single()` for tables where multiple rows per user are expected
- Server-side + client-side filtering as defense-in-depth for card scoping
- Set-based deduplication for counting across overlapping subscriptions

### Key Lessons
- Platform repo exclusion (`is_platform = true`) must account for user subscriptions to subfolders within the platform repo
- Existing RPC migrations may already cover new use cases — verify before writing code

### Cost Observations
- Model mix: opus for executor (1), sonnet for verifier (1) and plan checker (1)
- Sessions: 1
- Notable: Entire milestone from analysis to completion in single conversation

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v2.0 | ~4 | 4 | First milestone with audit-before-complete workflow; gap closure pattern |
| v2.1 | ~5 | 5 | Largest since v1.1; post-ship quick fixes revealed UAT gaps |
| v2.2 | ~2 | 2 | Cleanest milestone — zero deviations, zero issues |
| v2.3 | ~1 | 2 | Fastest milestone — pure UI polish, same-day ship |
| v3.0 | ~5 | 5 | First web app milestone; new platform (Vite/React SPA); clean sequential chain |
| v3.1 | ~3 | 4 | First cross-platform pipeline (DB → webhook → web → mobile); prefix matching fix during device test |
| v3.2 | ~1 | 2 | Smallest milestone since v2.3; pure UX parity for shared decks; single-session complete |
| v3.3 | ~1 | 2 | Bugfix milestone — analysis-driven, zero surprises, single-session |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v2.0 | 10 (SM-2 unit) | SRS module only | supermemo@2.0.23, vitest@4.0.18 |
| v2.1 | — | Auth flows (manual) | — |
| v2.2 | — | Session limit (manual) | — |
| v2.3 | — | UI polish (UAT) | — |
| v3.0 | 38+ (auth/theme/i18n/validation) | Lib layer | Vite 7, React 19, Tailwind 4, @uiw/react-md-editor, katex, yaml |
| v3.1 | 5 (api.test.ts) | API layer | — (zero new dependencies) |
| v3.2 | 6 (UAT device) | UI + integration | — (zero new dependencies) |
| v3.3 | 1 (getStats unit) | Edge function | — (zero new dependencies) |

### Top Lessons (Verified Across Milestones)

1. Research-first planning pays off — prevents mid-milestone pivots (validated v1.1 through v3.0)
2. Server-side computation for stateful operations avoids race conditions and simplifies client code (v2.0, v2.2, v3.0)
3. Small gap closure plans are more efficient than trying to get everything right in the first pass (v2.0)
4. Small, focused milestones execute cleanly with near-zero overhead (v2.2)
5. Reusing patterns across phases in the same milestone accelerates development (v2.2, v3.0)
6. Pure UI polish milestones are fast, low-risk, and benefit most from UAT (v2.3)
7. Shared backend across multiple frontends is a massive complexity reducer — one auth, one DB, no sync (v3.0)
8. Browser compatibility for npm packages must be verified during research, not mid-implementation (v3.0)
9. Search-as-you-type requires prefix matching — test with partial input during research, not just complete words (v3.1)
10. Transparent filter patterns on existing JOINs are the cleanest way to extend RPCs without breaking callers (v3.1)
11. Always apply new SQL migrations before testing features — local Supabase doesn't auto-migrate (v3.2)
12. Discriminated union types are the cleanest way to render mixed data in FlatList without runtime type checks (v3.2)
13. Platform repo exclusion filters must account for user subscriptions to subfolders within the platform repo (v3.3)
14. Verify existing code before writing new code — RPC subfolder filters already covered shared deck study (v3.3)
