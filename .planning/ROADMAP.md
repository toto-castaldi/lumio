# Roadmap: Lumio

## Milestones

- SHIPPED **v1.1 Lumio Native** -- Phases 1-5 (shipped 2026-02-08)
- SHIPPED **v1.2 Polish & UX** -- Phases 6-9 (shipped 2026-02-09)
- SHIPPED **v1.3 Bugfix & UX Polish** -- Phases 10-12 (shipped 2026-02-10)
- SHIPPED **v1.4 Card Browse & Stats** -- Phases 13-15 (shipped 2026-02-11)
- SHIPPED **v1.5 Study UX Fixes** -- Phase 16 (shipped 2026-02-12)
- SHIPPED **v1.6 Sync Error Handling** -- Phases 17-19 (shipped 2026-02-18)
- SHIPPED **v1.7 GSD Versioning** -- Phases 20-22 (shipped 2026-02-21)
- IN PROGRESS **v2.0 Spaced Repetition** -- Phases 23-26

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

<details>
<summary>v1.7 GSD Versioning (Phases 20-22) -- SHIPPED 2026-02-21</summary>

- [x] Phase 20: Cleanup Legacy Versioning (3 plans) -- completed 2026-02-21
- [x] Phase 21: GSD Version Pipeline (1 plan) -- completed 2026-02-21
- [x] Phase 22: Version Display & Docs (2 plans) -- completed 2026-02-21

Full details: `.planning/milestones/v1.7-ROADMAP.md`

</details>

---

### v2.0 Spaced Repetition (In Progress)

**Milestone Goal:** Transform study from random card selection to intelligent spaced repetition, so users study the right cards at the right time.

#### Phases

- [ ] **Phase 23: SRS Schema & Algorithm** - Database table, RLS, RPCs, and SM-2 pure function in @lumio/core
- [ ] **Phase 24: Study Session Integration** - Wire SRS into study hook: due-first card selection, per-answer schedule write-back
- [ ] **Phase 25: Dashboard & Study UI** - "Cards due today" counter on dashboard, Review/New badge during study
- [ ] **Phase 26: History Fix & Validation** - Fix study history card count display, end-to-end validation

## Phase Details

### Phase 23: SRS Schema & Algorithm
**Goal**: The database and algorithm foundation for spaced repetition exists and is validated in isolation
**Depends on**: Phase 22 (existing codebase)
**Requirements**: SRS-03, SRS-04, SRS-05, SRS-06
**Success Criteria** (what must be TRUE):
  1. A `card_review_schedule` table exists in Supabase with RLS, indexes, and a `card_updated_at_snapshot` column for stale-content detection
  2. `get_due_card_count` RPC returns the count of cards due today using `DATE` comparison (not `TIMESTAMPTZ`), returning 0 for users with no review history
  3. `get_study_cards_for_session` RPC returns priority-ordered cards (most overdue first via `ORDER BY next_review_at ASC`), using LEFT JOIN so new users with no review history receive cards
  4. Calling `sm2(quality, item)` in `@lumio/core/src/srs/sm2.ts` with quality=4 (correct) returns a longer interval; with quality=1 (wrong) returns interval=1 and a lower ease factor, never below 1.3; interval never exceeds 365
  5. `pnpm build:packages` passes with new types exported from `@lumio/shared` and new functions from `@lumio/core`
**Plans**: 2 plans
Plans:
- [ ] 23-01-PLAN.md — TDD SM-2 wrapper function + types + constants (SRS-03, SRS-05)
- [ ] 23-02-PLAN.md — Database migration + RPCs + client functions (SRS-04, SRS-06)

### Phase 24: Study Session Integration
**Goal**: Study sessions use SRS card ordering and write back per-card schedules after every answer
**Depends on**: Phase 23
**Requirements**: SRS-01, SRS-02
**Success Criteria** (what must be TRUE):
  1. Starting a study session returns overdue cards first (cards with `next_review_at <= today`), then new cards fill remaining slots — not random selection
  2. Answering a card correctly causes that card's next review to be scheduled further in the future; answering incorrectly resets it to 1 day
  3. A session with `cardsPerSession=10` and 15 overdue cards shows all 15 overdue cards (due cards bypass the cap), then fills with new cards only if slots remain
  4. The schedule update does not block navigation to the next card (fire-and-forget, same pattern as `saveStudySession`)
  5. Cards whose content has changed since last review (stale snapshot) are treated as new cards, not review cards
**Plans**: TBD

### Phase 25: Dashboard & Study UI
**Goal**: SRS data surfaces visibly in the app so users know what to study and what type each card is
**Depends on**: Phase 24
**Requirements**: DASH-01, DASH-02
**Success Criteria** (what must be TRUE):
  1. The Dashboard shows a "Cards due today" counter (using the `get_due_card_count` RPC) that updates when the user returns to the dashboard
  2. During a study session, each card displays a "Review" or "New" badge near the progress bar indicating whether it is a scheduled review or a first-time card
  3. The "Cards due today" counter shows 0 (not an error) for a user who has never studied
  4. The badge and counter use the existing i18n system and display correctly in both Italian and English
**Plans**: TBD

### Phase 26: History Fix & Validation
**Goal**: Study history shows accurate card counts, and all SRS correctness guarantees are verified end-to-end
**Depends on**: Phase 25
**Requirements**: HIST-01
**Success Criteria** (what must be TRUE):
  1. Each row in the study history screen shows the number of cards studied (e.g., "10 cards" / "10 carte") instead of "All repositories" / "Tutti i repository"
  2. A fresh user account (no review history) can start a study session and see cards without errors or empty sessions
  3. The "cards due today" counter does not flip at the wrong time when the device is in a non-UTC timezone (tested at 11pm, midnight, and 1am local time)
  4. After 20 consecutive wrong answers on the same card, its ease factor remains at 1.3 (floor enforced) and its interval stays at 1 day
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-22. Previous milestones | v1.1 - v1.7 | 54/54 | Complete | 2026-02-21 |
| 23. SRS Schema & Algorithm | v2.0 | 0/2 | Planned | - |
| 24. Study Session Integration | v2.0 | 0/TBD | Not started | - |
| 25. Dashboard & Study UI | v2.0 | 0/TBD | Not started | - |
| 26. History Fix & Validation | v2.0 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-29*
*v1.7 shipped: 2026-02-21*
*v2.0 roadmap added: 2026-02-25*
