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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v2.0 | ~4 | 4 | First milestone with audit-before-complete workflow; gap closure pattern |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v2.0 | 10 (SM-2 unit) | SRS module only | supermemo@2.0.23, vitest@4.0.18 |

### Top Lessons (Verified Across Milestones)

1. Research-first planning pays off — prevents mid-milestone pivots (validated v1.1 through v2.0)
2. Server-side computation for stateful operations avoids race conditions and simplifies client code (v2.0)
3. Small gap closure plans are more efficient than trying to get everything right in the first pass (v2.0)
