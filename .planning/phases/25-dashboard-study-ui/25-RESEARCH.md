# Phase 25: Dashboard & Study UI - Research

**Researched:** 2026-02-26
**Domain:** React Native UI — dashboard data display & study session badges
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- New full-width StatCard placed between existing stats row and the Study CTA button (same slot pattern as Last Studied card)
- When due count > 0: show the number prominently
- When due count = 0: show "All caught up!" message with checkmark icon instead of the number 0
- Not tappable — purely informational display. The Study button below handles navigation
- Uses `get_due_card_count` RPC (already exists from Phase 23)
- Color-coded pill badge inside the ProgressBar component area, next to the card counter (e.g., "3/10")
- Review cards: blue/teal pill with text "Review"
- New cards: green pill with text "New"
- Text is i18n-localized (en: Review/New, it: Ripasso/Nuova)
- Instant swap when moving to next card — no animation
- Dynamic Study CTA button text based on due count: Due > 0 = "Study N due cards" (localized); Due = 0 = "Start Study Session" (generic, same as current)

### Claude's Discretion
- Icon and color scheme for the due counter card (should fit with existing: blue/folder, purple/documents, amber/time)
- Refresh strategy for due count (focus listener vs pull-to-refresh — success criteria requires update on return to dashboard)
- Study button disabled logic (currently disabled when cardCount === 0)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DASH-01 | Dashboard mostra counter "carte da ripassare oggi" | `getDueCardCount()` already exported from `@lumio/core`. StatCard component reusable. `useFocusEffect` for refresh on return. |
| DASH-02 | Durante studio, badge "Ripasso"/"Nuova" indica il tipo di carta | `SRSStudyCard.isReview` boolean already available on `session.currentCard`. ProgressBar component is the insertion point. i18n keys partially exist (`study.review` = "Review"/"Revisione"). |
</phase_requirements>

## Summary

This phase is a pure UI-surfacing task. All backend data is already available — `getDueCardCount()` RPC (Phase 23), `SRSStudyCard.isReview` boolean (Phase 23/24), and the i18n system (established in v1.x). The work involves three UI changes:

1. **Due counter on dashboard** — A new full-width `StatCard` between the existing stats and the Study button, calling `getDueCardCount()` and refreshing on screen focus via `useFocusEffect`.
2. **Review/New badge in study** — A small colored pill inside the `ProgressBar` component, driven by `session.currentCard.isReview`.
3. **Dynamic Study CTA text** — The study button text changes based on due count ("Study N due cards" vs "Start Study Session").

No new packages, migrations, or edge functions are needed. No architectural changes.

**Primary recommendation:** Use `useFocusEffect` for dashboard refresh, add i18n keys for new strings, extend `ProgressBar` props for the badge, and use inline color values for badge pills (no theme extension needed).

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-navigation/native` | ^7.1.28 | `useFocusEffect` hook for refresh-on-focus | Official react-navigation API, already installed |
| `i18n-js` | ^4.5.2 | Localized strings for badge text and due counter | Already the project's i18n solution |
| `@lumio/core` | local | `getDueCardCount()` API | Already exports this function |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native` | 0.81.5 | `View`, `Text`, `StyleSheet` for badge pill | Already the foundation |
| `@expo/vector-icons` (Ionicons) | installed | Checkmark icon for "All caught up" state | Already used across the app |

### Alternatives Considered
None — all tooling is already in the project.

**Installation:**
No installation needed. All dependencies are already present.

## Architecture Patterns

### Recommended Project Structure
No new files needed. Changes are to existing files:
```
apps/android/
├── screens/DashboardScreen.tsx       # Add due counter + dynamic button text
├── components/study/ProgressBar.tsx  # Add Review/New badge pill
├── i18n/en.ts                        # Add new translation keys
└── i18n/it.ts                        # Add Italian translations
```

