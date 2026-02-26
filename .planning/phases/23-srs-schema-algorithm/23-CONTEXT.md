# Phase 23: SRS Schema & Algorithm - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Database table (`card_review_schedule`), RLS policies, RPCs (`get_due_card_count`, `get_study_cards_for_session`), and SM-2 pure function in `@lumio/core`. Backend/algorithm foundation for spaced repetition — no UI changes in this phase.

Requirements: SRS-03, SRS-04, SRS-05, SRS-06.

</domain>

<decisions>
## Implementation Decisions

### Quality Score Mapping
- Binary mapping: Correct -> quality 4, Incorrect -> quality 1
- SM-2 function accepts full 0-5 range for future granularity (UI sends only 1 or 4 today)
- No leech detection — ease floor at 1.3 and interval stays at 1 day on repeated failures, no special signaling
- Hard cap at 365 days max interval (no soft cap)

### New Card Initial Values
- Record created on answer, not on card appearance (no record if user sees card but doesn't answer)
- Initial ease factor: 2.5 (SM-2 classic)
- First correct interval: 1 day, second correct: 6 days, then grows with ease factor
- First incorrect interval: 1 day (no same-session re-queue)

### Stale Content Reset (SRS-06)
- Full reset: delete the `card_review_schedule` record when content changes — card becomes "new" again
- Detection via content hash (not timestamp snapshot): hash computed on question + answer + options only (not tags, title, explanation)
- Stale check happens at session load time (RPC `get_study_cards_for_session`), not at answer time
- "Not useful" votes that trigger card regeneration are handled automatically: regenerated content -> hash changes -> stale reset kicks in

### Due Card Count Semantics
- `next_review_at` column type: TIMESTAMPTZ (not DATE) — flexibility for future intraday scheduling
- "Due today" comparison: `next_review_at::date <= CURRENT_DATE` (cast to DATE for comparison)
- Timezone: UTC-based CURRENT_DATE — simple, deterministic
- New users (no SRS records): `get_due_card_count` returns 0, `get_study_cards_for_session` returns new cards via LEFT JOIN

### Session Card Limit
- `get_study_cards_for_session` RPC accepts a `limit` parameter
- Returns: all overdue cards (bypass cap) + new cards filling remaining slots up to limit
- Cap logic lives in the RPC, client just passes the number

### Claude's Discretion
- Exact content hash algorithm (MD5, SHA-256, etc.)
- Index strategy for `card_review_schedule` table
- RLS policy implementation details
- How to handle the LEFT JOIN for new cards ordering

</decisions>

<specifics>
## Specific Ideas

- SM-2 algorithm should be a pure function in `@lumio/core/src/srs/sm2.ts` — no database dependencies, easy to test
- Content hash should ignore metadata changes (tags, titles) that don't affect what the user studies
- The "useful vote" system already exists and triggers card regeneration — SRS just needs to detect the content change via hash, no direct coupling needed

</specifics>

<deferred>
## Deferred Ideas

- Anki-style granularity (Easy/Good/Hard/Again buttons) — future enhancement when binary mapping proves limiting
- Same-session re-queue for incorrect answers — could enhance learning but adds session logic complexity (Phase 24+)
- Leech card detection/signaling — useful but not critical for v2.0
- User timezone support for "due today" — UTC works for now, revisit if users complain about midnight boundary
- FSRS upgrade (SRS-F01 in requirements) — planned for when 400+ reviews exist per user

</deferred>

---

*Phase: 23-srs-schema-algorithm*
*Context gathered: 2026-02-26*
