# Roadmap: Lumio

## Milestones

- SHIPPED **v1.1 Lumio Native** -- Phases 1-5 (shipped 2026-02-08)
- IN PROGRESS **v1.2 Polish & UX** -- Phases 6-9

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

### v1.2 Polish & UX (In Progress)

**Milestone Goal:** Migliorare la qualita dell'esperienza utente con bugfix, branding, sessioni configurabili e internazionalizzazione IT/EN.

- [x] **Phase 6: Bugfix & Version** -- Fix card preview cutoff and display actual app version (completed 2026-02-09)
- [ ] **Phase 7: Branding** -- Integrate Lumio logo across app and landing page
- [ ] **Phase 8: Configurable Study Sessions** -- Let users control session length with preset options
- [ ] **Phase 9: Internationalization** -- IT/EN language toggle with full UI string translation

## Phase Details

### Phase 6: Bugfix & Version
**Goal**: Users see correct card content in previews and accurate version info in Settings
**Depends on**: Nothing (first phase of v1.2)
**Requirements**: BUG-01, BUG-02
**Success Criteria** (what must be TRUE):
  1. User opens card preview bottom-sheet and sees full card content from the top -- no content is cut off or hidden
  2. User opens Settings and sees the actual installed app version (e.g., v1.1.4), not a hardcoded placeholder
  3. Card preview correctly renders markdown, LaTeX, code blocks, and images without layout issues after the fix
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Install dependencies + fix version display (BUG-02)
- [x] 06-02-PLAN.md — Rewrite card preview with native rendering (BUG-01)

### Phase 7: Branding
**Goal**: Users see the Lumio logo as a consistent brand element throughout the app and landing page
**Depends on**: Nothing (independent of Phase 6)
**Requirements**: BRAND-01, BRAND-02, BRAND-03
**Success Criteria** (what must be TRUE):
  1. User sees the Lumio logo on the Login screen instead of a text placeholder
  2. User sees the Lumio logo icon in the Dashboard navigation header
  3. Visitor to lumio.toto-castaldi.com sees the Lumio logo on the landing page
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Generate PNG logo assets + integrate logo in Login screen and Dashboard header (BRAND-01, BRAND-02)
- [ ] 07-02-PLAN.md — Add inline SVG logo to landing page header (BRAND-03)

### Phase 8: Configurable Study Sessions
**Goal**: Users can control how many cards they study per session through persistent settings
**Depends on**: Nothing (independent, but modifies SettingsScreen before i18n)
**Requirements**: STUDY-01, STUDY-02, STUDY-03
**Success Criteria** (what must be TRUE):
  1. User can select cards-per-session (10/20/50/All) in Settings and the choice persists across app restarts
  2. User sees "studying Y of X" count on the study ready screen reflecting the configured limit
  3. Study session ends after the configured number of cards is reached (or after all cards if "All" is selected)
  4. Default behavior (before user configures) studies all available cards (backward compatible)
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

### Phase 9: Internationalization
**Goal**: Users can switch between Italian and English, with all UI strings updating accordingly
**Depends on**: Phases 6, 7, 8 (translates final strings from all completed phases)
**Requirements**: I18N-01, I18N-02, I18N-03, I18N-04
**Success Criteria** (what must be TRUE):
  1. User can switch app language between Italian and English in Settings
  2. Language preference persists across app restarts -- app launches in the last selected language
  3. All UI strings (buttons, labels, headers, toasts, empty states, error messages) update immediately on language change
  4. Card content and AI-generated quiz questions remain in their original language regardless of UI language setting
  5. No untranslated strings visible when navigating any screen in either language
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD
- [ ] 09-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 6 -> 7 -> 8 -> 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.1 | 3/3 | Complete | 2026-02-04 |
| 2. Auth & Navigation | v1.1 | 4/4 | Complete | 2026-02-04 |
| 3. Core Screens | v1.1 | 5/5 | Complete | 2026-02-07 |
| 4. Study & Cards | v1.1 | 4/4 | Complete | 2026-02-08 |
| 5. Distribution & Cleanup | v1.1 | 4/4 | Complete | 2026-02-08 |
| 6. Bugfix & Version | v1.2 | 2/2 | Complete | 2026-02-09 |
| 7. Branding | v1.2 | 0/2 | Not started | - |
| 8. Configurable Study Sessions | v1.2 | 0/? | Not started | - |
| 9. Internationalization | v1.2 | 0/? | Not started | - |

---
*Roadmap created: 2026-01-29*
*v1.1 shipped: 2026-02-08*
*v1.2 roadmap added: 2026-02-09*
