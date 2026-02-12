# Milestones: Lumio

## v1.1 Lumio Native (Shipped: 2026-02-08)

**Delivered:** Complete migration from dual PWA apps to a single native Android application with landing page and CI/CD pipeline.

**Phases completed:** 1-5 (20 plans total)

**Key accomplishments:**

- Native Android app with Expo SDK 54, Google OAuth, and SecureStore for encrypted auth tokens
- Dashboard with study statistics, repository management with PAT support, and system-aware dark mode
- Quiz study flow with 4-option multiple choice, haptic feedback, card preview with markdown/LaTeX/code rendering
- Bilingual landing page with APK download, CI/CD pipeline for automated release builds
- Legacy PWA apps removed (11,826 lines of dead code cleaned up)

**Stats:**

- 234 files changed (+24,569 / -11,384 lines)
- 5,019 lines of TypeScript/JS (4,538 Android app + 481 landing page)
- 5 phases, 20 plans, 33 requirements
- 11 days from 2026-01-29 to 2026-02-08

**Git range:** `v1.0.1` → `v1.1.3` (28 feat + 6 fix commits)

**What's next:** v2 enhancements — push notifications, offline mode, Google Play Store distribution

---

## v1.2 Polish & UX (Shipped: 2026-02-09)

**Delivered:** Polished user experience with native card rendering, brand identity, configurable study sessions, and full IT/EN internationalization.

**Phases completed:** 6-9 (9 plans total)

**Key accomplishments:**

- Native card preview with markdown, syntax highlighting, and KaTeX math (replaced WebView)
- Lumio logo integrated across Login screen, Dashboard header, and landing page
- Configurable cards-per-session (10/20/50/All) with persistent settings and progress tracking
- Full IT/EN internationalization with ~85 translated strings and reactive language toggle
- Dynamic version display from @lumio/shared with tap-to-copy in Settings

**Stats:**

- 65 files changed (+7,052 / -251 lines)
- 5,960 lines of code (5,506 Android app + 454 landing page)
- 4 phases, 9 plans, 12 requirements
- 1 day (2026-02-09)

**Git range:** `v1.1` → `docs(phase-09)` (14 feat commits)

**What's next:** v1.3 enhancements

---


## v1.3 Bugfix & UX Polish (Shipped: 2026-02-10)

**Delivered:** Fixed branding inconsistencies, simplified study experience, and corrected data display bugs across the app.

**Phases completed:** 10-12 (4 plans total)

**Key accomplishments:**

- Replaced default Expo icons with Lumio tri-color pie logo on launcher, adaptive icon, and splash screen
- Added "Lumio" brand text on Login screen and Dashboard header with theme-adaptive styling
- Simplified study flow: forward-only navigation, removed toast/prev/review/quit confirmation (-130 LOC)
- Fixed Android navbar overlap with safe area bottom insets on study screens
- Fixed dashboard "last studied" display with AsyncStorage persistence (replaces broken DB query)
- Fixed repository visibility icons: globe for public repos, lock for private

**Stats:**

- 22 files changed (+1,189 / -196 lines)
- 3 phases, 4 plans, 7 tasks
- 1 day (2026-02-10)

**Git range:** `v1.2` → `test(phase-12)` (5 feat + 2 fix commits)

**What's next:** TBD

---


## v1.4 Card Browse & Stats (Shipped: 2026-02-11)

**Delivered:** Card browsing within repositories, study session persistence with history viewing, and UX fixes for navbar overlap and settings styling.

**Phases completed:** 13-15 (4 plans total)

**Key accomplishments:**

- Fixed card preview navbar overlap with safe area bottom padding on Android
- Added ACCOUNT section with Google profile avatar to Settings screen
- Card browse: tap repo → scrollable card list → full card detail (markdown, code, LaTeX, images)
- Study session persistence with immutable study_sessions table and RLS policies
- Study history screen with score color-coding, pull-to-refresh, and tappable dashboard navigation

**Stats:**

- 33 files changed (+3,298 / -44 lines)
- 3 phases, 4 plans, 9 tasks
- 1 day (2026-02-11)

**Git range:** `v1.3` → `docs(phase-15)` (5 feat + 1 fix commits)

**What's next:** TBD

---


## v1.5 Study UX Fixes (Shipped: 2026-02-12)

**Delivered:** Fixed study screen layout waste and dark mode readability issues for a comfortable study experience in both themes.

**Phases completed:** 16 (1 plan total)

**Key accomplishments:**
- Next-card button pinned to screen bottom with absolute positioning — no wasted vertical space
- Dark mode contrast fixes: emerald-900/red-900 backgrounds for answer options (correct/incorrect)
- Dark mode-aware explanation panel backgrounds and borders for proper readability

**Stats:**
- 8 files changed (+203 / -21 lines)
- 1 phase, 1 plan, 2 tasks
- 1 day (2026-02-12)

**Git range:** `v1.4` → `c64e7c6` (2 fix commits + 1 docs commit)

**What's next:** TBD

---

