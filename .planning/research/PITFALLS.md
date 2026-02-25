# Pitfalls Research

**Domain:** Adding spaced repetition to existing Lumio flashcard app (React Native/Expo, Supabase backend)
**Researched:** 2026-02-25
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: Card-Level Schedule Orphaned When Card Content Changes

**What goes wrong:**
Lumio cards are synced from GitHub repos via Docora. When a card's content changes (edited markdown file pushed), the backend updates the `cards` row (including `updated_at`). If the spaced repetition schedule is keyed to the `card_id`, it becomes stale: the old schedule (ease factor, interval, next due date) was earned for the *previous* content, not the new content. The user may be scheduled to see an "easy" card in 60 days, but the card now teaches something entirely different. Worse: if `card_questions` are also regenerated on content change (they are — `deactivation_reason = 'card_updated'`), a new question is generated but the user's SRS state from the old question bleeds into the new one.

**Why it happens:**
SRS state is typically stored as `(user_id, card_id) → {ease, interval, due_date, repetitions}`. The card_id is stable across content changes, so no foreign key violation fires. The schedule silently persists with stale parameters.

**How to avoid:**
- Add a `content_version` hash (e.g., `SHA256` of card content) to the SRS state row.
- On each review session start, compare `cards.updated_at` (or a new `content_hash` column) against the value recorded in the SRS row at time of last review.
- If the card was updated since the last review, reset the SRS state to "new" for that user (equivalent to never having seen it).
- The Docora webhook already sets `deactivated_at` on questions when `card_updated`. Reuse this signal: when `card_questions` deactivates old questions for a card, also reset SRS state for that card across all users.
- Alternatively (simpler): reset SRS state whenever `cards.updated_at` is newer than `card_reviews.reviewed_at`. No extra hash column needed.

**Warning signs:**
- Users report seeing "easy" cards they've never actually studied under their current form.
- The `cards.updated_at` timestamp is newer than the `card_reviews.last_reviewed_at` for the same card.
- After a repo sync, a card's interval jumps to a large value on first review.

**Phase to address:**
Data model phase (schema design for `card_reviews` table). Add `card_updated_at TIMESTAMPTZ` snapshot column to `card_reviews` and stale-detection logic in the card selection RPC.

---

### Pitfall 2: Card Deleted While in Active SRS Schedule

**What goes wrong:**
When a card is deleted from GitHub (file removed, repo unlinked, or `.lumioignore` pattern added), the `cards` row is soft-deleted (`is_active = FALSE`) or hard-deleted. If the SRS schedule references `card_id` via FK with `ON DELETE CASCADE`, all SRS state is silently dropped — losing the user's review history for that card. If using `ON DELETE RESTRICT`, the card deletion fails. If using `ON DELETE SET NULL`, you have orphaned SRS rows with no card reference.

**Why it happens:**
The existing `card_questions` table uses `ON DELETE CASCADE` on `card_id`. The natural instinct is to do the same for SRS state. But SRS state has dual purpose: it drives future scheduling AND it's part of the user's learning history. Cascading delete destroys both.

**How to avoid:**
- Use `ON DELETE CASCADE` for the SRS state (`card_reviews`) table — it is per-user per-card and has no value without the card. Losing the schedule for a deleted card is acceptable; the card is gone anyway.
- However: `study_sessions` must **not** store `card_id` as a FK. The existing `study_sessions` schema correctly stores `repository_name TEXT` (nullable, not FK). Follow the same pattern for any session-level card tracking. Use `card_id UUID` (no FK) for audit columns in sessions, so session history survives card deletion.
- Do NOT add `REFERENCES cards(id) ON DELETE CASCADE` to session detail rows — use `ON DELETE SET NULL` or store `card_id` as plain UUID without FK.

**Warning signs:**
- After a repo sync that removes files, users see a drop in their "cards studied" stats.
- `study_sessions` table references a deleted card_id, causing broken lookups.

**Phase to address:**
Data model phase. Design `card_reviews` with `ON DELETE CASCADE` and session detail tables without hard card FK constraints.

---

### Pitfall 3: "Due Today" Counter Uses Server UTC, App Displays Local Date

**What goes wrong:**
SRS schedules cards with a `due_date TIMESTAMPTZ` stored in UTC. The "due today" dashboard counter runs a query like `WHERE due_date <= NOW()` on the server. But users think in calendar days, not UTC timestamps. A user in UTC+2 who finishes their reviews at 11pm local time (9pm UTC) will see the next day's cards appear at midnight UTC (2am local time) instead of their local midnight. Conversely, a user in UTC-5 whose next due date is "tomorrow" (UTC) has already started that day locally at 7pm.

