# Roadmap: Lumio

## Milestones

- SHIPPED **v1.1 Lumio Native** -- Phases 1-5 (shipped 2026-02-08)
- SHIPPED **v1.2 Polish & UX** -- Phases 6-9 (shipped 2026-02-09)
- SHIPPED **v1.3 Bugfix & UX Polish** -- Phases 10-12 (shipped 2026-02-10)
- SHIPPED **v1.4 Card Browse & Stats** -- Phases 13-15 (shipped 2026-02-11)
- SHIPPED **v1.5 Study UX Fixes** -- Phase 16 (shipped 2026-02-12)
- IN PROGRESS **v1.6 Sync Error Handling** -- Phases 17-19

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

<details>
<summary>v1.4 Card Browse & Stats (Phases 13-15) -- SHIPPED 2026-02-11</summary>

- [x] Phase 13: UX Fixes (1 plan) -- completed 2026-02-11
- [x] Phase 14: Card Browse (1 plan) -- completed 2026-02-11
- [x] Phase 15: Study Stats (2 plans) -- completed 2026-02-11

Full details: `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>v1.5 Study UX Fixes (Phase 16) -- SHIPPED 2026-02-12</summary>

- [x] Phase 16: Study Screen Polish (1 plan) -- completed 2026-02-12

Full details: `.planning/milestones/v1.5-ROADMAP.md`

</details>

### v1.6 Sync Error Handling (In Progress)

**Milestone Goal:** Handle Docora sync failures gracefully -- show errors in the app and let users fix expired PAT tokens without leaving the repository list.

- [x] **Phase 17: Sync Failure Backend** - Webhook handler for sync_failed events with DB error storage and auto-recovery (completed 2026-02-17)
- [x] **Phase 18: Sync Error Display** - Error indicators and messages visible in the repository list (completed 2026-02-18)
- [ ] **Phase 19: Token Update Flow** - Bottom-sheet modal for error details and PAT token refresh

## Phase Details

### Phase 17: Sync Failure Backend
**Goal**: Backend correctly receives, stores, and recovers from Docora sync failures
**Depends on**: Nothing (extends existing webhook infrastructure)
**Requirements**: SYNC-01, SYNC-02, SYNC-03
**Success Criteria** (what must be TRUE):
  1. When Docora sends a `sync_failed` webhook, the backend validates HMAC and processes the event without error
  2. The repository record stores the failure details (error type, error message, circuit breaker status) and `sync_status` is set to `failed`
  3. When a successful `create`/`update` webhook arrives for a previously failed repository, `sync_status` resets to `synced` and error fields are cleared
**Plans:** 2/2 plans complete

Plans:
- [x] 17-01-PLAN.md — Sync failure webhook handler, DB migration, and auto-recovery logic
- [x] 17-02-PLAN.md — Gap closure: add auto-recovery to handleUpdate existing-card and image-file paths

### Phase 18: Sync Error Display
**Goal**: Users can see which repositories have sync problems directly in the repository list
**Depends on**: Phase 17
**Requirements**: ERRDSP-01, ERRDSP-02
**Success Criteria** (what must be TRUE):
  1. A repository with `sync_status = failed` shows a visible error indicator (icon/badge) in the repository list
  2. The error message from Docora is displayed to the user so they understand what went wrong
  3. Repositories with `sync_status = synced` show no error indicator (clean state)
**Plans**: 1 plan

Plans:
- [ ] 18-01-PLAN.md — Sync error indicators, messages, and status display in RepoListItem

### Phase 19: Token Update Flow
**Goal**: Users can fix auth-related sync failures by updating their PAT token from within the app
**Depends on**: Phase 17, Phase 18
**Requirements**: TOKEN-01, TOKEN-02, TOKUI-01, TOKUI-02, TOKUI-03
**Success Criteria** (what must be TRUE):
  1. User can tap a failed repository to open a bottom-sheet modal showing the error details
  2. For auth-related errors, the modal presents a text input for entering a new PAT token
  3. Submitting a new PAT calls the backend, which proxies the update to Docora API
  4. After successful token update, the repository error state clears immediately in the UI without requiring a manual refresh
**Plans**: 1 plan

Plans:
- [ ] 19-01-PLAN.md — Token update edge function action, @lumio/core export, bottom-sheet error modal, and ReposScreen integration

## Progress

**Execution Order:**
Phases execute in numeric order: 17 -> 18 -> 19

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
| 15. Study Stats | v1.4 | 2/2 | Complete | 2026-02-11 |
| 16. Study Screen Polish | v1.5 | 1/1 | Complete | 2026-02-12 |
| 17. Sync Failure Backend | v1.6 | Complete    | 2026-02-17 | 2026-02-17 |
| 18. Sync Error Display | 1/1 | Complete    | 2026-02-18 | - |
| 19. Token Update Flow | v1.6 | 0/1 | Not started | - |

---
*Roadmap created: 2026-01-29*
*v1.1 shipped: 2026-02-08*
*v1.2 shipped: 2026-02-09*
*v1.3 shipped: 2026-02-10*
*v1.4 shipped: 2026-02-11*
*v1.5 shipped: 2026-02-12*
*v1.6 roadmap created: 2026-02-17*
