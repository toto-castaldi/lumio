---
phase: quick-fix-version
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/extract-version.cjs
  - packages/shared/src/index.ts
  - apps/android/screens/SettingsScreen.tsx
  - .github/workflows/ci-deploy.yml
  - package.json
autonomous: true
requirements: [VERSION-SYNC, APK-UPLOAD, BUILD-REF-DISPLAY]

must_haves:
  truths:
    - "Root package.json version matches STATE.md milestone after extract-version runs"
    - "Android app settings screen shows build reference format v1.7+42.abc1234 in CI and v1.7+dev locally"
    - "CI build-apk job uploads the APK as a GitHub artifact with version in the name"
  artifacts:
    - path: "scripts/extract-version.cjs"
      provides: "Version extraction + root package.json sync + getDisplayVersion template"
    - path: ".github/workflows/ci-deploy.yml"
      provides: "APK upload artifact step in build-apk job"
  key_links:
    - from: "scripts/extract-version.cjs"
      to: "package.json"
      via: "fs.writeFileSync with updated version field"
      pattern: "packageJson\\.version"
    - from: "apps/android/screens/SettingsScreen.tsx"
      to: "packages/shared/src/version.ts"
      via: "import getDisplayVersion"
      pattern: "getDisplayVersion"
---

<objective>
Fix version consistency across the Lumio project: sync root package.json from STATE.md, add build reference display (v1.7+42.abc1234) in the Android app, and upload APK artifacts in CI.

Purpose: Root package.json is stale at 1.6.2 (should be 1.7), the Android app only shows "v1.7" with no build traceability, and CI builds APKs but discards them.
Output: Updated extract-version.cjs, version.ts template with getDisplayVersion(), updated SettingsScreen, and CI workflow with APK upload.
</objective>

<execution_context>
@/home/toto/.claude/get-shit-done/workflows/execute-plan.md
@/home/toto/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@scripts/extract-version.cjs
@packages/shared/src/version.ts
@packages/shared/src/index.ts
@apps/android/screens/SettingsScreen.tsx
@.github/workflows/ci-deploy.yml
@package.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend extract-version.cjs to sync root package.json and add getDisplayVersion</name>
  <files>scripts/extract-version.cjs, packages/shared/src/index.ts</files>
  <action>
Modify `scripts/extract-version.cjs` with two additions:

**A) Sync root package.json version:**
After generating version.ts (around line 86), add code to:
1. Read `package.json` from ROOT (already defined as `path.resolve(__dirname, "..")`)
2. Parse it as JSON
3. Set `packageJson.version` to the extracted `version` value (e.g., "1.7")
4. Write it back with `JSON.stringify(packageJson, null, 2) + '\n'`
5. Add `const PACKAGE_JSON_PATH = path.join(ROOT, "package.json");` near the other path constants at the top

**B) Add getDisplayVersion to the version.ts template:**
In the template string (the `versionTs` variable), add a new exported function after `getFullVersionString`:

```typescript
/**
 * Display version with build reference for app UI
 * Format: v1.7+42.abc1234 (CI) or v1.7+dev (local)
 */
export function getDisplayVersion(): string {
  if (BUILD_INFO.buildNumber === "dev") {
    return \`v\${BUILD_INFO.version}+dev\`;
  }
  return \`v\${BUILD_INFO.version}+\${BUILD_INFO.buildNumber}.\${BUILD_INFO.gitSha.slice(0, 7)}\`;
}
```

**C) Update packages/shared/src/index.ts:**
Add `getDisplayVersion` to the export list from `'./version'`.

After making changes, run `node scripts/extract-version.cjs` to regenerate version.ts and sync package.json.
  </action>
  <verify>
    <automated>cd /home/toto/scm-projects/lumio && node scripts/extract-version.cjs && node -e "const pkg = require('./package.json'); if(pkg.version !== '1.7') { console.error('FAIL: version is ' + pkg.version); process.exit(1); } console.log('OK: package.json version = ' + pkg.version);" && node -e "const fs = require('fs'); const v = fs.readFileSync('packages/shared/src/version.ts','utf8'); if(!v.includes('getDisplayVersion')) { console.error('FAIL: getDisplayVersion not found'); process.exit(1); } console.log('OK: getDisplayVersion present');"</automated>
  </verify>
  <done>
    - `node scripts/extract-version.cjs` updates both `packages/shared/src/version.ts` and `package.json`
    - Root `package.json` version field is "1.7" (matches STATE.md)
    - `version.ts` exports `getDisplayVersion()` returning `v1.7+dev` locally
    - `packages/shared/src/index.ts` re-exports `getDisplayVersion`
  </done>
