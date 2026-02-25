# Architecture Patterns: Spaced Repetition Integration

**Domain:** Spaced repetition scheduling for existing flashcard study app
**Researched:** 2026-02-25
**Confidence:** HIGH (based on codebase analysis + established algorithm research)

---

## Executive Summary

Lumio's v2.0 spaced repetition feature integrates into the existing architecture through one new database table (`card_review_schedule`), modifications to the card selection logic in `useStudySession`, a new RPC function for due-card counting, and minor dashboard/UI changes. The existing `study_sessions` table (immutable, INSERT-only) stays untouched. The core SM-2 algorithm runs client-side in `@lumio/core` -- no new edge functions needed. The existing `study-planner` edge function stub can be deleted or repurposed later.

---

## Current Architecture (Baseline)

### Data Flow: Study Session

```
DashboardScreen
  |-- "Start Study Session" button
  v
StudyScreen
  |-- useStudySession hook (loads data)
  |     |-- getStudyCardsWithQuestions() --> RPC: get_study_cards_with_questions
  |     |-- getUserRepositories() --> REST: repositories table
  |     |-- Deck class filters per .lumioignore
  |     |-- selectRandomCard() --> random unseen card from pool
  |     |-- getPreGeneratedQuestion(cardId) --> Edge Function: llm-proxy (get_question action)
  |     v
  |-- QuizCard component (displays question, captures answer)
  |-- handleAnswer() --> sets userAnswer in state
  |-- handleNext() --> saves answered card, loads next random card
  |-- On completion:
  |     |-- saveStudySession() --> REST INSERT into study_sessions
  |     |-- AsyncStorage.setItem('@lumio/lastStudiedAt')
  |     v
  v
StudySummaryScreen (route params: totalCards, correctCount, etc.)
```

### Key Existing Tables

| Table | Purpose | Relevant Columns |
|-------|---------|------------------|
| `cards` | Flashcard content from Git repos | id, repository_id, file_path, title, content, is_active |
| `card_questions` | Pre-generated quiz questions per card | id, card_id, question_text, options, correct_answer, is_active |
| `study_sessions` | Immutable log of completed sessions | id, user_id, correct_count, total_count, duration_seconds |
| `user_repositories` | Many-to-many: user <-> repo subscription | user_id, repository_id |
| `platform_config` | Key-value admin settings | key, value |

### Key Existing Code Modules

| Module | Location | Role |
|--------|----------|------|
| `useStudySession` | `apps/android/hooks/useStudySession.ts` | Orchestrates study flow: load cards, random selection, track answers |
| `study.ts` | `packages/core/src/supabase/study.ts` | API layer: fetch study cards, questions, save sessions |
| `Deck` | `packages/core/src/deck/Deck.ts` | .lumioignore filtering for card pool |
| `types/index.ts` | `packages/shared/src/types/index.ts` | Shared TypeScript types |
| `StudyScreen` | `apps/android/screens/StudyScreen.tsx` | UI: quiz display, navigation |
| `DashboardScreen` | `apps/android/screens/DashboardScreen.tsx` | UI: stats display, study CTA |
| `StudyHistoryScreen` | `apps/android/screens/StudyHistoryScreen.tsx` | UI: past session list |

---

## Recommended Architecture: Spaced Repetition

### Algorithm Choice: SM-2 (not FSRS)

**Use SM-2 because:**
1. **Simplicity matches the project scope.** SM-2 requires 3 values per card (ease_factor, interval, repetitions). FSRS requires 5+ values (stability, difficulty, elapsed_days, scheduled_days, state, learning_steps, reps, lapses) plus parameter optimization.
2. **No ML training needed.** FSRS's advantage (20-30% fewer reviews) comes from training on user history. With a single-user app and low review volume, this advantage is negligible.
3. **Deterministic and debuggable.** SM-2 is a fixed formula. FSRS is a neural network -- harder to debug when scheduling seems off.
4. **Proven for 35+ years.** Anki used SM-2 as default for over a decade. It works well enough.
5. **Zero dependencies.** SM-2 is ~30 lines of code. FSRS via ts-fsrs adds a dependency with its own versioning.
6. **Existing stub mentions SM-2.** The `study-planner` edge function comment says "SM-2 algorithm."

