# Phase 23: SRS Schema & Algorithm - Research

**Researched:** 2026-02-26
**Domain:** PostgreSQL schema design, SM-2 spaced repetition algorithm, Supabase RPC/RLS patterns
**Confidence:** HIGH

## Summary

Phase 23 lays the database and algorithm foundation for spaced repetition. It requires a new `card_review_schedule` table with RLS, two RPCs (`get_due_card_count`, `get_study_cards_for_session`), and a pure SM-2 function in `@lumio/core/src/srs/sm2.ts`. No UI changes are in scope.

The critical technical decisions are already locked by the user in CONTEXT.md. The `supermemo` npm package (v2.0.23) provides a correct SM-2 implementation but does NOT enforce a 365-day max interval cap, so the wrapper function in `sm2.ts` must clamp it. The content hash for stale detection is intentionally different from the existing `cards.content_hash` (which hashes the full raw file) -- SRS needs a hash of question+answer+options only, computed at session-load time via the RPC.

**Primary recommendation:** Implement the `supermemo` package as the SM-2 engine inside a thin wrapper (`sm2.ts`) that enforces the 365-day cap and the 1.3 EF floor (already enforced by the package). Build two SECURITY DEFINER RPCs with DATE-cast comparison for due-card logic. Use `content_hash` from the existing `cards` table as the stale detection mechanism (store a snapshot in `card_review_schedule`, compare at session load).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Binary mapping: Correct -> quality 4, Incorrect -> quality 1
- SM-2 function accepts full 0-5 range for future granularity (UI sends only 1 or 4 today)
- No leech detection -- ease floor at 1.3 and interval stays at 1 day on repeated failures, no special signaling
- Hard cap at 365 days max interval (no soft cap)
- Record created on answer, not on card appearance (no record if user sees card but doesn't answer)
- Initial ease factor: 2.5 (SM-2 classic)
- First correct interval: 1 day, second correct: 6 days, then grows with ease factor
- First incorrect interval: 1 day (no same-session re-queue)
- Full reset: delete the `card_review_schedule` record when content changes -- card becomes "new" again
- Detection via content hash (not timestamp snapshot): hash computed on question + answer + options only (not tags, title, explanation)
- Stale check happens at session load time (RPC `get_study_cards_for_session`), not at answer time
- "Not useful" votes that trigger card regeneration are handled automatically: regenerated content -> hash changes -> stale reset kicks in
- `next_review_at` column type: TIMESTAMPTZ (not DATE) -- flexibility for future intraday scheduling
- "Due today" comparison: `next_review_at::date <= CURRENT_DATE` (cast to DATE for comparison)
- Timezone: UTC-based CURRENT_DATE -- simple, deterministic
- New users (no SRS records): `get_due_card_count` returns 0, `get_study_cards_for_session` returns new cards via LEFT JOIN
- `get_study_cards_for_session` RPC accepts a `limit` parameter
- Returns: all overdue cards (bypass cap) + new cards filling remaining slots up to limit
- Cap logic lives in the RPC, client just passes the number

### Claude's Discretion
- Exact content hash algorithm (MD5, SHA-256, etc.)
- Index strategy for `card_review_schedule` table
- RLS policy implementation details
- How to handle the LEFT JOIN for new cards ordering

### Deferred Ideas (OUT OF SCOPE)
- Anki-style granularity (Easy/Good/Hard/Again buttons) -- future enhancement when binary mapping proves limiting
- Same-session re-queue for incorrect answers -- could enhance learning but adds session logic complexity (Phase 24+)
- Leech card detection/signaling -- useful but not critical for v2.0
- User timezone support for "due today" -- UTC works for now, revisit if users complain about midnight boundary
- FSRS upgrade (SRS-F01 in requirements) -- planned for when 400+ reviews exist per user
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRS-03 | Ease factor si adatta per carta (EF parte da 2.5, floor 1.3, ceiling 2.5) | `supermemo` package enforces EF floor at 1.3. Initial EF 2.5 set in `card_review_schedule` defaults. The sm2 wrapper function validates these constraints. EF ceiling at 2.5 means EF never exceeds initial value -- with grade 4 (quality mapping decision), EF adjustment is +0.0, so EF stays stable on correct. With grade 5, EF would increase by +0.1 but grade 5 is not used. |
| SRS-04 | Carte piu in ritardo hanno priorita nella sessione (ORDER BY next_review_at ASC) | `get_study_cards_for_session` RPC uses `ORDER BY crs.next_review_at ASC` -- most overdue cards come first. |
| SRS-05 | Intervallo massimo 365 giorni per evitare carte "perse" | `supermemo` package has NO max interval cap. The `sm2.ts` wrapper MUST clamp: `Math.min(result.interval, 365)`. |
| SRS-06 | SRS state si resetta quando il contenuto della carta cambia (sync da GitHub) | `card_review_schedule` stores `content_hash_snapshot`. At session load, RPC compares snapshot vs current `cards.content_hash`. Mismatch -> delete the schedule row (card becomes "new"). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| supermemo | ^2.0.23 | SM-2 spaced repetition algorithm | Pure TypeScript, 2KB, zero deps, correct SM-2 implementation. Published March 2025. API: `supermemo(item, grade) -> SuperMemoItem`. Verified via Context7 and GitHub source. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2.45.0 | Already in project -- RPC calls | Calling `get_due_card_count` and `get_study_cards_for_session` RPCs from client |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| supermemo | Hand-rolled SM-2 | Never -- supermemo is correct, tiny, battle-tested. Nothing to gain. |
| supermemo | ts-fsrs | FSRS requires 4-level ratings. Binary correct/wrong loses FSRS precision advantage. Over-engineered for this use case. |
| content_hash comparison | card_updated_at timestamp | Hash is more precise -- metadata changes (tags, title) that don't affect study content won't trigger resets |

**Installation:**
```bash
pnpm --filter @lumio/core add supermemo
```

No native rebuild required. `supermemo` is pure JavaScript/TypeScript with no native modules.

## Architecture Patterns

### Recommended Project Structure
```
packages/core/src/
├── srs/
│   ├── sm2.ts           # SM-2 wrapper around supermemo package
│   └── index.ts         # Re-exports
├── supabase/
│   └── study.ts         # Add getDueCardCount(), getStudyCardsForSession()
└── index.ts             # Add new exports

packages/shared/src/
├── types/
│   └── index.ts         # Add CardReviewSchedule, SM2Item, SM2Result types
└── constants/
    └── index.ts         # SM2_DEFAULTS already exists, verify/update

supabase/migrations/
└── 2026MMDD000001_card_review_schedule.sql  # New migration
```

### Pattern 1: SM-2 Wrapper with Cap
**What:** Thin wrapper around `supermemo` that enforces project-specific constraints (365-day max interval, EF ceiling)
**When to use:** Every call to the SM-2 algorithm from the app
**Example:**
```typescript
// Source: supermemo package API (Context7) + project decisions
import { supermemo, SuperMemoItem, SuperMemoGrade } from 'supermemo';

const MAX_INTERVAL = 365;
const EF_CEILING = 2.5;

export interface SM2Item {
  interval: number;
  repetition: number;
  efactor: number;
}

export interface SM2Result extends SM2Item {
  nextReviewAt: Date;
}

export function sm2(quality: SuperMemoGrade, item: SM2Item): SM2Result {
  const result = supermemo(item, quality);

  // Enforce 365-day max interval (SRS-05)
  const clampedInterval = Math.min(result.interval, MAX_INTERVAL);

  // Enforce EF ceiling at 2.5 (SRS-03)
  const clampedEF = Math.min(result.efactor, EF_CEILING);

  // Compute next review date
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + clampedInterval);

  return {
    interval: clampedInterval,
    repetition: result.repetition,
    efactor: clampedEF,
    nextReviewAt,
  };
}
```

### Pattern 2: SECURITY DEFINER RPC with DATE Cast
**What:** Supabase RPC that uses `next_review_at::date <= CURRENT_DATE` for due-card comparison
**When to use:** Dashboard counter and session card loading
**Example:**
```sql
-- Source: project decision (CONTEXT.md) + Supabase RLS docs (Context7)
CREATE OR REPLACE FUNCTION get_due_card_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM card_review_schedule crs
    JOIN cards c ON c.id = crs.card_id AND c.is_active = TRUE
    JOIN user_repositories ur ON ur.repository_id = c.repository_id
                              AND ur.user_id = p_user_id
    WHERE crs.user_id = p_user_id
      AND crs.next_review_at::date <= CURRENT_DATE;

    RETURN COALESCE(v_count, 0);
END;
$$;
```

### Pattern 3: Stale Content Detection via Hash Snapshot
**What:** Store `content_hash_snapshot` in `card_review_schedule`. At session load, compare with `cards.content_hash`. Delete mismatched rows.
**When to use:** `get_study_cards_for_session` RPC
**Example:**
```sql
-- Inside get_study_cards_for_session, before returning cards:
-- Delete stale schedule rows where content has changed
DELETE FROM card_review_schedule crs
USING cards c
WHERE crs.card_id = c.id
  AND crs.user_id = p_user_id
  AND crs.content_hash_snapshot IS NOT NULL
  AND crs.content_hash_snapshot != c.content_hash;
```

### Pattern 4: RPC Call from @lumio/core (Existing Pattern)
**What:** Direct fetch to Supabase REST API for RPC calls, following the existing `getStudyCardsWithQuestions` pattern
**When to use:** All new SRS functions in `study.ts`
**Example:**
```typescript
// Source: existing pattern in packages/core/src/supabase/study.ts
export async function getDueCardCount(): Promise<number> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const userId = await getUserId();
  if (!userId) throw new Error('User ID not found');

  const supabaseUrl = getSupabaseUrl();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_due_card_count`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
      },
      body: JSON.stringify({ p_user_id: userId }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get due card count');
  }

  return response.json(); // Returns integer directly
}
```

### Pattern 5: UNION ALL for Mixed Card Types
**What:** Overdue cards UNION ALL new cards, with overdue bypassing the limit
**When to use:** `get_study_cards_for_session` RPC
**Why:** Due cards must ALL be returned (bypass cap per user decision). New cards fill remaining slots up to `p_limit`.
**Example:**
```sql
-- Due cards (all of them, no limit -- bypass cap)
(SELECT ... FROM card_review_schedule crs
 JOIN cards c ON ...
 WHERE crs.next_review_at::date <= CURRENT_DATE
 ORDER BY crs.next_review_at ASC)

