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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v2.0 | ~4 | 4 | First milestone with audit-before-complete workflow; gap closure pattern |
| v2.1 | ~5 | 5 | Largest since v1.1; post-ship quick fixes revealed UAT gaps |
| v2.2 | ~2 | 2 | Cleanest milestone — zero deviations, zero issues |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v2.0 | 10 (SM-2 unit) | SRS module only | supermemo@2.0.23, vitest@4.0.18 |
| v2.1 | — | Auth flows (manual) | — |
| v2.2 | — | Session limit (manual) | — |

### Top Lessons (Verified Across Milestones)

1. Research-first planning pays off — prevents mid-milestone pivots (validated v1.1 through v2.0)
2. Server-side computation for stateful operations avoids race conditions and simplifies client code (v2.0, v2.2)
3. Small gap closure plans are more efficient than trying to get everything right in the first pass (v2.0)
4. Small, focused milestones execute cleanly with near-zero overhead (v2.2)
5. Reusing patterns across phases in the same milestone accelerates development (v2.2)