### Pattern 1: useFocusEffect for Dashboard Refresh
**What:** Use `useFocusEffect` from `@react-navigation/native` to re-fetch due card count every time the dashboard screen gains focus (e.g., user returns from a study session).
**When to use:** Whenever data may have changed while the screen was not visible.
**Confidence:** HIGH (verified with Context7 react-navigation v7 docs)
**Example:**
```typescript
// Source: Context7 /react-navigation/react-navigation.github.io - useFocusEffect
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

// Inside DashboardScreen:
const [dueCount, setDueCount] = useState<number | null>(null);

useFocusEffect(
  useCallback(() => {
    let cancelled = false;
    getDueCardCount()
      .then(count => { if (!cancelled) setDueCount(count); })
      .catch(err => { if (!cancelled) setDueCount(0); });
    return () => { cancelled = true; };
  }, [])
);
```

**Key detail:** `useFocusEffect` fires on every focus event, including initial mount and returning from other screens. The existing `fetchStats` call via `useEffect` should be refactored to use `useFocusEffect` as well, so all dashboard data refreshes together.

### Pattern 2: Conditional StatCard Content
**What:** The due counter card shows a number when due > 0, or an "All caught up" message with checkmark when due = 0.
**When to use:** The `StatCard` component already accepts `value: string | number` — the conditional can be resolved at the call site.
**Example:**
```typescript
// Conditional value rendering
const dueValue = dueCount === 0
  ? t('dashboard.allCaughtUp')  // "All caught up!" / "Tutto aggiornato!"
  : dueCount;

// For the icon: checkmark when 0, calendar/alarm when > 0
const dueIcon = dueCount === 0 ? 'checkmark-circle-outline' : 'alarm-outline';
```

### Pattern 3: Badge Pill in ProgressBar
**What:** A small colored pill (`View` + `Text`) placed inside the `ProgressBar` container, next to the "current/total" text.
**When to use:** When displaying the Review/New card type during study.
**Example:**
```typescript
// Inside ProgressBar, after the text element:
{badgeText && (
  <View style={[
    styles.badge,
    { backgroundColor: isReview ? '#0d9488' : '#16a34a' }
  ]}>
    <Text style={styles.badgeText}>{badgeText}</Text>
  </View>
)}
```

### Anti-Patterns to Avoid
- **Don't add a new context/provider for due count.** A local state variable in `DashboardScreen` + `useFocusEffect` is sufficient. No global state needed.
- **Don't animate the badge.** Decision explicitly says "Instant swap when moving to next card — no animation."
- **Don't add a `success` color to the theme system** for the green badge. Inline colors are appropriate for a two-value badge that has no other usage.
- **Don't fetch due count inside the study session.** The badge uses `isReview` from the already-loaded `SRSStudyCard`, not a separate API call.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Refresh on screen focus | Custom event listeners or polling | `useFocusEffect` from `@react-navigation/native` | Official API, handles cleanup, works with bottom tabs |
| Due card count | Client-side counting/filtering | `getDueCardCount()` RPC (already exists) | Server-side COUNT is authoritative, handles RLS |
| Badge localization | Hardcoded strings or manual locale checks | `t('study.reviewBadge')` / `t('study.newBadge')` via i18n-js | Project pattern, supports future locales |

**Key insight:** Every piece of infrastructure for this phase already exists. The risk is not in building something new but in wiring existing pieces incorrectly.

## Common Pitfalls

### Pitfall 1: Due count shows stale data after study session
**What goes wrong:** User studies cards, goes back to dashboard, but the due counter still shows the old value.
**Why it happens:** `useEffect` with `[]` dependency only runs on mount, not when the screen re-focuses in a tab navigator.
**How to avoid:** Use `useFocusEffect` (not `useEffect`) for the due count fetch. This fires every time the dashboard screen gains focus.
**Warning signs:** Due count doesn't change after completing a study session and returning to dashboard.