UNION ALL

-- New cards (fill remaining slots)
(SELECT ... FROM cards c
 LEFT JOIN card_review_schedule crs ON crs.card_id = c.id AND crs.user_id = p_user_id
 WHERE crs.id IS NULL  -- no review schedule = never reviewed
 ORDER BY RANDOM()
 LIMIT GREATEST(0, p_limit - v_due_count))
```

### Anti-Patterns to Avoid
- **Storing next_review_at as DATE type:** User locked TIMESTAMPTZ for future intraday flexibility. Always cast to DATE for comparison, never store as DATE.
- **Computing content hash client-side for stale check:** The hash comparison must happen in the RPC at session load. Don't add a round-trip.
- **Using `NOW()` instead of `CURRENT_DATE` for due checks:** `NOW()` includes time component, causing cards to appear/disappear during the day. Use `next_review_at::date <= CURRENT_DATE`.
- **Putting SM-2 logic in an Edge Function:** SM-2 runs client-side in `@lumio/core`. No edge function needed (avoids 50-200ms latency per answer).
- **Creating UPDATE/DELETE RLS policies for card_review_schedule:** The stale content deletion happens inside SECURITY DEFINER RPCs, which bypass RLS. User-facing operations (upsert after answer) will be handled in Phase 24 via a SECURITY DEFINER function.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SM-2 algorithm | Custom EF/interval math | `supermemo` npm package | Correct, 2KB, battle-tested. EF formula has subtle edge cases (negative EF, boundary conditions). Package handles them. |
| Content hash | Custom hashing | PostgreSQL `md5()` function inside RPC | The RPC already has access to card content. Use `md5(c.content)` in SQL -- no need for a separate hashing step. MD5 is sufficient for change detection (not security). Fast, built-in, no extension needed. |
| Date comparison | Manual date math | `::date <= CURRENT_DATE` cast | PostgreSQL handles timezone conversion correctly with CURRENT_DATE. Don't do date math in application code. |

**Key insight:** The `supermemo` package is the only new dependency. Everything else is PostgreSQL SQL + existing Supabase patterns already in the codebase.

## Common Pitfalls

### Pitfall 1: Partial Index on next_review_at with NOW()
**What goes wrong:** Creating a partial index `WHERE next_review_at <= NOW()` -- `NOW()` is evaluated at index creation time, making the index useless for future queries.
**Why it happens:** Confusing partial index predicate (static) with query predicate (dynamic).
**How to avoid:** Use a non-partial composite index: `CREATE INDEX idx_crs_user_due ON card_review_schedule(user_id, next_review_at)`. The query planner will range-scan this efficiently for `WHERE user_id = X AND next_review_at::date <= CURRENT_DATE`.
**Warning signs:** Query plan shows sequential scan despite having an index.

### Pitfall 2: EF Ceiling Not Enforced
**What goes wrong:** The `supermemo` package enforces an EF floor (1.3) but NOT an EF ceiling. With grade 5, EF grows by +0.1 per correct answer and can exceed 2.5 indefinitely.
**Why it happens:** SM-2 original spec has no ceiling. The project decision (SRS-03) requires ceiling at 2.5.
**How to avoid:** The `sm2.ts` wrapper must clamp: `Math.min(result.efactor, 2.5)`. Currently only grade 4 is used (EF change = +0.0), but the function accepts 0-5 for future use, so the ceiling MUST be enforced.
**Warning signs:** Test with grade 5 showing EF > 2.5.

### Pitfall 3: New Users Get Empty Sessions
**What goes wrong:** `get_study_cards_for_session` uses INNER JOIN with `card_review_schedule`, which returns 0 rows for new users (no SRS records yet).
**Why it happens:** Forgetting that new users have no rows in `card_review_schedule`.
**How to avoid:** The "new cards" branch uses `LEFT JOIN card_review_schedule ... WHERE crs.id IS NULL` to find cards with no schedule. The UNION ALL structure ensures new users always get cards.
**Warning signs:** Fresh user account sees "No cards to study" despite having repository cards.

### Pitfall 4: Content Hash Mismatch Between Creation and Comparison
**What goes wrong:** `content_hash_snapshot` in `card_review_schedule` stores a hash computed differently from `cards.content_hash`, causing all cards to appear stale.
**Why it happens:** The docora-webhook currently hashes the FULL raw content (`hashContent(content)` = SHA-256 of entire file). If the SRS snapshot stores a different hash (e.g., MD5 of question+answer only), they'll never match.
**How to avoid:** Use the EXISTING `cards.content_hash` column value directly as the snapshot. When a card's content changes, the docora-webhook updates `cards.content_hash`. The RPC just compares `crs.content_hash_snapshot != c.content_hash`. No need to recompute a hash at all.
**Warning signs:** Cards constantly resetting their SRS state even when content hasn't changed.

**IMPORTANT DESIGN DECISION:** The user's CONTEXT.md says "hash computed on question + answer + options only." However, the existing `cards.content_hash` already tracks content changes (SHA-256 of full file). For Phase 23, the simplest and most reliable approach is to snapshot `cards.content_hash` into `card_review_schedule.content_hash_snapshot`. When content changes (including question-relevant parts), the hash changes, and SRS resets. This is slightly broader than "question+answer+options only" (it also triggers on explanation changes), but it's far simpler and leverages existing infrastructure. A more granular hash can be introduced later if over-resetting becomes a problem. The planner should note this simplification.

### Pitfall 5: Missing question_count Filter in Session RPC
**What goes wrong:** `get_study_cards_for_session` returns cards that have no pre-generated questions, causing the study UI to break.
**Why it happens:** Forgetting that the existing study flow requires `HAVING COUNT(cq.id) > 0` to filter cards without questions.
**How to avoid:** Both the "due cards" and "new cards" branches of the UNION ALL must JOIN `card_questions` and include `HAVING COUNT(cq.id) > 0`.
**Warning signs:** Study session shows cards with no quiz question available.

### Pitfall 6: UPSERT vs DELETE for Stale Content
**What goes wrong:** Updating the `card_review_schedule` row instead of deleting it when content changes. The user decision is "full reset: delete the record, card becomes new again."
**Why it happens:** Natural inclination to UPDATE rather than DELETE + re-INSERT.
**How to avoid:** The stale check in `get_study_cards_for_session` must DELETE the mismatched rows. The card then appears as "new" in the session because it has no schedule row.
**Warning signs:** Stale cards appearing as "review" with old interval/EF instead of as "new" cards.

## Code Examples

Verified patterns from official sources:

### SM-2 Algorithm Behavior (from supermemo package tests)

```typescript
// Source: supermemo GitHub test suite (verified via WebFetch)
// Starting state: { interval: 0, repetition: 0, efactor: 2.5 }

