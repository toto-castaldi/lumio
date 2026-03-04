---
phase: quick-9
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/extract-version.cjs
  - .github/workflows/ci-deploy.yml
  - docs/VERSIONING.md
autonomous: true
requirements: [QUICK-9]
must_haves:
  truths:
    - "When CI builds on a git tag vX.Y where X.Y > STATE.md version, the tag version is used"
    - "When STATE.md version >= git tag version, STATE.md version is used (existing behavior preserved)"
    - "Local dev builds (no GIT_TAG env var) work exactly as before"
    - "Version comparison is semantic (2.1 < 2.2, 1.9 < 2.0, not string comparison)"
  artifacts:
    - path: "scripts/extract-version.cjs"
      provides: "Git tag version override logic"
      contains: "GIT_TAG"
    - path: ".github/workflows/ci-deploy.yml"
      provides: "GIT_TAG env var passed to extract-version steps"
      contains: "GIT_TAG"
  key_links:
    - from: ".github/workflows/ci-deploy.yml"
      to: "scripts/extract-version.cjs"
      via: "GIT_TAG env var"
      pattern: "GIT_TAG"
---

<objective>
Modify the version extraction pipeline so that when a CI build runs on a git tag with a version
higher than the one in STATE.md, the tag version is used instead.

Purpose: Allow git tags to override STATE.md as version source when they represent a newer release,
enabling version bumps via `git tag v2.2 && git push --tags` without editing STATE.md first.

Output: Updated extract-version.cjs with tag comparison logic, CI workflow passing GIT_TAG env var,
updated VERSIONING.md documenting the new behavior.
</objective>

<execution_context>
@/home/toto/.claude/get-shit-done/workflows/execute-plan.md
@/home/toto/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@scripts/extract-version.cjs
@.github/workflows/ci-deploy.yml
@docs/VERSIONING.md
@packages/shared/src/version.ts
</context>

<interfaces>
<!-- Current extract-version.cjs API -->
<!-- Reads: .planning/STATE.md (Milestone field), env vars BUILD_NUMBER, GIT_SHA, COMMIT_SHA, BUILD_DATE -->
<!-- Writes: packages/shared/src/version.ts, package.json (version field) -->
<!-- Stdout: version string (e.g. "2.1") -->
<!-- Exit 0 on success, 1 on missing STATE.md or Milestone field -->

<!-- CI workflow passes to extract-version.cjs: -->
<!-- BUILD_NUMBER=${{ github.run_number }} -->
<!-- GIT_SHA=${{ github.sha }} -->
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Add git tag version override to extract-version.cjs</name>
  <files>scripts/extract-version.cjs</files>
  <action>
Modify `scripts/extract-version.cjs` to support a `GIT_TAG` env var that can override the STATE.md version when higher.

After step 2 (parsing the Milestone field from STATE.md), add a new step:

1. Read `process.env.GIT_TAG` (will be set by CI, empty/undefined locally)
2. If GIT_TAG is set and matches a version pattern (strip leading `v` if present, match `\d+\.\d+(\.\d+)?`):
   - Parse both versions into numeric components for comparison
   - Compare: split on `.`, compare each segment numerically left-to-right (e.g. "2.1" vs "1.9" -> [2,1] vs [1,9] -> 2 > 1, tag wins)
   - If the tag version is strictly greater than STATE.md version, use the tag version
   - Log to stderr which version source was used: `"VERSION: Using git tag vX.Y (higher than STATE.md vA.B)"` or `"VERSION: Using STATE.md vA.B (git tag vX.Y is not higher)"`
3. If GIT_TAG is not set or doesn't match, proceed with STATE.md version as before (no log needed -- existing behavior)

Important implementation details:
- Do NOT use any external dependencies (no `semver` package). Use a simple `compareVersions(a, b)` helper that splits on `.`, pads shorter arrays with 0, and compares numerically segment by segment. Return -1, 0, or 1.
- The `compareVersions` function should handle 2-segment (1.7) and 3-segment (2.1.1) versions correctly.
- The rest of the script (generating version.ts, syncing package.json, printing to stdout) remains unchanged -- it just uses whichever version won.
  </action>
  <verify>
    <automated>cd /home/toto/scm-projects/lumio && node -e "
      // Test 1: No GIT_TAG - should use STATE.md version
      const cp = require('child_process');
      const r1 = cp.execSync('node scripts/extract-version.cjs', { encoding: 'utf-8' }).trim();
      console.log('No tag:', r1);

      // Test 2: GIT_TAG lower than STATE.md - should keep STATE.md
      const r2 = cp.execSync('node scripts/extract-version.cjs', { encoding: 'utf-8', env: { ...process.env, GIT_TAG: 'v1.0' } }).trim();
      console.log('Low tag:', r2);

      // Test 3: GIT_TAG higher than STATE.md - should use tag
      const r3 = cp.execSync('node scripts/extract-version.cjs', { encoding: 'utf-8', env: { ...process.env, GIT_TAG: 'v99.0' } }).trim();
      console.log('High tag:', r3);
      if (r3 !== '99.0') throw new Error('Expected 99.0 but got ' + r3);

      // Restore: re-run without tag to reset version.ts
      cp.execSync('node scripts/extract-version.cjs', { encoding: 'utf-8' });
      console.log('All tests passed');
    "</automated>
  </verify>
  <done>extract-version.cjs uses GIT_TAG when its version is higher than STATE.md, falls back to STATE.md otherwise. No external dependencies added. Local dev unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: Pass GIT_TAG env var in CI workflow and update docs</name>
  <files>.github/workflows/ci-deploy.yml, docs/VERSIONING.md</files>
  <action>
