# Phase 3: Core Screens - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Dashboard with study statistics (repo count, card count, last studied) and repository management (list repos, add public/private repos, remove repos). Dark mode support with in-app toggle. Study button on dashboard disabled when no cards exist. Backend remains unchanged.

</domain>

<decisions>
## Implementation Decisions

### Dashboard layout
- Stat cards: individual cards/tiles for each metric (repo count, card count, last studied)
- Stats to show: repository count, total card count, and last study timestamp
- Study button as a prominent CTA below the stat cards — large, centered, primary action on the page
- Study button disabled when no cards exist

### Dark mode
- In-app toggle in Settings to override system preference
- Supports system-auto + manual override

### Repository list
- Swipe-to-delete to reveal remove action — mobile-native pattern
- Confirmation dialog before actual removal (per roadmap success criteria)

### Add repo flow
- Single URL input field — app detects if public or private
- If public validation fails, prompt for PAT (private repo)
- After submit: inline feedback — stay on repos screen, toast/snackbar for success/error, repo appears in list

### Error handling
- Inline errors for form validation (invalid URL, missing PAT)
- Toast/snackbar for network and background errors (sync failures, connectivity)
- Both patterns coexist

### Refresh behavior
- Pull-to-refresh on both dashboard and repo list screens

### Claude's Discretion
- Repository list display format (list vs cards, information density)
- Private repo visual indicator (lock icon vs badge — pick the clearest)
- Add repo button placement (FAB vs header button)
- PAT input UX when private repo detected (expandable section vs bottom sheet)
- Dashboard empty state design (CTA-driven vs zero-state cards)
- Repo list empty state design
- Sync status visibility in repo list (based on available backend data)
- Loading states and skeleton designs
- Exact spacing, typography, and color choices

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow existing design patterns established in Phase 2 (NativeWind styling, consistent with auth screens).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-core-screens*
*Context gathered: 2026-02-07*
