# Phase 5: Distribution & Cleanup - Research

**Researched:** 2026-02-08
**Domain:** Android APK CI/CD, static landing page, monorepo cleanup
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Landing page inherits branding from Android app's theme (purple/amber palette -- note: actual app theme uses blue `#3B82F6` primary, so this needs clarification or the landing page should use the agreed purple/amber)
- Include real screenshots from the actual app
- Bilingual: both English and Italian (language toggle or dual sections)
- APK built via local Gradle build in GitHub Actions (NOT EAS Build)
- Auto-trigger on push to main -- every merge produces a new APK
- Built APK stored as GitHub Releases asset
- Landing page download link points to latest GitHub Release
- Remove apps/web and apps/mobile directories
- Clean up CI/CD pipeline: remove web/mobile deploy jobs, add APK build job
- Review Edge Functions for web/mobile-specific ones and remove if found
- lumio.toto-castaldi.com nginx config switches from serving web app to serving landing page
- Landing page lives inside monorepo as apps/landing (or similar)
- Deployed via GitHub Actions + SCP/rsync to server
- SSH keys and server details already configured in GitHub Secrets (DO_HOST, DO_USERNAME, DO_SSH_KEY)

### Claude's Discretion
- Landing page layout style (single-section vs multi-section)
- packages/core and packages/shared unification (based on current usage analysis)
- Landing page build tooling (plain static HTML vs Vite)

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

## Summary

Phase 5 has three major workstreams: (1) CI/CD for building an Android release APK and publishing it to GitHub Releases, (2) creating a bilingual static landing page at lumio.toto-castaldi.com, and (3) removing legacy PWA code (apps/web, apps/mobile) with full CI/CD cleanup.

The Android app already has a fully generated native `android/` directory (from `expo prebuild`), Gradle 8.14.3, and a debug keystore. The release build currently signs with the debug keystore (`signingConfig signingConfigs.debug` in the release buildType). A dedicated release keystore needs to be generated and stored as a base64-encoded GitHub Secret. The Gradle command `./gradlew app:assembleRelease` will produce the APK at `android/app/build/outputs/apk/release/app-release.apk`.

The landing page should be plain static HTML/CSS (no build step needed) deployed via SCP to `/var/www/lumio`, replacing the current web app. The nginx config needs minor adjustment: remove the SPA `try_files` fallback and serve static files directly. The download link uses GitHub's stable `/releases/latest/download/lumio.apk` URL pattern.

**Primary recommendation:** Start with the APK build pipeline (keystore + CI), then build the landing page, then clean up legacy code last (to avoid breaking CI during the transition).

## Standard Stack

### Core
| Library/Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Gradle (wrapper) | 8.14.3 | Android build system | Already in project, builds the APK |
| Java JDK | 17 | Required for Gradle/Android builds | React Native 0.81 + Expo SDK 54 recommend JDK 17 |
| `actions/setup-java@v4` | v4 | Set up JDK in GitHub Actions | Standard GH Action for Java projects |
| `softprops/action-gh-release@v2` | v2 | Create GitHub Release + upload assets | Most popular action for release creation, actively maintained |
| `appleboy/scp-action@v0.1.7` | v0.1.7 | Deploy landing page to server | Already used in existing CI for web deploy |
| `appleboy/ssh-action@v1.0.3` | v1.0.3 | Reload nginx after deploy | Already used in existing CI |
| `keytool` (from JDK) | -- | Generate release keystore | Standard Android signing tool, ships with JDK |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `actions/cache@v4` | Cache Gradle dependencies | Every APK build (saves 2-5 min) |
| `openssl base64` | Encode keystore for GH Secrets | One-time setup |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain HTML landing | Vite static site | Vite adds build step, dependencies, complexity; a single-page landing with language toggle needs no framework |
| `softprops/action-gh-release` | `gh release create` (GH CLI) | CLI works too but action is more declarative and handles edge cases like updating existing releases |
| `r0adkll/sign-android-release` | Manual signing in build.gradle | build.gradle signing is simpler and more standard for Expo projects; the action adds complexity |

