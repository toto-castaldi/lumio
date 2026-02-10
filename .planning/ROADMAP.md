# Roadmap: Lumio

## Milestones

- SHIPPED **v1.1 Lumio Native** -- Phases 1-5 (shipped 2026-02-08)
- SHIPPED **v1.2 Polish & UX** -- Phases 6-9 (shipped 2026-02-09)
- IN PROGRESS **v1.3 Bugfix & UX Polish** -- Phases 10-12

## Phases

<details>
<summary>v1.1 Lumio Native (Phases 1-5) -- SHIPPED 2026-02-08</summary>

- [x] Phase 1: Foundation (3 plans) -- completed 2026-02-04
- [x] Phase 2: Auth & Navigation (4 plans) -- completed 2026-02-04
- [x] Phase 3: Core Screens (5 plans) -- completed 2026-02-07
- [x] Phase 4: Study & Cards (4 plans) -- completed 2026-02-08
- [x] Phase 5: Distribution & Cleanup (4 plans) -- completed 2026-02-08

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>v1.2 Polish & UX (Phases 6-9) -- SHIPPED 2026-02-09</summary>

- [x] Phase 6: Bugfix & Version (2 plans) -- completed 2026-02-09
- [x] Phase 7: Branding (2 plans) -- completed 2026-02-09
- [x] Phase 8: Configurable Study Sessions (2 plans) -- completed 2026-02-09
- [x] Phase 9: Internationalization (3 plans) -- completed 2026-02-09

Full details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

### v1.3 Bugfix & UX Polish (In Progress)

**Milestone Goal:** Fix branding inconsistencies, simplify the study experience, and correct data display bugs across the app.

- [x] **Phase 10: Branding Consistency** - Launcher icon and in-app logos show the correct Lumio brand -- completed 2026-02-10
- [x] **Phase 11: Study Flow Simplification** - Study sessions are streamlined with no unnecessary friction or layout issues -- completed 2026-02-10
- [ ] **Phase 12: Dashboard & Repo Bugfixes** - Dashboard and repository list display accurate data

## Phase Details

### Phase 10: Branding Consistency
**Goal**: The app presents the Lumio brand correctly at every touchpoint -- launcher, login, and dashboard
**Depends on**: Nothing (independent of other v1.3 phases)
**Requirements**: BRAND-01, BRAND-02, BRAND-03
**Success Criteria** (what must be TRUE):
  1. The Android home screen and app drawer show the Lumio logo as the launcher icon (not the default Expo icon)
  2. The Login screen displays the correct Lumio logo image with the text "Lumio" visible
  3. The Dashboard header displays the correct Lumio logo image with the text "Lumio" visible
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md -- Generate Lumio launcher icon PNGs from SVG source
- [x] 10-02-PLAN.md -- Add "Lumio" text to Login screen and Dashboard header

### Phase 11: Study Flow Simplification
**Goal**: The study experience is clean and unobstructed -- no unnecessary toasts, no backward navigation, no confirmation dialogs, and no content hidden behind the navbar
**Depends on**: Nothing (independent of other v1.3 phases)
**Requirements**: STUDY-01, STUDY-02, STUDY-03, LAYOUT-01
**Success Criteria** (what must be TRUE):
  1. Skipping a card during study produces no toast notification
  2. The study screen shows only a "Next" button with no "Prev" button visible
  3. Tapping the X button during a study session closes it immediately without any confirmation dialog
  4. All card content is fully visible during study -- the Android navigation bar does not overlap or cover any part of the card
**Plans**: 1 plan

Plans:
- [x] 11-01-PLAN.md -- Remove study friction (no toast, no Prev, no quit dialog) and fix Android navbar overlap

### Phase 12: Dashboard & Repo Bugfixes
**Goal**: The dashboard and repository list display accurate, up-to-date information
**Depends on**: Nothing (independent of other v1.3 phases)
**Requirements**: BUG-01, BUG-02
**Success Criteria** (what must be TRUE):
  1. After completing a study session, the dashboard shows the correct date/time of the last session (not "Non ancora")
  2. Public repositories display a public/open icon (not a lock/private icon), regardless of whether the repo was previously private
**Plans**: 1 plan

Plans:
- [ ] 12-01-PLAN.md -- Fix dashboard "last studied" display and repository visibility icons

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.1 | 3/3 | Complete | 2026-02-04 |
| 2. Auth & Navigation | v1.1 | 4/4 | Complete | 2026-02-04 |
| 3. Core Screens | v1.1 | 5/5 | Complete | 2026-02-07 |
| 4. Study & Cards | v1.1 | 4/4 | Complete | 2026-02-08 |
| 5. Distribution & Cleanup | v1.1 | 4/4 | Complete | 2026-02-08 |
| 6. Bugfix & Version | v1.2 | 2/2 | Complete | 2026-02-09 |
| 7. Branding | v1.2 | 2/2 | Complete | 2026-02-09 |
| 8. Configurable Study Sessions | v1.2 | 2/2 | Complete | 2026-02-09 |
| 9. Internationalization | v1.2 | 3/3 | Complete | 2026-02-09 |
| 10. Branding Consistency | v1.3 | 2/2 | Complete | 2026-02-10 |
| 11. Study Flow Simplification | v1.3 | 1/1 | Complete | 2026-02-10 |
| 12. Dashboard & Repo Bugfixes | v1.3 | 0/1 | Not started | - |

---
*Roadmap created: 2026-01-29*
*v1.1 shipped: 2026-02-08*
*v1.2 shipped: 2026-02-09*
*v1.3 roadmap added: 2026-02-10*
