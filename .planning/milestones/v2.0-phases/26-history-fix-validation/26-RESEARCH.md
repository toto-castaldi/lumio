# Phase 26: History Fix & Validation - Research

**Researched:** 2026-02-26
**Domain:** SRS correctness validation, study history UI fix, timezone-aware scheduling
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Replace "All repositories" / "Tutti i repository" with card count: "10 cards" / "10 carte"
- Card count must be localized (i18n) -- Italian and English
- Date/time shown as relative ("2 hours ago", "Yesterday", "3 days ago")
- Flat chronological list, most recent first -- no day grouping
- New (never-reviewed) cards count as "due" in the dashboard counter -- encourages first-time study
- When a fresh user taps Study with unreviewed cards, show them all as new cards immediately
- Empty state for study screen (no cards at all): friendly message + CTA to import a deck / go to repositories
- Empty state for study history screen (no sessions yet): friendly message + CTA to start first session
- "Today" determined by device local midnight -- due counter resets at 00:00 local time
- Calculation happens server-side: client sends timezone to server, server filters due cards accordingly
- Due counter updates live if device timezone changes (travel scenario)
- next_review_at stored as UTC timestamps in database, converted to local on client for comparison
- No UI indication when ease factor hits the 1.3 floor -- silent enforcement
- Ease factor floor (1.3) and minimum interval (1 day) are hardcoded -- not configurable
- Wrong answer resets interval to 1 day (strict SM-2, no lapse multiplier)
- Defense in depth: CHECK constraints on DB (ease_factor >= 1.3, interval >= 1) AND app-level enforcement

### Claude's Discretion
- Exact i18n key naming and pluralization approach
- How to pass timezone from client to server (query param, header, or body field)
- Empty state illustration/icon choices
- Migration strategy for adding DB CHECK constraints

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HIST-01 | Storico sessioni mostra conteggio carte al posto di "tutti i repository" | History row currently shows `repositoryName` which is always null (see Bug Analysis section). Fix: show `totalCount` from `study_sessions` table with localized "N cards"/"N carte" string. |
</phase_requirements>

## Summary

This phase addresses four distinct areas: (1) a history display bug, (2) fresh user experience validation, (3) timezone-aware due counter, and (4) SRS floor enforcement with DB constraints. The research found concrete root causes and clear implementation paths for each.

The **history bug** is straightforward: `saveStudySession()` in `StudyScreen.tsx` never passes `repositoryName`, so it defaults to `null`, and the history screen renders `null` as "All repositories". The fix replaces the center column with `item.totalCount` formatted via i18n pluralization (e.g., "10 cards" / "10 carte").

The **timezone fix** requires modifying the `get_due_card_count` and `get_study_cards_for_session` RPCs to accept a timezone parameter and use `AT TIME ZONE` for comparison instead of bare `CURRENT_DATE`. The client passes `Intl.DateTimeFormat().resolvedOptions().timeZone` (e.g., "Europe/Rome").

The **SRS floor enforcement** needs a new migration adding `CHECK` constraints to `card_review_schedule` (`ease_factor >= 1.3`, `interval_days >= 1`). The server-side `upsert_card_review` already enforces these via `GREATEST`, so the CHECK is defense-in-depth.

**Primary recommendation:** Treat this as 1 plan with 4 work streams (history UI, fresh user, timezone, DB constraints), since all are small, independent fixes touching different files.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| i18n-js | (via `i18n-js` npm) | Internationalization with pluralization | Already in project, supports `one`/`other` plural forms with `%{count}` interpolation |
| supermemo | 2.0.23 | SM-2 algorithm | Already in project, enforces EF floor at 1.3 |
| vitest | ^4.0.18 | Unit testing | Already in @lumio/core, used for sm2.test.ts |
| PostgreSQL | 15 | Database, CHECK constraints, AT TIME ZONE | Supabase-managed, version confirmed in config.toml |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Intl.DateTimeFormat | Native JS | Get device timezone string | Client-side timezone detection for RPC calls |

### Alternatives Considered
None -- all tools are already in the project. No new dependencies needed.

## Architecture Patterns

### Pattern 1: History Row Card Count Display
**What:** Replace `repositoryName` column in `StudyHistoryScreen` with localized card count from `item.totalCount`.
**When to use:** History screen rendering.