### Pitfall 2: Flash of stale content on dashboard
**What goes wrong:** When returning to dashboard, old values briefly appear before the new fetch completes.
**Why it happens:** The `useFocusEffect` re-fetch is async; previous state renders first.
**How to avoid:** Keep the previous values showing while fetching (no loading spinner on refocus). The slight staleness for < 200ms is acceptable. Only show loading skeleton on initial mount.

### Pitfall 3: Badge reading wrong card's isReview
**What goes wrong:** The badge shows "Review" for a new card or vice versa.
**Why it happens:** If the badge reads from a stale reference instead of the current `session.currentCard`.
**How to avoid:** Pass `isReview` as a prop to `ProgressBar` directly from `session.currentCard?.isReview`, not from a separate state variable.

### Pitfall 4: i18n keys not matching type system
**What goes wrong:** TypeScript compilation fails because new keys exist in `en.ts` but not `it.ts` (or vice versa).
**Why it happens:** The `Translations` type from `en.ts` (`DeepStringify<typeof en>`) enforces the same key shape for all locales.
**How to avoid:** Always add new keys to BOTH `en.ts` and `it.ts` in the same commit/task.

### Pitfall 5: Study button still shows "Start Study Session" when due > 0
**What goes wrong:** Dynamic button text doesn't update because the due count state hasn't loaded yet.
**Why it happens:** `dueCount` state is `null` during initial load, and the button text defaults to generic.
**How to avoid:** Use a `null` initial state for `dueCount` (not `0`). Show the generic text while loading (null), and switch to dynamic text once the count resolves.

## Code Examples

### Due Counter StatCard (Dashboard)
```typescript
// New i18n keys needed:
// en: dashboard.dueToday: 'Due Today'
// en: dashboard.allCaughtUp: 'All caught up!'
// en: dashboard.studyNDueCards: 'Study %{count} due cards'
// it: dashboard.dueToday: 'Da ripassare oggi'
// it: dashboard.allCaughtUp: 'Tutto aggiornato!'
// it: dashboard.studyNDueCards: 'Studia %{count} schede in scadenza'

// In DashboardScreen, between lastStudiedRow and studyButton:
<View style={styles.dueCountRow}>
  <StatCard
    icon={dueCount === 0 ? 'checkmark-circle-outline' : 'alarm-outline'}
    iconColor="#10b981"                       // emerald-500 (success/green)
    iconBgColor={isDark ? '#064e3b' : '#d1fae5'}  // emerald-900/100
    label={t('dashboard.dueToday')}
    value={dueCount === 0 ? t('dashboard.allCaughtUp') : dueCount ?? '—'}
    isLoading={dueCount === null && isLoading}
  />
</View>
```

### Badge Pill in ProgressBar
```typescript
// Extended ProgressBar props:
interface ProgressBarProps {
  progress: number;
  current: number;
  total: number;
  badgeText?: string;     // "Review" / "Ripasso" or "New" / "Nuova"
  isReview?: boolean;     // Controls badge color
}

// Inside ProgressBar render, after the "current / total" Text:
{badgeText && (
  <View style={[
    styles.badge,
    { backgroundColor: isReview ? '#0d9488' : '#16a34a' },
  ]}>
    <Text style={styles.badgeText}>{badgeText}</Text>
  </View>
)}

// Badge styles:
badge: {
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 10,
},
badgeText: {
  color: '#ffffff',
  fontSize: 11,
  fontWeight: '600',
},
```

### useFocusEffect in DashboardScreen
```typescript
// Source: Context7 react-navigation v7 docs
import { useFocusEffect } from '@react-navigation/native';

// Replace the current useEffect + fetchStats with:
useFocusEffect(
  useCallback(() => {
    let cancelled = false;
    setIsLoading(prev => repoCount === 0 ? true : prev); // Only show loading on first load

    const refresh = async () => {
      try {
        const [stats, due] = await Promise.all([
          getUserStats(),
          getDueCardCount(),
        ]);
        if (!cancelled) {
          setRepoCount(stats.repositoryCount);
          setCardCount(stats.cardCount);
          setDueCount(due);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        if (!cancelled) setDueCount(0); // Graceful fallback
      }
    };

    refresh().finally(() => { if (!cancelled) setIsLoading(false); });

    // Also refresh lastStudied
    AsyncStorage.getItem('@lumio/lastStudiedAt').then(stored => {
      if (!cancelled) setLastStudied(stored);
    });

    return () => { cancelled = true; };
  }, [])
);
```

