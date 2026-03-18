---
phase: 50-popular-decks-leaderboard
verified: 2026-03-18T10:45:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 50: Popular Decks Leaderboard Verification Report

**Phase Goal:** Visitors see a live ranking of the most popular shared decks, demonstrating platform activity and content quality
**Verified:** 2026-03-18T10:45:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Public RPC top_decks returns up to 10 decks ordered by subscriber count without authentication | VERIFIED | `supabase/migrations/20260318000001_top_decks_rpc.sql`: `SECURITY DEFINER`, `GRANT EXECUTE TO anon`, `LIMIT 10`, `ORDER BY subscriber_count DESC` |
| 2 | Landing page displays a Popular Decks section between Features and Screenshots when decks exist | VERIFIED | `apps/landing/index.html` line 107: `<div id="popular-decks-anchor"></div>` placed between `.features` closing tag and `.screenshots` section; JS builds and injects full section HTML on successful fetch |
| 3 | Each leaderboard entry shows rank number, deck name, subscriber count (bilingual), tag chips, and language flag | VERIFIED | `apps/landing/script.js` lines 83-97: `entry-rank` (#i+1), `entry-name` (escapeHtml display_name), `entry-subscribers` (count + bilingual EN/IT label), `entry-lang` (flag emoji), `entry-tags` (tag-chip spans) |
| 4 | Section is hidden entirely when zero decks are returned or fetch fails | VERIFIED | `apps/landing/script.js` lines 63-64 (non-ok response returns), 68-70 (empty array guard returns), 107-109 (`.catch` silently does nothing) — anchor div stays empty, section never injected |
| 5 | Language toggle switches subscriber label between English and Italian | VERIFIED | `apps/landing/script.js` lines 80-81 bilingual `enLabel`/`itLabel` inside `<span lang="en">`/`<span lang="it">`; existing CSS `html[lang="en"] [lang="it"] { display: none !important }` applies |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260318000001_top_decks_rpc.sql` | Public top_decks RPC function | VERIFIED | 44 lines; contains `CREATE OR REPLACE FUNCTION top_decks`, `SECURITY DEFINER`, `GRANT EXECUTE TO anon`, `LIMIT 10`, subscriber JOIN on `user_repositories`, `ORDER BY subscriber_count DESC` |
| `apps/landing/index.html` | Placeholder anchor for dynamic section injection | VERIFIED | Line 107: `<div id="popular-decks-anchor"></div>` correctly positioned between `.features` and `.screenshots` |
| `apps/landing/styles.css` | Leaderboard section and entry styles | VERIFIED | 14 leaderboard class definitions including `.popular-decks`, `.leaderboard-entry`, `.entry-rank`, `.tag-chip`, plus responsive 480px rules for `flex-wrap: wrap` |
| `apps/landing/script.js` | Fetch logic and DOM injection for popular decks | VERIFIED | `loadPopularDecks()` function: dev guard, `fetch POST /rest/v1/rpc/top_decks`, full HTML builder, `anchor.innerHTML = html`, `escapeHtml()` helper, `LANG_FLAGS` map |
| `.github/workflows/ci-deploy.yml` | Supabase URL and anon key injection into landing page | VERIFIED | Lines 184-190: "Inject Supabase config into landing page" step with `sed -i "s\|__SUPABASE_URL__\|..."` using pipe delimiter, placed after version inject and before scp deploy |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/landing/script.js` | Supabase REST API `/rest/v1/rpc/top_decks` | `fetch POST` with `apikey` header | VERIFIED | Line 55: `fetch(SUPABASE_URL + '/rest/v1/rpc/top_decks', { method: 'POST', headers: { 'apikey': SUPABASE_ANON_KEY, ... } })` |
| `.github/workflows/ci-deploy.yml` | `apps/landing/script.js` | `sed` placeholder replacement at deploy time | VERIFIED | Lines 186-187: `sed -i "s\|__SUPABASE_URL__\|$SUPABASE_URL\|g"` and `sed -i "s\|__SUPABASE_ANON_KEY__\|$SUPABASE_ANON_KEY\|g"` |
| `apps/landing/script.js` | `apps/landing/index.html` | DOM insertion via `anchor.innerHTML` | VERIFIED | Lines 102-104: `document.getElementById('popular-decks-anchor').innerHTML = html` after successful fetch and non-empty array check |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LEAD-01 | 50-01-PLAN.md | RPC Supabase pubblica `top_decks` che ritorna top 10 deck per subscriber count | SATISFIED | Migration creates `top_decks()` with `SECURITY DEFINER`, `GRANT TO anon`, `LIMIT 10`, subscriber `COUNT(DISTINCT ur.user_id)` |
| LEAD-02 | 50-01-PLAN.md | Sezione "Popular Decks" nella landing page dopo Features con fetch client-side | SATISFIED | Anchor div between Features and Screenshots; `loadPopularDecks()` called from `init()`; fetches RPC on DOMContentLoaded |
| LEAD-03 | 50-01-PLAN.md | Ogni deck nella classifica mostra nome, subscriber count, tag chips, e lingua | SATISFIED | Each `leaderboard-entry` renders: rank number, `entry-name`, `entry-subscribers` (bilingual count), `entry-tags` (max 3 tag chips), `entry-lang` (flag emoji) |

All 3 requirements for Phase 50 are satisfied. No orphaned requirements found — REQUIREMENTS.md maps exactly LEAD-01, LEAD-02, LEAD-03 to Phase 50.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/landing/styles.css` | 267 | `"Screenshot coming soon"` in `::after` pseudo-element | INFO | Pre-existing placeholder for screenshots section — unrelated to Phase 50 leaderboard work |

No anti-patterns in Phase 50 code. The `// Dev mode guard: if placeholders not replaced by CI, skip fetch` comment at line 49 is intentional design documentation, not a TODO/FIXME.

---

### Human Verification Required

#### 1. Live leaderboard rendering in production

**Test:** Deploy to production (or use a staging environment with real Supabase credentials). Open the landing page in a browser.
**Expected:** A "Popular Decks" section appears between Features and Screenshots, showing ranked entries with amber rank numbers, deck names, subscriber counts, tag chips, and language flags. Section is absent if no decks have subscribers.
**Why human:** Visual rendering, CSS variable application, and conditional section presence depend on live Supabase data and cannot be verified programmatically.

#### 2. Language toggle switches subscriber label

**Test:** Open landing page, observe an entry showing e.g. "3 subscribers". Click the IT button in the header.
**Expected:** Subscriber label switches to "3 iscritti". Click EN to switch back.
**Why human:** CSS `display: none !important` on `[lang]` elements requires a live browser to confirm the bilingual toggle works end-to-end with dynamically injected HTML.

#### 3. Empty-state behavior

**Test:** Deploy with Supabase credentials pointing to a database with zero decks having subscribers.
**Expected:** No "Popular Decks" section appears anywhere on the page — no empty container, no heading, no loading state.
**Why human:** Requires a controlled data state in a live environment.

---

### Gaps Summary

No gaps found. All 5 must-have truths verified, all 5 artifacts substantive and wired, all 3 key links confirmed, all 3 requirements satisfied.

The SQL migration is clean (no `auth.uid()`, no `RAISE EXCEPTION`, correct `SECURITY DEFINER` pattern). The JS is correct (dev guard prevents fetch when placeholders not replaced, HTML escaping via DOM API, silent failure on error). The CI step uses the pipe delimiter correctly to handle Supabase URLs containing `://`. The leaderboard section is positioned correctly in `index.html` between Features and Screenshots.

Commits 8a421f9 and 5849332 verified to exist in git history.

---

_Verified: 2026-03-18T10:45:00Z_
_Verifier: Claude (gsd-verifier)_
