---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .github/workflows/ci-deploy.yml
autonomous: true
requirements: [FIX-APK-DOWNLOAD]

must_haves:
  truths:
    - "Website download link serves the APK built from latest main push"
    - "GitHub release tag matches the version from STATE.md"
    - "The release asset is named lumio.apk so the landing page URL works"
  artifacts:
    - path: ".github/workflows/ci-deploy.yml"
      provides: "GitHub Release creation job with APK upload"
      contains: "softprops/action-gh-release"
  key_links:
    - from: "build-apk job"
      to: "create-release job"
      via: "needs: [build-apk], downloads APK artifact"
      pattern: "actions/download-artifact"
    - from: "landing page download link"
      to: "GitHub release asset"
      via: "releases/latest/download/lumio.apk URL"
      pattern: "lumio.apk"
---

<objective>
Fix the APK download link on the Lumio landing page. The website links to
`https://github.com/toto-castaldi/lumio/releases/latest/download/lumio.apk`
but the latest GitHub Release is stuck at v1.6.2 because the CI/CD pipeline
builds the APK and uploads it as a GitHub Actions artifact but never creates
or updates a GitHub Release.

Purpose: Users visiting the landing page get the current APK, not a stale v1.6.2 build.
Output: Updated CI/CD workflow that creates a GitHub Release with the APK on every main push.
</objective>

<execution_context>
@/home/toto/.claude/get-shit-done/workflows/execute-plan.md
@/home/toto/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.github/workflows/ci-deploy.yml
@scripts/extract-version.cjs
@apps/landing/index.html
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add GitHub Release job to CI/CD pipeline</name>
  <files>.github/workflows/ci-deploy.yml</files>
  <action>
Add a new job `create-release` to `.github/workflows/ci-deploy.yml` that runs
after `build-apk` completes successfully. This job must:

1. **Depend on `build-apk`**: `needs: [build-apk]` with the same `if` condition
   (main branch push only).

2. **Extract version** the same way `build-apk` does:
   - `actions/checkout@v4`
   - Run `node scripts/extract-version.cjs` and capture output as `version` step output

3. **Download the APK artifact** uploaded by `build-apk`:
   - Use `actions/download-artifact@v4` with the artifact name pattern
     `lumio-apk-v${{ steps.version.outputs.version }}-build${{ github.run_number }}`

4. **Rename the versioned APK to `lumio.apk`** so the landing page URL works:
   - The artifact contains a file named `lumio-v{version}+{run_number}.{sha7}.apk`
   - Rename it: `mv lumio-v*.apk lumio.apk`

5. **Create/update a GitHub Release** using `softprops/action-gh-release@v2`:
   - `tag_name`: `v${{ steps.version.outputs.version }}`
   - `name`: `v${{ steps.version.outputs.version }}`
   - `body`: Auto-generated body like "Lumio v{version} - Build #{run_number} ({sha7})"
   - `files`: `lumio.apk`
   - `make_latest`: `true`
   - `draft`: `false`
   - `prerelease`: `false`

IMPORTANT: The `build-apk` job currently renames the APK with a version suffix
on line 111 (`mv lumio.apk "lumio-v...apk"`). The original `lumio.apk` copy
from line 108 is gone after that rename. So the artifact only contains the
versioned filename. The `create-release` job must rename it back to `lumio.apk`.

IMPORTANT: The `build-apk` job needs to pass its version output to
`create-release`. Use job outputs to expose the version step output:
- Add `outputs: version: ${{ steps.version.outputs.version }}` to `build-apk` job
- In `create-release`, reference `needs.build-apk.outputs.version`

This avoids needing to re-checkout and re-run extract-version in the release job.

NOTE: The `softprops/action-gh-release@v2` action will update an existing
release if the tag already exists, and its `make_latest: true` ensures the
"Latest" badge moves to this release. The `permissions: contents: write` is
already set at the workflow level (line 10).

Do NOT modify the existing `build-apk` job steps except:
- Adding `outputs` to the job definition
- Keep the existing `upload-artifact` step (useful for build history/debugging)
  </action>
  <verify>
    <automated>cd /home/toto/scm-projects/lumio && python3 -c "