**CI workflow changes (.github/workflows/ci-deploy.yml):**

In each job step that runs `node scripts/extract-version.cjs`, add `GIT_TAG` to the `env:` block.

The value should be `${{ github.ref_name }}` -- in GitHub Actions, `github.ref_name` is the tag name
(e.g. `v2.1`) when triggered by a tag push, and the branch name (e.g. `main`) when triggered by a
branch push. The extract-version.cjs script's regex will only match version-shaped strings, so
passing `main` is harmless (it won't match `\d+\.\d+`).

Specific locations to update (3 places):

1. **lint-and-typecheck** job, "Extract version from STATE.md" step (~line 35):
   Add `env:` block with `GIT_TAG: ${{ github.ref_name }}`

2. **build-apk** job, "Extract version from STATE.md" step (~line 80):
   Add `GIT_TAG: ${{ github.ref_name }}` to existing `env:` block (which already has BUILD_NUMBER, GIT_SHA)

3. **deploy-landing** job, "Extract version from STATE.md" step (~line 170):
   Add `env:` block with `GIT_TAG: ${{ github.ref_name }}`

4. **deploy-functions** job, "Extract version from STATE.md" step (~line 249):
   Add `env:` block with `GIT_TAG: ${{ github.ref_name }}`

Additionally, add tag push trigger to the workflow's `on:` block so CI runs when a version tag is pushed:

```yaml
on:
  push:
    branches: [main, develop]
    tags:
      - 'v*'
  pull_request:
    branches: [main, develop]
```

**VERSIONING.md changes (docs/VERSIONING.md):**

1. Update the "Principi" section, item 1: change from "la versione vive in un solo posto: `.planning/STATE.md`" to something like "la versione vive in `.planning/STATE.md`, con override da git tag se piu' recente"

2. Add a new section after "Source of Truth: STATE.md" titled "## Git Tag Override" explaining:
   - When a build runs on a git tag `vX.Y`, the script compares it with STATE.md
   - If the tag version is strictly higher, it overrides STATE.md
   - This enables `git tag v2.2 && git push --tags` as a lightweight version bump
   - STATE.md remains the default source for branch pushes

3. Update the pipeline ASCII diagram to show the GIT_TAG env var input to extract-version.cjs

4. Update "Come bumpare la versione" section to add the git tag alternative method
  </action>
  <verify>
    <automated>cd /home/toto/scm-projects/lumio && grep -q 'GIT_TAG' .github/workflows/ci-deploy.yml && grep -c 'GIT_TAG' .github/workflows/ci-deploy.yml | xargs -I{} test {} -ge 4 && grep -q "v\*" .github/workflows/ci-deploy.yml && grep -q 'Git Tag Override\|git tag' docs/VERSIONING.md && echo "All checks passed"</automated>
  </verify>
  <done>CI passes GIT_TAG to all extract-version steps. Workflow triggers on tag pushes. VERSIONING.md documents the git tag override behavior.</done>
</task>

</tasks>

<verification>
- `node scripts/extract-version.cjs` produces same output as before (STATE.md version) when no GIT_TAG set
- `GIT_TAG=v99.0 node scripts/extract-version.cjs` produces `99.0`
- `GIT_TAG=v0.1 node scripts/extract-version.cjs` produces STATE.md version (tag is lower)
- `GIT_TAG=main node scripts/extract-version.cjs` produces STATE.md version (not a version string)
- CI workflow has GIT_TAG env var in all 4 extract-version steps
- CI workflow triggers on `tags: ['v*']`
- VERSIONING.md documents the override behavior
</verification>

<success_criteria>
- extract-version.cjs uses git tag version when GIT_TAG env var contains a version higher than STATE.md
- Backward compatible: no GIT_TAG or lower tag version preserves existing behavior
- CI workflow passes github.ref_name as GIT_TAG to all version extraction steps
- CI triggers on version tag pushes
- Documentation updated
</success_criteria>

<output>
After completion, create `.planning/quick/9-use-git-tag-version-when-higher-than-sta/9-SUMMARY.md`
</output>