**SM-2 Core Formula:**
```
Per card per user:
  - ease_factor: starts at 2.5, adjusts per response quality
  - interval: days until next review (1, 6, then interval * ease_factor)
  - repetitions: count of consecutive correct answers

On correct answer (quality >= 3):
  repetitions++
  if repetitions == 1: interval = 1
  if repetitions == 2: interval = 6
  else: interval = round(interval * ease_factor)

On incorrect answer (quality < 3):
  repetitions = 0
  interval = 1

Ease factor adjustment:
  ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  ease_factor = max(1.3, ease_factor)
```

**Quality mapping for Lumio (simplified):**
- Correct answer = quality 4 (Good)
- Incorrect answer = quality 1 (Bad)
- Skipped = quality 0 (Complete failure, treated as wrong)

This is a deliberate simplification. Lumio's quiz is multiple-choice with A/B/C/D -- there is no granular "how hard was it" input. Binary correct/incorrect maps cleanly to quality 4 vs quality 1.

### New Database Table: `card_review_schedule`

```sql
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

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One schedule per user per card
    UNIQUE(user_id, card_id)
);

-- Indexes
CREATE INDEX idx_card_review_schedule_user_due
    ON card_review_schedule(user_id, next_review_at)
    WHERE next_review_at <= NOW();

CREATE INDEX idx_card_review_schedule_user_card
    ON card_review_schedule(user_id, card_id);

-- RLS
ALTER TABLE card_review_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own review schedule"
    ON card_review_schedule FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own review schedule"
    ON card_review_schedule FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own review schedule"
    ON card_review_schedule FOR UPDATE
    USING (auth.uid() = user_id);

-- No DELETE policy: schedule entries persist (reset via UPDATE)
```

**Design decisions:**
- `ease_factor REAL` not `NUMERIC`: SM-2 values are approximate, REAL (4 bytes) is sufficient, no precision concerns.
- `interval_days INTEGER`: Whole days, matching SM-2 spec. No sub-day precision needed.
- `next_review_at TIMESTAMPTZ`: Computed as `last_reviewed_at + interval_days`. Stored pre-computed for efficient querying ("cards due now").
- `UNIQUE(user_id, card_id)`: One schedule row per user per card. UPSERT pattern for updates.
- No DELETE policy: Schedule rows are long-lived. When a card is deleted, CASCADE handles cleanup.

### New RPC Function: `get_due_card_count`

```sql
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
    JOIN user_repositories ur ON ur.repository_id = c.repository_id AND ur.user_id = p_user_id
    WHERE crs.user_id = p_user_id
      AND crs.next_review_at <= NOW();

    RETURN v_count;
END;
$$;
```

This powers the dashboard "cards due for review" counter.

### New RPC Function: `get_study_cards_for_session`

New RPC that replaces the current `get_study_cards_with_questions` for study session initialization. Returns cards in priority order: due cards first, then new cards.

