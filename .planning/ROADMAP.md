# Roadmap: Lumio

## Milestones

- ✅ **v1.1 Lumio Native** — Phases 1-5 (shipped 2026-02-08)
- ✅ **v1.2 Polish & UX** — Phases 6-9 (shipped 2026-02-09)
- ✅ **v1.3 Bugfix & UX Polish** — Phases 10-12 (shipped 2026-02-10)
- ✅ **v1.4 Card Browse & Stats** — Phases 13-15 (shipped 2026-02-11)
- ✅ **v1.5 Study UX Fixes** — Phase 16 (shipped 2026-02-12)
- ✅ **v1.6 Sync Error Handling** — Phases 17-19 (shipped 2026-02-18)
- ✅ **v1.7 GSD Versioning** — Phases 20-22 (shipped 2026-02-21)
- ✅ **v2.0 Spaced Repetition** — Phases 23-26 (shipped 2026-02-26)
- ✅ **v2.1 Email Auth** — Phases 27-31 (shipped 2026-03-02)
- 🚧 **v2.2 Session Limits** — Phases 32-33 (in progress)

## Phases

<details>
<summary>✅ v1.1 Lumio Native (Phases 1-5) — SHIPPED 2026-02-08</summary>

- [x] Phase 1: Foundation (3 plans) — completed 2026-02-04
- [x] Phase 2: Auth & Navigation (4 plans) — completed 2026-02-04
- [x] Phase 3: Core Screens (5 plans) — completed 2026-02-07
- [x] Phase 4: Study & Cards (4 plans) — completed 2026-02-08
- [x] Phase 5: Distribution & Cleanup (4 plans) — completed 2026-02-08

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Polish & UX (Phases 6-9) — SHIPPED 2026-02-09</summary>

- [x] Phase 6: Bugfix & Version (2 plans) — completed 2026-02-09
- [x] Phase 7: Branding (2 plans) — completed 2026-02-09
- [x] Phase 8: Configurable Study Sessions (2 plans) — completed 2026-02-09
- [x] Phase 9: Internationalization (3 plans) — completed 2026-02-09

Full details: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v1.3 Bugfix & UX Polish (Phases 10-12) — SHIPPED 2026-02-10</summary>

- [x] Phase 10: Branding Consistency (2 plans) — completed 2026-02-10
- [x] Phase 11: Study Flow Simplification (1 plan) — completed 2026-02-10
- [x] Phase 12: Dashboard & Repo Bugfixes (1 plan) — completed 2026-02-10

Full details: `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>✅ v1.4 Card Browse & Stats (Phases 13-15) — SHIPPED 2026-02-11</summary>

- [x] Phase 13: UX Fixes (1 plan) — completed 2026-02-11
- [x] Phase 14: Card Browse (1 plan) — completed 2026-02-11
- [x] Phase 15: Study Stats (2 plans) — completed 2026-02-11

Full details: `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>✅ v1.5 Study UX Fixes (Phase 16) — SHIPPED 2026-02-12</summary>

- [x] Phase 16: Study Screen Polish (1 plan) — completed 2026-02-12

Full details: `.planning/milestones/v1.5-ROADMAP.md`

</details>

<details>
<summary>✅ v1.6 Sync Error Handling (Phases 17-19) — SHIPPED 2026-02-18</summary>

- [x] Phase 17: Sync Failure Backend (2 plans) — completed 2026-02-17
- [x] Phase 18: Sync Error Display (1 plan) — completed 2026-02-18
- [x] Phase 19: Token Update Flow (1 plan) — completed 2026-02-18

Full details: `.planning/milestones/v1.6-ROADMAP.md`

</details>

<details>
<summary>✅ v1.7 GSD Versioning (Phases 20-22) — SHIPPED 2026-02-21</summary>

- [x] Phase 20: Cleanup Legacy Versioning (3 plans) — completed 2026-02-21
- [x] Phase 21: GSD Version Pipeline (1 plan) — completed 2026-02-21
- [x] Phase 22: Version Display & Docs (2 plans) — completed 2026-02-21

