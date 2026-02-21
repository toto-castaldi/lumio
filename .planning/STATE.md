# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** v1.7 GSD Versioning -- Phase 22 Version Display & Docs

## Current Position

Milestone: v1.7
Phase: 22 of 22 (Version Display & Docs)
Plan: 2 of 2 (completed)
Status: Phase 22 complete
Last activity: 2026-02-21 — Plan 22-02 completed (VERSIONING.md Documentation)

Progress (v1.7): [██████████] 100% (2/2 plans in phase 22)
Progress (overall): 48/48 plans across 6 milestones + v1.7 in progress

## Performance Metrics

**Velocity:**
- Total plans completed: 48 (20 v1.1 + 9 v1.2 + 4 v1.3 + 4 v1.4 + 1 v1.5 + 4 v1.6 + 6 v1.7)
- Total milestones shipped: 6
- Timeline: 24 days (2026-01-29 to 2026-02-21)

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (35 entries).

- [20-01] Left version 1.6.1 in package.json as-is -- Phase 21 will wire to STATE.md
- [20-01] Removed .husky/_/ untracked directory from disk (was gitignored, not tracked by git)
- [20-02] Kept contents: write CI permission (may be needed by future actions)
- [20-02] Hardcoded 0.0.0 as APK versionName placeholder (Phase 21 wires STATE.md)
- [20-02] Removed GitHub Release upload step (no tags = no releases to upload to)
- [20-03] Kept historical mention of auto-release in section 6.3 as 'removed' context (plan-specified text)
- [21-01] Used CommonJS (.cjs) for extraction script -- no build step, maximum compatibility
- [21-01] Script generates entire version.ts rather than patching -- ensures consistent output
- [21-01] deploy-functions uses default ubuntu-latest node (no setup-node) since script has zero npm deps
- [22-01] Version injected at deploy time by CI sed replacement, not fetched at runtime -- zero JS overhead
- [22-01] deploy-landing uses default ubuntu-latest node (no setup-node) since extract-version.cjs has zero npm deps
- [22-02] Documented deploy-landing version injection (from plan 22-01) as part of the complete pipeline reference

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-21
Stopped at: Completed 22-02-PLAN.md (VERSIONING.md Documentation) -- Phase 22 complete
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-02-21 (22-02 completed, Phase 22 complete)*