```sql
CREATE OR REPLACE FUNCTION get_study_cards_for_session(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    card_id UUID,
    repository_id UUID,
    file_path TEXT,
    title TEXT,
    content TEXT,
    raw_content TEXT,
    tags TEXT[],
    difficulty INTEGER,
    question_count BIGINT,
    is_review BOOLEAN,         -- true = due card, false = new card
    ease_factor REAL,
    interval_days INTEGER,
    repetitions INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_due_count INTEGER;
    v_new_limit INTEGER;
    v_due_limit INTEGER;
BEGIN
    -- Count due cards
    SELECT COUNT(*) INTO v_due_count
    FROM card_review_schedule crs
    JOIN cards c ON c.id = crs.card_id AND c.is_active = TRUE
    JOIN user_repositories ur ON ur.repository_id = c.repository_id AND ur.user_id = p_user_id
    WHERE crs.user_id = p_user_id
      AND crs.next_review_at <= NOW();

    -- Proportional split: at least 70% due cards, rest new
    v_due_limit := LEAST(v_due_count, GREATEST(p_limit * 7 / 10, p_limit - 5));
    v_new_limit := p_limit - v_due_limit;

    RETURN QUERY
    -- Due cards (review)
    (SELECT
        c.id AS card_id,
        c.repository_id,
        c.file_path,
        c.title,
        c.content,
        c.raw_content,
        c.tags,
        c.difficulty,
        COUNT(cq.id) AS question_count,
        TRUE AS is_review,
        crs.ease_factor,
        crs.interval_days,
        crs.repetitions
    FROM card_review_schedule crs
    JOIN cards c ON c.id = crs.card_id AND c.is_active = TRUE
    JOIN user_repositories ur ON ur.repository_id = c.repository_id AND ur.user_id = p_user_id
    LEFT JOIN card_questions cq ON cq.card_id = c.id AND cq.is_active = TRUE
    WHERE crs.user_id = p_user_id
      AND crs.next_review_at <= NOW()
    GROUP BY c.id, c.repository_id, c.file_path, c.title, c.content, c.raw_content, c.tags, c.difficulty,
             crs.ease_factor, crs.interval_days, crs.repetitions
    HAVING COUNT(cq.id) > 0
    ORDER BY crs.next_review_at ASC
    LIMIT v_due_limit)

    UNION ALL

    -- New cards (never reviewed by this user)
    (SELECT
        c.id AS card_id,
        c.repository_id,
        c.file_path,
        c.title,
        c.content,
        c.raw_content,
        c.tags,
        c.difficulty,
        COUNT(cq.id) AS question_count,
        FALSE AS is_review,
        2.5::REAL AS ease_factor,
        0 AS interval_days,
        0 AS repetitions
    FROM cards c
    JOIN user_repositories ur ON ur.repository_id = c.repository_id AND ur.user_id = p_user_id
    LEFT JOIN card_questions cq ON cq.card_id = c.id AND cq.is_active = TRUE
    LEFT JOIN card_review_schedule crs ON crs.card_id = c.id AND crs.user_id = p_user_id
    WHERE c.is_active = TRUE
      AND crs.id IS NULL  -- no review schedule = never seen
    GROUP BY c.id, c.repository_id, c.file_path, c.title, c.content, c.raw_content, c.tags, c.difficulty
    HAVING COUNT(cq.id) > 0
    ORDER BY RANDOM()
    LIMIT v_new_limit);
END;
$$;
```

### Component Boundaries: What Changes, What Stays

```
EXISTING (no changes)              NEW / MODIFIED
================================   ================================
cards table                        card_review_schedule table (NEW)
card_questions table               get_study_cards_for_session RPC (NEW)
study_sessions table               get_due_card_count RPC (NEW)
question_votes table
platform_config table

Deck class (filtering)             sm2.ts in @lumio/core (NEW)
CardView class                     study.ts: new API functions (MODIFIED)
                                   types/index.ts: new types (MODIFIED)

StudyScreen.tsx (UI stays same)    useStudySession.ts (MODIFIED: selection logic)
StudySummaryScreen.tsx             DashboardScreen.tsx (MODIFIED: due count)
CardListScreen.tsx                 StudyHistoryScreen.tsx (MODIFIED: card count fix)
CardDetailScreen.tsx

AppNavigator.tsx                   i18n/en.ts, i18n/it.ts (MODIFIED: new strings)
MainNavigator.tsx
AuthNavigator.tsx

llm-proxy edge function
git-sync edge function
docora-webhook edge function
question-generator edge function
```

---

## Detailed Data Flow: After Spaced Repetition

### Study Session Flow (Modified)

```
DashboardScreen
  |-- Shows "X cards due for review" (NEW)
  |-- "Start Study Session" button
  v
StudyScreen
  |-- useStudySession hook (MODIFIED)
  |     |-- get_study_cards_for_session RPC (NEW) -- returns due + new cards
  |     |     (replaces getStudyCardsWithQuestions + random selection)
  |     |-- getUserRepositories() --> REST (unchanged)
  |     |-- Deck class filters per .lumioignore (unchanged)
  |     |-- Cards arrive pre-ordered: due first, then new (no random for due)
  |     |-- Each card tagged: is_review=true/false
  |     |-- getPreGeneratedQuestion(cardId) --> same as before
  |     v
  |-- QuizCard component (unchanged)
  |-- handleAnswer() --> sets userAnswer (unchanged)
  |-- handleNext() --> saves answered card + calls updateReviewSchedule (MODIFIED)
  |     |-- updateReviewSchedule():
  |     |     1. Compute SM-2 output (client-side in @lumio/core)
  |     |     2. UPSERT into card_review_schedule via REST
  |     v
  |-- On completion:
  |     |-- saveStudySession() --> same as before
  |     |-- AsyncStorage.setItem('@lumio/lastStudiedAt') --> same
  |     v
  v
StudySummaryScreen (unchanged, but shows card count instead of "all repos")
```

