# Feature Landscape

**Domain:** Spaced repetition system and study history UX fix for Lumio v2.0
**Researched:** 2026-02-25
**Confidence:** HIGH (SM-2 is thoroughly documented, Anki is open-source reference, existing codebase reviewed in detail)

## Table Stakes

Features users expect from any spaced repetition flashcard app. Missing = product feels like "just another random quiz" instead of a learning system.

| Feature | Why Expected | Complexity | Dependencies on Existing | Notes |
|---------|--------------|------------|--------------------------|-------|
| Per-card scheduling based on answer correctness | Core of spaced repetition. Correct = see later, wrong = see sooner. Every SRS app (Anki, Quizlet, RemNote, Mochi) does this. Without it, Lumio is just a random quiz. | **Med** | New `card_progress` table; modify `useStudySession` hook to query due cards instead of random selection from `selectRandomCard()` | SM-2 uses 0-5 grade scale but Lumio has binary correct/wrong from multiple choice. Map correct to grade 4 (EF unchanged, interval advances), wrong to grade 1 (EF decreases, interval resets to 1 day). Simpler than full SM-2 but preserves the core scheduling benefit. |
| Due cards queue (review before new) | Users expect to review cards that are "due" before seeing new material. Anki's default gathering order: learning cards, then reviews, then new cards. Without this, spaced repetition intervals are meaningless. | **Med** | Replaces random `selectRandomCard()` in `useStudySession`; needs new RPC function to get due cards ordered by `next_review_at` | Current hook picks randomly from all cards with `const randomIndex = Math.floor(Math.random() * unseenCards.length)`. Must change to: 1) fetch due cards (`next_review_at <= now`), 2) fill remaining session slots with new cards (cards with no `card_progress` row). |
| Dashboard "cards due today" counter | Users need to know at a glance how many cards need review. Anki, RemNote, Mochi all show this prominently on their home screen. It is the primary motivator to study. | **Low** | New RPC function `get_due_card_count(p_user_id)`; modify `DashboardScreen.tsx` to show count alongside existing repo/card `StatCard` components | Simple count query: cards joined with `card_progress` WHERE `next_review_at <= NOW()` for user's subscribed repositories. Returns a single integer. |
| Session mix: due cards + new cards | A pure review-only session is boring; a pure new-cards session is overwhelming. The mix is standard in every SRS app. Anki offers configurable new/review ordering. | **Med** | Builds on due cards queue; modify session card selection in `useStudySession` to prioritize due then fill with new | Lumio approach: fill session with due cards first (most overdue first), pad remaining slots with new cards up to the session limit (10/20/50/All presets already exist). Simpler than Anki's three-queue system. |
| Review/New indicator during study | Users need to know if the current card is a review (seen before, being reinforced) or new (first encounter). Provides learning context and sets expectations. | **Low** | Check if card has a `card_progress` row; show small badge/label near `ProgressBar` component or in `QuizCard` header area | Small UI addition: colored text badge "Ripasso"/"Review" or "Nuova"/"New" near the progress bar. No new screens or navigation changes. |
| Study history: show card count instead of "All repositories" | Current bug: `StudyHistoryScreen` shows `item.repositoryName ?? t('history.allRepos')` which always renders "All repositories" / "Tutti i repository" because `repository_name` is always null (sessions are cross-repo). Meaningless text confuses users. | **Low** | Modify display logic in `StudyHistoryScreen.tsx` to show `total_count` (which already exists and is correctly saved) instead of the null `repository_name` | The `study_sessions.total_count` column contains the actual card count. Replace the repo label with something like "10 cards" / "10 carte". Alternatively, show `correct_count/total_count` more prominently and drop the repo column entirely. |

## Differentiators

Features that set Lumio apart from basic SRS implementations. Not expected by all users, but valued.