</task>

<task type="auto">
  <name>Task 2: Update Android SettingsScreen to use getDisplayVersion</name>
  <files>apps/android/screens/SettingsScreen.tsx</files>
  <action>
In `apps/android/screens/SettingsScreen.tsx`:

1. Line 13: Change import from `getVersionString` to `getDisplayVersion`:
   ```typescript
   import { getDisplayVersion } from '@lumio/shared';
   ```

2. Line 45: Change the version assignment:
   ```typescript
   const version = getDisplayVersion();
   ```

No other changes needed -- the `version` variable is already used downstream in the JSX for display.
  </action>
  <verify>
    <automated>cd /home/toto/scm-projects/lumio && grep -q "getDisplayVersion" apps/android/screens/SettingsScreen.tsx && echo "OK: import updated" || (echo "FAIL: getDisplayVersion not found in SettingsScreen" && exit 1)</automated>
  </verify>
  <done>
    - SettingsScreen imports and calls `getDisplayVersion()` instead of `getVersionString()`
    - Settings screen will show `v1.7+dev` in local dev and `v1.7+42.abc1234` in CI builds
  </done>
</task>

<task type="auto">
  <name>Task 3: Add APK upload artifact step to CI build-apk job</name>
  <files>.github/workflows/ci-deploy.yml</files>
  <action>
In `.github/workflows/ci-deploy.yml`, in the `build-apk` job:

1. After the existing "Rename APK" step (line 108), add a new step to rename with version info:

```yaml
      - name: Rename APK with version
        run: mv lumio.apk "lumio-v${{ steps.version.outputs.version }}+${{ github.run_number }}.${GITHUB_SHA::7}.apk"

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: lumio-apk-v${{ steps.version.outputs.version }}-build${{ github.run_number }}
          path: lumio-v*.apk
          retention-days: 30
```

This uses the `steps.version.outputs.version` already set earlier in the job (line 79-80) and `github.run_number` for the build number.
  </action>
  <verify>
    <automated>cd /home/toto/scm-projects/lumio && grep -q "upload-artifact@v4" .github/workflows/ci-deploy.yml && grep -q "retention-days: 30" .github/workflows/ci-deploy.yml && grep -q "lumio-apk-v" .github/workflows/ci-deploy.yml && echo "OK: APK upload step present" || (echo "FAIL: APK upload step missing" && exit 1)</automated>
  </verify>
  <done>
    - CI build-apk job uploads the APK as a GitHub artifact after building
    - Artifact name includes version and build number: `lumio-apk-v1.7-build42`
    - APK filename includes full build ref: `lumio-v1.7+42.abc1234.apk`
    - Artifact retained for 30 days
  </done>
</task>

</tasks>

<verification>
Run the full verification sequence:
1. `node scripts/extract-version.cjs` succeeds and prints "1.7"
2. `cat package.json | node -e "process.stdin.on('data',d=>{const p=JSON.parse(d);console.log(p.version)})"` prints "1.7"
3. `grep getDisplayVersion packages/shared/src/version.ts` shows the function
4. `grep getDisplayVersion packages/shared/src/index.ts` shows the re-export
5. `grep getDisplayVersion apps/android/screens/SettingsScreen.tsx` shows the import/usage
6. `grep upload-artifact .github/workflows/ci-deploy.yml` shows the upload step
7. `pnpm build:packages` succeeds (shared package compiles with new export)
8. `pnpm typecheck` passes (no type errors from import changes)
</verification>

<success_criteria>
- Root package.json version reads "1.7" (synced from STATE.md) after running extract-version
- Android app SettingsScreen uses getDisplayVersion() showing v1.7+dev locally, v1.7+N.sha in CI
- CI build-apk job uploads APK artifact with 30-day retention and version in filename
- pnpm build:packages and pnpm typecheck both pass
</success_criteria>

<output>
After completion, create `.planning/quick/1-fix-version-consistency-sync-root-packag/1-SUMMARY.md`
</output>