### SM-2 Computation: Client-Side in @lumio/core

```
packages/core/src/srs/sm2.ts (NEW FILE)

export interface SM2Input {
  quality: number;       // 0-5
  easeFactor: number;    // previous, default 2.5
  interval: number;      // previous, in days
  repetitions: number;   // previous, default 0
}

export interface SM2Output {
  easeFactor: number;
  interval: number;      // in days
  repetitions: number;
  nextReviewAt: Date;    // computed from now + interval
}

export function computeSM2(input: SM2Input): SM2Output { ... }
```

**Why client-side, not edge function:**
- SM-2 is ~30 lines of pure math with no external dependencies.
- Running server-side would add latency per card answer (network round-trip).
- The `study-planner` edge function is not needed for SM-2 -- the computation is trivial.
- Result is written to DB via REST UPSERT (same pattern as saveStudySession).

### Schedule Update: UPSERT Pattern

```typescript
// In packages/core/src/supabase/study.ts (new export)

export async function updateReviewSchedule(
  cardId: string,
  sm2Output: SM2Output
): Promise<void> {
  // UPSERT via Supabase REST with Prefer: resolution=merge-duplicates
  // Sets ease_factor, interval_days, repetitions, next_review_at, last_reviewed_at
}
```

This is fire-and-forget (same pattern as saveStudySession). Does not block navigation to next card.

### Dashboard: Due Count

```typescript
// In packages/core/src/supabase/study.ts (new export)

export async function getDueCardCount(): Promise<number> {
  // Calls RPC get_due_card_count
}
```

Dashboard calls this alongside existing `getUserStats()` on mount and refresh.

---

## Component Architecture: New and Modified Files

### Layer 1: Database (Supabase Migration)

| Change | File | Type |
|--------|------|------|
| New table `card_review_schedule` | `supabase/migrations/YYYYMMDD_card_review_schedule.sql` | NEW |
| New RPC `get_due_card_count` | Same migration file | NEW |
| New RPC `get_study_cards_for_session` | Same migration file | NEW |
| Platform config: `new_cards_per_session` | Same migration file | NEW |

### Layer 2: Shared Types (packages/shared)

| Change | File | Type |
|--------|------|------|
| `CardReviewSchedule` interface | `packages/shared/src/types/index.ts` | MODIFIED (add type) |
| `StudyCard` extended with `isReview`, schedule fields | `packages/shared/src/types/index.ts` | MODIFIED (extend) |
| `SM2Input`, `SM2Output` interfaces | `packages/shared/src/types/index.ts` | MODIFIED (add types) |

### Layer 3: Core Library (packages/core)

| Change | File | Type |
|--------|------|------|
| SM-2 algorithm implementation | `packages/core/src/srs/sm2.ts` | NEW |
| `updateReviewSchedule()` | `packages/core/src/supabase/study.ts` | MODIFIED (add export) |
| `getDueCardCount()` | `packages/core/src/supabase/study.ts` | MODIFIED (add export) |
| `getStudyCardsForSession()` | `packages/core/src/supabase/study.ts` | MODIFIED (add export) |
| Re-export SM-2 + new functions | `packages/core/src/index.ts` | MODIFIED (add exports) |

### Layer 4: Android App

| Change | File | Type |
|--------|------|------|
| Use new card selection (due + new mix) | `apps/android/hooks/useStudySession.ts` | MODIFIED |
| Call `updateReviewSchedule` after each answer | `apps/android/hooks/useStudySession.ts` | MODIFIED |
| Show due card count on dashboard | `apps/android/screens/DashboardScreen.tsx` | MODIFIED |
| Show "Review" / "New" badge during study | `apps/android/screens/StudyScreen.tsx` | MODIFIED (minor) |
| Show card count instead of "all repos" in history | `apps/android/screens/StudyHistoryScreen.tsx` | MODIFIED (minor) |
| New i18n strings | `apps/android/i18n/en.ts`, `it.ts` | MODIFIED |

