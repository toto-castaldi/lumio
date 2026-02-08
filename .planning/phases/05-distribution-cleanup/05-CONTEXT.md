# Phase 5: Distribution & Cleanup - Context

**Gathered:** 2026-02-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a distributable APK via CI, create a bilingual landing page at lumio.toto-castaldi.com for APK download, and remove legacy PWA code (apps/web, apps/mobile) with full CI/CD cleanup.

</domain>

<decisions>
## Implementation Decisions

### Landing page design
- Inherit branding from the Android app's theme (purple/amber palette)
- Include real screenshots from the actual app
- Bilingual: both English and Italian (language toggle or dual sections)
- Claude's discretion on layout style and structure (single-section vs multi-section)

### APK build
- Local Gradle build running in GitHub Actions (not EAS Build)
- Auto-trigger on push to main — every merge produces a new APK
- Built APK stored as GitHub Releases asset
- Landing page download link points to latest GitHub Release
- Keystore status uncertain — plan should include keystore generation/setup as needed

### Cleanup scope
- Remove apps/web and apps/mobile directories
- packages/core and packages/shared unification: Claude's discretion based on current usage analysis
- Clean up CI/CD pipeline: remove web/mobile deploy jobs, add APK build job
- Review Edge Functions for web/mobile-specific ones and remove if found
- lumio.toto-castaldi.com nginx config switches from serving web app to serving the landing page

### Landing page hosting
- Lives inside monorepo as apps/landing (or similar)
- Claude's discretion on build tooling (plain static HTML vs Vite)
- Deployed via GitHub Actions + SCP/rsync to server
- SSH keys and server details already configured in GitHub Secrets

</decisions>

<specifics>
## Specific Ideas

- Landing page replaces the current web app at lumio.toto-castaldi.com — same domain, new content
- APK download should feel seamless — user lands on page, sees what Lumio is, downloads APK
- Screenshots should show the actual study flow (dashboard, quiz, card rendering)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-distribution-cleanup*
*Context gathered: 2026-02-08*
