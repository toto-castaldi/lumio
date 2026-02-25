# Stack Research: v2.0 Spaced Repetition

**Domain:** SRS algorithm + card progress tracking + dashboard counter for Lumio Android
**Researched:** 2026-02-25
**Scope:** NEW additions only. Existing stack (Expo SDK 54, RN 0.81, react-navigation, Supabase, i18n-js, etc.) is validated and not re-researched.
**Confidence:** HIGH

---

## Recommended Stack Additions

### SRS Algorithm Library

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| supermemo | ^2.0.23 | SM-2 spaced repetition scheduling | **The right weight class for this use case.** Lumio uses binary correct/incorrect answers (quiz: 4-option multiple choice). SM-2 maps directly to this: correct = grade 5, incorrect = grade 0. Three fields to persist per card (interval, repetition, efactor). Zero dependencies, pure TypeScript, 2KB. Published March 2025. The algorithm is correct and universally understood. |

**Why `supermemo` over `ts-fsrs`:**

ts-fsrs (v5.2.3, Sep 2025) implements FSRS v6 — the modern Anki algorithm trained on 700M reviews. FSRS is measurably better for long-term scheduling. However, it requires 4-level ratings (Again/Hard/Good/Easy) to work properly, and it persists 7+ fields per card (stability, difficulty, elapsed_days, scheduled_days, reps, lapses, state, last_review, due). Lumio's quiz is binary (right/wrong) — mapping two outcomes to four FSRS grades loses the precision that makes FSRS better than SM-2. **When your input is binary, SM-2's simpler model is appropriate.**

supermemo persists exactly 3 fields: `interval` (days until next review), `repetition` (consecutive correct count), `efactor` (ease factor, initialized to 2.5). The new table is 4 columns. FSRS would need 8+ columns and a review_log table.

**Why NOT a hand-rolled SM-2:**

The `supermemo` package is a correct, battle-tested, 2KB SM-2 implementation. Hand-rolling saves nothing and introduces bugs.

**Confidence:** HIGH — version verified via npm registry, algorithm match to Lumio's binary quiz confirmed from codebase analysis.

### No New React Native Libraries Needed

The dashboard counter, study session badge, and card mix logic require only:
- New Supabase DB table (`user_card_progress`)
- New Supabase DB function (`get_due_card_count`)
- New functions in `@lumio/core/src/supabase/study.ts`
- New types in `@lumio/shared/src/types/index.ts`
- UI changes to existing screens (DashboardScreen, StudyScreen, StudyHistoryScreen)

No new React Native packages are required. All UI components (StatCard, badges, counters) are built with existing StyleSheet + Ionicons patterns already in the project.

---

## Database: New Table Required

### `user_card_progress` Table

This is the central new addition for SRS. It tracks SM-2 state **per user per card**.

```sql
CREATE TABLE public.user_card_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  -- SM-2 algorithm state (from supermemo package)
  interval INTEGER NOT NULL DEFAULT 0,       -- days until next review
  repetition INTEGER NOT NULL DEFAULT 0,     -- consecutive correct count
  efactor REAL NOT NULL DEFAULT 2.5,         -- ease factor (initialized to 2.5 per SM-2 spec)
  -- Scheduling
  due_date TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- when this card is next due
  last_reviewed_at TIMESTAMPTZ,
  -- Constraint: one row per user+card
  UNIQUE(user_id, card_id)
);
```

**Why `UNIQUE(user_id, card_id)` not a composite PK:** Allows `INSERT ... ON CONFLICT (user_id, card_id) DO UPDATE` (upsert) pattern from the app, which is the natural update primitive.

**Why `efactor REAL` not `NUMERIC(4,2)`:** The SM-2 formula produces floating-point values. REAL matches the JS `number` type without truncation risk.

**Why `due_date` stored (not computed):** The query `WHERE due_date <= NOW()` for the dashboard counter must use an index. Storing `due_date` enables a simple indexed query. If derived from `last_reviewed_at + interval`, the query would need a computed expression index.

**RLS:** `USING (auth.uid() = user_id)` for SELECT and INSERT/UPDATE. Users only see/modify their own progress.

### Supporting DB Function

```sql
-- Returns count of cards due for review for the authenticated user
CREATE OR REPLACE FUNCTION get_due_card_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM user_card_progress
  WHERE user_id = p_user_id
    AND due_date <= NOW();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Why a DB function, not a raw REST query:** The dashboard needs a single integer. The function hides the query complexity and is callable via `rpc/get_due_card_count` without exposing table structure.

---

## Integration Points

### `@lumio/core` — New Functions Needed

Add to `packages/core/src/supabase/study.ts`:

```typescript
// Upsert SRS progress after each card answer
export async function updateCardProgress(
  cardId: string,
  grade: 0 | 5  // correct = 5, incorrect = 0
): Promise<void>

// Get count of cards due for review today
export async function getDueCardCount(): Promise<number>

// Get ordered list of cards for SRS study session
// Returns: expired due cards first, then new cards, up to limit
export async function getSRSStudyQueue(limit: number): Promise<StudyCard[]>
```

### `@lumio/shared` — New Types Needed

Add to `packages/shared/src/types/index.ts`:

```typescript
// SRS progress for a single card (stored in user_card_progress table)
export interface CardProgress {
  id: string;
  userId: string;
  cardId: string;
  interval: number;        // days until next review (SM-2)
  repetition: number;      // consecutive correct count (SM-2)
  efactor: number;         // ease factor, initialized to 2.5 (SM-2)
  dueDate: string;         // ISO timestamp of next review
  lastReviewedAt: string | null;
}

// Input for upserting card progress
export interface UpdateCardProgressOptions {
  cardId: string;
  interval: number;
  repetition: number;
  efactor: number;
  dueDate: string;
}

