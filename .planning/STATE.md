# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-11)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** Phase 15 - Study Stats (v1.4)

## Current Position

Phase: 15 of 15 (Study Stats) -- COMPLETE
Plan: 2 of 2 in current phase (COMPLETE)
Status: Phase 15 complete -- all plans shipped (v1.4 Study Stats milestone complete)
Last activity: 2026-02-11 -- Phase 15 Plan 02 completed (study history screen, dashboard navigation, i18n)

Progress: [==============================] 100% (15/15 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 37 (20 v1.1 + 9 v1.2 + 4 v1.3 + 4 v1.4)
- Total milestones shipped: 4
- Timeline: 14 days (2026-01-29 to 2026-02-11)

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (18 entries).

- [13-01] Used contentPaddingBottom prop on CardContentView rather than SafeAreaView wrapper for reusability
- [13-01] Used universal "Account" term for both EN and IT translations
- [14-01] Reused CardContentView and CardView from study module for card detail rendering
- [14-01] Applied .lumioignore filtering via Deck class to card list for consistency with study sessions
- [14-01] Sorted cards alphabetically by title for predictable browsing order
- [15-01] repository_name is nullable TEXT (not FK) -- NULL means all repos since current study is cross-repo
- [15-01] study_sessions are immutable -- no UPDATE/DELETE RLS policies
- [15-01] saveStudySession is fire-and-forget -- does not block navigation to StudySummary
- [15-02] Score color coding: green >= 70%, yellow >= 40%, red otherwise
- [15-02] Dashboard Last Studied card wrapped in TouchableOpacity for navigation (not modifying shared StatCard)
- [15-02] Session date formatted with toLocaleDateString for locale-aware display

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 15-02-PLAN.md (Phase 15 complete -- all v1.4 plans shipped)
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-02-11 (Phase 15 complete -- v1.4 Study Stats milestone shipped)*
