---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .github/workflows/ci-deploy.yml
autonomous: true
requirements: [QUICK-3]

must_haves:
  truths:
    - "APK built in CI displays version as v1.7+{run_number}.{short_sha} instead of v1.7+dev"
    - "BUILD_NUMBER and GIT_SHA env vars are available during pnpm build:packages in build-apk job"
  artifacts:
    - path: ".github/workflows/ci-deploy.yml"
      provides: "build-apk job with BUILD_NUMBER and GIT_SHA env vars"
      contains: "BUILD_NUMBER"
  key_links:
    - from: ".github/workflows/ci-deploy.yml build-apk extract version step"
      to: "Build packages step env vars"
      via: "step outputs -> env vars"
      pattern: "BUILD_NUMBER.*steps\\.version\\.outputs\\.build_number"
---

<objective>
Fix APK version display by passing BUILD_NUMBER and GIT_SHA environment variables to the build-apk CI job.

Purpose: The build-apk job bundles packages/shared/src/version.ts during `pnpm build:packages` but does not set BUILD_NUMBER or GIT_SHA env vars. This causes `getDisplayVersion()` to return `v1.7+dev` instead of `v1.7+104.20d8fcb` in production APKs.

Output: Updated ci-deploy.yml where build-apk job passes build metadata through the bundle pipeline.
</objective>

<execution_context>
@/home/toto/.claude/get-shit-done/workflows/execute-plan.md
@/home/toto/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.github/workflows/ci-deploy.yml
@packages/shared/src/version.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Pass BUILD_NUMBER and GIT_SHA env vars to build-apk job steps</name>
  <files>.github/workflows/ci-deploy.yml</files>
  <action>
In the `build-apk` job, make these changes:

1. **Update the "Extract version from STATE.md" step** (currently lines 79-82) to also output `build_number` and `git_sha`, matching how `deploy-functions` does it (lines 246-250):
   ```yaml
   - name: Extract version from STATE.md
     id: version
     run: |
       VERSION=$(node scripts/extract-version.cjs)
       echo "version=$VERSION" >> $GITHUB_OUTPUT
       echo "build_number=${{ github.run_number }}" >> $GITHUB_OUTPUT
       echo "git_sha=${GITHUB_SHA::7}" >> $GITHUB_OUTPUT
   ```

2. **Add env vars to the "Build packages" step** (currently line 85-86). This is the CRITICAL step -- `pnpm build:packages` compiles `packages/shared/src/version.ts` and bakes in the values of `process.env.BUILD_NUMBER` and `process.env.GIT_SHA` at bundle time:
   ```yaml
   - name: Build packages
     run: pnpm build:packages
     env:
       BUILD_NUMBER: ${{ steps.version.outputs.build_number }}
       GIT_SHA: ${{ steps.version.outputs.git_sha }}
   ```

3. **Also add env vars to the "Expo prebuild" step** (currently lines 87-93) for completeness, in case any Metro bundling happens during prebuild:
   Add to the existing env block:
   ```yaml
       BUILD_NUMBER: ${{ steps.version.outputs.build_number }}
       GIT_SHA: ${{ steps.version.outputs.git_sha }}
   ```

4. **Also add env vars to the "Build release APK" step** (currently lines 98-107) for completeness, in case Gradle triggers any JS rebundling:
   Add to the existing env block:
   ```yaml
       BUILD_NUMBER: ${{ steps.version.outputs.build_number }}
       GIT_SHA: ${{ steps.version.outputs.git_sha }}
   ```

Do NOT change any other jobs or steps. The `deploy-functions` and `deploy-landing` jobs already handle versioning correctly.
  </action>
  <verify>
    <automated>grep -n "BUILD_NUMBER\|GIT_SHA\|build_number\|git_sha" .github/workflows/ci-deploy.yml | grep -c "build-apk" || grep -A2 "Build packages" .github/workflows/ci-deploy.yml | grep -q "BUILD_NUMBER" && echo "PASS: BUILD_NUMBER found in Build packages step" || echo "FAIL: BUILD_NUMBER not found"</automated>
    <manual>Review the diff to confirm BUILD_NUMBER and GIT_SHA are set in Extract version outputs AND passed as env vars to Build packages, Expo prebuild, and Build release APK steps in the build-apk job only.</manual>
  </verify>
  <done>The build-apk job's "Extract version" step outputs build_number and git_sha. The "Build packages", "Expo prebuild", and "Build release APK" steps all receive BUILD_NUMBER and GIT_SHA as environment variables. On next CI run, the APK will display v1.7+{run_number}.{short_sha} instead of v1.7+dev.</done>
</task>

</tasks>

<verification>
After applying the change:
1. `grep -c 'BUILD_NUMBER' .github/workflows/ci-deploy.yml` should return at least 5 (3 new in build-apk + 2 existing in deploy-functions)
2. The build-apk job's "Extract version" step has `build_number` and `git_sha` outputs
3. The "Build packages" step has `BUILD_NUMBER` and `GIT_SHA` in its env block
4. No other jobs were modified
</verification>

<success_criteria>
- ci-deploy.yml build-apk job passes BUILD_NUMBER and GIT_SHA env vars to pnpm build:packages
- The extract version step in build-apk outputs build_number and git_sha (matching deploy-functions pattern)
- Expo prebuild and Build release APK steps also receive the env vars
- No regressions in other CI jobs
</success_criteria>

<output>
After completion, create `.planning/quick/3-fix-apk-version-display-pass-build-numbe/3-SUMMARY.md`
</output>