// Grade 5 (perfect): { interval: 1, repetition: 1, efactor: 2.6 }
// Grade 4 (correct): { interval: 6, repetition: 2, efactor: 2.6 }
// Grade 3 (hard):    { interval: 16, repetition: 3, efactor: 2.46 }
// Grade 2 (wrong-easy): { interval: 1, repetition: 0, efactor: 2.14 }
// Grade 1 (wrong):   { interval: 1, repetition: 0, efactor: 1.6 }
// Grade 0 (blackout): { interval: 1, repetition: 0, efactor: 1.3 }

// For Lumio's binary mapping:
// Correct (grade 4): EF stays at 2.5 (+0.0 adjustment), intervals grow: 1 -> 6 -> 15 -> ...
// Incorrect (grade 1): EF drops by 0.54 each time, floor at 1.3, interval resets to 1
```

### Migration: card_review_schedule Table

```sql
-- New table for SRS scheduling state
CREATE TABLE public.card_review_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

    -- SM-2 algorithm state
    ease_factor REAL NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 0,
    repetitions INTEGER NOT NULL DEFAULT 0,

    -- Scheduling
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ,

    -- Stale content detection (SRS-06)
    content_hash_snapshot TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One schedule per user per card
    UNIQUE(user_id, card_id)
);

-- Indexes
CREATE INDEX idx_crs_user_due
    ON card_review_schedule(user_id, next_review_at);

