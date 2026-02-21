# Versioning Strategy

Lumio derives its version from `.planning/STATE.md` at build time. There are no git tags, no CHANGELOG, no conventional commits, and no release-please automation. The version flows through CI into every consumer automatically.

## Source of Truth

The single source of truth for the app version is the `Milestone` field in `.planning/STATE.md`:

```
Milestone: v1.7
```

To change the version, edit this field. Every CI build reads it and propagates the value to all consumers.

## Extraction Script

`scripts/extract-version.cjs` is a zero-dependency CommonJS script that bridges STATE.md and the build system.

**What it does:**

1. Reads `.planning/STATE.md`
2. Parses the `Milestone: vX.Y` line with a regex (`/^Milestone:\s*v?([\d.]+)/m`)
3. Generates `packages/shared/src/version.ts` with the extracted version and build-info helpers
4. Prints the version to stdout (for CI to capture via `$GITHUB_OUTPUT`)

**Exit codes:**

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | `STATE.md` not found or no `Milestone` field |

**Usage:**

```bash
node scripts/extract-version.cjs
# stdout: 1.7
# side-effect: writes packages/shared/src/version.ts
```

The script uses only Node.js built-ins (`fs`, `path`) -- no `npm install` required. It runs on any Node.js version available on ubuntu-latest.

## CI Pipeline

The version is extracted and used in `.github/workflows/ci-deploy.yml` across multiple jobs:

### `lint-and-typecheck`

Runs `node scripts/extract-version.cjs` before `pnpm build:packages` so that TypeScript compilation sees the correct `version.ts` content.

### `build-apk`

Extracts the version into a step output (`id: version`), then passes it to Gradle as `-PversionName=${{ steps.version.outputs.version }}`. The APK versionName matches the STATE.md milestone.

### `deploy-functions`

Extracts the version and sets `LUMIO_VERSION`, `BUILD_NUMBER`, `GIT_SHA`, and `BUILD_DATE` as environment variables for the Edge Functions deploy step.

### `deploy-landing`

Extracts the version and uses `sed` to replace the `__LUMIO_VERSION__` placeholder in `apps/landing/index.html` before SCP deploy to the production server.

## Consumers

All places that consume the version:

| Consumer | Mechanism | File / Variable |
|----------|-----------|-----------------|
| Shared package | TypeScript import | `packages/shared/src/version.ts` exports `VERSION`, `BUILD_INFO`, `getVersionString()`, `getFullVersionString()` |
| Android app | Import from `@lumio/shared` | Settings screen displays version via `getVersionString()` |
| Edge Functions | Environment variable | `/version` endpoint reads `LUMIO_VERSION` env var (set by CI) |
| Landing page | Static injection | `__LUMIO_VERSION__` placeholder in `index.html` replaced by CI via `sed` |

## How to Bump the Version

1. Edit `.planning/STATE.md`
2. Change `Milestone: v1.7` to the new version (e.g., `Milestone: v1.8`)
3. Commit and push to `main`
4. CI automatically propagates the new version to all consumers

No other files need manual changes. The extraction script regenerates `version.ts`, and CI injects the version into APK, Edge Functions, and landing page.

## Version Format

Lumio uses `major.minor` versioning only (no patch component).

**Examples:** `1.7`, `1.8`, `2.0`

There are no git tags, no CHANGELOG.md, and no semver patch versions. The version increments when a new milestone begins in the GSD planning workflow.

## Legacy

Legacy versioning infrastructure was removed in v1.7 Phase 20:

- **Removed:** husky, commitlint, commitizen, release-please, auto-release CI workflow, git tags, CHANGELOG.md
- **Reason:** The GSD-based workflow provides a simpler, single-source-of-truth versioning model that does not require conventional commits or automated release tooling
- **Migration:** Phase 21 wired `STATE.md` as the replacement; Phase 22 updated all public surfaces

---
*Updated: Phase 22 -- GSD versioning documentation*
