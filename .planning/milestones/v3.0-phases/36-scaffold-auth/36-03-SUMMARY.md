---
phase: 36-scaffold-auth
plan: 03
subsystem: ui
tags: [react, tailwind, responsive, dark-mode, i18n, layout, sidebar]

# Dependency graph
requires:
  - phase: 36-scaffold-auth/01
    provides: "AuthContext, ThemeContext, I18nContext, Tailwind lumio tokens, Supabase client"
provides:
  - "Responsive app shell with fixed header and collapsible sidebar"
  - "IT/EN segmented language toggle in header"
  - "Dark mode cycling icon (system/light/dark) with tooltip"
  - "Avatar dropdown with user email and sign out"
  - "DashboardPage placeholder (default authenticated route)"
affects: [38-deck-management, 39-card-authoring]

# Tech tracking
tech-stack:
  added: []
  patterns: [responsive-sidebar-layout, header-preference-controls, avatar-dropdown-pattern]

key-files:
  created:
    - apps/deck-builder/src/components/Layout.tsx
    - apps/deck-builder/src/components/Header.tsx
    - apps/deck-builder/src/components/Sidebar.tsx
    - apps/deck-builder/src/components/AvatarDropdown.tsx
    - apps/deck-builder/src/pages/DashboardPage.tsx
    - apps/deck-builder/public/logo-header.png
  modified:
    - apps/deck-builder/src/main.tsx
    - apps/deck-builder/src/i18n/en.ts
    - apps/deck-builder/src/i18n/it.ts

key-decisions:
  - "Inline SVG icons for hamburger, sun, moon, monitor -- no icon library dependency"
  - "CSS transform transition for mobile sidebar slide-in animation"
  - "Sidebar auto-closes on route change via useLocation() effect"

patterns-established:
  - "Layout wraps all authenticated routes via ProtectedLayout in main.tsx"
  - "Header preference controls pattern: segmented toggle for locale, cycling icon for theme"
  - "Avatar dropdown with click-outside and Escape key close behavior"

requirements-completed: [AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 15min
completed: 2026-03-12
---

# Phase 36 Plan 03: App Shell Summary

**Responsive layout with collapsible sidebar, header preference controls (IT/EN toggle, dark mode cycling, avatar dropdown), and dashboard placeholder**

## Performance

- **Duration:** ~15 min (across two sessions with visual verification checkpoint)
- **Started:** 2026-03-12T07:59:00Z
- **Completed:** 2026-03-12T11:09:13Z
- **Tasks:** 2 (1 implementation + 1 human-verify checkpoint)
- **Files modified:** 9

## Accomplishments
- Responsive app shell: sidebar always visible on desktop (>=1024px), hamburger-triggered overlay drawer on mobile (<1024px)
- Header bar with Lumio logo, IT/EN segmented language toggle, dark mode cycling icon with tooltips, and avatar dropdown
- Avatar dropdown showing user email and sign out button, with click-outside and Escape key close
- DashboardPage placeholder as default authenticated landing route
- All UI text uses i18n keys -- no hardcoded strings
- All components use lumio Tailwind color tokens for light and dark themes

## Task Commits

Each task was committed atomically:

1. **Task 1: App shell components (Layout, Header, Sidebar, AvatarDropdown, DashboardPage)** - `3ea7920` (feat)
2. **Task 2: Verify responsive layout, dark mode, and i18n** - checkpoint:human-verify approved (no code commit)

## Files Created/Modified
- `apps/deck-builder/src/components/Layout.tsx` - App shell with sidebar, header, and main content area
- `apps/deck-builder/src/components/Header.tsx` - Header bar with logo, language toggle, dark mode, avatar
- `apps/deck-builder/src/components/Sidebar.tsx` - Collapsible sidebar with placeholder content
- `apps/deck-builder/src/components/AvatarDropdown.tsx` - User avatar with dropdown (email + sign out)
- `apps/deck-builder/src/pages/DashboardPage.tsx` - Placeholder authenticated landing page
- `apps/deck-builder/public/logo-header.png` - Lumio logo for header display
- `apps/deck-builder/src/main.tsx` - Updated ProtectedLayout to wrap Outlet in Layout
- `apps/deck-builder/src/i18n/en.ts` - Added theme tooltip keys (themeSystem, themeLight, themeDark)
- `apps/deck-builder/src/i18n/it.ts` - Added Italian theme tooltip keys

## Decisions Made
- Used inline SVG icons for hamburger, sun, moon, and monitor icons rather than adding an icon library dependency (consistent with 36-02 approach using inline Google SVG)
- CSS transform translateX transition for smooth mobile sidebar slide-in animation
- Sidebar auto-closes on route change via useLocation() pathname effect (prevents stale overlay state)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 36 complete: scaffold, auth pages, and app shell all delivered
- Ready for Phase 37 (Backend Pipeline) - edge functions and GitHub API integration
- Ready for Phase 38 (Deck Management) - Sidebar will be replaced with actual deck list, DashboardPage with deck grid

## Self-Check: PASSED

All 9 files verified present. Commit 3ea7920 verified in git log.

---
*Phase: 36-scaffold-auth*
*Completed: 2026-03-12*
