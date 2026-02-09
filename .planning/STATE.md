# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** Phase 8 - Configurable Study Sessions (v1.2)

## Current Position

Phase: 8 of 9 (Configurable Study Sessions)
Plan: 1 of 2 in current phase
Status: Plan 08-01 complete, 08-02 remaining
Last activity: 2026-02-09 -- Completed 08-01 (study settings persistence & UI)

Progress: [##########################....] 26/? plans (v1.1 complete, v1.2 phase 6-8 in progress)

## Performance Metrics

**Velocity:**
- Total plans completed: 26 (20 v1.1 + 6 v1.2)
- Average duration: ~5.3 hours (estimated from 11-day milestone)
- Total execution time: ~106 hours (v1.1)

**By Phase (v1.1):**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Foundation | 3 | Complete |
| 2. Auth & Navigation | 4 | Complete |
| 3. Core Screens | 5 | Complete |
| 4. Study & Cards | 4 | Complete |
| 5. Distribution & Cleanup | 4 | Complete |

**By Phase (v1.2):**

| Phase | Plans | Status |
|-------|-------|--------|
| 6. Bugfix & Version | 2/2 | Complete |
| 7. Branding | 2/2 | Complete |
| 8. Configurable Study Sessions | 1/2 | In Progress |

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table.

Recent decisions affecting current work:
- 08-01: Mirror ThemeContext pattern exactly for StudySettings (lib + context + hook re-export)
- 08-01: String(value) for AsyncStorage serialization with explicit parse on load
- 07-01: Square viewBox (-10 -10 420 420) for SVG-to-PNG to ensure square output at all sizes
- 07-01: Signature line omitted from all PNG variants (invisible at small sizes)
- 07-02: Inline SVG for landing logo (1.3KB, avoids extra HTTP request)
- 07-02: viewBox cropped to 0 0 400 300 (removes empty space below graphic)
- 07-02: Signature line omitted from inline SVG (invisible at 36px)
- v1.2: PNG for logo (no react-native-svg, avoids native rebuild + SDK 54 press regressions)
- v1.2: i18n-js over react-i18next (Expo recommended, 15kb vs 45kb, sufficient for 2 locales)
- v1.2: Preset radio buttons for cards-per-session (not slider, avoids decision paralysis)
- 06-01: workspace:* for @lumio/shared, expo install for SDK 54 SVG compat
- 06-01: Version display shows "v1.1.4" only (no app name prefix)
- 06-02: LaTeX preprocessor wraps $...$ in backticks (marked only calls codespan for backtick-delimited content)
- 06-02: Bottom-sheet fixed height (not maxHeight) for FlatList scroll compatibility
- 06-02: Server-only modules shimmed via Metro resolveRequest to empty module
- 06-02: trim-newlines forced to v5 for ESM named exports in react-native-code-highlighter

### Pending Todos

None.

### Blockers/Concerns

- ~~WebView height fix may need ResizeObserver fallback for older Android WebView (pre-2020)~~ -- resolved: card preview no longer uses WebView for markdown
- i18n retrofit touches 16 files / 82+ strings -- systematic extraction needed to avoid partial translation

## Session Continuity

Last session: 2026-02-09
Stopped at: Completed 08-01-PLAN.md (study settings persistence & UI)
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-02-09 (08-01 completed, phase 8 in progress)*