**Why it happens:**
`NOW()` in PostgreSQL returns server UTC time. SRS algorithms typically compute `due_date = reviewed_at + interval_days` where `interval_days` is a whole number, so the due date is calculated as a point in time, not a calendar day. Without timezone awareness, "due today" means different things to different users.

**How to avoid:**
- Store `due_date DATE` (not `TIMESTAMPTZ`) in the `card_reviews` table. A DATE represents a calendar day, not a UTC instant. The query becomes `WHERE due_date <= CURRENT_DATE AT TIME ZONE user_timezone` or simply `WHERE due_date <= (NOW() AT TIME ZONE user_tz)::DATE`.
- Simpler alternative for a single-developer app with known user base: store `due_date TIMESTAMPTZ` but compute "due today" on the client using the device's local `new Date()` for comparison. Pass `new Date().toISOString()` as `?currentTime=` parameter to the API.
- Never compute "due today" purely in a Supabase RPC using `NOW()` without accounting for timezone.
- For this milestone, storing as `DATE` and comparing to `CURRENT_DATE` is the cleanest approach given Lumio's single-user / known-timezone context.

**Warning signs:**
- User says "I finished all my cards but the counter still shows N due".
- Cards show as due at unexpected times (2am, 7pm instead of midnight).
- The counter differs by 1 depending on the time of day.

**Phase to address:**
Data model phase. Use `DATE` type for `due_date`, document timezone assumption explicitly in migration comment.

---

### Pitfall 4: Ease Factor Spiraling to Minimum ("Low Interval Hell")

**What goes wrong:**
SM-2's ease factor has a floor of 1.3. When a user repeatedly answers incorrectly, the ease factor hits 1.3 and stays there. The interval formula `next_interval = current_interval * ease_factor` then produces intervals that grow only by 30% each time (e.g., 1 → 1.3 → 1.7 → 2.2 days). Cards that the user genuinely struggles with get scheduled more often than useful, appearing nearly every day. The user sees these "difficult" cards constantly, which creates review fatigue and can cause them to abandon the app.

**Why it happens:**
SM-2 was designed for 5-point quality ratings (0-5). Lumio's quiz is binary (correct/incorrect). Mapping binary answers to SM-2 quality grades is non-trivial. If "correct" maps to quality=4 and "incorrect" maps to quality=0, the ease factor change for incorrect is `-0.8` per review, which quickly hits the 1.3 floor.

**How to avoid:**
- Use a simpler binary-adapted algorithm. Do not implement full SM-2 with 5-point quality scale for a binary correct/wrong quiz. Instead:
  - **Correct answer:** `new_interval = max(1, round(current_interval * ease_factor))`, ease_factor += 0.1 (up to 2.5 max)
  - **Wrong answer:** reset interval to 1, ease_factor = max(1.3, ease_factor - 0.2)
- OR: Use fixed multipliers. Correct: multiply by 2.5 (easy), 2.0 (medium). Wrong: reset to 1 day. No ease factor at all — simpler and sufficient for Lumio's use case.
- Enforce a floor (`ease_factor >= 1.3`) and ceiling (`ease_factor <= 2.5`) explicitly in the calculation, not just in DB constraints.
- Cap maximum interval at 365 days to prevent cards from disappearing for over a year after a lucky correct answer streak.

**Warning signs:**
- User complains of seeing the same hard cards every day.
- `card_reviews` table shows many rows where `ease_factor = 1.3` (the floor).
- Session contains disproportionate number of low-interval cards.

**Phase to address:**
Algorithm design phase. Decide on SM-2 binary adaptation or simplified fixed multipliers before writing any DB migration.

---

### Pitfall 5: Session Limit (10/20/50/All) Conflicts With "Due Cards First" Priority

**What goes wrong:**
The existing `cardsPerSession` setting (10/20/50/All) was designed for random selection. With spaced repetition, sessions have a different structure: due cards must come first (the user is "late" on those), then new cards fill remaining slots. But if a user sets 10 cards per session and has 15 overdue cards, the current limit logic truncates the session before all due cards are shown. This violates the core SRS contract: due cards should be reviewed when due.

**Why it happens:**
The `cardsPerSession` setting was implemented as a hard cap on total cards. It made sense for random selection (any card is equally valid). For SRS, "how many cards" is less important than "which cards" — overdue cards must take priority.

