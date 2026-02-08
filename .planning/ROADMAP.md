# Roadmap: Lumio Native

## Overview

Migration from dual PWA apps to a single native Android application. The journey progresses from foundation setup (Expo, Supabase client, NativeWind) through authentication and navigation, then builds out core screens (dashboard, repository management), implements the study flow with card rendering, and concludes with APK distribution plus legacy code cleanup. Backend remains unchanged throughout.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Expo SDK 54 project with Supabase client and NativeWind
- [x] **Phase 2: Auth & Navigation** - Google OAuth and protected routes with tab navigation
- [x] **Phase 3: Core Screens** - Dashboard statistics and repository management
- [x] **Phase 4: Study & Cards** - Quiz flow with markdown/LaTeX rendering
- [x] **Phase 5: Distribution & Cleanup** - APK build, landing page, legacy removal

## Phase Details

### Phase 1: Foundation
**Goal**: Working Expo project integrated into monorepo with Supabase client and styling infrastructure ready
**Depends on**: Nothing (first phase)
**Requirements**: APP-01, APP-02, APP-03, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. App launches on Android emulator/device without crashes
  2. Supabase client connects and can query the database
  3. NativeWind styles render correctly (Tailwind classes work)
  4. Decision made on @lumio/core reuse vs unification
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Create Expo project with dependencies and NativeWind build tooling
- [ ] 01-02-PLAN.md — Implement LargeSecureStore and Supabase integration
- [ ] 01-03-PLAN.md — Create navigation structure and verify all success criteria

### Phase 2: Auth & Navigation
**Goal**: Users can log in with Google and navigate between tabs
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, APP-04
**Success Criteria** (what must be TRUE):
  1. User can tap "Sign in with Google" and complete OAuth flow
  2. User session persists after closing and reopening the app
  3. User can log out and return to login screen
  4. Bottom tab navigation shows Dashboard, Repository, Settings tabs
  5. OAuth callback works on both cold start and warm start scenarios
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md — Install dependencies, configure Expo plugin, migrate Supabase to SecureStore
- [ ] 02-02-PLAN.md — Create AuthContext with Google Sign-In integration and OfflineBanner
- [x] 02-03-PLAN.md — Create navigation structure (AppNavigator, AuthNavigator, MainNavigator) with Study button
- [ ] 02-04-PLAN.md — Create screen components (LoginScreen, SettingsScreen with logout, placeholders)

### Phase 3: Core Screens
**Goal**: Users can view their statistics and manage repositories
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, REPO-01, REPO-02, REPO-03, REPO-04, REPO-05
**Success Criteria** (what must be TRUE):
  1. Dashboard shows repository count and total card count
  2. Study button is visible and disabled when no cards exist
  3. App respects system dark mode setting
  4. User can see list of their repositories with private indicator
  5. User can add a public repository via URL
  6. User can add a private repository with PAT
  7. User can remove a repository after confirmation dialog
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — Install dependencies, @lumio/core integration, theme system, App.tsx root setup
- [x] 03-02-PLAN.md — Dashboard screen with stat cards, study CTA, pull-to-refresh
- [x] 03-03-PLAN.md — Repository screen with list, add form, swipe-to-delete, toast notifications
- [x] 03-04-PLAN.md — Settings dark mode toggle, apply theme to LoginScreen and OfflineBanner

### Phase 4: Study & Cards
**Goal**: Users can study with pre-generated quiz questions and view card content
**Depends on**: Phase 3
**Requirements**: STUD-01, STUD-02, STUD-03, STUD-04, STUD-05, STUD-06, STUD-07, STUD-08, CARD-01, CARD-02, CARD-03, CARD-04, CARD-05
**Success Criteria** (what must be TRUE):
  1. User can start a study session from dashboard
  2. Quiz shows 4 answer options with immediate feedback (correct/incorrect)
  3. User sees explanation after answering
  4. User can vote on question quality (like/dislike)
  5. User can skip cards during study
  6. Prev/Next buttons navigate between cards (swipe replaced due to ScrollView conflict)
  7. Haptic feedback triggers on answer (correct/incorrect)
  8. Progress bar shows session completion status
  9. Card content renders markdown (headings, lists, bold, italic, links)
  10. Code blocks have syntax highlighting
  11. LaTeX formulas render inline and block
  12. Images from Supabase display correctly
  13. Long content scrolls properly
**Plans**: 4 plans

Plans:
- [x] 04-01-PLAN.md — Install deps, restructure navigation (RootStack), create useStudySession hook and StudyScreen skeleton
- [x] 04-02-PLAN.md — Quiz interaction UI (QuizCard, AnswerOption, ExplanationPanel, haptics, swipe, skip, progress, quit confirmation)
- [x] 04-03-PLAN.md — Card content WebView renderer (markdown, LaTeX, code highlighting, images)
- [x] 04-04-PLAN.md — StudySummaryScreen, complete flow wiring, native rebuild, device verification

### Phase 5: Distribution & Cleanup
**Goal**: APK available for download and legacy PWA code removed
**Depends on**: Phase 4
**Requirements**: DIST-01, DIST-02, DIST-03, DIST-04, CLEAN-01, CLEAN-02
**Success Criteria** (what must be TRUE):
  1. APK builds successfully via local Gradle build in GitHub Actions
  2. Landing page is live at lumio.toto-castaldi.com
  3. APK download link works from landing page
  4. Landing page shows product description and screenshots
  5. apps/web directory is removed from codebase
  6. apps/mobile (PWA) directory is removed from codebase
**Plans**: 4 plans

Plans:
- [x] 05-01-PLAN.md — Release signing config, dynamic versioning, keystore setup
- [x] 05-02-PLAN.md — Bilingual landing page with purple/amber branding and nginx config
- [x] 05-03-PLAN.md — CI/CD overhaul: build-apk + deploy-landing, remove web/mobile jobs
- [x] 05-04-PLAN.md — Remove apps/web and apps/mobile, clean up root package.json

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | ✅ Complete | 2026-02-04 |
| 2. Auth & Navigation | 4/4 | ✅ Complete | 2026-02-04 |
| 3. Core Screens | 4/4 | ✅ Complete | 2026-02-07 |
| 4. Study & Cards | 4/4 | ✅ Complete | 2026-02-08 |
| 5. Distribution & Cleanup | 4/4 | ✅ Complete | 2026-02-08 |

---
*Roadmap created: 2026-01-29*
*Phase 1 planned: 2026-02-03*
*Phase 4 planned: 2026-02-08*
*Phase 5 planned: 2026-02-08*
