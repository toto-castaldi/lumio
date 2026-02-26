# Phase 24: Study Session Integration - Research

**Researched:** 2026-02-26
**Domain:** React Native hook refactoring, Supabase PL/pgSQL RPC (SM-2 write-back), fire-and-forget async patterns
**Confidence:** HIGH

## Summary

Phase 24 wires the SRS engine into the existing study session flow. Two things change: (1) card selection switches from random (`getStudyCardsWithQuestions`) to SRS-ordered (`getStudyCardsForSession`), and (2) each answered card triggers a fire-and-forget write-back to a new server-side RPC that runs SM-2 and upserts `card_review_schedule`. The study UI stays unchanged -- SRS is invisible to the user.

The refactor centers on `apps/android/hooks/useStudySession.ts`. The current hook loads all cards via `getStudyCardsWithQuestions()`, picks random cards, and advances through them. The new hook must: call `getStudyCardsForSession(limit)` instead (which returns SRS-ordered cards), iterate through them sequentially (not randomly), and fire off an SRS write-back after each answer. The fire-and-forget pattern already exists in `StudyScreen.tsx` for `saveStudySession` -- the SRS write-back follows the same `.catch(err => console.error(...))` pattern.

The server-side SM-2 RPC is the most critical new component. It must replicate the exact SM-2 formula from the `supermemo` package in PL/pgSQL: EF adjustment formula, interval calculation for first/second/subsequent reviews, grade-based branching (grades < 3 reset, grades >= 3 progress). The RPC performs an atomic UPSERT on `card_review_schedule` with the computed values plus `content_hash_snapshot`.

