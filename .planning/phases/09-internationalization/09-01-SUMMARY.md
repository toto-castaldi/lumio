---
phase: 09-internationalization
plan: 01
subsystem: ui
tags: [i18n, i18n-js, react-context, asyncstorage, translations, locale]

# Dependency graph
requires:
  - phase: 08-configurable-study-sessions
    provides: "ThemeContext/StudySettingsContext pattern (lib + context + hook re-export)"
provides:
  - "i18n-js v4 translation runtime with EN/IT locales"
  - "I18nContext with reactive t() function for all components"
  - "useI18n hook for consuming translations"
  - "Complete EN/IT translation files with ~85 UI strings each"
  - "AsyncStorage locale persistence under @lumio/locale"
  - "Language selector in SettingsScreen with autonym labels"
affects: [09-02, 09-03, all-screens, all-components]

# Tech tracking
tech-stack:
  added: [i18n-js@4.5.2]
  patterns: [I18nContext provider, useI18n hook, DeepStringify type utility, autonym language labels]

key-files:
  created:
    - apps/android/i18n/en.ts
    - apps/android/i18n/it.ts
    - apps/android/i18n/index.ts
    - apps/android/lib/i18n.ts
    - apps/android/contexts/I18nContext.tsx
    - apps/android/hooks/useI18n.ts
  modified:
    - apps/android/package.json
    - apps/android/App.tsx
    - apps/android/screens/SettingsScreen.tsx

key-decisions:
  - "DeepStringify<T> type utility to widen as-const literal types to string while preserving key structure"
  - "I18nProvider placed inside ThemeProvider but outside StudySettingsProvider in provider tree"
  - "Language option labels use autonyms (English/Italiano) not translated names"
  - "Option arrays moved inside component body for reactive t() calls"

patterns-established:
  - "I18nContext: lib/i18n.ts singleton + contexts/I18nContext.tsx provider + hooks/useI18n.ts re-export"
  - "DeepStringify<T> type for translation file type safety without literal string constraints"
  - "Module-level option arrays with translated labels must be inside component body"

# Metrics
duration: 4min
completed: 2026-02-09
---

# Phase 9 Plan 1: i18n Infrastructure Summary

**i18n-js v4 with EN/IT translations, I18nContext reactive provider, and SettingsScreen language selector with AsyncStorage persistence**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-09T17:46:36Z
- **Completed:** 2026-02-09T17:50:45Z
- **Tasks:** 2
- **Files modified:** 10 (8 created, 2 modified)

## Accomplishments
- Installed i18n-js v4.5.2 and created complete EN/IT translation files with ~85 UI strings organized by screen/feature
- Created I18nContext with reactive t() function following established ThemeContext pattern (lib + context + hook)
- Wired I18nProvider into App.tsx provider tree and added Language selector to SettingsScreen
- All SettingsScreen strings now translate reactively on locale switch, with preference persisted in AsyncStorage

## Task Commits

Each task was committed atomically:

1. **Task 1: Install i18n-js and create translation infrastructure** - `b539b2d` (feat)
2. **Task 2: Wire I18nProvider into App.tsx and add language selector to SettingsScreen** - `c984bb2` (feat)

## Files Created/Modified
- `apps/android/i18n/en.ts` - Complete English translation file with ~85 strings organized by screen/feature namespace
- `apps/android/i18n/it.ts` - Complete Italian translation file satisfying DeepStringify<Translations> type
- `apps/android/i18n/index.ts` - Barrel re-export for both translation files and Translations type
- `apps/android/lib/i18n.ts` - i18n-js singleton with AsyncStorage load/save persistence
- `apps/android/contexts/I18nContext.tsx` - I18nProvider and useI18n hook with reactive t() function
- `apps/android/hooks/useI18n.ts` - Convenience re-export of useI18n from context
- `apps/android/package.json` - Added i18n-js v4.5.2 dependency
- `apps/android/App.tsx` - Added I18nProvider to provider tree
- `apps/android/screens/SettingsScreen.tsx` - Language selector, all strings translated, option arrays moved inside component

## Decisions Made
- **DeepStringify type utility:** The plan specified `as const` for the English file and `Translations = typeof en` for the type. However, `as const` creates literal string types (e.g., `"Cancel"` not `string`), making Italian translations impossible to satisfy the type. Created `DeepStringify<T>` utility type that preserves nested key structure but widens values to `string`. This ensures key parity between locales without constraining values.
- **Provider placement:** I18nProvider inside ThemeProvider (translations don't depend on theme) but outside StudySettingsProvider (study settings labels may need translations in future).
- **Autonym labels:** Language options display as "English" and "Italiano" (the language's own name for itself), not translated -- standard i18n UX practice.
- **Generic OptionItem type:** Consolidated ThemeOption, StudyOption, and new LanguageOption types into a single generic `OptionItem<T>` to reduce type duplication.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Translations type to use DeepStringify instead of literal types**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** `as const` on English translation object created literal string types. Italian file with different string values could not satisfy `typeof en` since `"Annulla"` is not assignable to `"Cancel"`.
- **Fix:** Created `DeepStringify<T>` utility type that recursively maps nested object types to `string` values while preserving the key structure. Changed `Translations` export to `DeepStringify<typeof en>`.
- **Files modified:** `apps/android/i18n/en.ts`
- **Verification:** `pnpm --filter @lumio/android exec -- npx tsc --noEmit` passes with both EN and IT files
- **Committed in:** b539b2d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for TypeScript type safety. The plan's specified approach was not viable with `as const`. No scope creep.

## Issues Encountered
None beyond the type system issue documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Translation infrastructure is complete and ready for consumption by all screens/components
- Plans 09-02 and 09-03 can import `useI18n` and call `t()` to translate remaining screens
- SettingsScreen serves as the proof-of-concept for the translation pattern
- All ~85 strings are defined in both EN and IT, ready for use

## Self-Check: PASSED

- All 9 key files verified on disk
- Commit b539b2d (Task 1) verified in git log
- Commit c984bb2 (Task 2) verified in git log
- TypeScript compilation passes cleanly

---
*Phase: 09-internationalization*
*Completed: 2026-02-09*
