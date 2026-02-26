# Phase 24: Study Session Integration - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire SRS into the existing study session hook: replace random card selection with due-first ordering via `getStudyCardsForSession` RPC, and write back per-card SRS schedules after every answer. The study UI itself stays unchanged — SRS is invisible to the user in this phase (visual indicators like badges are Phase 25).

</domain>

<decisions>
## Implementation Decisions

### Answer-to-quality mapping
- Binary mapping: correct = quality 4, incorrect = quality 1
- No UI changes to the QuizCard component — same 4-option multiple choice
- SRS scheduling is invisible to the user (no "Next review: X days" feedback)
- Vote system (like/dislike questions) remains completely separate from SRS — votes are about question quality, not card scheduling

### Skip & abort behavior
- Skipping a card = no SRS schedule update. Card stays at its current schedule and will appear again in the next session
- Per-answer SRS writes persist immediately (fire-and-forget per SC#4), so quitting mid-session does NOT lose already-answered updates
- Session summary (`saveStudySession`) still saves at session completion — two separate concerns: SRS scheduling (per-answer) vs study history (session-level)
- No incomplete sessions in study history — if user quits mid-session, no history entry is created, but SRS updates for answered cards are already persisted

### Session composition & overflow
- Show actual card count with breakdown: "50 cards to study (40 overdue + 10 new)"
- No absolute cap on overdue cards — if 200 are overdue, show all 200. User can quit mid-session and progress is saved
- Progress bar reflects the actual total card count (not the user's cardsPerSession limit)
- When zero overdue cards exist, silently fill session with new cards up to the limit — no special messaging

### SRS write-back mechanism
- Server-side RPC: client sends (cardId, quality, contentHash), RPC reads current SRS state, runs SM-2 calculation, writes result + updates card_updated_at_snapshot — single atomic operation
- Retry once silently on network failure, then drop the update. Card will appear again as if not reviewed
- Always-update semantics: if same card answered twice (retry/glitch), second answer overwrites. Simple upsert, no idempotency tracking

### Claude's Discretion
- RPC function naming and parameter design
- Error handling patterns for the retry logic
- How to structure the hook refactor (incremental vs wholesale replacement of card selection)
- TypeScript type updates needed in the hook

</decisions>

<specifics>
## Specific Ideas

- Fire-and-forget pattern should match existing `saveStudySession` approach — same error handling style
- The `getStudyCardsForSession` RPC from Phase 23 already returns SRS-ordered cards — use it to replace `getStudyCardsWithQuestions`
- SM-2 function already exists in `@lumio/core/src/srs/sm2.ts` — the new server-side RPC should replicate this logic in PL/pgSQL

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-study-session-integration*
*Context gathered: 2026-02-26*