---

## Patterns to Follow

### Pattern 1: Fire-and-Forget Database Write

**What:** Write review schedule updates without blocking the UI.
**Why:** Same pattern already used for `saveStudySession()`. User should never wait for DB write to proceed to next card.

```typescript
// In useStudySession.ts handleNext():
const sm2Result = computeSM2({
  quality: isCorrect ? 4 : 1,
  easeFactor: currentCard.easeFactor ?? 2.5,
  interval: currentCard.intervalDays ?? 0,
  repetitions: currentCard.repetitions ?? 0,
});

// Fire and forget
updateReviewSchedule(currentCard.id, sm2Result)
  .catch(err => console.error('Failed to update review schedule:', err));
```

### Pattern 2: UPSERT for Schedule Rows

**What:** Use PostgreSQL's ON CONFLICT for card_review_schedule writes.
**Why:** First review of a card creates the row. Subsequent reviews update it. Single code path for both.

```typescript
// Via Supabase REST with Prefer: resolution=merge-duplicates
const response = await fetch(`${supabaseUrl}/rest/v1/card_review_schedule`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    apikey: getSupabaseAnonKey(),
    Prefer: 'resolution=merge-duplicates',
  },
  body: JSON.stringify({
    user_id: userId,
    card_id: cardId,
    ease_factor: sm2Output.easeFactor,
    interval_days: sm2Output.interval,
    repetitions: sm2Output.repetitions,
    next_review_at: sm2Output.nextReviewAt.toISOString(),
    last_reviewed_at: new Date().toISOString(),
  }),
});
```

### Pattern 3: Server-Side Card Ordering, Client-Side Algorithm

**What:** Database RPC returns cards in priority order (due first, then new). SM-2 math runs in the app.
**Why:** Querying "which cards are due" requires efficient database indexing. Computing "what happens after this answer" is pure math that belongs client-side for zero latency.

### Pattern 4: Progressive Enhancement of StudyCard Type

**What:** Extend the existing `StudyCard` interface with optional SRS fields rather than creating a new type.
**Why:** Keeps the `useStudySession` hook working with both the old and new data shape during transition. Existing fields remain, new fields are optional.