**How to avoid:**
- Change the semantics of `cardsPerSession` for SRS: the limit applies to **new** cards only, not due cards. Due cards always appear regardless of the limit.
- Alternatively: show all due cards first, then fill remaining slots (up to limit) with new cards. Example: limit=10, 7 due cards → show all 7 due + 3 new.
- If the due card count itself is very high (backlog), cap at 2× the session limit to prevent overwhelming the user, but always show at least `min(due_count, session_limit)` due cards.
- The `cardsPerSession` UI in Settings may need a label update: "New cards per session" instead of "Cards per session".

**Warning signs:**
- User studies 10 cards per session but keeps seeing "X cards due" never going to zero.
- Due cards accumulate over time because they never get shown within the session limit.

**Phase to address:**
Session design phase (after data model). When implementing `useStudySession` SRS adaptation, the card selection logic must prioritize due cards before new cards, separate from the limit logic.

---

### Pitfall 6: Cold-Start Problem — First-Time User Has No Schedule State

**What goes wrong:**
When a user starts their first SRS session, there is no `card_reviews` data. The scheduler has nothing to base intervals on. A naive implementation returns zero cards ("nothing due") or crashes on empty results. The "due today" counter shows 0, making the app look broken. Alternatively, all cards are treated as "new" and the scheduler floods the user with a backlog of hundreds of new cards.

**Why it happens:**
SRS systems assume some initial state. SM-2 initializes with repetitions=0, ease_factor=2.5, interval=1. Many implementations forget to handle the "no rows in card_reviews" case as "all cards are new" and display them correctly.

**How to avoid:**
- Define "new card" as: a card with no row in `card_reviews` for this user, OR a card whose `card_reviews.repetitions = 0`.
- The card selection query must include cards with no `card_reviews` row (LEFT JOIN, not INNER JOIN).
- On first session, present N new cards (where N = `cardsPerSession` setting, defaulting to 10). Do not dump all cards at once.
- Initialize the `card_reviews` row on the user's first correct answer, not before (lazy initialization avoids pre-populating thousands of rows).
- The "due today" counter should show `new_cards_available` as a non-zero starting state, not just due cards.

**Warning signs:**
- Dashboard shows "0 cards due" for a new user with 100 cards available.
- The session starts but immediately completes ("no cards to study").
- All cards appear in a single session with no SRS limiting.