import yaml, sys
with open('.github/workflows/ci-deploy.yml') as f:
    wf = yaml.safe_load(f)
jobs = wf['jobs']
# Check create-release job exists
assert 'create-release' in jobs, 'create-release job missing'
cr = jobs['create-release']
# Check it depends on build-apk
assert 'build-apk' in cr['needs'], 'must depend on build-apk'
# Check build-apk has outputs
assert 'outputs' in jobs['build-apk'], 'build-apk must have outputs'
# Check steps reference gh-release action
steps_text = str(cr['steps'])
assert 'softprops/action-gh-release' in steps_text, 'must use gh-release action'
assert 'download-artifact' in steps_text, 'must download artifact'
assert 'lumio.apk' in steps_text, 'must reference lumio.apk'
print('ALL CHECKS PASSED')
" 2>&1 || echo "Verify with: grep -A5 'create-release' .github/workflows/ci-deploy.yml"</automated>
    <manual>Review the workflow YAML for correctness. Push to main and verify a release is created.</manual>
  </verify>
  <done>
    The CI/CD pipeline has a `create-release` job that:
    - Runs after successful `build-apk` on main branch pushes
    - Downloads the APK artifact from the build job
    - Creates/updates a GitHub Release tagged with the version from STATE.md
    - Attaches the APK as `lumio.apk` so the landing page download URL works
    - Sets the release as "Latest" so `/releases/latest/download/lumio.apk` resolves
  </done>
</task>

<task type="auto">
  <name>Task 2: Manually create release for current version to fix immediately</name>
  <files></files>
  <action>
The CI fix will only take effect on the NEXT push to main. To fix the download
link immediately, use the `gh` CLI to:

1. Check if the latest CI run produced an APK artifact:
   - `gh run list --workflow ci-deploy.yml --branch main --limit 3`
   - Find the most recent successful run
   - `gh run download {run_id} --name "lumio-apk-v*"` to get the APK

2. If an artifact is available, download it and rename to `lumio.apk`.

3. Delete the existing v1.6.2 release (or update it):
   - Option A (preferred): Create a new release `v1.7` with `lumio.apk`:
     `gh release create v1.7 lumio.apk --title "v1.7" --notes "Lumio v1.7" --latest`
   - If v1.7 tag already exists: `gh release delete v1.7 --yes` first, then create

4. If no artifact is downloadable (expired), skip this task -- the next push
   to main will create the release automatically via Task 1.

NOTE: This is a one-time fix. After the CI changes from Task 1 are pushed,
every subsequent main push will automatically update the release.
  </action>
  <verify>
    <automated>gh release view --json tagName,name,assets --jq '.tagName + " " + (.assets | map(.name) | join(","))' 2>/dev/null | grep -q "lumio.apk" && echo "RELEASE HAS lumio.apk" || echo "WARNING: lumio.apk not in latest release (may need next CI push)"</automated>
    <manual>Visit https://github.com/toto-castaldi/lumio/releases/latest and confirm lumio.apk is listed as an asset.</manual>
  </verify>
  <done>
    The latest GitHub Release contains `lumio.apk` with a version matching v1.7,
    OR this task is skipped because no CI artifact is available (will be fixed on next push).
  </done>
</task>

</tasks>

<verification>
- `gh release view --json tagName,assets` shows latest release with `lumio.apk` asset
- Landing page download link (`/releases/latest/download/lumio.apk`) returns HTTP 302 to the APK file
- CI workflow YAML parses correctly: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-deploy.yml'))"`
</verification>

<success_criteria>
- The CI/CD pipeline creates a GitHub Release with `lumio.apk` on every push to main
- The landing page download link serves the APK matching the current version
- Existing CI jobs (build-apk, deploy-landing, etc.) are not broken
</success_criteria>

<output>
After completion, create `.planning/quick/2-fix-apk-download-github-release-apk-is-o/2-SUMMARY.md`
</output>