Full details: `.planning/milestones/v1.7-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Spaced Repetition (Phases 23-26) — SHIPPED 2026-02-26</summary>

- [x] Phase 23: SRS Schema & Algorithm (2 plans) — completed 2026-02-26
- [x] Phase 24: Study Session Integration (3 plans) — completed 2026-02-26
- [x] Phase 25: Dashboard & Study UI (1 plan) — completed 2026-02-26
- [x] Phase 26: History Fix & Validation (2 plans) — completed 2026-02-26

Full details: `.planning/milestones/v2.0-ROADMAP.md`

</details>

<details>
<summary>✅ v2.1 Email Auth (Phases 27-31) — SHIPPED 2026-03-02</summary>

- [x] Phase 27: Foundation & Database (2 plans) — completed 2026-02-27
- [x] Phase 28: Auth Context & Infrastructure (2 plans) — completed 2026-02-27
- [x] Phase 29: Email Signup & Verification (2 plans) — completed 2026-02-27
- [x] Phase 30: Email Login & Password Reset (2 plans) — completed 2026-03-02
- [x] Phase 31: Account Linking (2 plans) — completed 2026-03-02

Full details: `.planning/milestones/v2.1-ROADMAP.md`

</details>

### v2.2 Session Limits (In Progress)

**Milestone Goal:** Rispettare il limite carte-per-sessione scelto dall'utente, con dashboard coerente e label "Auto" per il selettore.

- [x] **Phase 32: RPC Session Limit Enforcement** - Backend RPC caps cards to chosen limit with overdue-first priority (completed 2026-03-04)
- [x] **Phase 33: Dashboard Counter & Auto Label** - Dashboard reflects session-limited count and selector shows "Auto" (completed 2026-03-05)

## Phase Details

### Phase 32: RPC Session Limit Enforcement
**Goal**: Study sessions deliver exactly the number of cards the user chose, prioritizing overdue cards
**Depends on**: Nothing (first phase of v2.2)
**Requirements**: SESS-01, SESS-02
**Success Criteria** (what must be TRUE):
  1. User who selects "20 cards" receives at most 20 cards in a study session, even if 50 are available
  2. Overdue cards always appear before new cards within the capped session (oldest overdue first)
  3. User with "Auto" selected receives all available cards (overdue + new) with no cap applied
  4. When fewer cards exist than the chosen limit, all available cards are returned without error
**Plans**: 1 plan

Plans:
- [ ] 32-01-PLAN.md — Enforce session limit in RPC, rename CardsPerSession type, update hook

### Phase 33: Dashboard Counter & Auto Label
**Goal**: Dashboard and session selector accurately reflect the session-limited experience
**Depends on**: Phase 32
**Requirements**: DASH-01, DASH-02, UI-01
**Success Criteria** (what must be TRUE):
  1. Dashboard counter shows the number of cards the user will actually study in their next session (respecting chosen limit), not the total backlog
  2. User with "Auto" selected sees the full count of all available cards on the dashboard
  3. Session size selector displays "Auto" instead of "Tutte" or the infinity symbol for the unlimited option
**Plans**: 1 plan

Plans:
- [ ] 33-01-PLAN.md — Session-aware dashboard counter, Auto label with sparkles icon

## Progress

**Execution Order:**
Phases execute in numeric order: 32 -> 33

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-5. Foundation to Cleanup | v1.1 | 20/20 | Complete | 2026-02-08 |
| 6-9. Polish to i18n | v1.2 | 9/9 | Complete | 2026-02-09 |
| 10-12. Branding to Bugfixes | v1.3 | 4/4 | Complete | 2026-02-10 |
| 13-15. UX to Stats | v1.4 | 4/4 | Complete | 2026-02-11 |
| 16. Study Screen Polish | v1.5 | 1/1 | Complete | 2026-02-12 |
| 17-19. Sync Error Handling | v1.6 | 4/4 | Complete | 2026-02-18 |
| 20-22. GSD Versioning | v1.7 | 6/6 | Complete | 2026-02-21 |
| 23-26. Spaced Repetition | v2.0 | 8/8 | Complete | 2026-02-26 |
| 27-31. Email Auth | v2.1 | 10/10 | Complete | 2026-03-02 |
| 32. RPC Session Limit Enforcement | 1/1 | Complete    | 2026-03-04 | - |
| 33. Dashboard Counter & Auto Label | 1/1 | Complete    | 2026-03-05 | - |

---
*Roadmap created: 2026-01-29*
*v2.2 roadmap added: 2026-03-04*
