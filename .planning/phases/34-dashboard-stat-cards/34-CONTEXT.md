# Phase 34: Dashboard Stat Cards - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Compact two-column layout for "Ultimo studio" and "Da ripassare oggi" stat cards on a single row (matching Repository/Schede pattern), with verbose localized relative time and non-navigable last-studied card. Study button redesign is Phase 35.

</domain>

<decisions>
## Implementation Decisions

### Two-column layout
- "Ultimo studio" and "Da ripassare oggi" on the same row, each half-width
- Match existing Repository/Schede row pattern (flexDirection: row, gap: 12, paddingHorizontal: 16)
- "Ultimo studio" on left, "Da ripassare oggi" on right (reading order: when → what's due)
- Remove TouchableOpacity wrapper from "Ultimo studio" — no navigation to StudyHistory

### Relative time format
- Switch from abbreviated ("2g fa", "5h ago") to verbose ("2 giorni fa", "5 hours ago")
- Natural language singulars: "un minuto fa" (not "1 minuto fa"), "un'ora fa", "ieri" / "a minute ago", "an hour ago", "yesterday"
- "Just now" / "Adesso" threshold extended to <5 minutes (was <1 minute)
- Always relative — never fall back to absolute date
- Standard transition thresholds: <5m → "just now", <60m → minutes, <24h → hours, <7d → days, <30d → weeks, <365d → months, else years

### Value text sizing
- Add `compact` prop to StatCard for half-width contexts
- When `compact`, use smaller font size (~18-20) for values — prevents overflow for text like "2 giorni fa"
- Repository/Schede row does NOT use compact (their values are short numbers)

### Due Today card
- Keep dynamic icon behavior: checkmark when caught up, alarm when cards due
- Shorten "caught up" text: "In pari" / "All done" (was "Tutto aggiornato!" / "All caught up!")

### Claude's Discretion
- Exact compact font size (18 vs 20)
- Loading skeleton size adjustments for compact mode
- Any subtle spacing tweaks for half-width cards

</decisions>

<specifics>
## Specific Ideas

- Requirements explicitly mention "ieri", "2 giorni fa", "un'ora fa" — verbose Italian relative time as the reference style
- "In pari" / "All done" chosen over emoji alternatives for caught-up state

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatCard` component (apps/android/components/StatCard.tsx): flex: 1, icon + label + value + optional subtitle. Needs `compact` prop addition.
- `formatLastStudied()` in DashboardScreen.tsx: already handles relative time with i18n — needs rewrite for verbose format + extended thresholds
- i18n keys exist for dashboard (mAgo, hAgo, dAgo, justNow, notYet, allCaughtUp, dueToday, lastStudied) — need update/expansion for verbose forms

### Established Patterns
- Row layout: `statRow` style (flexDirection: row, gap: 12, paddingHorizontal: 16, marginTop: 16)
- StatCard value: fontSize 28, fontWeight bold — works for numbers, needs compact variant for text
- Dynamic icon/color on Due Today card based on `dueCount === 0`

### Integration Points
- `DashboardScreen.tsx` lines 163-213: stat card rendering — restructure lastStudiedRow + dueCountRow into single row
- `DashboardScreen.tsx` lines 183-197: TouchableOpacity to remove
- i18n files: apps/android/i18n/en.ts and it.ts — update allCaughtUp keys, add verbose time keys

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-dashboard-stat-cards*
*Context gathered: 2026-03-05*