**Current code (bug):**
```typescript
// StudyHistoryScreen.tsx line 120
const repoLabel = item.repositoryName ?? t('history.allRepos');
```

**Fix pattern:**
```typescript
// Use i18n-js pluralization with count
const cardCountLabel = t('history.cardCount', { count: item.totalCount });
```

**i18n keys (new):**
```typescript
// en.ts
history: {
  cardCount: {
    one: '%{count} card',
    other: '%{count} cards',
  },
}

// it.ts
history: {
  cardCount: {
    one: '%{count} carta',
    other: '%{count} carte',
  },
}
```

**Confidence:** HIGH -- i18n-js pluralization with `one`/`other` is documented in the library and this pattern matches the project's existing interpolation style (`%{count}`).

### Pattern 2: Timezone-Aware Due Card Queries
**What:** Pass client timezone to server RPCs so `CURRENT_DATE` reflects the user's local midnight, not server UTC.
**When to use:** `get_due_card_count` and `get_study_cards_for_session` RPCs.

**Problem analysis:**
PostgreSQL `CURRENT_DATE` returns the date in the session's timezone setting. On Supabase (UTC by default), at 11:30 PM in Rome (UTC+1), `CURRENT_DATE` is already tomorrow in UTC. This means:
- Cards due "today" (local) are wrongly excluded after 11 PM local for UTC+N timezones
- Cards due "tomorrow" (local) are wrongly included after 11 PM local for UTC+N timezones

**Fix pattern -- RPC accepts timezone string:**
```sql
CREATE OR REPLACE FUNCTION get_due_card_count(p_user_id UUID, p_timezone TEXT DEFAULT 'UTC')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_today DATE;
BEGIN
    -- Compute "today" in the user's timezone
    v_today := (NOW() AT TIME ZONE p_timezone)::DATE;

    SELECT COUNT(*)::INTEGER INTO v_count
    FROM card_review_schedule crs
    JOIN cards c ON c.id = crs.card_id AND c.is_active = TRUE
    JOIN user_repositories ur ON ur.repository_id = c.repository_id
                              AND ur.user_id = p_user_id
    WHERE crs.user_id = p_user_id
      AND (crs.next_review_at AT TIME ZONE p_timezone)::DATE <= v_today;

    RETURN COALESCE(v_count, 0);
END;
$$;
```

**Client-side timezone detection:**
```typescript
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
// e.g., "Europe/Rome", "America/New_York", "Asia/Tokyo"

// Pass as body parameter in RPC call
body: JSON.stringify({ p_user_id: userId, p_timezone: timezone })
```

**Recommendation for passing timezone:** Use a body field (`p_timezone`) in the RPC JSON body. This is simplest since all existing RPC calls already use `POST` with JSON body. No need for headers or query params.

**Confidence:** HIGH -- `AT TIME ZONE` is standard PostgreSQL, and `Intl.DateTimeFormat().resolvedOptions().timeZone` is universally supported on modern Android/iOS.

### Pattern 3: DB CHECK Constraints for SRS Floor Enforcement
**What:** Add CHECK constraints to `card_review_schedule` for defense-in-depth.
**When to use:** New migration.

```sql
ALTER TABLE card_review_schedule
    ADD CONSTRAINT chk_ease_factor_floor CHECK (ease_factor >= 1.3),
    ADD CONSTRAINT chk_interval_floor CHECK (interval_days >= 0);
```

**Note:** `interval_days >= 0` (not `>= 1`) because the default for new cards is `0`. After the first review, `upsert_card_review` sets it to at least `1`. The constraint protects against negative values. The app-level floor at `1` is enforced in the SM-2 RPC (`v_new_interval := 1` on failure).

**Alternative:** Use `interval_days >= 1` with a default of `1` instead of `0`. However, this would conflict with the current table definition where `DEFAULT 0` is used for new cards. The safer approach is `>= 0` at the DB level and `>= 1` enforced in the RPC.

**Confidence:** HIGH -- `ALTER TABLE ADD CONSTRAINT` is non-destructive, and the current RPC already enforces these floors.

### Pattern 4: Fresh User Flow
**What:** Ensure a user with no review history can start a study session and see cards.
**When to use:** First-time study experience.