| Feature | Value Proposition | Complexity | Dependencies on Existing | Notes |
|---------|-------------------|------------|--------------------------|-------|
| Automatic new/review proportioning | Unlike Anki's manual "new cards per day" setting (default 20), Lumio auto-calculates: if many cards are due, fewer new cards get mixed in; if few are due, more new cards appear. Zero configuration required from user. | **Low** | Uses session card count preset (10/20/50/All) already built in v1.2; proportioning logic is just: `dueCards.slice(0, limit)` then fill remaining with new cards | Eliminates Anki's most confusing setting. Lumio already has cards-per-session presets. The proportioning is implicit: take `min(dueCount, sessionLimit)` due cards, fill remaining with new. No settings UI needed. |
| Easiness factor per card (adaptive difficulty) | Cards that are consistently hard get shorter review intervals; consistently easy cards get much longer intervals. More sophisticated than simple fixed-ratio doubling. Matches how memory actually works. | **Med** | `easiness_factor` column in `card_progress` table; SM-2 EF formula applied on each answer | EF starts at 2.5. Correct (grade 4): EF unchanged. Wrong (grade 1): EF decreases by 0.54 (min 1.3). Next interval = `previous_interval * EF`. This is the core SM-2 math, well-proven over 35+ years. |
| Overdue card priority boost | Cards significantly overdue (e.g., due 5 days ago but user skipped studying) surface first in the session queue. Prevents important forgotten cards from being buried behind barely-due cards. | **Low** | Sort due cards by `next_review_at ASC` (most overdue first) in the RPC query | Simple `ORDER BY` in the database function. Most overdue cards naturally surface first. No additional logic or UI needed. |
| No "ease hell" (EF floor at 1.3) | Anki's notorious problem: EF drops too low over time and cards become annoying daily reviews forever ("ease hell"). Lumio prevents this with SM-2's built-in EF minimum of 1.3, meaning even consistently-wrong cards never get stuck at sub-daily intervals. | **Low** | Built into EF formula as `EF = max(EF', 1.3)` | SM-2 specification already includes this floor. Just enforce it in the update logic. |

## Anti-Features

Features to explicitly NOT build for v2.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full SM-2 grade scale (0-5 buttons) | Lumio uses multiple choice with binary correct/wrong outcome. Asking users to self-rate recall quality ("Easy"/"Good"/"Hard"/"Again") after answering a multiple choice question is redundant and confusing. The MC answer IS the assessment. | Map correct to grade 4, wrong to grade 1. Binary mapping. No extra buttons after answering. |
| FSRS algorithm | FSRS is demonstrably superior to SM-2 (20-30% fewer reviews for same retention per benchmarks). However, FSRS requires ML model training and 400+ reviews per user to calibrate effectively. Overkill for v2.0 with a small user base. | Start with simplified SM-2. Can upgrade to FSRS in a future milestone when review data exists. The `card_progress` table schema is compatible with future FSRS migration. |
| Custom interval settings per user | Anki exposes graduating interval, easy interval, learning steps, new cards/day, max reviews/day, etc. These are power-user features that create decision paralysis and support burden for a solo developer. | Use sensible SM-2 defaults: I(1)=1 day, I(2)=6 days, EF=2.5 initial. Store defaults in `platform_config` table (already exists) for admin tuning if needed. |
| Separate "learning" card state | Anki has three states: New, Learning, Review. "Learning" cards are in-progress (seen today but not yet graduated to Review). This adds state machine complexity for marginal UX benefit. | Two states only: **New** (no `card_progress` row exists) and **Review** (has `card_progress` row). A card becomes Review after its first answer. Simpler mental model for users and developers. |
| Undo/Reschedule button | Letting users manually reschedule or undo answers undermines the algorithm's integrity and adds significant UI complexity (undo stack, confirmation dialogs). | Trust the algorithm. If a card keeps coming back frequently, the EF naturally adjusts. The existing forward-only study flow (v1.3 decision) aligns with this. |
| Push notifications for due cards | Out of scope per PROJECT.md. Requires notification permission, background services, FCM setup, and notification content localization. | Dashboard counter is sufficient for v2.0. User opens app, sees "X cards due today," and studies. |
| Per-card statistics detail | Out of scope per PROJECT.md. Individual card history (review timeline, EF curve, interval history) is complex UI with low value for most users. | Session-level stats are sufficient. Individual card mastery is implicit in the scheduling algorithm. |
| Streak/gamification | Explicitly excluded in PRD section 5.2. Distracts from core learning value. | Due card counter provides natural daily motivation without artificial gamification mechanics. |
| Spaced repetition for skipped cards | Currently skipped cards increment `skipped_count` but have no progress tracked. Making skipped cards count as "wrong" would penalize users for skipping unknown content. | Skipped cards remain untracked in `card_progress`. They stay as "new" cards and will appear in future sessions naturally. |

