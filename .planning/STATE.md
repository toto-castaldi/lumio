# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** Phase 9 - Internationalization (v1.2)

## Current Position

Phase: 9 of 9 (Internationalization)
Plan: 3 of 3 in current phase
Status: Phase 09 COMPLETE (all 3 plans done)
Last activity: 2026-02-09 -- Completed 09-03 (component & navigation i18n)

Progress: [##############################] 30/30 plans (v1.1 complete, v1.2 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 30 (20 v1.1 + 10 v1.2)
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
| 8. Configurable Study Sessions | 2/2 | Complete |
| 9. Internationalization | 3/3 | Complete |

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table.

Recent decisions affecting current work:
- 09-03: ConnectionTest.tsx excluded from translation (developer-only component per 09-RESEARCH)
- 09-03: Props-only components (EmptyState, StatCard, ProgressBar, StudyFAB) confirmed no-translate
- 09-02: formatLastStudied accepts t as parameter (module-level function outside component cannot use hooks)
- 09-02: t added to useCallback/useEffect dependency arrays to ensure locale changes propagate to callbacks
- 09-02: Card content and AI-generated quiz questions intentionally left untranslated (I18N-04)
- 09-01: DeepStringify<T> type utility to widen as-const literal types for translation file type safety
- 09-01: I18nProvider inside ThemeProvider but outside StudySettingsProvider in provider tree
- 09-01: Language option labels use autonyms (English/Italiano) not translated names
- 09-01: Generic OptionItem<T> type consolidates ThemeOption/StudyOption/LanguageOption
- 08-02: effectiveLimit = min(cardsPerSession, totalCards) for graceful handling when limit > available
- 08-02: seenCardIds.size as limit counter (includes skipped + question-less cards, not just answered)
- 08-02: Conditional ready text only when limit < total (backward compatible default)
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
- ~~i18n retrofit touches 16 files / 82+ strings~~ -- COMPLETE: infrastructure (09-01), screens (09-02), components & navigation (09-03)

## Session Continuity

Last session: 2026-02-09
Stopped at: Completed 09-03-PLAN.md (component & navigation i18n -- Phase 9 complete)
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-02-09 (09-03 completed, Phase 9 Internationalization complete, v1.2 milestone complete)*