**Primary recommendation:** Refactor `useStudySession` to use `getStudyCardsForSession` for card ordering, iterate sequentially instead of randomly, and add a `recordCardReview` fire-and-forget call after each answer. Create a new `upsert_card_review` SECURITY DEFINER RPC in PL/pgSQL that implements SM-2 server-side.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Binary mapping: correct = quality 4, incorrect = quality 1
- No UI changes to the QuizCard component -- same 4-option multiple choice
- SRS scheduling is invisible to the user (no "Next review: X days" feedback)
- Vote system (like/dislike questions) remains completely separate from SRS
- Skipping a card = no SRS schedule update. Card stays at its current schedule
- Per-answer SRS writes persist immediately (fire-and-forget per SC#4), so quitting mid-session does NOT lose already-answered updates
- Session summary (saveStudySession) still saves at session completion -- two separate concerns
- No incomplete sessions in study history -- if user quits mid-session, no history entry is created, but SRS updates for answered cards are already persisted
- Show actual card count with breakdown: "50 cards to study (40 overdue + 10 new)"
- No absolute cap on overdue cards -- if 200 are overdue, show all 200
- Progress bar reflects the actual total card count (not the user's cardsPerSession limit)
- When zero overdue cards exist, silently fill session with new cards up to the limit -- no special messaging
- Server-side RPC: client sends (cardId, quality, contentHash), RPC reads current SRS state, runs SM-2 calculation, writes result + updates content_hash_snapshot -- single atomic operation
- Retry once silently on network failure, then drop the update. Card will appear again as if not reviewed
- Always-update semantics: if same card answered twice (retry/glitch), second answer overwrites. Simple upsert, no idempotency tracking

### Claude's Discretion
- RPC function naming and parameter design
- Error handling patterns for the retry logic
- How to structure the hook refactor (incremental vs wholesale replacement of card selection)
- TypeScript type updates needed in the hook

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SRS-01 | User studia carte schedulate in base alle risposte precedenti (giusto -> intervallo piu lungo, sbagliato -> reset a 1 giorno) | Server-side `upsert_card_review` RPC implements SM-2: grade 4 (correct) grows interval via EF multiplication; grade 1 (incorrect) resets interval to 1 day and EF drops by 0.54. The hook calls this after each answer. |
| SRS-02 | Sessione presenta carte scadute prima, poi nuove carte riempiono i posti restanti | `getStudyCardsForSession` RPC (from Phase 23) already returns overdue-first ordering. Hook refactor replaces random selection with sequential iteration through these SRS-ordered cards. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| supermemo | ^2.0.23 | SM-2 reference implementation (client-side `sm2.ts` already exists) | Used to verify PL/pgSQL implementation produces identical results. The server-side RPC replicates the exact formulas. |
| PostgreSQL (PL/pgSQL) | 15+ (Supabase) | Server-side SM-2 calculation in `upsert_card_review` RPC | Atomic upsert + SM-2 calculation in a single DB round-trip. No Edge Function latency. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | ^2.45.0 | Already in project -- RPC calls from `@lumio/core` | Calling the new `upsert_card_review` RPC |
| React Native | 0.76+ | Already in project -- `useStudySession` hook | Hook refactoring for SRS integration |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server-side SM-2 in PL/pgSQL | Client-side SM-2 + direct table upsert | Client-side would require the client to read current SRS state, compute, then write -- two round-trips vs one. Server-side is atomic, single round-trip. User locked "server-side RPC" decision. |
| PL/pgSQL SM-2 | Edge Function SM-2 | Edge Function adds 50-200ms latency per answer. PL/pgSQL runs in the database with zero network hop. |

**Installation:**
No new packages needed. All dependencies already exist from Phase 23.

## Architecture Patterns

### Recommended Project Structure
```
supabase/migrations/
└── 2026MMDD000002_upsert_card_review.sql   # New migration: upsert_card_review RPC

packages/core/src/supabase/
└── study.ts                                 # Add recordCardReview() function

apps/android/hooks/
└── useStudySession.ts                       # Refactor: SRS ordering + per-answer write-back

apps/android/screens/
└── StudyScreen.tsx                          # Minor: session composition display

apps/android/i18n/
├── en.ts                                    # New strings for card count breakdown
└── it.ts                                    # Italian translations
```

### Pattern 1: SM-2 Algorithm in PL/pgSQL
**What:** Server-side SM-2 implementation as a SECURITY DEFINER RPC that reads current state, computes new state, and upserts atomically.
**When to use:** Every time a card is answered during a study session.
**Example:**
```sql
-- SM-2 formula (exact replication of supermemo package)
-- Source: supermemo GitHub src/main.ts (verified via WebFetch)

-- EF adjustment (always applied, regardless of grade):
-- new_ef = old_ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
-- Minimum EF = 1.3

-- Grade < 3 (failure): interval = 1, repetition = 0
-- Grade >= 3 (success):
--   repetition 0 -> interval = 1
--   repetition 1 -> interval = 6
--   repetition 2+ -> interval = ROUND(old_interval * old_ef)
--   repetition = repetition + 1

-- Project caps: max interval 365, max EF 2.5

CREATE OR REPLACE FUNCTION upsert_card_review(
    p_user_id UUID,
    p_card_id UUID,
    p_quality INTEGER,       -- 0-5 (Lumio sends 1 or 4)
    p_content_hash TEXT      -- cards.content_hash snapshot
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_ef REAL := 2.5;
    v_old_interval INTEGER := 0;
    v_old_repetition INTEGER := 0;
    v_new_ef REAL;
    v_new_interval INTEGER;
    v_new_repetition INTEGER;
BEGIN
    -- Read current SRS state (if exists)
    SELECT ease_factor, interval_days, repetitions
    INTO v_old_ef, v_old_interval, v_old_repetition
    FROM card_review_schedule
    WHERE user_id = p_user_id AND card_id = p_card_id;

    -- SM-2: compute new EF (always, regardless of grade)
    v_new_ef := v_old_ef + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
    v_new_ef := GREATEST(v_new_ef, 1.3);       -- EF floor
    v_new_ef := LEAST(v_new_ef, 2.5);          -- EF ceiling (project cap)

    -- SM-2: compute new interval and repetition
    IF p_quality < 3 THEN
        -- Failure: reset
        v_new_interval := 1;
        v_new_repetition := 0;
    ELSE
        -- Success: progress
        IF v_old_repetition = 0 THEN
            v_new_interval := 1;
        ELSIF v_old_repetition = 1 THEN
            v_new_interval := 6;
        ELSE
            v_new_interval := ROUND(v_old_interval * v_old_ef)::INTEGER;
        END IF;
        v_new_repetition := v_old_repetition + 1;
    END IF;

    -- Cap interval at 365 days (SRS-05)
    v_new_interval := LEAST(v_new_interval, 365);

    -- Atomic upsert
    INSERT INTO card_review_schedule (
        user_id, card_id, ease_factor, interval_days, repetitions,
        next_review_at, last_reviewed_at, content_hash_snapshot
    ) VALUES (
        p_user_id, p_card_id, v_new_ef, v_new_interval, v_new_repetition,
        NOW() + (v_new_interval || ' days')::INTERVAL,
        NOW(), p_content_hash
    )
    ON CONFLICT (user_id, card_id) DO UPDATE SET
        ease_factor = EXCLUDED.ease_factor,
        interval_days = EXCLUDED.interval_days,
        repetitions = EXCLUDED.repetitions,
        next_review_at = EXCLUDED.next_review_at,
        last_reviewed_at = EXCLUDED.last_reviewed_at,
        content_hash_snapshot = EXCLUDED.content_hash_snapshot;
END;
$$;
```

### Pattern 2: Fire-and-Forget with Single Retry
**What:** Call the write-back RPC without awaiting the result. Retry once on failure, then drop.
**When to use:** After each answer in the study session (SC#4: does not block navigation).
**Example:**
```typescript
// Source: existing fire-and-forget pattern in StudyScreen.tsx (saveStudySession)
// + CONTEXT.md retry decision

async function recordCardReviewWithRetry(
  cardId: string,
  quality: number,
  contentHash: string
): Promise<void> {
  try {
    await recordCardReview(cardId, quality, contentHash);
  } catch (err) {
    // Retry once silently
    try {
      await recordCardReview(cardId, quality, contentHash);
    } catch (retryErr) {
      // Drop the update -- card will appear again as if not reviewed
      console.error('SRS write-back failed after retry:', retryErr);
    }
  }
}
```

### Pattern 3: Sequential Card Iteration (Replace Random Selection)
**What:** Cards from `getStudyCardsForSession` are pre-ordered by the RPC (overdue first, then new). The hook iterates sequentially instead of picking random cards.
**When to use:** Replacing the current `selectRandomCard` pattern in `useStudySession`.
**Example:**
```typescript
// Current: random selection from all cards
const selectRandomCard = (cards: StudyCard[]): StudyCard | null => {
  const unseenCards = cards.filter(c => !seenCardIds.current.has(c.id));
  const randomIndex = Math.floor(Math.random() * unseenCards.length);
  return unseenCards[randomIndex];
};

// New: sequential iteration (cards already SRS-ordered)
// Simply track currentIndex and advance through the pre-ordered array
// No random selection, no seenCardIds set needed
```

### Pattern 4: Modifying get_study_cards_for_session Return Type
**What:** Add `content_hash` to the return columns of the existing `get_study_cards_for_session` RPC so the client can pass it to the write-back RPC.
**When to use:** The client needs `content_hash` to send to `upsert_card_review`.
**Why needed:** Currently `mapSRSStudyCard` sets `contentHash: ''` because the RPC doesn't return it. The write-back RPC needs the actual `content_hash` value to store as `content_hash_snapshot`.
**Example:**
```sql
-- Add to RETURNS TABLE of get_study_cards_for_session:
-- content_hash TEXT,
-- And add c.content_hash to both SELECT statements in the UNION ALL
```

### Anti-Patterns to Avoid
- **Running SM-2 client-side then writing via direct table INSERT:** The user locked "server-side RPC" -- the calculation MUST happen in PL/pgSQL. Client only sends (cardId, quality, contentHash).
- **Awaiting the write-back before advancing to next card:** SC#4 requires fire-and-forget. Never `await` the SRS write-back in the navigation flow.
- **Keeping random card selection:** The whole point of SRS is deterministic ordering. Cards must be served sequentially as returned by the RPC.
- **Filtering `.lumioignore` AFTER the RPC returns:** This is actually correct (the RPC doesn't know about `.lumioignore`), but don't skip this step. The `Deck.getActiveCards()` filter must still be applied client-side after receiving SRS-ordered cards.
- **Using `cardsPerSession` to limit the RPC call:** The `p_limit` parameter to `getStudyCardsForSession` should receive the `cardsPerSession` value. But remember: overdue cards bypass this cap (handled in the RPC), so the total returned may exceed `cardsPerSession`.
- **Blocking on `getUserRepositories()` for Deck filtering:** The current hook loads repos and cards in parallel. Keep this pattern -- load repos for `.lumioignore` info in parallel with the RPC call.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SM-2 interval math in SQL | Custom EF formula | The exact supermemo formulas in PL/pgSQL | The formula `EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))` is precise and must match the client-side implementation exactly. Copy from verified source. |
| Retry logic | Custom retry framework | Simple try/catch with one retry | User decision: "retry once silently, then drop." No exponential backoff, no queue, no retry count tracking. |
| Card ordering | Custom sort after fetch | `getStudyCardsForSession` RPC | The RPC already handles overdue-first ordering (SRS-04) and cap bypass logic. Don't re-sort client-side. |

**Key insight:** The server-side SM-2 RPC is the only genuinely new code. Everything else is refactoring existing patterns to wire the pieces together.

## Common Pitfalls

### Pitfall 1: SM-2 Formula Mismatch Between Client and Server
**What goes wrong:** The PL/pgSQL SM-2 implementation produces different results than the TypeScript `sm2.ts` wrapper, causing inconsistent scheduling.
**Why it happens:** Subtle differences in integer rounding, EF precision, or grade boundary handling.
**How to avoid:** The PL/pgSQL RPC is the ONLY writer. The client-side `sm2.ts` is not used for write-back in Phase 24 (it was Phase 23 scaffolding). The server-side formula must exactly match the `supermemo` package: `EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))`, floor 1.3, ceiling 2.5. Interval: rep 0 -> 1, rep 1 -> 6, rep 2+ -> ROUND(interval * EF). Grade < 3 resets.
**Warning signs:** Cards scheduled for different dates than expected based on the SM-2 formula.

### Pitfall 2: content_hash Not Available on SRS Cards
**What goes wrong:** The `upsert_card_review` RPC receives an empty string for `contentHash` because the `get_study_cards_for_session` RPC doesn't return it and `mapSRSStudyCard` sets `contentHash: ''`.
**Why it happens:** Phase 23 didn't include `content_hash` in the return columns of `get_study_cards_for_session`.
**How to avoid:** Add `content_hash TEXT` to the RETURNS TABLE of `get_study_cards_for_session` and include `c.content_hash` in both SELECT branches of the UNION ALL. Update `mapSRSStudyCard` to populate `contentHash` from the response.
**Warning signs:** All `content_hash_snapshot` values in `card_review_schedule` are empty strings, causing stale detection to break.

### Pitfall 3: .lumioignore Filtering Lost After Hook Refactor
**What goes wrong:** Cards excluded by `.lumioignore` appear in SRS sessions because the `Deck.getActiveCards()` filter was removed during the refactor.
**Why it happens:** The current hook calls `getStudyCardsWithQuestions()` then filters with `Deck`. When replacing with `getStudyCardsForSession()`, the Deck filtering step could be accidentally dropped.
**How to avoid:** After receiving SRS-ordered cards, group by repository and apply `Deck.getActiveCards()` filter. Preserve the existing parallel load pattern: `Promise.all([getUserRepositories(), getStudyCardsForSession(limit)])`.
**Warning signs:** Hidden cards appearing in study sessions.

### Pitfall 4: Progress Bar and Card Count Mismatch
**What goes wrong:** The progress bar shows wrong totals because the total card count now includes all overdue cards (which bypass the cap).
**Why it happens:** The current `effectiveLimit` is `min(cardsPerSession, totalCards)`. With SRS, the total is `overdueCount + min(cardsPerSession, newCardCount)`, which can exceed `cardsPerSession`.
**How to avoid:** After filtering, count the actual total cards returned. The progress bar should reflect `answeredCards.length / totalReturnedCards`. The ready screen should show "50 cards to study (40 overdue + 10 new)" using new i18n strings.
**Warning signs:** Progress bar jumping or showing 120% when there are many overdue cards.

### Pitfall 5: seenCardIds Ref Becomes Stale with Sequential Iteration
**What goes wrong:** The `seenCardIds` ref from the random-selection pattern interferes with sequential iteration, causing cards to be skipped.
**Why it happens:** The ref was needed to track which cards were randomly selected. With sequential iteration, the `currentIndex` is sufficient.
**How to avoid:** Remove or repurpose `seenCardIds`. Sequential iteration just needs `currentIndex` to track position in the pre-ordered array.
**Warning signs:** Cards being mysteriously skipped or the session ending prematurely.

### Pitfall 6: Double SRS Write on Card Re-visit
**What goes wrong:** Navigating back to a previously answered card and seeing the answer triggers a second SRS write-back.
**Why it happens:** The `handleGoToCard` function shows old answers, and the write-back hook fires again.
**How to avoid:** The user decision says "always-update semantics: second answer overwrites." But the cleaner approach is to only fire the write-back once per card. Track which card IDs have been written back, and skip on re-visit. The user decision allows overwrites (upsert), so either approach works, but single-write is more efficient.
**Warning signs:** SRS write-back called multiple times for the same card ID in a single session.

## Code Examples

Verified patterns from official sources and existing codebase:

### Client-Side recordCardReview Function
```typescript
// Source: existing pattern in packages/core/src/supabase/study.ts
// Follows same structure as getDueCardCount() and getStudyCardsForSession()

export async function recordCardReview(
  cardId: string,
  quality: number,
  contentHash: string
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const userId = await getUserId();
  if (!userId) throw new Error('User ID not found');

  const supabaseUrl = getSupabaseUrl();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/upsert_card_review`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_card_id: cardId,
        p_quality: quality,
        p_content_hash: contentHash,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to record card review');
  }
}
```

### Hook Refactor: loadInitialData
```typescript
// Source: current useStudySession.ts loadInitialData, adapted for SRS

const loadInitialData = async () => {
  try {
    const limit = cardsPerSession === 'all' ? 9999 : cardsPerSession;

    // Load repositories and SRS-ordered cards in parallel
    const [repositories, srsCards] = await Promise.all([
      getUserRepositories(),
      getStudyCardsForSession(limit),
    ]);

    // Build repository map
    const repoMap = new Map(repositories.map(r => [r.id, r]));

    // Apply .lumioignore filtering (same pattern as current hook)
    const filteredCards: SRSStudyCard[] = [];
    const cardsByRepo = new Map<string, SRSStudyCard[]>();
    for (const card of srsCards) {
      const repoCards = cardsByRepo.get(card.repositoryId) || [];
      repoCards.push(card);
      cardsByRepo.set(card.repositoryId, repoCards);
    }
    for (const [repoId, repoCards] of cardsByRepo) {
      const repo = repoMap.get(repoId);
      if (repo) {
        const deck = new Deck(repo, repoCards);
        filteredCards.push(...(deck.getActiveCards() as SRSStudyCard[]));
      }
    }

    // Re-sort to maintain SRS ordering after Deck filtering
    // (Deck filtering preserves input order for items that pass)
    // Overdue cards first, then new cards (as returned by RPC)

    if (filteredCards.length === 0) {
      setSession(prev => ({ ...prev, state: 'no_cards', repositoryMap: repoMap }));
      return;
    }

    // Count overdue vs new for display
    const overdueCount = filteredCards.filter(c => c.isReview).length;
    const newCount = filteredCards.filter(c => !c.isReview).length;

    setSession(prev => ({
      ...prev,
      state: 'studying',
      cards: filteredCards,
      repositoryMap: repoMap,
      overdueCount,
      newCount,
    }));
  } catch (err) {
    console.error('Failed to load study data:', err);
    setSession(prev => ({ ...prev, state: 'no_cards' }));
  }
};
```

### Updated get_study_cards_for_session (add content_hash)
```sql
-- Migration to add content_hash to get_study_cards_for_session return type
-- This is a CREATE OR REPLACE, so it modifies the existing function

-- Add to RETURNS TABLE: content_hash TEXT
-- Add c.content_hash to both SELECT branches
-- No other logic changes needed
```

### Fire-and-Forget in handleNext
```typescript
// Inside handleNext callback, after determining isCorrect:
// Fire SRS write-back (does NOT block navigation)
if (prev.currentCard && prev.userAnswer !== null) {
  const isCorrect = prev.userAnswer === prev.currentQuestion.correctAnswer;
  const quality = isCorrect ? 4 : 1;

  recordCardReviewWithRetry(
    prev.currentCard.id,
    quality,
    prev.currentCard.contentHash
  );
  // Note: NOT awaited -- fire-and-forget
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Random card selection | SRS-ordered (overdue first, then new) | Phase 24 (now) | Optimal review intervals replace random repetition |
| No write-back per answer | Fire-and-forget SRS update per answer | Phase 24 (now) | Each answer immediately updates the spaced repetition schedule |
| Client-side SM-2 only | Server-side SM-2 in PL/pgSQL | Phase 24 (now) | Atomic upsert, single round-trip, no read-before-write race |
| `getStudyCardsWithQuestions` | `getStudyCardsForSession` | Phase 24 (now) | Cards come pre-ordered from DB with SRS metadata |

**Deprecated/outdated:**
- `selectRandomCard` function in `useStudySession.ts`: Replaced by sequential iteration through SRS-ordered array
- `seenCardIds` ref: No longer needed with sequential iteration
- Client-side `sm2()` for write-back: Phase 23 created this for testing/reference. Phase 24 does SM-2 server-side. The client-side function remains available for future use but is NOT called during write-back.

## Open Questions

1. **Deck filtering order preservation**
   - What we know: `Deck.getActiveCards()` filters cards based on `.lumioignore`. The RPC returns cards in SRS order (overdue first, then new).
   - What's unclear: Whether `Deck.getActiveCards()` preserves the input array order for cards that pass the filter, or if it re-sorts them.
   - Recommendation: Verify `Deck.getActiveCards()` preserves order. If it does, simply apply the filter after receiving SRS-ordered cards. If it doesn't, re-sort the filtered results by `isReview` (true first) to maintain SRS priority order. LOW risk -- the `ignore` package used by Deck is a simple predicate filter, likely preserving order.

2. **Large overdue backlogs**
   - What we know: User decided "no absolute cap on overdue cards -- if 200 are overdue, show all 200."
   - What's unclear: Whether loading 200+ card questions will cause performance issues in the hook (each card requires a `getPreGeneratedQuestion` call).
   - Recommendation: The current hook loads questions lazily (one at a time via `loadNextQuestion`). Keep this pattern -- don't pre-load all questions. The RPC returns card metadata only; questions are loaded per-card as the user advances. This bounds memory and network usage regardless of overdue count.

3. **contentHash parameter necessity**
   - What we know: User locked "client sends (cardId, quality, contentHash)". Currently `get_study_cards_for_session` doesn't return `content_hash`.
   - What's unclear: Whether modifying the existing RPC's return type requires a migration (CREATE OR REPLACE on the function is idempotent, but it changes the function signature).
   - Recommendation: Use a new migration that does `CREATE OR REPLACE FUNCTION get_study_cards_for_session(...)` with the updated RETURNS TABLE including `content_hash TEXT`. PostgreSQL allows overwriting function signatures when using CREATE OR REPLACE and the return type is compatible. Since we're ADDING a column to the TABLE return type, we need to DROP and re-CREATE (PostgreSQL doesn't allow adding columns to an existing TABLE return type via CREATE OR REPLACE). The migration should DROP the old function and CREATE the new one.

## Sources

### Primary (HIGH confidence)
- [/viendinhcom/supermemo] Context7 - SuperMemoItem type, supermemo function API, grade definitions. Verified SM-2 formula.
- [supermemo GitHub source code](https://raw.githubusercontent.com/VienDinhCom/supermemo/master/src/main.ts) - Full SM-2 implementation: EF formula `ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))`, interval calculation for rep 0/1/2+, grade < 3 reset logic. No max interval, no EF ceiling.
- Existing codebase: `packages/core/src/srs/sm2.ts`, `packages/core/src/supabase/study.ts`, `apps/android/hooks/useStudySession.ts`, `apps/android/screens/StudyScreen.tsx`, `supabase/migrations/20260226000001_card_review_schedule.sql` - All current patterns verified by direct file reads.
- Phase 23 research: `.planning/phases/23-srs-schema-algorithm/23-RESEARCH.md` - SM-2 formula details, RPC patterns, content hash decisions.

### Secondary (MEDIUM confidence)
- [PostgreSQL CREATE OR REPLACE FUNCTION docs](https://www.postgresql.org/docs/current/sql-createfunction.html) - CREATE OR REPLACE cannot change return type of existing function. Must DROP + CREATE for modified RETURNS TABLE.

### Tertiary (LOW confidence)
- None. All findings verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies. SM-2 formula verified from supermemo source code. PL/pgSQL patterns follow existing codebase conventions.
- Architecture: HIGH - Hook refactor follows existing patterns. Fire-and-forget pattern already exists in `StudyScreen.tsx`. RPC pattern identical to existing functions in `study.ts`.
- Pitfalls: HIGH - All pitfalls derived from direct codebase analysis. Content hash gap verified by reading `mapSRSStudyCard` source. `.lumioignore` filtering verified by reading `useStudySession` hook.

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable domain -- SM-2 algorithm and React Native patterns don't change)