**Recommendation on build tooling (Claude's Discretion):** Use **plain static HTML/CSS** for the landing page. Rationale: it is a single page with a language toggle, no routing, no dynamic content. Adding Vite or any build tool is unnecessary overhead. A single `index.html` + `styles.css` + `script.js` (for language toggle) + screenshot images is sufficient and results in zero build step, zero dependencies, and trivial deployment.

## Architecture Patterns

### Recommended Project Structure
```
apps/landing/
  index.html          # Bilingual landing page
  styles.css          # Styles (purple/amber palette)
  script.js           # Language toggle logic
  screenshots/        # App screenshots (PNG/WebP)
    dashboard.png
    study.png
    quiz.png
  favicon.png         # Reuse from android/assets
```

### Pattern 1: GitHub Release APK with Stable Download URL
**What:** Every push to main triggers APK build, creates/updates a GitHub Release, uploads APK as asset with a consistent filename.
**When to use:** Whenever you need a stable "latest download" URL.
**Key URL pattern:**
```
https://github.com/toto-castaldi/lumio/releases/latest/download/lumio.apk
```
This URL always resolves to the latest release's `lumio.apk` asset. The landing page links here directly -- no API calls, no JavaScript needed.

**CI flow:**
```
push to main
  -> auto-release job (already exists, creates vX.Y.Z tag)
  -> build-apk job (new, runs after auto-release)
     -> checkout + setup JDK 17 + pnpm install + build packages
     -> expo prebuild --platform android --clean
     -> cd android && ./gradlew app:assembleRelease
     -> create/update GitHub Release with APK asset
  -> deploy-landing job (new, replaces deploy-web)
     -> SCP landing page files to /var/www/lumio
     -> reload nginx
```

### Pattern 2: Keystore as Base64 GitHub Secret
**What:** Generate a release keystore locally, base64-encode it, store as GitHub Secret. CI decodes it before the build.
**When to use:** Standard approach for Android CI signing.
**Steps:**
```bash
# Generate keystore (one-time, local)
keytool -genkey -v -keystore lumio-release.keystore \
  -alias lumio -keyalg RSA -keysize 2048 -validity 10000

# Base64 encode for GitHub Secret
openssl base64 < lumio-release.keystore | tr -d '\n' > keystore.b64

# Store as GitHub Secrets:
#   ANDROID_KEYSTORE_BASE64 = contents of keystore.b64
#   ANDROID_KEYSTORE_PASSWORD = store password
#   ANDROID_KEY_ALIAS = lumio
#   ANDROID_KEY_PASSWORD = key password
```

In CI, decode and reference in build.gradle:
```bash
echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 --decode > android/app/release.keystore
```

### Pattern 3: Bilingual Landing Page with Language Toggle
**What:** Single HTML page with all content in both languages, toggled via JavaScript.
**How it works:** All text wrapped in `<span lang="en">` and `<span lang="it">` elements. A language toggle button switches visibility. Default detected from browser `navigator.language`. State stored in `localStorage`.

### Pattern 4: Version Code from CI Run Number
**What:** Use GitHub Actions `github.run_number` as Android `versionCode` to ensure monotonically increasing build numbers.
**Why:** Android requires `versionCode` to increase with each release. The CI run number naturally increases. `versionName` comes from the auto-release semver tag.
**Implementation:** Pass as Gradle property: `./gradlew app:assembleRelease -PversionCode=${{ github.run_number }} -PversionName=${{ needs.auto-release.outputs.new_version }}`
Then in `build.gradle`, read from project properties with fallback:
```groovy
versionCode (findProperty('versionCode') ?: 1).toInteger()
versionName findProperty('versionName') ?: "1.0.0"
```

### Anti-Patterns to Avoid
- **Hardcoded versionCode in build.gradle:** Never commit a static versionCode that must be manually bumped. Use CI run number instead.
- **Checking keystore into git:** Never store the keystore file in the repository, even encrypted. Use GitHub Secrets with base64 encoding.
- **Using debug keystore for releases:** The current `build.gradle` signs release builds with the debug keystore. This must be changed to use a proper release keystore.
- **SPA fallback for static landing page:** The current nginx config has `try_files $uri $uri/ /index.html` for SPA routing. The landing page is static, so this should be simplified.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GitHub Release creation | Custom API calls to GitHub | `softprops/action-gh-release@v2` | Handles idempotent create/update, asset upload, tag detection |
| APK signing in CI | Manual jarsigner commands | build.gradle `signingConfigs` + decoded keystore | Gradle handles signing natively, cleaner and less error-prone |
| Language toggle | Custom i18n framework | CSS `[lang]` attribute selectors + 20 lines of JS | Landing page is ~50 strings total, no framework needed |
| Cache management in CI | Manual cache keys | `actions/cache@v4` with `~/.gradle/caches` | Standard pattern, well-documented restore keys |

**Key insight:** This phase is infrastructure and deployment, not application code. Use battle-tested CI actions and keep the landing page dead simple.

## Common Pitfalls

### Pitfall 1: Expo Prebuild in CI Without Node Modules
**What goes wrong:** Running `npx expo prebuild --platform android --clean` in CI without first installing dependencies fails because Expo needs node_modules to resolve native modules.
**Why it happens:** The monorepo requires `pnpm install` + `pnpm build:packages` before prebuild can work, because `@lumio/core` is a workspace dependency.
**How to avoid:** CI steps must be: checkout -> setup node/pnpm -> `pnpm install --frozen-lockfile` -> `pnpm build:packages` -> prebuild -> gradle build.
**Warning signs:** Errors about missing `expo-modules-autolinking` or unresolved workspace packages.

### Pitfall 2: Gradle Build Fails Due to Missing ANDROID_HOME
**What goes wrong:** GitHub Actions `ubuntu-latest` has Android SDK preinstalled, but `ANDROID_HOME` may not be set or may point to wrong location.
**Why it happens:** Ubuntu runner environment varies; Expo expects `ANDROID_HOME` or `ANDROID_SDK_ROOT`.
**How to avoid:** After `setup-java`, verify with `echo $ANDROID_HOME`. On `ubuntu-latest`, it is typically `/usr/local/lib/android/sdk`. May need explicit `ANDROID_HOME` env var.
**Warning signs:** "SDK location not found" or "Failed to find Build Tools" errors.

### Pitfall 3: Monorepo Node Resolution in Gradle
**What goes wrong:** Gradle's `settings.gradle` and `build.gradle` use `node --print require.resolve(...)` to find React Native and Expo packages. In a monorepo, these resolve relative to `rootDir` which is `apps/android/android/`, but packages may be hoisted to the monorepo root.
**Why it happens:** pnpm uses a strict node_modules structure. The current project already handles this with `metro.config.js` and the `react` block in `build.gradle` setting `projectRoot`.
**How to avoid:** Ensure Gradle commands run from `apps/android/android/` and that the working directory context is correct. The existing setup already works locally, so CI should replicate the same directory structure.
**Warning signs:** "Cannot find module 'react-native/package.json'" during Gradle build.

### Pitfall 4: Forgetting to Update pnpm-workspace.yaml After Removing apps/web and apps/mobile
**What goes wrong:** `pnpm-workspace.yaml` uses `apps/*` glob, so removing directories won't break it. But `package.json` root scripts reference `@lumio/web` and `@lumio/mobile` -- those scripts will error if the packages are gone.
**Why it happens:** Root `package.json` has `dev:web`, `dev:mobile`, `build:web`, `build:mobile` scripts that use `pnpm --filter @lumio/web` and `pnpm --filter @lumio/mobile`.
**How to avoid:** Remove the web/mobile scripts from root `package.json` when removing the directories. Also remove web/mobile from the CI workflow.
**Warning signs:** CI `pnpm typecheck` or `pnpm build:web` fails on missing package.

### Pitfall 5: Release Keystore Lost
**What goes wrong:** If the release keystore is lost, you cannot sign updates to the APK. Users who installed with the old keystore cannot upgrade.
**Why it happens:** Keystore was only stored in CI secrets and nowhere else.
**How to avoid:** After generating the keystore, back it up securely (e.g., password manager, encrypted cloud backup). Document that this keystore must NEVER be regenerated.
**Warning signs:** "Keystore was tampered with, or password was incorrect" after re-generating.

### Pitfall 6: GitHub Releases Permissions
**What goes wrong:** The `softprops/action-gh-release` action fails with 403 because the workflow doesn't have `contents: write` permission.
**Why it happens:** GitHub Actions tokens have restricted permissions by default.
**How to avoid:** The existing CI already has `permissions: contents: write` at the top level. Ensure the new APK job inherits this.
**Warning signs:** "Resource not accessible by integration" error.

## Code Examples

### CI Job: Build APK and Upload to GitHub Release
```yaml
# Source: verified pattern from softprops/action-gh-release docs + Expo docs
build-apk:
  runs-on: ubuntu-latest
  needs: [lint-and-typecheck, auto-release]
  if: always() && github.ref == 'refs/heads/main' && github.event_name == 'push' && needs.lint-and-typecheck.result == 'success' && needs.auto-release.outputs.released == 'true'
  steps:
    - uses: actions/checkout@v4
      with:
        ref: main
        fetch-depth: 0

    - name: Pull latest changes
      run: git pull origin main

    - uses: actions/setup-java@v4
      with:
        distribution: 'temurin'
        java-version: '17'

    - uses: pnpm/action-setup@v4

    - uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'pnpm'

    - name: Cache Gradle
      uses: actions/cache@v4
      with:
        path: |
          ~/.gradle/caches
          ~/.gradle/wrapper
        key: gradle-${{ hashFiles('apps/android/android/gradle/wrapper/gradle-wrapper.properties') }}
        restore-keys: gradle-

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Build packages
      run: pnpm build:packages

    - name: Expo prebuild
      working-directory: apps/android
      run: npx expo prebuild --platform android --clean

    - name: Decode keystore
      run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 --decode > apps/android/android/app/release.keystore

    - name: Build release APK
      working-directory: apps/android/android
      run: ./gradlew app:assembleRelease -PversionCode=${{ github.run_number }} -PversionName=${{ needs.auto-release.outputs.new_version }}
      env:
        ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
        ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
        ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}

    - name: Rename APK
      run: cp apps/android/android/app/build/outputs/apk/release/app-release.apk lumio.apk

    - name: Upload to GitHub Release
      uses: softprops/action-gh-release@v2
      with:
        tag_name: v${{ needs.auto-release.outputs.new_version }}
        files: lumio.apk
```

### build.gradle Release Signing Config
```groovy
// Source: React Native docs + Android developer docs
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        storeFile file('release.keystore')
        storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD') ?: 'android'
        keyAlias System.getenv('ANDROID_KEY_ALIAS') ?: 'androiddebugkey'
        keyPassword System.getenv('ANDROID_KEY_PASSWORD') ?: 'android'
    }
}
buildTypes {
    debug {
        signingConfig signingConfigs.debug
    }
    release {
        signingConfig signingConfigs.release
        // ... rest of release config
    }
}
```

### Dynamic Version Code from Gradle Properties
```groovy
// In android/app/build.gradle defaultConfig block:
versionCode (findProperty('versionCode') ?: 1).toInteger()
versionName findProperty('versionName') ?: "1.0.0"
```

### Landing Page Language Toggle (JavaScript)
```javascript
// Source: standard pattern, no library
(function() {
  const STORAGE_KEY = 'lumio-lang';
  const defaultLang = (navigator.language || '').startsWith('it') ? 'it' : 'en';
  let currentLang = localStorage.getItem(STORAGE_KEY) || defaultLang;

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('[lang="en"]').forEach(el => el.style.display = lang === 'en' ? '' : 'none');
    document.querySelectorAll('[lang="it"]').forEach(el => el.style.display = lang === 'it' ? '' : 'none');
  }

  document.getElementById('lang-toggle').addEventListener('click', () => {
    setLang(currentLang === 'en' ? 'it' : 'en');
  });

  setLang(currentLang);
})();
```

### Updated Nginx Config for Static Landing Page
```nginx
server {
    listen 80;
    server_name lumio.toto-castaldi.com;

    root /var/www/lumio;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Cache static assets (screenshots, CSS, JS)
    location ~* \.(css|js|png|jpg|jpeg|webp|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No SPA fallback needed -- pure static site
    location / {
        try_files $uri $uri/ =404;
    }
}
```

### Deploy Landing Page CI Job
```yaml
deploy-landing:
  runs-on: ubuntu-latest
  needs: [lint-and-typecheck, auto-release]
  if: always() && github.ref == 'refs/heads/main' && github.event_name == 'push' && needs.lint-and-typecheck.result == 'success'
  steps:
    - uses: actions/checkout@v4
      with:
        ref: main

    - name: Deploy to DigitalOcean
      uses: appleboy/scp-action@v0.1.7
      with:
        host: ${{ secrets.DO_HOST }}
        username: ${{ secrets.DO_USERNAME }}
        key: ${{ secrets.DO_SSH_KEY }}
        source: 'apps/landing/*'
        target: '/var/www/lumio'
        strip_components: 2

    - name: Reload Nginx
      uses: appleboy/ssh-action@v1.0.3
      with:
        host: ${{ secrets.DO_HOST }}
        username: ${{ secrets.DO_USERNAME }}
        key: ${{ secrets.DO_SSH_KEY }}
        script: sudo systemctl reload nginx
```

## Codebase Analysis: Cleanup Impact

### packages/core and packages/shared Unification (Claude's Discretion)

**Analysis of current usage:**

`@lumio/shared` exports:
- `version.ts` -- VERSION, BUILD_INFO, version string functions
- `types/index.ts` -- All TypeScript interfaces (Card, Repository, QuizQuestion, etc.)
- `constants/index.ts` -- APP_NAME, SM2_DEFAULTS, STUDY_DEFAULTS, CARD_FORMAT, LLM_MODELS

`@lumio/core` depends on `@lumio/shared` and re-exports everything from it (`export * from '@lumio/shared'`). It adds:
- Supabase client, auth, repositories, assets, study functions
- Markdown configuration (remark/rehype plugins)
- Deck class, CardView class

**Who uses what:**
- `apps/android` imports only `@lumio/core` (12 files). Since core re-exports shared, android gets everything through core.
- `apps/web` imports both `@lumio/core` and `@lumio/shared` (being removed).
- `apps/mobile` imports both `@lumio/core` and `@lumio/shared` (being removed).
- `supabase/functions` do NOT import from workspace packages -- they have their own inline types.

**Recommendation: Keep packages/core and packages/shared as separate packages.** Rationale:
1. The separation is clean and working. `shared` = pure types/constants (zero deps), `core` = Supabase client + business logic (has runtime deps).
2. Edge Functions might benefit from importing `@lumio/shared` in the future (types only, no runtime deps).
3. Merging would create a single package with both types and Supabase deps, making it harder to use the types independently.
4. The cost of maintaining two packages is near zero (they rarely change).

### Platform Type Cleanup

`packages/shared/src/types/index.ts` defines `Platform = 'web' | 'mobile'`. After removing web and mobile, this type should be updated. However, it is not actually imported or used anywhere in the Android app or Edge Functions (the Edge Function `llm-proxy` has its own internal `PlatformConfig` interface). This type can be removed or changed to `'android'` during cleanup.

### Root package.json Script Cleanup

The following scripts in root `package.json` must be removed:
- `dev:web`, `dev:mobile`, `build:web`, `build:mobile`

### Edge Functions Review

All 6 Edge Functions (git-sync, docora-webhook, llm-proxy, question-generator, study-planner, version) are backend services that serve the Android app equally. None are web/mobile-specific. **No Edge Functions need to be removed.**

### CI/CD Jobs to Remove

| Job | What It Does | Action |
|-----|-------------|--------|
| `build-web` | Builds apps/web with Vite | Remove entirely |
| `build-mobile` | Builds apps/mobile with Vite | Remove entirely |
| `deploy-web` | SCPs web dist to /var/www/lumio | Replace with `deploy-landing` |
| `deploy-mobile` | SCPs mobile dist to /var/www/lumio-mobile | Remove entirely |

### CI/CD Jobs to Add

| Job | What It Does |
|-----|-------------|
| `build-apk` | Expo prebuild + Gradle assembleRelease + upload to GitHub Release |
| `deploy-landing` | SCP landing page to /var/www/lumio + reload nginx |

### CI/CD Jobs to Keep (unchanged)

| Job | Reason |
|-----|--------|
| `auto-release` | Still needed for versioning |
| `lint-and-typecheck` | Still needed; but `pnpm -r typecheck` will skip web/mobile naturally since they won't exist |
| `deploy-migrations` | Still needed for Supabase |
| `deploy-functions` | Still needed for Edge Functions |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `actions/create-release` + `actions/upload-release-asset` (two separate actions) | `softprops/action-gh-release@v2` (single action) | 2024 | Simpler, handles both create and upload |
| `actions/upload-artifact` for APK | GitHub Releases for APK distribution | -- | Releases provide permanent, versioned download URLs |
| EAS Build for CI APK | Local Gradle in GitHub Actions | -- | No EAS account needed, full control, faster for simple projects |

**Deprecated/outdated:**
- `actions/create-release` (archived by GitHub, no longer maintained)
- `actions/upload-release-asset` (archived, superseded by softprops)

## Open Questions

1. **Keystore generation -- who does it?**
   - What we know: A release keystore must be generated and its base64 encoding stored as a GitHub Secret.
   - What's unclear: Should the planner include the `keytool` command as a task, or is this a manual step the developer does before CI runs?
   - Recommendation: Include it as a documented manual prerequisite step in the plan, with exact commands. The planner should create a task for updating build.gradle to read the release keystore, but the actual keytool generation and secret upload should be marked as a manual developer action.

2. **Purple/amber palette vs actual app theme**
   - What we know: The CONTEXT.md says "purple/amber palette" for the landing page. The actual app theme uses blue primary (`#3B82F6`) and standard grays.
   - What's unclear: Whether the user wants the actual app theme colors or a different purple/amber scheme for the landing page.
   - Recommendation: The planner should use the colors mentioned in CONTEXT.md (purple/amber). The user explicitly decided this. The landing page can have its own marketing palette distinct from the app's UI theme.

3. **Screenshots -- where do they come from?**
   - What we know: Real screenshots from the actual app are required.
   - What's unclear: Whether screenshots should be captured as part of this phase or provided by the developer.
   - Recommendation: Include a task for the developer to capture screenshots and place them in `apps/landing/screenshots/`. The planner should define the expected filenames and dimensions.

4. **EXPO_PUBLIC_SUPABASE_URL for release builds**
   - What we know: The Android app reads Supabase URL from `EXPO_PUBLIC_SUPABASE_URL` env var in `.env.local`. For production APKs, this needs to point to the production Supabase instance.
   - What's unclear: Whether this is already handled by the existing build process or needs explicit CI env vars.
   - Recommendation: The CI job should set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from existing secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). Also `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` may need to be set.