**Phase to address:**
Data model phase and session selection logic. The card selection RPC must LEFT JOIN `card_reviews` and treat NULL rows as "new" cards.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store `due_date` as TIMESTAMPTZ instead of DATE | Familiar type, no timezone thinking needed | "Due today" logic breaks subtly for users in non-UTC timezones | Never — use DATE |
| Skip content-change reset (ignore card updates) | No migration, no webhook changes needed | Users study cards under stale ease factors; wrong content, right difficulty | Never for cards that change frequently |
| Hard-cap session at `cardsPerSession` regardless of due status | Simple logic, existing code reuse | Due cards accumulate, SRS contract violated, cards never cleared | Only for "all" setting where the cap is effectively infinite |
| Store SRS state in AsyncStorage instead of DB | Instant, no migration, no server calls | SRS state lost on app reinstall, no multi-device sync possible | Only during prototyping, never in production |
| Use INNER JOIN on card_reviews in card selection | Simpler query | New cards (no review row) never appear; cold-start broken | Never |
| Pre-initialize card_reviews rows for all cards | No NULL handling needed | Thousands of rows per user on first login, expensive migration for existing users | Never — use lazy initialization |
| Use fire-and-forget for SRS state update (no await) | Non-blocking UX | SRS state may not persist if app crashes before write completes; session and schedule get out of sync | Only acceptable if retry is implemented |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase RLS on `card_reviews` | Forgetting RLS, allowing users to read/write other users' SRS state | Add `user_id = auth.uid()` to all policies; index on `(user_id, card_id)` for performance |
| `study_sessions` (immutable) + SRS state (mutable) | Trying to UPDATE `study_sessions` to store per-card SRS outcomes | Keep sessions immutable (INSERT-only). Store SRS state in separate mutable `card_reviews` table with UPSERT |
| Docora webhook card update | Not triggering SRS state reset when card content changes | On `sync_success` webhook, check `cards.updated_at`; where it changed, mark `card_reviews` stale or reset interval |
| `get_study_cards_with_questions` RPC | Using existing RPC which returns cards ordered by `updated_at DESC` (wrong for SRS) | Create new SRS-specific RPC that orders by: (1) overdue first, (2) new cards second, within each group random |
| `card_questions` vote-based deactivation | A question gets deactivated after bad votes, but SRS state references the question_id | SRS state must reference `card_id` not `question_id`. The question is selected fresh each session; SRS tracks the card, not the question |
| Supabase `NOW()` in RPC | Computing "due today" with `WHERE due_date <= NOW()` returns UTC-relative results | Use `WHERE due_date <= CURRENT_DATE` (if storing DATE) or pass current timestamp from client |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 SRS state fetch (one query per card in session) | Session loading takes 2-5 seconds for 20 cards | Batch-fetch all `card_reviews` for the session in one query, join with card selection | At 10+ cards per session |
| No index on `(user_id, due_date)` in `card_reviews` | "Due today" counter query becomes table scan | Add composite index `CREATE INDEX ON card_reviews(user_id, due_date)` | At 500+ card_reviews rows |
| Dashboard queries `card_reviews` on every mount | Repeated expensive aggregation calls when switching screens | Cache due-count in component state, invalidate on session completion | At 1000+ rows (single user, not a concern for solo app) |
| Unindexed `card_id` in `card_reviews` | Card-specific lookups slow during session | Composite unique index on `(user_id, card_id)` is both uniqueness constraint and performance index | At 200+ cards per user |
| RLS policy using subquery on `user_repositories` | Policy re-evaluates for every row scan | Already an existing concern in the codebase (all RLS policies use this pattern); acceptable given single-user scale | At multi-user scale |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| No RLS on `card_reviews` | User A can read/modify User B's SRS schedule | Enable RLS immediately; no policy = publicly accessible via API |
| Allowing UPDATE on other users' SRS rows | User can manipulate their score by resetting difficult cards | Policy: `USING (user_id = auth.uid())` on UPDATE and DELETE |
| SRS reset endpoint (admin) accessible by regular users | Users could reset their own SRS to fake fresh start | Admin-only reset should use service_role key, not user JWT; no user-facing reset API |
| Storing raw card content in `card_reviews` | Data duplication risk; stale snapshots if card updates silently diverge | Store only `card_id` + `card_updated_at_snapshot` (timestamp), never full content |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing SRS algorithm details to users ("ease: 2.3, interval: 7d") | Users over-optimize for algorithm instead of learning | Hide all algorithm state; show only "Review" vs "New" label and streak |
| No visual distinction between "review" and "new" cards | Users don't understand why some cards keep repeating | Show "Review" badge on due cards, "New" badge on first-time cards during session |
| Study session immediately jumps to SRS after feature ships | Existing users see all their cards reset to "new" state; disorienting | On first SRS session, initialize `card_reviews` lazily — no visible difference from user perspective, new cards just get scheduled going forward |
| "Due today" counter shows 0 for genuinely new users | User thinks app is broken or has no content | Show "N new cards available" when due=0 but new cards exist |
| Session ends immediately when all due cards shown (none new) | User feels punished for being caught up | Show congratulatory "All caught up!" screen instead of abrupt empty session |
| Backlog anxiety: user returns after a week to find 50+ due cards | User feels overwhelmed, likely to abandon | Cap displayed backlog at "20+" with message "Take it easy, do 20 today" — don't show exact debt |
| Session history screen shows "all repositories" instead of card count | Confusing; doesn't tell user what was studied | Fix per PROJECT.md requirement: show actual card count from `study_sessions.total_count` |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **SRS scheduler "working":** Often missing: reset logic when a card's content changes (verify: edit a card in GitHub, sync, check if SRS state resets)
- [ ] **"Due today" counter accurate:** Often missing: timezone handling (verify: check counter value at 11pm local vs midnight vs 1am)
- [ ] **New user onboarding:** Often missing: cold-start case where no `card_reviews` rows exist (verify: create new test user, check session loads correctly)
- [ ] **Session limit with due cards:** Often missing: due cards bypass the cardsPerSession cap (verify: set limit=10 with 15 overdue cards, confirm all 15 show)
- [ ] **Card deletion handling:** Often missing: SRS rows for deleted/inactive cards are excluded from scheduling (verify: soft-delete a card, confirm it no longer appears in sessions)
- [ ] **Study history "card count" fix:** Often missing: `repository_name` in old sessions is NULL for cross-repo sessions — the display fix must handle NULL gracefully (verify: check history screen with old sessions that have NULL repository_name)
- [ ] **SRS state persists after app reinstall:** Often missing if state stored in AsyncStorage (verify: uninstall, reinstall, check SRS state is recovered from DB)
- [ ] **Ease factor bounds enforced:** Often missing: floor at 1.3 and ceiling at 2.5 in application code, not just DB CHECK constraint (verify: answer a card wrong 20 times, check ease_factor stays at 1.3, not below)

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stale SRS state after card content changes | MEDIUM | Write migration to reset `card_reviews` where `card_updated_at_snapshot < cards.updated_at`; run as one-time script |
| Wrong due_date type (TIMESTAMPTZ instead of DATE) | MEDIUM | Migration: `ALTER TABLE card_reviews ALTER COLUMN due_date TYPE DATE USING due_date::DATE`; test timezone behavior before deploying |
| Ease factor below 1.3 in existing data | LOW | `UPDATE card_reviews SET ease_factor = 1.3 WHERE ease_factor < 1.3`; add CHECK constraint going forward |
| All `card_reviews` rows lost (cascade delete from cards) | HIGH | Restore from Supabase backup; no in-app recovery. Prevention is the only real answer. |
| Session limit blocking due cards | LOW | Update card selection query; old sessions not affected; client update sufficient |
| AsyncStorage SRS state (wrong implementation) | HIGH | Migration requires all users to lose their SRS history; no graceful recovery. Must be caught before shipping. |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Stale schedule after card content change | Phase: Data model (card_reviews schema) | Check `card_updated_at_snapshot` column in migration; test card edit → SRS reset flow |
| Card deletion orphaning SRS state | Phase: Data model (FK policy decision) | Verify ON DELETE CASCADE on card_reviews; verify session detail uses UUID (no FK) |
| UTC vs local date for "due today" | Phase: Data model (due_date type choice) | Test counter at 11pm, midnight, 1am local time |
| Ease factor minimum floor | Phase: Algorithm implementation | Unit test: 20 wrong answers → ease_factor = 1.3, not lower |
| Session limit vs due card priority | Phase: Session selection logic | Integration test: 15 due cards + limit=10 → all 15 due cards shown |
| Cold-start empty state | Phase: Session selection RPC | Test with fresh user account with no card_reviews rows |
| Study history "card count" display | Phase: Session history UI fix (standalone, minimal) | History screen shows "20 cards" not "all repositories" for old sessions |
| N+1 SRS fetches | Phase: Session selection RPC | Single query fetches all needed state; verify in Supabase query logs |
| Missing RLS on card_reviews | Phase: Data model (migration) | Verify RLS enabled before any other work; test cross-user access returns 0 rows |