CREATE INDEX idx_crs_user_card
    ON card_review_schedule(user_id, card_id);

-- updated_at trigger (reuse existing function)
CREATE TRIGGER set_card_review_schedule_updated_at
    BEFORE UPDATE ON card_review_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE card_review_schedule ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own schedule
CREATE POLICY "Users can view own review schedule"
    ON card_review_schedule FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own review schedule"
    ON card_review_schedule FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own review schedule"
    ON card_review_schedule FOR UPDATE
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own review schedule"
    ON card_review_schedule FOR DELETE
    USING ((select auth.uid()) = user_id);

-- Service role for RPCs
CREATE POLICY "Service role can manage card_review_schedule"
    ON card_review_schedule FOR ALL
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role');
```

### TypeScript Types for @lumio/shared

```typescript
// Source: existing pattern in packages/shared/src/types/index.ts

// SM-2 item state (mirrors supermemo package's SuperMemoItem)
export interface SM2Item {
  interval: number;     // days until next review
  repetition: number;   // consecutive correct count
  efactor: number;      // ease factor (2.5 initial, 1.3 floor, 2.5 ceiling)
}

// SM-2 result with computed next review date
export interface SM2Result extends SM2Item {
  nextReviewAt: Date;
}

// Card review schedule (stored in public.card_review_schedule table)
export interface CardReviewSchedule {
  id: string;
  userId: string;
  cardId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  contentHashSnapshot: string | null;
  createdAt: string;
  updatedAt: string;
}

