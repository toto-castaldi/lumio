# Phase 33: Dashboard Counter & Auto Label - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Dashboard counter and session selector accurately reflect the session-limited experience. The counter shows how many cards the user will actually study next (respecting their chosen limit), not the total backlog. The "Auto" option in the session size selector gets a proper label and icon.

</domain>

<decisions>
## Implementation Decisions

### Counter display
- Show session-aware count only (no total backlog visible on dashboard)
- When user has limit=20 and 150 due: counter shows "20"
- When user has limit=20 and 5 due: counter shows "5" (fewer than limit is fine)
- When 0 due: keep current behavior ("Tutto in pari!" / green checkmark)
- With "Auto" selected: counter shows full count of all available cards (DASH-02)

### CTA button text
- Button uses same session-aware count: "Study 20 cards" (not total backlog)
- Same text format for both limited and Auto modes — no branching
- With Auto and 150 due: button says "Study 150 due cards" (full count happens to be the session count)

### Auto label & icon
- Label text: "Auto" in both languages (no translation, universal term)
- Icon: sparkle/magic icon (sparkles-outline or color-wand-outline) instead of infinity
- Hints at "smart" future evolution while being visually distinct from numeric options

### Claude's Discretion
- Technical approach for session-aware count (modify getDueCardCount RPC vs other approach)
- Whether to rename "Due Today" label to "Next Session" or keep current label
- i18n key naming for the Auto option (rename or keep existing key)
- Exact Ionicons icon name for the sparkle/magic concept

</decisions>

<specifics>
## Specific Ideas

No specific requirements — the REQUIREMENTS.md (DASH-01, DASH-02, UI-01) and success criteria are precise enough.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getDueCardCount()`: `packages/core/src/supabase/study.ts:470` — calls `get_due_card_count` RPC, returns total due. Needs limit-awareness
- `DashboardScreen.tsx`: `apps/android/screens/DashboardScreen.tsx` — uses `dueCount` state from `getDueCardCount()`, feeds StatCard and CTA button
- `StatCard` component: `apps/android/components/StatCard.tsx` — already used for "Due Today" display
- `studySettings.ts`: `apps/android/lib/studySettings.ts` — `CardsPerSession` type already uses `'auto'`
- `StudySettingsContext`: `apps/android/contexts/StudySettingsContext.tsx` — provides `cardsPerSession` to the app
- `useStudySettings` hook: available in DashboardScreen for reading current session limit

### Established Patterns
- RPC calls: core function fetches from `/rest/v1/rpc/{name}`, components consume via hooks
- SQL migrations: new file that DROPs old function and CREATEs new one
- i18n: `en.ts` and `it.ts` with matching key structure, interpolation via `%{count}`
- Settings selector: `OptionItem<CardsPerSession>[]` array in SettingsScreen

### Integration Points
- `DashboardScreen` needs access to `cardsPerSession` from `useStudySettings` to pass limit to count function
- `SettingsScreen` line 111: `{ value: 'auto', label: t('settings.allCards'), icon: 'infinite-outline' }` — change label and icon here
- i18n files: `settings.allCards` key in `en.ts:102` and `it.ts:105` — update value or rename key
- `get_due_card_count` SQL RPC: `supabase/migrations/20260226000003_timezone_checks_fresh_user.sql` — may need p_limit param

</code_context>

<deferred>
## Deferred Ideas

- Smart "Auto" mode (dynamic card count based on time/performance) — out of scope per REQUIREMENTS.md
- Showing total backlog somewhere (e.g., separate stat or expandable detail) — not requested

</deferred>

---

*Phase: 33-dashboard-counter-auto-label*
*Context gathered: 2026-03-04*