**Current behavior analysis:**
1. `getStudyCardsForSession()` RPC: When no `card_review_schedule` rows exist, the overdue section returns 0 rows, and the new-card section returns all cards with questions (up to `p_limit`). This already works correctly for fresh users.
2. `getDueCardCount()` RPC: Returns 0 for users with no review history (no schedule rows match). Per the decision, new (never-reviewed) cards should count as "due" to encourage first-time study.
3. Study screen empty states already exist (`no_cards` state with CTA).

**Changes needed for fresh user:**
- Modify `getDueCardCount` to ALSO count new cards (cards with no schedule row), OR add a separate counter. The decision says "new cards count as due" so the dashboard shows a non-zero count for fresh users.
- History empty state already exists with `t('history.emptyTitle')` and `t('history.emptySubtitle')`. The decision wants a CTA button ("start first session") -- currently the EmptyState in StudyHistoryScreen has no `actionLabel`/`onAction`.

**Confidence:** HIGH -- the existing code paths are clear and the changes are well-scoped.

### Anti-Patterns to Avoid
- **Don't use `CURRENT_DATE` without timezone context:** On Supabase (UTC), `CURRENT_DATE` does not reflect the user's local date. Always use `NOW() AT TIME ZONE p_timezone` for date comparison.
- **Don't add `interval_days >= 1` CHECK if default is 0:** New card schedule rows start with `interval_days = 0`. The CHECK must allow 0.
- **Don't format relative dates client-side with manual logic:** The `StudyHistoryScreen` currently uses `formatSessionDate()` with `toLocaleDateString()`. Per the decision, switch to relative time format -- but reuse the pattern from `DashboardScreen.formatLastStudied()` rather than hand-rolling.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pluralization (1 card / 2 cards) | Manual `count === 1 ? 'card' : 'cards'` | i18n-js `one`/`other` pluralization | Handles Italian (1 carta / 2 carte) and edge cases (0 cards) |
| Timezone detection | Manual offset calculation from `Date.getTimezoneOffset()` | `Intl.DateTimeFormat().resolvedOptions().timeZone` | Returns IANA timezone name (e.g., "Europe/Rome"), which PostgreSQL's `AT TIME ZONE` understands directly |
| Relative date formatting | Custom time-diff function | Reuse `formatLastStudied()` pattern from DashboardScreen | Already handles "just now", "Xm ago", "Xh ago", "Xd ago" with i18n |
| SM-2 EF floor | Custom clamp logic | `GREATEST(v_new_ef, 1.3)` in SQL + supermemo package built-in floor | Already implemented, just needs CHECK constraint for defense-in-depth |

**Key insight:** All four work streams use patterns already established in the codebase. No new libraries or architectural changes needed.

## Common Pitfalls

### Pitfall 1: PostgreSQL AT TIME ZONE Double Conversion
**What goes wrong:** Using `AT TIME ZONE` on a `TIMESTAMPTZ` converts it to a `TIMESTAMP` (without timezone). Applying `AT TIME ZONE` again would reconvert in the wrong direction.
**Why it happens:** `TIMESTAMPTZ AT TIME ZONE 'X'` returns `TIMESTAMP` (drops TZ info). `TIMESTAMP AT TIME ZONE 'X'` returns `TIMESTAMPTZ` (adds TZ info).
**How to avoid:** Always cast to `DATE` after a single `AT TIME ZONE` conversion: `(next_review_at AT TIME ZONE p_timezone)::DATE`.
**Warning signs:** Dates off by one day in specific timezones.

### Pitfall 2: Invalid Timezone String
**What goes wrong:** Client sends a malformed timezone string, causing the RPC to fail.
**Why it happens:** Some older devices or edge-case locales might return unusual timezone identifiers.
**How to avoid:** Validate the timezone in SQL with a TRY/CATCH, falling back to UTC. Or validate client-side that the timezone string is non-empty.
**Warning signs:** RPC errors in production for specific users/devices.

### Pitfall 3: i18n-js Pluralization Key Structure
**What goes wrong:** Using a flat string key for a pluralized translation returns `[missing]` or the raw key.
**Why it happens:** i18n-js expects pluralized keys as objects with `one`/`other` sub-keys, not flat strings.
**How to avoid:** Structure the key as `{ one: '...', other: '...' }` and call `t('key', { count: N })`.
**Warning signs:** Missing translation warnings in dev console.