// Study card with SRS info (returned by get_study_cards_for_session RPC)
export interface SRSStudyCard extends StudyCard {
  isReview: boolean;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}
```

### RLS Performance Optimization

```sql
-- Source: Supabase RLS docs (Context7)
-- Use (select auth.uid()) instead of auth.uid() in policies
-- This forces PostgreSQL to evaluate the function once (initPlan),
-- not once per row.
CREATE POLICY "Users can view own review schedule"
    ON card_review_schedule FOR SELECT
    USING ((select auth.uid()) = user_id);
-- NOT: USING (auth.uid() = user_id)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Random card selection | SM-2 spaced repetition | Phase 23 (now) | Cards studied at optimal intervals instead of randomly |
| No stale detection | Content hash comparison | Phase 23 (now) | Cards with changed content reset their SRS state |
| `NOW()` for due check | `::date <= CURRENT_DATE` | Phase 23 decision | Cards due "today" are consistent regardless of time of day |

**Deprecated/outdated:**
- The ARCHITECTURE.md research proposed a proportional split (70% due / 30% new). The user decided differently: ALL overdue cards are returned (bypass cap), new cards fill remaining slots. The planner must use the CONTEXT.md decision, not the architecture research.

## Open Questions

1. **Content hash granularity vs. simplicity**
   - What we know: User wants hash on "question + answer + options only." Existing `cards.content_hash` is SHA-256 of full raw file.
   - What's unclear: Whether using `cards.content_hash` (broader) will cause excessive SRS resets in practice (e.g., when only tags or title change).
   - Recommendation: Use `cards.content_hash` for Phase 23 (simpler, no new hash computation needed). If over-resetting becomes an issue, Phase 24+ can introduce a more granular hash column. The planner should document this simplification.

