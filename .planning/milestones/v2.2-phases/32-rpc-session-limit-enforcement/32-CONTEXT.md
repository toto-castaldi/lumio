# Phase 32: RPC Session Limit Enforcement - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Backend RPC caps cards to chosen limit with overdue-first priority. The `get_study_cards_for_session` RPC currently returns ALL overdue cards (bypassing the cap) then fills remaining with new cards. This phase enforces the total never exceeds `p_limit`, and updates the frontend to pass the correct signal. Dashboard counter changes are Phase 33.

</domain>

<decisions>
## Implementation Decisions

### Overdue dominance
- Pure overdue-first within the cap: if limit=20 and 30 overdue exist, return 20 most-overdue, 0 new cards
- No reserved new-card slots — user clears backlog before seeing new material
- No "remaining overdue" hint in this phase — Phase 33 dashboard handles that via existing `get_due_card_count`
- Keep `get_due_card_count` as a separate query — no metadata added to the session RPC

### Frontend limit signaling
- NULL means unlimited: pass `p_limit=NULL` for Auto, numeric value for capped sessions
- RPC default changes from `DEFAULT 10` to `DEFAULT NULL` (safer: matches current production behavior)
- Frontend hook change happens in Phase 32 for end-to-end enforcement (not deferred to Phase 33)
- `getStudyCardsForSession` TypeScript function accepts `null | number` (not 'all' string alias)
- Hook translates `'auto'` CardsPerSession to `null` before calling the core function

### CardsPerSession type
- Rename `'all'` to `'auto'` in Phase 32: type becomes `10 | 20 | 50 | 'auto'`
- Available options stay 10/20/50/auto (no new values)
- AsyncStorage migration: `loadCardsPerSession` reads both `'all'` and `'auto'` as the auto value; `saveCardsPerSession` writes `'auto'`

### Claude's Discretion
- SQL implementation approach for the cap (LIMIT clause vs subquery)
- Migration file naming and structure
- Exact TypeScript refactoring in the hook

</decisions>

<specifics>
## Specific Ideas

No specific requirements — the REQUIREMENTS.md (SESS-01, SESS-02) and success criteria are precise enough.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `get_study_cards_for_session` RPC: `supabase/migrations/20260226000003_timezone_checks_fresh_user.sql` — current version with timezone-aware logic, needs LIMIT change
- `get_due_card_count` RPC: same migration file — already counts overdue + new, no changes needed
- `getStudyCardsForSession()`: `packages/core/src/supabase/study.ts:509` — accepts `limit: number`, needs to accept `null | number`
- `useStudySession` hook: `apps/android/hooks/useStudySession.ts:87` — translates CardsPerSession to limit, calls core function
- `studySettings.ts`: `apps/android/lib/studySettings.ts` — CardsPerSession type, AsyncStorage persistence
- `StudySettingsContext.tsx`: `apps/android/contexts/StudySettingsContext.tsx` — provides CardsPerSession to the app

### Established Patterns
- SQL RPC migrations: new migration file that DROPs old function signature and CREATEs new one
- RPC parameter naming: `p_user_id`, `p_limit`, `p_timezone` convention
- Frontend-to-RPC: core function makes fetch call to `/rest/v1/rpc/{name}`, hook consumes core function

### Integration Points
- `useStudySession` hook is the single consumer of `getStudyCardsForSession`
- `CardsPerSession` type used in SettingsScreen selector and StudySettingsContext
- i18n files (`en.ts`, `it.ts`) reference session size labels — Phase 33 handles "Auto" label

</code_context>

<deferred>
## Deferred Ideas

- "Auto" label rename in UI selector — Phase 33 (UI-01)
- Dashboard counter respecting session limit — Phase 33 (DASH-01, DASH-02)
- Smart "Auto" mode (dynamic card count based on time/performance) — out of scope per REQUIREMENTS.md

</deferred>

---

*Phase: 32-rpc-session-limit-enforcement*
*Context gathered: 2026-03-04*
