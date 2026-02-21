# Roadmap: Lumio

## Milestones

- SHIPPED **v1.1 Lumio Native** -- Phases 1-5 (shipped 2026-02-08)
- SHIPPED **v1.2 Polish & UX** -- Phases 6-9 (shipped 2026-02-09)
- SHIPPED **v1.3 Bugfix & UX Polish** -- Phases 10-12 (shipped 2026-02-10)
- SHIPPED **v1.4 Card Browse & Stats** -- Phases 13-15 (shipped 2026-02-11)
- SHIPPED **v1.5 Study UX Fixes** -- Phase 16 (shipped 2026-02-12)
- SHIPPED **v1.6 Sync Error Handling** -- Phases 17-19 (shipped 2026-02-18)
- IN PROGRESS **v1.7 GSD Versioning** -- Phases 20-22

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

<details>
<summary>v1.6 Sync Error Handling (Phases 17-19) -- SHIPPED 2026-02-21</summary>

- [x] Phase 17: Sync Failure Backend (2 plans) -- completed 2026-02-17
- [x] Phase 18: Sync Error Display (1 plan) -- completed 2026-02-18
- [x] Phase 19: Token Update Flow (1 plan) -- completed 2026-02-18

Full details: `.planning/milestones/v1.6-ROADMAP.md`

</details>

### v1.7 GSD Versioning (In Progress)

**Milestone Goal:** App and landing page version derived from .planning/STATE.md, replacing all legacy versioning infrastructure (husky, commitlint, commitizen, release-please, auto-release CI, git tags).

- [x] **Phase 20: Cleanup Legacy Versioning** - Remove all automated versioning tooling (gap closure in progress) (completed 2026-02-21)
- [x] **Phase 21: GSD Version Pipeline** - STATE.md milestone field parsed by CI into version.ts (completed 2026-02-21)
- [ ] **Phase 22: Version Display & Docs** - Landing page and edge function show GSD version; docs updated

## Phase Details

### Phase 20: Cleanup Legacy Versioning
**Goal**: All legacy versioning infrastructure is gone -- no husky, commitlint, commitizen, release-please, auto-release CI, CHANGELOG, or git tags in the project
**Depends on**: Nothing (first phase of v1.7)
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-05, CLEAN-06
**Success Criteria** (what must be TRUE):
  1. Running `git commit` does not trigger any husky pre-commit or commit-msg hooks
  2. No commitlint, commitizen, or release-please configuration files exist in the repository
  3. CI workflow runs without any auto-release job or git tag creation step
  4. CHANGELOG.md no longer exists in the repository root
**Plans**: 3 plans

Plans:
- [x] 20-01-PLAN.md — Remove local tooling (husky, commitlint, commitizen, release-please configs, CHANGELOG)
- [x] 20-02-PLAN.md — Remove CI auto-release job, delete git tags, update docs
- [ ] 20-03-PLAN.md — Update TECHNICAL-ARCHITECTURE.md to remove stale legacy versioning references (gap closure)

### Phase 21: GSD Version Pipeline
**Goal**: The app version is derived from STATE.md at build time -- a single source of truth replaces the old multi-tool chain
**Depends on**: Phase 20
**Requirements**: VER-01, VER-02
**Success Criteria** (what must be TRUE):
  1. STATE.md contains a `Milestone: v1.7` field that CI can parse to extract the version string
  2. CI build step reads STATE.md, extracts the milestone version, and writes it to `version.ts`
  3. The Android app displays the version derived from STATE.md (visible in Settings screen)
**Plans**: 1 plan

Plans:
- [ ] 21-01-PLAN.md — Create version extraction script and wire CI to derive version from STATE.md

### Phase 22: Version Display & Docs
**Goal**: The GSD-derived version is visible on all public surfaces and the new versioning flow is documented
**Depends on**: Phase 21
**Requirements**: VER-03, VER-04, VER-05
**Success Criteria** (what must be TRUE):
  1. The landing page at lumio.toto-castaldi.com displays the current version matching STATE.md milestone
  2. The `/version` edge function returns the version string derived from STATE.md
  3. `docs/VERSIONING.md` documents the new GSD-based versioning flow (STATE.md as source, CI extraction, consumers)
**Plans**: TBD

Plans:
- [ ] 22-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 20 -> 21 -> 22

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 20. Cleanup Legacy Versioning | 3/3 | Complete    | 2026-02-21 | - |
| 21. GSD Version Pipeline | 1/1 | Complete   | 2026-02-21 | - |
| 22. Version Display & Docs | v1.7 | 0/? | Not started | - |

---
*Roadmap created: 2026-01-29*
*v1.6 shipped: 2026-02-21*
*v1.7 roadmap added: 2026-02-21*
