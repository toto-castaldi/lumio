---
phase: 20-cleanup-legacy-versioning
verified: 2026-02-21T21:15:14Z
status: gaps_found
score: 7/8 must-haves verified
gaps:
  - truth: "No repository files contain legacy versioning tool references (outside historical notes)"
    status: partial
    reason: "docs/TECHNICAL-ARCHITECTURE.md still contains an extensive section (lines 843-893) describing the old auto-release system, including references to release-please-manifest.json, conventional commits, and the old CI job flow diagram. This file was not included in Plan 02's files_modified scope."
    artifacts:
      - path: "docs/TECHNICAL-ARCHITECTURE.md"
        issue: "Lines 148, 150, 845-893 describe auto-release job, .release-please-manifest.json, and conventional commits as if they still exist"
    missing:
      - "Update docs/TECHNICAL-ARCHITECTURE.md section 6.3 to remove the auto-release versioning description"
      - "Remove .release-please-manifest.json from the project structure diagram at line 150"
      - "Remove the 'CI/CD unificato (auto-release, lint, typecheck, deploy)' comment at line 148"
      - "Replace the old CI flow diagram (lines 858-876) with the new simplified flow"
---

# Phase 20: Cleanup Legacy Versioning Verification Report

**Phase Goal:** All legacy versioning infrastructure is gone -- no husky, commitlint, commitizen, release-please, auto-release CI, CHANGELOG, or git tags in the project
**Verified:** 2026-02-21T21:15:14Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running `git commit` does not trigger any husky pre-commit or commit-msg hooks | VERIFIED | `.git/hooks/` contains only `.sample` files. No active hooks present. `.husky/` directory deleted. |
| 2 | No commitlint, commitizen, or release-please configuration files exist in the repository | VERIFIED | All confirmed absent: `.commitlintrc.json` GONE, `.czrc` GONE, `.release-please-manifest.json` GONE, `release-please-config.json` GONE |
| 3 | CHANGELOG.md no longer exists in the repository root | VERIFIED | File absent from filesystem |
| 4 | `pnpm install` succeeds without installing husky, commitlint, commitizen, or cz-conventional-changelog | VERIFIED | `package.json` devDependencies contains only `"typescript": "^5.7.0"`. No legacy deps present. |
| 5 | CI workflow runs without any auto-release job or git tag creation step | VERIFIED | `grep -c "auto-release" ci-deploy.yml` returns 0. No `needs.auto-release`, no `released` output, no `git tag` step. YAML valid. |
| 6 | CI deploy jobs no longer depend on auto-release outputs | VERIFIED | All jobs: `build-apk` needs `[lint-and-typecheck]`, `deploy-landing` needs `[lint-and-typecheck]`, `deploy-migrations` needs `[lint-and-typecheck]`, `deploy-functions` needs `[deploy-migrations]`. No `auto-release` in any `needs`. |
| 7 | build-apk job builds with a hardcoded fallback version (not from auto-release) | VERIFIED | Line 90: `-PversionName=0.0.0` hardcoded. No `${{ needs.auto-release.outputs.new_version }}` reference. |
| 8 | All 53 version git tags are deleted from both local and remote | VERIFIED | `git tag -l | wc -l` returns 0. |