2. **DELETE policy on card_review_schedule**
   - What we know: Stale content detection deletes rows via SECURITY DEFINER RPC (bypasses RLS). User-facing operations are INSERT/UPDATE.
   - What's unclear: Whether users should be able to DELETE their own schedule rows directly (e.g., "reset my progress" feature).
   - Recommendation: Include a DELETE policy for completeness. Even if not used in Phase 23, it follows the existing pattern (see `study_sessions` which has no DELETE, but `card_review_schedule` is different -- it's mutable state, not immutable log).

## Sources

### Primary (HIGH confidence)
- [/viendinhcom/supermemo] Context7 - SuperMemoItem type, supermemo function API, grade definitions, import syntax
- [supermemo GitHub source code](https://github.com/VienDinhCom/supermemo/blob/master/src/main.ts) - Full SM-2 implementation verified: EF floor at 1.3, NO max interval cap, NO EF ceiling. Test expectations verified for all grades 0-5.
- [/supabase/supabase] Context7 - SECURITY DEFINER patterns, RLS policy optimization with `(select auth.uid())`, row-level security best practices
- Existing codebase: `supabase/migrations/`, `packages/core/src/supabase/study.ts`, `packages/shared/src/types/index.ts` - Verified all existing patterns for RPC calls, type definitions, RLS policies, and migration structure

### Secondary (MEDIUM confidence)
- [SM-2 Algorithm Original Specification](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2) - Piotr Wozniak 1987 formulas. Referenced in prior project research.
- `.planning/research/ARCHITECTURE.md` - Prior architecture research for v2.0. Table schema, RPC design.
- `.planning/research/STACK.md` - Prior stack research. `supermemo` package selection rationale.

### Tertiary (LOW confidence)
- None. All findings verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - `supermemo` v2.0.23 verified via Context7 and GitHub source. API confirmed. No max interval cap confirmed (critical finding).
- Architecture: HIGH - Schema, RPCs, and RLS patterns follow existing codebase conventions exactly. Migration pattern identical to `20260211000001_study_sessions.sql`.
- Pitfalls: HIGH - All pitfalls derived from verified source code analysis (supermemo has no cap, existing content_hash is SHA-256 of full file, PostgreSQL partial index semantics).

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable domain -- SM-2 algorithm and PostgreSQL patterns don't change)