// Card with SRS state attached (for study queue)
export interface SRSStudyCard extends StudyCard {
  isDue: boolean;          // true if due_date <= now
  isNew: boolean;          // true if no progress record exists
  dueDate: string | null;  // null for new cards
}
```

### Hook Changes

The existing `useStudySession` hook needs extension, not replacement:

- Add SRS mode flag to distinguish random (legacy) vs SRS scheduling
- After `handleAnswer`, call `updateCardProgress` with grade 5 (correct) or 0 (incorrect)
- Card loading in SRS mode uses `getSRSStudyQueue` instead of `getStudyCardsWithQuestions`
- Track `isDue` / `isNew` on current card for the in-session badge

### Dashboard Changes

`DashboardScreen.tsx` — add a fourth StatCard:

```typescript
const [dueCount, setDueCount] = useState(0);

// In fetchStats():
const count = await getDueCardCount();
setDueCount(count);
```

StatCard with icon `"refresh-outline"` and orange/amber color (matching the last-studied card).

### Study History Fix

The `StudyHistoryScreen` shows `item.repositoryName ?? t('history.allRepos')` for the repo column. The bug: when `repositoryName` is null (cross-repo sessions), it shows "All Repos" which is misleading. Fix: store `total_count` (already stored) and display `N cards` instead of repo name in the center column. No schema change needed.

---

## Installation

```bash
# From monorepo root — add to @lumio/android
pnpm --filter @lumio/android add supermemo
```

No native rebuild required. `supermemo` is pure JavaScript/TypeScript with no native modules.

Also add to `@lumio/core` dependencies if the SRS scheduling logic lives there:

```bash
pnpm --filter @lumio/core add supermemo
```

**Recommendation:** Place the `supermemo(card, grade)` call in `@lumio/core` alongside the Supabase upsert. This keeps the algorithm + persistence co-located and the app only calls `updateCardProgress(cardId, isCorrect)`.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| supermemo (SM-2) | ts-fsrs (FSRS v6) | If Lumio adds multi-level ratings (Again/Hard/Good/Easy) in a future milestone. FSRS is genuinely better for nuanced recall grading. Current binary correct/wrong maps better to SM-2. |
| supermemo (SM-2) | Hand-rolled SM-2 | Never — the package is correct, tiny, and battle-tested. Nothing to gain. |
| supermemo (SM-2) | @open-spaced-repetition/sm-2-ts | Both implement the same algorithm. supermemo (2.0.23, Mar 2025) has more downloads, is slightly older/more proven, and the README is clearer. Either works. |
| Supabase DB upsert | AsyncStorage for SRS state | AsyncStorage is local-only. SRS progress must survive reinstall and be shared if user logs in on another device. DB is correct here. |
| Dedicated `user_card_progress` table | Add SRS columns to `cards` table | `cards` is shared across users (one card row per card, not per user). SRS progress is per-user, so it must be a separate table with `user_id`. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| ts-fsrs | FSRS requires 4-rating input (Again/Hard/Good/Easy). Lumio's binary quiz loses FSRS's advantage. 7+ DB columns vs 3. Over-engineered for binary grading. | supermemo (SM-2) |
| react-native-reanimated | No new animations needed. Dashboard counter and session badges are static UI. | Not needed |
| @gorhom/bottom-sheet | Already decided against in prior research. Custom Modal pattern works. | Existing Modal pattern |
| Supabase Realtime for due counter | Dashboard counter refreshes on pull-to-refresh and screen focus. Real-time push for a study counter is over-engineering. | Simple fetch in `fetchStats()` |
| expo-background-fetch | SRS review reminders are out of scope per PROJECT.md. | Out of scope |

---

## Version Compatibility

| Package | Compatible With | Requires Native Rebuild | Notes |
|---------|-----------------|------------------------|-------|
| supermemo ^2.0.23 | Any JS runtime, Expo SDK 54 | No | Pure TypeScript, no native deps, ESM + CJS exports |
| New Supabase migration | Existing Supabase local + production | No | Standard `supabase/migrations/` pattern |
| `@lumio/core` additions | @lumio/android as-is | No | Adding functions to existing module |
| `@lumio/shared` additions | @lumio/android as-is | No | Adding types to existing module |

---

## Sources

- [supermemo npm registry](https://registry.npmjs.org/supermemo) — version 2.0.23, published 2025-03-20, verified via Node.js fetch
- [supermemo GitHub (VienDinhCom/supermemo)](https://github.com/VienDinhCom/supermemo) — SuperMemoItem type: `{interval, repetition, efactor}`, grade range 0-5, API verified
- [ts-fsrs npm registry](https://registry.npmjs.org/ts-fsrs) — version 5.2.3, published 2025-09-05, zero peer deps, verified via Node.js fetch
- [open-spaced-repetition/ts-fsrs GitHub](https://github.com/open-spaced-repetition/ts-fsrs) — FSRS v6, Card type fields (due, stability, difficulty, elapsed_days, state), 4-level Rating enum
- FSRS vs SM-2 comparison — [MemoForge Blog 2025](https://memoforge.app/blog/fsrs-vs-sm2-anki-algorithm-guide-2025/): FSRS better for nuanced grading, SM-2 simpler and correct for binary outcomes
- Codebase analysis: `apps/android/hooks/useStudySession.ts`, `packages/core/src/supabase/study.ts`, `packages/shared/src/types/index.ts`, `supabase/migrations/20260211000001_study_sessions.sql` — confirmed binary correct/wrong quiz model, existing DB patterns, study.ts architecture

---

*Stack research for: Lumio v2.0 Spaced Repetition — SRS algorithm, card progress tracking, dashboard review counter*
*Researched: 2026-02-25*