### Dynamic Study Button Text
```typescript
// Button text logic:
const studyButtonText = dueCount != null && dueCount > 0
  ? t('dashboard.studyNDueCards', { count: dueCount })
  : t('dashboard.startStudySession');

// In JSX (replacing the current static text):
<Text style={styles.studyButtonText}>{studyButtonText}</Text>
```

### Badge in StudyScreen (passing to ProgressBar)
```typescript
// In StudyScreen.tsx, where ProgressBar is rendered:
const currentCard = session.currentCard as SRSStudyCard | null;
const badgeText = currentCard
  ? (currentCard.isReview ? t('study.reviewBadge') : t('study.newBadge'))
  : undefined;

<ProgressBar
  progress={progress}
  current={answeredCount}
  total={effectiveLimit}
  badgeText={badgeText}
  isReview={currentCard?.isReview}
/>
```

### New i18n Keys (Complete List)
```typescript
// en.ts additions:
dashboard: {
  // ... existing keys
  dueToday: 'Due Today',
  allCaughtUp: 'All caught up!',
  studyNDueCards: 'Study %{count} due cards',
},
study: {
  // ... existing keys
  reviewBadge: 'Review',
  newBadge: 'New',
},

// it.ts additions:
dashboard: {
  // ... existing keys
  dueToday: 'Da ripassare oggi',
  allCaughtUp: 'Tutto aggiornato!',
  studyNDueCards: 'Studia %{count} schede in scadenza',
},
study: {
  // ... existing keys
  reviewBadge: 'Ripasso',
  newBadge: 'Nuova',
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useEffect` on mount only | `useFocusEffect` for tab screens | react-navigation v5+ | Data refreshes when user navigates back to screen |
| `navigation.addListener('focus')` | `useFocusEffect` | react-navigation v5+ | Cleaner API with automatic cleanup |

**Deprecated/outdated:**
- `navigation.addListener('focus', callback)` — still works but `useFocusEffect` is the recommended hook-based approach per official docs.

## Open Questions

1. **Due counter icon color — emerald or another color?**
   - What we know: Existing cards use blue (repos), purple (cards), amber (time). User said "should fit with existing."
   - Recommendation: Use emerald/green (#10b981) — it's the success/positive color already used elsewhere in the app (e.g., correct answers, session complete checkmark). It contrasts well with the existing blue/purple/amber set. When due > 0, could use amber/orange (alarm theme) instead.
   - **Resolved via discretion:** Use emerald green for the "All caught up" state (matches success semantics), and amber/orange for the "due cards" state (matches urgency semantics). This dual-color approach provides visual feedback about the state.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** — `DashboardScreen.tsx`, `StatCard.tsx`, `ProgressBar.tsx`, `StudyScreen.tsx`, `useStudySession.ts`, `study.ts`, `en.ts`, `it.ts`, `theme.ts` — all files read in full
- **Context7 `/react-navigation/react-navigation.github.io`** — `useFocusEffect` hook documentation, verified v7 compatible
- **Supabase migration `20260226000001_card_review_schedule.sql`** — `get_due_card_count` RPC confirmed

### Secondary (MEDIUM confidence)
None needed — all findings are from primary sources (codebase + official docs).

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — patterns verified from codebase (StatCard, ProgressBar, i18n) and Context7 (useFocusEffect)
- Pitfalls: HIGH — derived from direct code reading and understanding of react-navigation focus behavior

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable — no external dependencies changing)
