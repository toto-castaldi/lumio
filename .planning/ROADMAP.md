# Roadmap: Lumio

## Milestones

- SHIPPED **v1.1 Lumio Native** -- Phases 1-5 (shipped 2026-02-08)
- SHIPPED **v1.2 Polish & UX** -- Phases 6-9 (shipped 2026-02-09)
- SHIPPED **v1.3 Bugfix & UX Polish** -- Phases 10-12 (shipped 2026-02-10)
- IN PROGRESS **v1.4 Card Browse & Stats** -- Phases 13-15

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

<details>
<summary>v1.3 Bugfix & UX Polish (Phases 10-12) -- SHIPPED 2026-02-10</summary>

- [x] Phase 10: Branding Consistency (2 plans) -- completed 2026-02-10
- [x] Phase 11: Study Flow Simplification (1 plan) -- completed 2026-02-10
- [x] Phase 12: Dashboard & Repo Bugfixes (1 plan) -- completed 2026-02-10

Full details: `.planning/milestones/v1.3-ROADMAP.md`

</details>

### v1.4 Card Browse & Stats (In Progress)

**Milestone Goal:** Aggiungere navigazione carte nei repo, statistiche sessioni di studio, e fix UX residui.

- [x] **Phase 13: UX Fixes** - Fix navbar overlap su card preview e stile impostazioni -- completed 2026-02-11
- [x] **Phase 14: Card Browse** - Navigazione carte: lista per repo e dettaglio carta -- completed 2026-02-11
- [ ] **Phase 15: Study Stats** - Registrazione e visualizzazione storico sessioni di studio

## Phase Details

### Phase 13: UX Fixes
**Goal**: L'esperienza utente durante studio e nelle impostazioni e' visivamente coerente e priva di bug di layout
**Depends on**: Nothing (first phase of v1.4)
**Requirements**: UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. During a study session, the card preview content is fully visible and not obscured by the Android navigation bar on any screen
  2. In Settings, the "Connesso come" section has the same uppercase section header style as "ASPETTO" and other section headers
**Plans**: 1 plan

Plans:
- [x] 13-01-PLAN.md -- Fix card preview navbar overlap and settings ACCOUNT section with avatar

### Phase 14: Card Browse
**Goal**: L'utente puo' esplorare le carte di un repository senza avviare una sessione di studio
**Depends on**: Phase 13 (clean UX baseline)
**Requirements**: BROWSE-01, BROWSE-02
**Success Criteria** (what must be TRUE):
  1. User can tap on a repository in the dashboard and see a scrollable list of all cards in that repository
  2. User can tap on a card in the list to open a full read-only detail view showing the card content (markdown, code, LaTeX, images)
  3. User can navigate back from card detail to card list, and from card list to dashboard
**Plans**: 1 plan

Plans:
- [x] 14-01-PLAN.md -- Card browse screens with navigation, card list, card detail, and i18n

### Phase 15: Study Stats
**Goal**: L'utente puo' vedere il proprio storico sessioni di studio con risultati e tempi
**Depends on**: Phase 14 (card browse complete, clean codebase)
**Requirements**: STATS-01, STATS-02, STATS-03
**Success Criteria** (what must be TRUE):
  1. After completing a study session, the system persists the session result (date, repository name, correct/total answers, elapsed time) to the database
  2. User can tap on "ultimo studio" in the dashboard to navigate to a session history screen
  3. The session history screen displays the last N sessions (N configured by backend, default 10) with date, repo, score, and duration for each
  4. If the user has no study sessions yet, the history screen shows an appropriate empty state
**Plans**: TBD

Plans:
- [ ] 15-01: TBD

## Progress

**Execution Order:** 13 -> 14 -> 15

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
| 12. Dashboard & Repo Bugfixes | v1.3 | 1/1 | Complete | 2026-02-10 |
| 13. UX Fixes | v1.4 | 1/1 | Complete | 2026-02-11 |
| 14. Card Browse | v1.4 | 1/1 | Complete | 2026-02-11 |
| 15. Study Stats | v1.4 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-29*
*v1.1 shipped: 2026-02-08*
*v1.2 shipped: 2026-02-09*
*v1.3 shipped: 2026-02-10*
*v1.4 roadmap created: 2026-02-11*