**Score:** 7/8 truths verified (1 partial gap in documentation coverage)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | Clean without legacy versioning deps or scripts | VERIFIED | Only `typescript` in devDependencies. No `commit`/`prepare` scripts. No `config.commitizen` block. `"version": "1.6.1"` preserved intentionally (Phase 21 wires to STATE.md). |
| `.github/workflows/ci-deploy.yml` | CI/CD workflow without auto-release job | VERIFIED | 211 lines. auto-release job completely absent. All 5 remaining jobs have clean dependency chains. YAML valid. |
| `packages/shared/src/version.ts` | Version file without release-please comments | VERIFIED | Comment updated: "Version will be derived from .planning/STATE.md in Phase 21. For now, this is a static placeholder." No release-please references. |
| `docs/VERSIONING.md` | Versioning doc noting removal of old tooling | VERIFIED | Replaced with clean placeholder. Historical note explicitly names removed tools. Phase 21/22 plan documented. |
| `README.md` | README without references to CHANGELOG or release-please | VERIFIED | No CHANGELOG.md reference. Versioning link reads "version strategy" (not "release-please, conventional commits"). |
| `docs/TECHNICAL-ARCHITECTURE.md` | (Not in scope per Plan 02) | GAP | Section 6.3 (lines 843-893) still describes auto-release job. Project structure diagram (line 150) still lists `.release-please-manifest.json`. CI comment (line 148) still says "auto-release, lint, typecheck, deploy". |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `package.json` | `.husky/` | `prepare` script removed | VERIFIED | No `"prepare"` script exists in `package.json`. `.husky/` directory absent from filesystem. `git hooks/` contains only sample files. |
| `.github/workflows/ci-deploy.yml` | `build-apk job` | `versionName` no longer from auto-release output | VERIFIED | Line 90: `-PversionName=0.0.0` hardcoded. Zero references to `needs.auto-release` anywhere in the file. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CLEAN-01 | Plan 01 | Rimuovere husky hooks (`.husky/` directory e dipendenza) | SATISFIED | `.husky/` directory gone. `husky` devDependency removed. No `prepare` script. No active `.git/hooks`. |
| CLEAN-02 | Plan 01 | Rimuovere commitlint (`.commitlintrc.json` e dipendenza) | SATISFIED | `.commitlintrc.json` deleted. `@commitlint/cli` and `@commitlint/config-conventional` removed from devDependencies. |
| CLEAN-03 | Plan 01 | Rimuovere commitizen config da `package.json` | SATISFIED | `.czrc` deleted. `commitizen` and `cz-conventional-changelog` removed. `config.commitizen` block removed. `"commit": "cz"` script removed. |
| CLEAN-04 | Plan 01 | Rimuovere release-please config (`.release-please-config.json`, `.release-please-manifest.json`) | SATISFIED | Both `release-please-config.json` and `.release-please-manifest.json` deleted from filesystem. |
| CLEAN-05 | Plan 02 | Rimuovere auto-release job e git tag creation dal CI workflow | SATISFIED | auto-release job removed. `git tag -l` returns 0. No tag creation steps in CI. All 53 tags deleted from local and remote. |
| CLEAN-06 | Plan 01 | Rimuovere `CHANGELOG.md` | SATISFIED | `CHANGELOG.md` absent. Git history preserves content. |

All 6 requirement IDs from REQUIREMENTS.md for Phase 20 are satisfied by the implementation. No orphaned requirements.

### Anti-Patterns Found

| File | Lines | Pattern | Severity | Impact |
|------|-------|---------|----------|--------|
| `docs/TECHNICAL-ARCHITECTURE.md` | 148, 150, 843-893 | Legacy tool descriptions still present as current documentation | Warning | Misleading: describes removed infrastructure as active. Future readers will see auto-release CI job and .release-please-manifest.json described as real. |

### Gaps Summary

One gap found: `docs/TECHNICAL-ARCHITECTURE.md` was not updated in Phase 20.

The file still contains:
- Line 148: CI/CD workflow described as "(auto-release, lint, typecheck, deploy)"
- Line 150: `.release-please-manifest.json` listed in project structure tree as a present file
- Lines 843-893: A full section "6.3 Versioning con Auto-Release" describing the removed auto-release job as active, including a flow diagram showing the old job, "conventional commits" table, and `.release-please-manifest.json` being updated automatically

This was not in scope for Plan 01 or Plan 02. Plan 02 updated `docs/VERSIONING.md` and `README.md` but did not include `docs/TECHNICAL-ARCHITECTURE.md`. The CLEAN requirements (CLEAN-01 through CLEAN-06) are all technically satisfied -- no active tooling remains. However, the phase goal states "no... release-please... in the project" and this stale documentation is the only remaining reference to the old system as a functioning entity.

Severity: This is a documentation gap, not an infrastructure gap. All tooling is actually gone. The gap is in documentation accuracy.

---

_Verified: 2026-02-21T21:15:14Z_
_Verifier: Claude (gsd-verifier)_
