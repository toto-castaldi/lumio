---
phase: 50-popular-decks-leaderboard
plan: 01
subsystem: database, ui
tags: [supabase, rpc, sql, landing-page, vanilla-js, leaderboard, bilingual]

# Dependency graph
requires:
  - phase: 41-deck-search
    provides: deck_index table, search_decks RPC pattern, user_repositories subfolder_path
provides:
  - Public top_decks() RPC returning top 10 decks by subscriber count (anon-accessible)
  - Landing page Popular Decks leaderboard section with live data
  - CI pipeline Supabase credential injection for landing page
affects: [landing-page, deploy-pipeline]

# Tech tracking
tech-stack:
  added: []
  patterns: [anon-accessible SECURITY DEFINER RPC, CI sed placeholder injection for static pages]

key-files:
  created:
    - supabase/migrations/20260318000001_top_decks_rpc.sql
  modified:
    - apps/landing/index.html
    - apps/landing/styles.css
    - apps/landing/script.js
    - .github/workflows/ci-deploy.yml

key-decisions:
  - "First public (anon-accessible) RPC in the project using SECURITY DEFINER to bypass RLS"
  - "Direct REST fetch to Supabase API from landing page (zero dependencies, no client library)"
  - "CI sed placeholder injection with pipe delimiter for Supabase URL containing slashes"

patterns-established:
  - "Anon RPC pattern: SECURITY DEFINER + GRANT TO anon for public-facing data"
  - "Landing page dynamic section injection: JS builds HTML and inserts into anchor div"
  - "CI landing page secret injection: __PLACEHOLDER__ tokens replaced by sed at deploy time"

requirements-completed: [LEAD-01, LEAD-02, LEAD-03]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 50 Plan 01: Popular Decks Leaderboard Summary

**Public top_decks RPC with anon access and landing page leaderboard section showing ranked decks with bilingual labels, tag chips, and language flags**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T10:28:18Z
- **Completed:** 2026-03-18T10:31:03Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created public top_decks() RPC that returns top 10 decks by subscriber count, accessible without authentication
- Built dynamic Popular Decks leaderboard section on landing page with rank numbers, deck names, bilingual subscriber counts, tag chips (max 3), and language flag emojis
- Integrated Supabase credential injection into CI deploy pipeline for landing page

## Task Commits

Each task was committed atomically:

1. **Task 1: Create public top_decks RPC migration** - `8a421f9` (feat)
2. **Task 2: Add Popular Decks section to landing page with fetch logic and CI injection** - `5849332` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `supabase/migrations/20260318000001_top_decks_rpc.sql` - Public RPC returning top 10 decks by subscriber count with SECURITY DEFINER
- `apps/landing/index.html` - Added popular-decks-anchor div between Features and Screenshots sections
- `apps/landing/styles.css` - Added leaderboard styles (.popular-decks, .leaderboard-entry, .tag-chip, etc.) with responsive 480px breakpoint
- `apps/landing/script.js` - Added Supabase fetch logic, escapeHtml helper, LANG_FLAGS map, loadPopularDecks() function with bilingual rendering
- `.github/workflows/ci-deploy.yml` - Added Supabase URL and anon key sed injection step in deploy-landing job

## Decisions Made
- First public (anon-accessible) RPC in the project -- uses SECURITY DEFINER to bypass deck_index RLS for anonymous visitors
- Direct Supabase REST API fetch (no client library) to keep landing page at zero npm dependencies
- Used pipe delimiter in CI sed commands to handle Supabase URLs containing forward slashes
- Section completely hidden (never injected into DOM) when zero decks returned or fetch fails -- no loading spinner, no error state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - Supabase secrets (SUPABASE_URL, SUPABASE_ANON_KEY) already exist as GitHub repository secrets from prior phases. No new external service configuration required.

## Next Phase Readiness
- Phase 50 has a single plan; this completes the phase
- Landing page will show the leaderboard once deployed and there are decks with subscribers in production
- No blockers or concerns

---
*Phase: 50-popular-decks-leaderboard*
*Completed: 2026-03-18*