---

## Sources

- Direct inspection: `apps/android/hooks/useStudySession.ts` — existing random card selection logic (PRIMARY)
- Direct inspection: `supabase/migrations/20260211000001_study_sessions.sql` — study_sessions schema, immutable INSERT-only design (PRIMARY)
- Direct inspection: `supabase/migrations/20260123000001_card_questions.sql` — card_questions schema, card deletion cascade, deactivation reasons (PRIMARY)
- Direct inspection: `supabase/migrations/20260115000001_shared_repositories.sql` — RLS patterns, user_repositories join pattern (PRIMARY)
- Direct inspection: `apps/android/lib/studySettings.ts` — cardsPerSession type and semantics (PRIMARY)
- [SM-2 algorithm bugs: low interval hell and ease factor floor](https://www.blueraja.com/blog/477/a-better-spaced-repetition-learning-algorithm-sm2) — MEDIUM confidence (WebSearch verified)
- [FSRS vs SM-2 implementation considerations](https://memoforge.app/blog/fsrs-vs-sm2-anki-algorithm-guide-2025/) — MEDIUM confidence
- [Effective Spaced Repetition: card design and backlog pitfalls](https://borretti.me/article/effective-spaced-repetition) — MEDIUM confidence
- [Designing SRS for play not work: UX anti-patterns](https://pine.substack.com/p/designing-spaced-repetition-systems) — MEDIUM confidence
- [FSRS algorithm data model: D/S/R state per card](https://github.com/open-spaced-repetition/fsrs4anki/wiki/spaced-repetition-algorithm:-a-three%E2%80%90day-journey-from-novice-to-expert) — HIGH confidence
- [UTC timezone bug patterns in date logic](https://dev.to/kcsujeet/how-to-handle-date-and-time-correctly-to-avoid-timezone-bugs-4o03) — HIGH confidence
- [Supabase RLS performance and best practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — HIGH confidence
- Anki SM-2 implementation: ease factor floor = 1.3, confirmed in multiple sources — HIGH confidence

---
*Pitfalls research for: Lumio v2.0 — Adding spaced repetition to existing flashcard app*
*Researched: 2026-02-25*