5. **Server cleanup of /var/www/lumio-mobile**
   - What we know: The current CI deploys mobile PWA to `/var/www/lumio-mobile`.
   - What's unclear: Whether this directory should be cleaned up on the server and whether there's a separate nginx config for it.
   - Recommendation: Include a task to remove `/var/www/lumio-mobile` on the server and remove any mobile-specific nginx config if it exists.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `apps/android/android/app/build.gradle` -- signing config, build types, version code
- Codebase analysis: `.github/workflows/ci-deploy.yml` -- full existing CI/CD pipeline
- Codebase analysis: `packages/core/src/index.ts`, `packages/shared/src/index.ts` -- package exports and dependencies
- Context7 `/llmstxt/expo_dev_llms_txt` -- Expo prebuild, local builds, Gradle commands, JDK requirements
- [GitHub Docs: Linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases) -- `/releases/latest/download/` URL pattern
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release) -- GitHub Release action docs

### Secondary (MEDIUM confidence)
- [React Native CI/CD using GitHub Actions](https://blog.logrocket.com/react-native-ci-cd-using-github-actions/) -- workflow patterns
- [Securely Create Android Release using Github Actions](https://www.droidcon.com/2023/04/04/securely-create-android-release-using-github-actions/) -- keystore base64 encoding pattern
- [How to store Android Keystore safely on GitHub Actions](https://stefma.medium.com/how-to-store-a-android-keystore-safely-on-github-actions-f0cef9413784) -- secret storage pattern
- [Expo SDK 54 changelog](https://expo.dev/changelog/sdk-54) -- SDK 54 + RN 0.81 requirements
- [React Native Environment Setup](https://reactnative.dev/docs/set-up-your-environment) -- JDK 17 recommendation

### Tertiary (LOW confidence)
- None -- all findings verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools are well-documented, existing CI patterns can be extended
- Architecture: HIGH -- codebase fully analyzed, patterns are straightforward
- Pitfalls: HIGH -- based on direct codebase analysis and verified documentation
- Cleanup impact: HIGH -- every import, script, and CI job traced in the codebase

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable domain, no fast-moving dependencies)