## Feature Dependencies

```
card_progress table (DB migration)
    |
    +---> Per-card scheduling logic (SM-2 formula in RPC)
    |         |
    |         +---> Due cards query (get_due_cards_for_study RPC)
    |         |         |
    |         |         +---> Session card selection rewrite (useStudySession)
    |         |         |         |
    |         |         |         +---> Automatic due/new proportioning
    |         |         |         |
    |         |         |         +---> Review/New indicator during study
    |         |         |
    |         |         +---> Dashboard "cards due" counter (get_due_card_count RPC)
    |         |
    |         +---> Easiness factor tracking (column in card_progress)
    |         |
    |         +---> Overdue priority boost (ORDER BY in query)

Study history display fix -- INDEPENDENT, no dependencies on card_progress
```

## SM-2 Algorithm Specification for Lumio

Since Lumio uses multiple choice (not self-rated recall), the SM-2 adaptation works as follows:

### Grade Mapping (Binary from MC)

| MC Result | SM-2 Grade (q) | EF Change | Interval Effect |
|-----------|-----------------|-----------|-----------------|
| Correct answer | 4 | EF' = EF + 0.0 (no change) | I(n) = I(n-1) * EF (advances) |
| Wrong answer | 1 | EF' = EF - 0.54 (significant decrease, min 1.3) | Resets to I(1) = 1 day |

### Core Formulas

**EF update formula:** `EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))`
- Correct (q=4): `EF' = EF + (0.1 - 1 * (0.08 + 1 * 0.02)) = EF + 0.0` (unchanged)
- Wrong (q=1): `EF' = EF + (0.1 - 4 * (0.08 + 4 * 0.02)) = EF - 0.54`
- **Floor:** `EF = max(EF', 1.3)`

**Interval formula:**
- I(1) = 1 day (first review after wrong answer, or first review of new card)
- I(2) = 6 days
- For n > 2: I(n) = round(I(n-1) * EF)
- On wrong answer: reset repetition_count to 0, interval back to I(1) = 1

**Initial values:** EF = 2.5, interval = 0 days, repetition_count = 0

### Concrete Example Walkthrough

Card first seen and answered correctly:
1. repetition_count: 0 -> 1, interval: 0 -> 1 day, EF: 2.5 (unchanged), next_review: tomorrow
2. Reviewed tomorrow, correct: rep 1 -> 2, interval: 1 -> 6 days, EF: 2.5, next: +6 days
3. Reviewed in 6 days, correct: rep 2 -> 3, interval: 6 -> 15 days (6 * 2.5), next: +15 days
4. Reviewed in 15 days, wrong: rep 3 -> 0, interval: 15 -> 1 day, EF: 2.5 -> 1.96, next: tomorrow
5. Reviewed tomorrow, correct: rep 0 -> 1, interval: 0 -> 1, EF: 1.96, next: tomorrow
6. Reviewed, correct: rep 1 -> 2, interval: 1 -> 6, EF: 1.96, next: +6 days
7. Reviewed, correct: rep 2 -> 3, interval: 6 -> 12 (6 * 1.96), next: +12 days

### Proposed card_progress Table

```sql
CREATE TABLE card_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    easiness_factor REAL NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 0,
    repetition_count INTEGER NOT NULL DEFAULT 0,
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, card_id)
);
```

### Session Card Selection Algorithm (Pseudocode)

