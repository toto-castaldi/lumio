# Phase 20: Cleanup Legacy Versioning - Context

**Gathered:** 2026-02-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove all legacy versioning infrastructure from the project: husky, commitlint, commitizen, release-please, auto-release CI, CHANGELOG, and git tags. After this phase, no automated versioning tooling remains. The new version source (STATE.md) is wired up in Phase 21.

</domain>

<decisions>
## Implementation Decisions

### Git tags
- Delete ALL existing version tags from both local and remote (GitHub)
- Keep GitHub Releases if any exist (only delete the git tags themselves)
- Remove any CI workflows or steps triggered by tag push events

### Commit convention
- Abandon conventional commit format entirely (no more feat:, fix:, docs: prefixes)
- Remove ALL commitizen config (czConfig, .czrc, custom scopes/types)
- Remove ALL commit/release npm scripts from package.json
- Remove any commit convention documentation or guidance from the project

### CHANGELOG and release-please artifacts
- Delete CHANGELOG.md outright (git history preserves the content)
- Remove all release-please files (release-please-config.json, .release-please-manifest.json, etc.)
- Decouple Android build versionName from package.json version in this phase, so Phase 21 can wire up STATE.md cleanly

### Husky removal
- Remove husky entirely: delete .husky/ directory, uninstall the package, remove prepare/postinstall scripts
- Remove lint-staged and any other tools that only ran via husky hooks
- Clean .git/hooks directory to remove any stale installed hooks
- Remove the prepare/postinstall script from package.json that runs husky install

### Claude's Discretion
- What to set package.json version fields to (or whether to leave them as-is)
- How to decouple Android versionName from package.json
- Order of removal operations for cleanest result

</decisions>

<specifics>
## Specific Ideas

- Full scorched-earth cleanup: user wants zero trace of old versioning tooling
- Git history is sufficient archive for CHANGELOG content
- GitHub Releases can stay (they're useful reference even without tags)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-cleanup-legacy-versioning*
*Context gathered: 2026-02-21*
