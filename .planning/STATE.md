---
gsd_state_version: 1.0
milestone: v3.1
milestone_name: Deck Discovery
status: executing
stopped_at: Phase 44 context gathered
last_updated: "2026-03-15T18:28:26.873Z"
last_activity: 2026-03-13 — Plan 43-02 executed (DeckMetadataForm component with i18n, integrated into DeckDetailPanel)
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI -- il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** Phase 43 — Deck Builder Metadata

## Current Position

Phase: 43 of 44 (Deck Builder Metadata)
Plan: 2 of 2
Status: Executing (Phase 43, Plan 02 complete)
Last activity: 2026-03-13 — Plan 43-02 executed (DeckMetadataForm component with i18n, integrated into DeckDetailPanel)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 80 (70 across v1.1-v2.3 + 10 in v3.0)
- Total milestones shipped: 12 (v1.1 through v3.0)
- Timeline: 44 days (2026-01-29 to 2026-03-13)

## Accumulated Context

### Decisions

All decisions logged in PROJECT.md Key Decisions table (77 entries).

Recent decisions affecting current work:
- Research recommends `subfolder_path` column on `user_repositories` over separate subscription table
- Research recommends `'simple'` tsvector config everywhere (avoids stemming for multilingual deck names)
- Card count computed at query time via correlated subquery, not stored in deck_index
- Standardize on `display_name` field (not `name`) to distinguish from filesystem directory name
- Created `deck_index_search_vector()` IMMUTABLE wrapper function for generated tsvector column (to_tsvector and array_to_string are STABLE, not IMMUTABLE)
- Used `is_platform BOOLEAN` column to identify platform repos (explicit over implicit NULL pattern)
- Used COALESCE-based unique index for subfolder_path NULL handling in user_repositories
- [Phase 41]: Created deck_index_search_vector() IMMUTABLE wrapper for generated tsvector column (to_tsvector and array_to_string are STABLE)
- [Phase 41]: Used websearch_to_tsquery (not plainto_tsquery) for Google-style search syntax in search_decks RPC
- [Phase 41]: Subfolder filter added transparently to study RPC JOINs -- no signature changes, backward compatible with NULL subfolder_path
- [Phase 42]: Server-enforced author from public.users.display_name with email prefix fallback, client value always ignored
- [Phase 42]: Lightweight YAML serialization via string concatenation (no external yaml library needed for fixed structure)
- [Phase 42]: Reused parseFrontmatter() via parseYaml() wrapper for pure YAML parsing -- no new YAML library needed
- [Phase 42]: Both handleCreate and handleUpdate use UPSERT for idempotent out-of-order webhook delivery
- [Phase 43]: get_yaml bypasses validateUserPath (.md-only restriction) using deck_name-based path construction
- [Phase 43]: getDeckYaml maps data-level "File not found" error to null return, rethrows all other errors
- [Phase 43]: Form starts collapsed by default, dirty tracking via JSON.stringify comparison against loadedRef snapshot
- [Phase 43]: Race condition guard via cancelled flag in useEffect for rapid deck switching

### Pending Todos

None.

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Fix version consistency: sync root package.json, add APK upload to CI, show build ref v1.7+42.abc1234 in apps | 2026-02-23 | 8e265b7 | [1-fix-version-consistency-sync-root-packag](./quick/1-fix-version-consistency-sync-root-packag/) |
| 2 | Fix APK download: add create-release CI job with softprops/action-gh-release, create v1.7 release with lumio.apk | 2026-02-23 | d4036ea | [2-fix-apk-download-github-release-apk-is-o](./quick/2-fix-apk-download-github-release-apk-is-o/) |
| 3 | Fix APK version display: pass BUILD_NUMBER and GIT_SHA env vars to build-apk CI job | 2026-02-23 | 54b502f | [3-fix-apk-version-display-pass-build-numbe](./quick/3-fix-apk-version-display-pass-build-numbe/) |
| 4 | Fix version.ts: hardcode build metadata as string literals (not process.env) | 2026-02-23 | 353f6fa | [4-fix-version-ts-hardcode-build-number-and](./quick/4-fix-version-ts-hardcode-build-number-and/) |
| 5 | ho provato la registrazione utente con mail. come da screenshot che trovi nella cartella /home/toto/tmp/screenshot (ultimo file) la UI si comporta bene. Il problema è che NON ho ricevuto email | 2026-03-03 | a1bd90a | [5-ho-provato-la-registrazione-utente-con-m](./quick/5-ho-provato-la-registrazione-utente-con-m/) |
| 6 | Fix i18n countdown interpolation bug on OTP verification screens | 2026-03-03 | d771d4b | [6-fix-i18n-countdown-bug-on-email-verifica](./quick/6-fix-i18n-countdown-bug-on-email-verifica/) |
| 8 | Navigate to Login after successful password update | 2026-03-04 | 6870913 | [8-navigate-to-home-after-successful-passwo](./quick/8-navigate-to-home-after-successful-passwo/) |
| 9 | Use git tag version when higher than STATE.md | 2026-03-04 | 262e189 | [9-use-git-tag-version-when-higher-than-sta](./quick/9-use-git-tag-version-when-higher-than-sta/) |
| Phase 41 P01 | 5min | 2 tasks | 3 files |
| Phase 41 P02 | 3min | 2 tasks | 2 files |
| Phase 42 P02 | 1min | 1 tasks | 1 files |
| Phase 42 P01 | 2min | 2 tasks | 1 files |
| Phase 43 P01 | 2min | 1 tasks | 3 files |
| Phase 43 P02 | 5min | 3 tasks | 4 files |

## Session Continuity

Last session: 2026-03-15T18:28:26.871Z
Stopped at: Phase 44 context gathered
Resume file: .planning/phases/44-mobile-discovery/44-CONTEXT.md

---
*State initialized: 2026-01-29*
*Last updated: 2026-03-13 (Plan 41-01 complete)*