```typescript
// In packages/shared/src/types/index.ts
export interface StudyCard extends Card {
  questionCount: number;
  // NEW: spaced repetition metadata (optional for backward compat)
  isReview?: boolean;
  easeFactor?: number;
  intervalDays?: number;
  repetitions?: number;
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Edge Function for SM-2 Calculation

**What:** Moving SM-2 computation to the study-planner edge function.
**Why bad:** Adds 50-200ms latency per card answer for a 30-line calculation. Creates unnecessary coupling and deployment dependency.
**Instead:** Pure function in `@lumio/core`, called synchronously in the hook.

### Anti-Pattern 2: Storing Schedule in study_sessions

**What:** Trying to derive review schedule from the immutable study_sessions table.
**Why bad:** study_sessions is aggregate (per-session), not per-card. It lacks card_id. Reconstructing per-card state from session history is fragile and slow.
**Instead:** Dedicated `card_review_schedule` table with per-card per-user state.

### Anti-Pattern 3: Random Selection for Due Cards

**What:** Continuing to use `selectRandomCard()` for cards that are due for review.
**Why bad:** Due cards should be reviewed in order of urgency (most overdue first). Randomizing defeats the purpose of spaced repetition.
**Instead:** Due cards ordered by `next_review_at ASC` from the RPC. New cards can remain random.

### Anti-Pattern 4: Blocking UI on Schedule Update

**What:** Awaiting the UPSERT before allowing navigation to the next card.
**Why bad:** Adds perceived latency. If the write fails, the user still studied the card -- the worst case is a slightly suboptimal next review date.
**Instead:** Fire-and-forget with error logging, same as existing saveStudySession pattern.

### Anti-Pattern 5: Modifying study_sessions Table

**What:** Adding SRS columns to the immutable study_sessions table.
**Why bad:** study_sessions has no UPDATE/DELETE RLS policies by design. It is an append-only audit log. SRS state is mutable (changes every review).
**Instead:** Separate table with UPDATE policy.

---

## Suggested Build Order

Build order follows dependency chain: schema first, then core library, then app integration, then UI.

### Phase 1: Database + SM-2 Algorithm
**Dependencies:** None
**Delivers:** Foundation that everything else builds on

1. Write migration: `card_review_schedule` table + RLS + indexes
2. Write migration: `get_due_card_count` RPC
3. Write migration: `get_study_cards_for_session` RPC
4. Implement `packages/core/src/srs/sm2.ts` (pure function, easily unit-testable)
5. Add new types to `packages/shared/src/types/index.ts`
6. Add `updateReviewSchedule()`, `getDueCardCount()`, `getStudyCardsForSession()` to `packages/core/src/supabase/study.ts`
7. Re-export from `packages/core/src/index.ts`
8. Run `pnpm build:packages`

### Phase 2: Study Session Integration
**Dependencies:** Phase 1 (schema + core library)
**Delivers:** Core spaced repetition behavior

1. Modify `useStudySession.ts`:
   - Replace `getStudyCardsWithQuestions()` with `getStudyCardsForSession()`
   - Remove `selectRandomCard()` for due cards (use ordered list)
   - Keep random for new cards within the session
   - Add `updateReviewSchedule()` call in `handleNext()` after answer
   - Track `isReview` flag per card for UI indicator
2. Modify `StudyScreen.tsx`:
   - Show "Review" / "New" badge on current card (small UI addition)

### Phase 3: Dashboard + History Fixes
**Dependencies:** Phase 1 (RPC for due count)
**Delivers:** Visible spaced repetition value on home screen

1. Modify `DashboardScreen.tsx`:
   - Add `getDueCardCount()` call alongside `getUserStats()`
   - Show "X cards due for review" stat card
2. Modify `StudyHistoryScreen.tsx`:
   - Show `totalCount` (card count) instead of repository_name when null
   - This is the "Fix storico sessioni" from the milestone description
3. Add i18n strings to `en.ts` and `it.ts`:
   - `dashboard.dueForReview`: "Due for Review"
   - `dashboard.cardsToReview`: "%{count} cards"
   - `study.reviewBadge`: "Review"
   - `study.newBadge`: "New"

### Phase 4: Validation + Polish
**Dependencies:** Phases 1-3
**Delivers:** Confidence that it works correctly

1. Manual testing: verify SM-2 intervals are computed correctly
2. Verify schedule UPSERT works for first review and subsequent reviews
3. Verify due count updates after completing a study session
4. Verify mix of due + new cards in session
5. Verify `.lumioignore` filtering still works with new card selection

---

## Scalability Considerations

| Concern | Current Scale | At 1K cards | At 10K cards |
|---------|--------------|-------------|--------------|
| Due count query | Trivial | Index on (user_id, next_review_at) handles it | Same index, sub-ms |
| Card selection query | ~50 cards total | RPC with LIMIT handles it | May need pagination |
| Schedule table size | 0 rows | 1 row per card studied | 10K rows max per user |
| SM-2 computation | N/A | Instant (pure math) | Instant |

The architecture handles 10K+ cards per user without modification. The indexed `next_review_at` query is the critical path and is O(log n).

---

## Sources

- [SM-2 Algorithm Original Specification](https://super-memory.com/english/ol/sm2.htm) - HIGH confidence
- [SM-2 ES6 Implementation (cnnrhill/sm-2)](https://github.com/cnnrhill/sm-2) - HIGH confidence
- [SuperMemo TypeScript Package (VienDinhCom/supermemo)](https://github.com/VienDinhCom/supermemo) - HIGH confidence
- [FSRS vs SM-2 Comparison](https://memoforge.app/blog/fsrs-vs-sm2-anki-algorithm-guide-2025/) - MEDIUM confidence
- [ts-fsrs npm package](https://www.npmjs.com/package/ts-fsrs) - HIGH confidence (evaluated but not recommended)
- [Spaced Repetition in PostgreSQL (sivers/srs)](https://github.com/sivers/srs) - MEDIUM confidence
- [FSRS Algorithm: Next-Gen Spaced Repetition](https://www.quizcat.ai/blog/fsrs-algorithm-next-gen-spaced-repetition) - MEDIUM confidence
- Lumio codebase analysis (direct code reading) - HIGH confidence