```
1. Fetch due cards:
   SELECT c.*, cp.* FROM cards c
   JOIN card_progress cp ON cp.card_id = c.id
   WHERE cp.user_id = :user_id
     AND cp.next_review_at <= NOW()
     AND c.is_active = TRUE
   ORDER BY cp.next_review_at ASC  -- most overdue first

2. Fetch new cards (never reviewed by this user):
   SELECT c.* FROM cards c
   JOIN user_repositories ur ON ur.repository_id = c.repository_id
   WHERE ur.user_id = :user_id
     AND c.is_active = TRUE
     AND c.id NOT IN (SELECT card_id FROM card_progress WHERE user_id = :user_id)
   ORDER BY RANDOM()

3. Build session queue:
   session = due_cards.slice(0, sessionLimit)
   remaining = sessionLimit - session.length
   session += new_cards.slice(0, remaining)

4. For each card answered:
   IF no card_progress row exists:
     CREATE row with defaults (EF=2.5, rep=0, interval=0)
   Apply SM-2 formula based on correct/wrong:
     IF correct AND rep < 2: increment rep, set interval per I(1)/I(2) rules
     IF correct AND rep >= 2: increment rep, interval = round(interval * EF)
     IF wrong: reset rep=0, interval=1, decrease EF
   SET next_review_at = NOW() + interval_days
   SET last_reviewed_at = NOW()
```

## MVP Recommendation

Prioritize in this order:

1. **card_progress table + SM-2 RPC functions** (table stakes foundation, everything depends on this)
   - DB migration creating `card_progress` with RLS policies
   - RPC: `upsert_card_progress(p_user_id, p_card_id, p_is_correct)` applying SM-2 formula server-side
   - RPC: `get_due_cards_for_study(p_user_id, p_limit)` returning due cards ordered by overdue-ness
   - RPC: `get_due_card_count(p_user_id)` returning count for dashboard

2. **Rewrite useStudySession for SRS card selection** (table stakes, replaces random selection)
   - Replace `selectRandomCard` with due-first-then-new selection
   - Call `upsert_card_progress` after each answer (alongside existing `saveStudySession`)
   - Track card type (review/new) in session state

3. **Dashboard "cards due today" counter** (table stakes, visible user value)
   - Add new `StatCard` to `DashboardScreen` showing due count
   - Use the color coding pattern already established (like the amber clock icon for "last studied")

4. **Review/New indicator during study** (differentiator, small UI addition)
   - Badge near progress bar showing "Review" or "New" for current card
   - i18n strings for both IT and EN

5. **Study history display fix** (table stakes bug fix, independent of SRS)
   - Replace `item.repositoryName ?? t('history.allRepos')` with card count display
   - Show something like "10 carte" / "10 cards" using existing `item.totalCount`

Defer to future milestone: FSRS upgrade (needs review data), push notifications, per-card statistics.

## Sources

- [SM-2 Algorithm Original Specification](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2) - Original SM-2 by Piotr Wozniak, 1987. Formulas and rating scale. (HIGH confidence)
- [Anki Manual - Studying](https://docs.ankiweb.net/studying.html) - Study session UX: card counts, answer buttons, queue order (HIGH confidence)
- [Anki Manual - Deck Options](https://docs.ankiweb.net/deck-options.html) - New cards/day, review limits, learning steps, new/review mix (HIGH confidence)
- [FSRS vs SM-2 Guide](https://memoforge.app/blog/fsrs-vs-sm2-anki-algorithm-guide-2025/) - Algorithm comparison showing FSRS 20-30% more efficient (MEDIUM confidence)
- [FSRS ABC Wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki/abc-of-fsrs) - Why FSRS outperforms SM-2, 99.6% superiority metric (MEDIUM confidence)
- [SM-2 Explained - Tegaru](https://tegaru.app/en/blog/sm2-algorithm-explained) - Simplified SM-2 explanation with grade effects (MEDIUM confidence)
- [Spaced Repetition Algorithm Journey](https://github.com/open-spaced-repetition/fsrs4anki/wiki/spaced-repetition-algorithm:-a-three%E2%80%90day-journey-from-novice-to-expert) - Evolution from SM-0 to FSRS, practical implementation approaches (HIGH confidence)
- [Quizlet Spaced Repetition](https://medium.com/tech-quizlet/spaced-repetition-for-all-cognitive-science-meets-big-data-in-a-procrastinating-world-59e4d2c8ede1) - Industry approach to SRS in consumer apps (MEDIUM confidence)
- Lumio codebase analysis: `useStudySession.ts`, `study.ts`, `StudyScreen.tsx`, `StudyHistoryScreen.tsx`, `DashboardScreen.tsx`, study_sessions migration, card_questions migration (HIGH confidence)