### Pitfall 4: CHECK Constraint Blocks Existing Data
**What goes wrong:** Adding a CHECK constraint fails if existing rows violate it.
**Why it happens:** PostgreSQL validates all existing rows when adding a CHECK constraint.
**How to avoid:** Either (a) fix violating rows before adding the constraint, or (b) use `NOT VALID` to skip existing row validation (then `VALIDATE CONSTRAINT` separately). In this case, the `upsert_card_review` RPC already enforces the floors, so existing data should be clean. But add a safety UPDATE before the constraint.
**Warning signs:** Migration fails in CI with `ERROR: check constraint ... is violated by some row`.

### Pitfall 5: Fresh User Due Count Including New Cards
**What goes wrong:** Modifying `get_due_card_count` to include new cards changes the semantics for existing users. Users who have reviewed all cards would see a non-zero due count (new cards they haven't reached yet).
**Why it happens:** "New cards" and "due cards" are different concepts in SRS.
**How to avoid:** The decision says new cards should count as due. This is intentional for fresh users but affects all users. Consider whether the dashboard label "Due Today" is still appropriate, or if the count should be "Cards to study" (due + new). The existing study CTA already says "Study N due cards" -- this wording may need adjustment.
**Warning signs:** Existing users confused by non-zero due count after clearing all reviews.

## Code Examples

### Example 1: Relative Date Formatting (Reuse from Dashboard)
```typescript
// Already exists in DashboardScreen.tsx — extract to shared utility
function formatRelativeTime(
  dateString: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return t('dashboard.justNow');
  if (diffMinutes < 60) return t('dashboard.mAgo', { count: diffMinutes });
  if (diffHours < 24) return t('dashboard.hAgo', { count: diffHours });
  if (diffDays < 7) return t('dashboard.dAgo', { count: diffDays });

  return date.toLocaleDateString();
}
```

### Example 2: Timezone-Aware RPC Call
```typescript
// packages/core/src/supabase/study.ts
export async function getDueCardCount(): Promise<number> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const userId = await getUserId();
  if (!userId) throw new Error('User ID not found');

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
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
      body: JSON.stringify({ p_user_id: userId, p_timezone: timezone }),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get due card count');
  }
  return response.json();
}
```

### Example 3: i18n-js Pluralization Keys
```typescript
// en.ts - history section
history: {
  title: 'Study History',
  emptyTitle: 'No sessions yet',
  emptySubtitle: 'Complete a study session to see your history here.',
  startFirstSession: 'Start Studying',  // CTA for empty state
  cardCount: {
    one: '%{count} card',
    other: '%{count} cards',
  },
  score: '%{correct}/%{total}',
  failedToLoad: 'Failed to load study history',
}

// it.ts - history section
history: {
  title: 'Storico studio',
  emptyTitle: 'Nessuna sessione',
  emptySubtitle: 'Completa una sessione di studio per vedere lo storico qui.',
  startFirstSession: 'Inizia a studiare',
  cardCount: {
    one: '%{count} carta',
    other: '%{count} carte',
  },
  score: '%{correct}/%{total}',
  failedToLoad: 'Impossibile caricare lo storico',
}
```

### Example 4: CHECK Constraint Migration
```sql
-- Safety: ensure no violating rows exist before constraint
UPDATE card_review_schedule
SET ease_factor = GREATEST(ease_factor, 1.3)
WHERE ease_factor < 1.3;

UPDATE card_review_schedule
SET interval_days = GREATEST(interval_days, 0)
WHERE interval_days < 0;

-- Add defense-in-depth constraints
ALTER TABLE card_review_schedule
    ADD CONSTRAINT chk_ease_factor_floor CHECK (ease_factor >= 1.3);

ALTER TABLE card_review_schedule
    ADD CONSTRAINT chk_interval_floor CHECK (interval_days >= 0);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `CURRENT_DATE` for due check (assumes server TZ = user TZ) | `NOW() AT TIME ZONE p_timezone` with client-passed timezone | This phase | Fixes due counter flip at wrong time for non-UTC users |
| `repositoryName` in study_sessions (always null) | `totalCount` already stored, display via i18n pluralization | This phase | History rows show "10 cards" instead of "All repositories" |
| No DB constraint on ease_factor/interval | CHECK constraints as defense-in-depth | This phase | Prevents corruption if future code bypasses the RPC |

## Bug Analysis

### Bug 1: History Shows "All repositories" Instead of Card Count
**Root cause:** `StudyScreen.tsx` line 67-72 calls `saveStudySession()` without passing `repositoryName`. The field defaults to `null`. In `StudyHistoryScreen.tsx` line 120, `null` maps to `t('history.allRepos')` = "All repositories".
**Fix:** Remove the `repositoryName` column from the history display entirely. Replace with `item.totalCount` formatted via i18n pluralization. The `totalCount` field is already saved correctly in `study_sessions`.
**Files:** `StudyHistoryScreen.tsx` (display), `en.ts` (i18n key), `it.ts` (i18n key).

### Bug 2: Due Counter Uses Server UTC Date
**Root cause:** `get_due_card_count` and `get_study_cards_for_session` use `CURRENT_DATE` which reflects the PostgreSQL session timezone (UTC on Supabase). Users in non-UTC timezones see the wrong date boundary.
**Fix:** Add `p_timezone TEXT DEFAULT 'UTC'` parameter to both RPCs. Use `(NOW() AT TIME ZONE p_timezone)::DATE` instead of `CURRENT_DATE`. Also update `upsert_card_review` to use timezone for `next_review_at` calculation.
**Files:** New SQL migration, `packages/core/src/supabase/study.ts` (pass timezone).

### Bug 3: Fresh User Due Count Shows 0
**Root cause:** `get_due_card_count` only counts cards with a `card_review_schedule` row where `next_review_at::date <= CURRENT_DATE`. Fresh users have no schedule rows, so count is always 0. Per the decision, new cards should count as "due".
**Fix:** Modify `get_due_card_count` to add a second count: cards with active questions but no schedule row. Return `due_count + new_count`.
**Files:** SQL migration (update RPC), no client changes needed (just returns a number).

## Open Questions

1. **Due counter label wording when including new cards**
   - What we know: The decision says new cards count as "due". The dashboard shows "Due Today" / "Da ripassare oggi".
   - What's unclear: Should the label change to "Cards to study" since "due" traditionally means "scheduled for review"?
   - Recommendation: Keep "Due Today" label unchanged. The intent is to show urgency/encourage study. Users don't think in SRS terms.

2. **upsert_card_review timezone for next_review_at**
   - What we know: Currently uses `CURRENT_DATE + interval` which is UTC-based.
   - What's unclear: Should `upsert_card_review` also accept timezone to compute `next_review_at` relative to local date?
   - Recommendation: Yes -- pass timezone to `upsert_card_review` as well. When a user reviews a card at 11:30 PM local time, `CURRENT_DATE` in UTC is already tomorrow, making the computed `next_review_at` off by one day. Use `(NOW() AT TIME ZONE p_timezone)::DATE + interval` instead.

3. **Timezone validation in SQL**
   - What we know: PostgreSQL will throw an error for invalid timezone strings in `AT TIME ZONE`.
   - What's unclear: Whether to add a TRY/CATCH in the RPC or trust the client.
   - Recommendation: Add a simple validation with fallback to UTC. Use `BEGIN ... EXCEPTION WHEN invalid_parameter_value THEN v_today := CURRENT_DATE; END;` pattern. Lightweight and safe.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `StudyScreen.tsx`, `StudyHistoryScreen.tsx`, `useStudySession.ts`, `study.ts` -- direct code inspection for bug root causes
- Codebase analysis: `20260226000001_card_review_schedule.sql`, `20260226000002_upsert_card_review.sql` -- current RPC implementations
- Codebase analysis: `sm2.test.ts` -- existing test for 20 consecutive wrong answers (line 48-55)
- PostgreSQL 15 documentation -- `AT TIME ZONE` operator, `CHECK` constraints
- `/fnando/i18n` Context7 -- pluralization support with `one`/`other` keys

### Secondary (MEDIUM confidence)
- `i18n-js` npm package behavior for nested pluralization keys -- verified via Context7

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new deps
- Architecture: HIGH -- patterns follow existing codebase conventions exactly
- Pitfalls: HIGH -- all identified from direct code analysis and PostgreSQL docs
- Bug analysis: HIGH -- root causes identified by reading actual source code

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable domain, no moving parts)
