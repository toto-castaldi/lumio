# Project Research Summary

**Project:** Lumio Native Android App
**Domain:** React Native mobile application (PWA-to-native migration)
**Researched:** 2026-01-29
**Confidence:** HIGH

## Executive Summary

Lumio's migration from PWA to native Android is a well-trodden path with established patterns. The recommended approach uses **Expo SDK 54** with the New Architecture, providing managed workflows that eliminate native toolchain complexity while supporting all required features: Google OAuth, Supabase integration, markdown/LaTeX rendering, and direct APK distribution via EAS Build.

The core challenge is not technical feasibility—all required components exist and integrate well—but rather avoiding common PWA-to-native migration pitfalls. The most critical risks are: (1) performance degradation from web-style patterns (ScrollView instead of FlatList, inline markdown rendering), (2) OAuth deep linking failures on Android 13+ requiring precise manifest configuration, and (3) Supabase client incompatibilities requiring React Native polyfills. All are preventable with upfront architectural decisions.

The research reveals a clear path to feature parity plus native enhancements within 5-6 weeks of focused development. The existing `@lumio/core` package provides 100% reusable business logic, making this primarily a UI reimplementation with native performance optimizations rather than a ground-up rebuild.

## Key Findings

### Recommended Stack

Expo SDK 54 with New Architecture provides the optimal balance of developer experience and native quality. Use **Expo Router** for file-based navigation (matching Next.js conventions), **NativeWind 4** for Tailwind CSS compatibility with existing design system, and **TanStack Query + Zustand** (same as PWA) for state management. This maintains familiar patterns while leveraging true native components.

**Core technologies:**
- **Expo SDK 54** (React Native 0.81, React 19.1) — Managed workflow eliminates Android SDK maintenance, EAS Build handles APK distribution without local toolchains
- **Expo Router 4.x** — File-based routing with automatic deep linking, same developer experience as Next.js in existing web app
- **NativeWind 4** — Tailwind CSS for React Native, enables design system reuse across web/PWA/native without CSS-in-JS learning curve
- **TanStack Query 5 + Zustand 5** — Same state management as PWA, 80% less boilerplate than manual caching solutions
- **react-native-markdown-display** — Native markdown rendering (not WebView), 100% CommonMark compatible with custom renderer support
- **@react-native-google-signin/google-signin** — Official Google OAuth for React Native, works with Supabase auth via idToken flow
- **EAS Build** — Cloud-based APK generation, handles signing and distribution without managing keystore locally

**Critical version requirements:**
- Tailwind CSS must be 3.4.x (NativeWind 4 incompatible with Tailwind 4)
- @react-native-google-signin 16.x requires compileSdkVersion 35+ on Android

### Expected Features

Native Android users expect feature parity with the existing PWA plus mobile-specific enhancements. The research identifies 9 table-stakes features that must exist for launch, 8 differentiators that provide competitive advantage, and 10 anti-features to explicitly avoid despite user requests.

**Must have (table stakes):**
- Smooth study session UX with swipe gestures (Tinder-style card interactions now standard)
- Dark mode (79% of students prefer it, reduces eye strain during night study)
- Push notifications for study reminders (drives retention)
- Offline capability for basic study (students use apps in transit without reliable internet)
- Fast app launch (< 3 second cold start expected on native)
- Native gestures and haptic feedback (premium mobile feel)
- Bottom navigation (thumb-friendly zone, Material Design 3 pattern)
- Progress visualization (daily/weekly stats, mastery tracking)
- Markdown rendering with LaTeX support (existing card content format)

**Should have (competitive):**
- Home screen widget (study directly from home screen, passive learning trigger)
- Study streak tracking (40-60% higher DAU according to research, loss aversion mechanism)
- Goal-based study with deadline tracking (existing PWA feature users expect)
- Quick session mode (5-minute micro-sessions, perfect for native instant launch)
- Background sync (repos sync while app closed via WorkManager)
- Biometric app lock (fingerprint/face unlock for study data privacy)

**Defer (v2+):**
- Voice input for answers (hands-free study, complex integration, niche use case)
- Focus timer integration (Pomodoro built-in, not core to Lumio value proposition)
- Confidence-based rating (Brainscape-style 1-5 scale, requires SM-2 algorithm changes)

**Anti-features (explicitly avoid):**
- In-app card creation (violates Git-based content model, requires maintaining editor)
- Social/community decks (Quizlet's quality control nightmare, not Lumio's value)
- Extensive gamification (shifts focus from learning to game, Duolingo critique applies)
- Multiple simultaneous goals (cognitive overload, focus on single active goal)
- Custom spaced repetition algorithms (Anki's complexity is a barrier, "just work" approach)

### Architecture Approach

Follow React Native community best practices: **file-based routing** with Expo Router, **server state in TanStack Query**, **client state in Zustand**, and **business logic in @lumio/core** shared package. The monorepo structure enables 100% code reuse for Supabase client, auth flows, and data fetching—only UI components need native reimplementation.

**Major components:**
1. **Screens (app/ directory)** — UI layer using React Native primitives (View, Text, FlatList), navigated via file-based routing with automatic deep linking
2. **State Layer (hooks + stores)** — TanStack Query for server state (repositories, cards, stats), Zustand for client state (current card index, theme preference)
3. **API Layer (@lumio/core)** — Shared package with Supabase client, auth methods (signInWithGoogle, signOut), data fetching (getUserRepositories, getStudyCards), and quiz generation/validation
4. **Native Integration** — expo-secure-store for encrypted token storage, @react-native-google-signin for OAuth, AsyncStorage adapter for Supabase session persistence
5. **Markdown Renderer** — react-native-markdown-display with custom rules for LaTeX (react-native-math-view) and code blocks (react-native-syntax-highlighter)

**Critical architectural decisions:**
- Use FlatList (not ScrollView) for card lists from the start—performance disaster otherwise
- Never render full markdown in list items—show preview text only, render on card open
- Configure Supabase client with `detectSessionInUrl: false` (required for React Native)
- Install react-native-url-polyfill at entry point (Supabase client assumes browser APIs)
- Implement proper Android back button handling at every screen (users feel trapped without it)

### Critical Pitfalls

1. **Using web primitives instead of native components** — Web developers instinctively use div/span/CSS patterns. React Native has no DOM—components render to native views. Using web patterns creates apps that feel sluggish and miss platform conventions. **Prevention:** Learn View/Text/FlatList immediately, use StyleSheet.create not inline styles, never render text outside `<Text>` component.

2. **FlatList performance disaster on large card lists** — Using ScrollView or misconfiguring FlatList causes severe lag on low-end Android devices. Without `getItemLayout`, `keyExtractor`, and proper memoization, every scroll triggers expensive re-renders. **Prevention:** Always use FlatList for lists > 10 items, implement `getItemLayout` for fixed heights, use React.memo on list items, never use inline functions in `renderItem`, optimize images to max 720p.

3. **Supabase client configuration incompatibilities** — Supabase JavaScript client assumes browser APIs (localStorage, URL, WebSocket) that don't exist in React Native. App crashes on startup or auth flows silently fail. **Prevention:** Install react-native-url-polyfill first, use AsyncStorage for session storage, set `detectSessionInUrl: false` in client config, use expo-secure-store for sensitive tokens.

4. **Google OAuth deep linking failures on Android** — OAuth redirect after Google sign-in doesn't return to app. User completes auth then gets stuck in browser. Android 13+ has stricter deep link verification. **Prevention:** Configure AndroidManifest with `launchMode="singleTask"`, add intent-filters for scheme and Universal Links, set up assetlinks.json with SHA-256 fingerprint, test both cold-start and warm-start scenarios.

5. **Markdown rendering performance with complex content** — Rendering markdown with code blocks, LaTeX, and images causes severe UI lag. Quiz transitions feel sluggish. Entire UI freezes on complex cards. **Prevention:** Don't render markdown in list items (show preview only), use react-native-markdown-display (native, not WebView), use react-native-math-view for LaTeX (native SVG rendering), memoize all rendered markdown, provide explicit image dimensions to prevent layout thrash.

6. **APK distribution and update management** — Unlike Play Store apps, sideloaded APKs have no built-in update mechanism. Users stuck on old buggy versions with no notification of updates. Google tightening sideloading restrictions in Brazil, Indonesia, Singapore, Thailand starting September 2026. **Prevention:** Implement in-app update checking with react-native-update-apk, host version.json on server, use CodePush for JS-only hotfixes, establish clear versioning strategy, monitor Google's policy changes with Play Store contingency plan.

## Implications for Roadmap

Based on research, suggested 5-phase structure organized by dependency order and risk mitigation:

### Phase 1: Foundation & Infrastructure (Week 1)
**Rationale:** Must establish core infrastructure before any feature work. Supabase client configuration mistakes caught here prevent cascading failures in later phases. Expo project setup with NativeWind and monorepo integration unblocks all UI development.

**Delivers:** Working Expo SDK 54 project integrated into monorepo, NativeWind configured, Supabase client initialized with AsyncStorage adapter and react-native-url-polyfill, @lumio/core verified compatible with React Native, TanStack Query and Zustand providers ready, file-based routing structure established.

**Addresses:** Pitfall 3 (Supabase incompatibilities), Pitfall 1 (web primitives—establish conventions early)

**Research flags:** Standard Expo setup, well-documented patterns. Skip research-phase.

### Phase 2: Authentication & Navigation (Week 2)
**Rationale:** Auth is foundation for all protected features. OAuth deep linking is highest technical risk—must validate on physical devices with cold-start testing before building dependent features. Getting this working unblocks repository management and study flows.

**Delivers:** Google OAuth login via @react-native-google-signin, Expo Router protected routes with auth layout wrapper, OAuth callback handling for both warm and cold start scenarios, AndroidManifest and assetlinks.json properly configured, auth state persistence in expo-secure-store, session management via AuthProvider context.

**Addresses:** Pitfall 4 (OAuth deep linking failures), Table stakes: authentication persistence

**Research flags:** OAuth deep linking on Android 13+ is complex. Consider research-phase if team lacks Android deep linking experience.

### Phase 3: Repository & Card Management (Week 2-3)
**Rationale:** Repository management required before study features. Card list performance issues must be prevented upfront—FlatList optimization from the start cheaper than refactoring later. Markdown rendering strategy (preview in list, full render on open) established here.

**Delivers:** Repository list screen with add/remove functionality, Card list with FlatList performance optimization (getItemLayout, keyExtractor, memoization), Card preview with markdown/LaTeX rendering via react-native-markdown-display and react-native-math-view, Pull-to-refresh for repo sync, Bottom navigation structure.

**Addresses:** Pitfall 2 (FlatList performance), Pitfall 5 (markdown rendering), Table stakes: repository management, markdown rendering

**Research flags:** Markdown rendering with LaTeX is medium confidence area. May need research-phase for react-native-math-view integration patterns if complex formulas common in cards.

### Phase 4: Study Flow & Quiz (Week 3-4)
**Rationale:** Core value proposition—AI-generated quiz based on cards. Depends on card rendering from Phase 3. Swipe gestures and haptic feedback establish "native feel" that differentiates from PWA. Progress tracking enables retention metrics.

**Delivers:** Study session screen with swipe gesture controls (Tinder-style), Quiz question generation via existing Edge Functions, Answer validation and SM-2 algorithm integration, Haptic feedback on card flip and answer submission, Progress visualization (daily/weekly stats, mastery tracking), Question voting (like/dislike) UI, Dark mode support.

**Addresses:** Table stakes: smooth study UX, swipe gestures, dark mode, progress visualization, question voting. Differentiator: native gestures with haptic feedback.

**Research flags:** Standard React Native patterns. Skip research-phase.

### Phase 5: Native Enhancements & Distribution (Week 4-5)
**Rationale:** Native-specific features that leverage platform capabilities beyond PWA. Push notifications drive retention. APK distribution strategy must include update mechanism to avoid version fragmentation. Widget is high-value but non-blocking for launch.

**Delivers:** Push notifications for study reminders (configurable, not aggressive), EAS Build configuration for APK generation (preview and production profiles), In-app update checking with react-native-update-apk, Version.json hosting infrastructure, Study streak tracking, Optional: Home screen widget (show daily card, streak, quick-study button).

**Addresses:** Pitfall 6 (APK distribution), Table stakes: push notifications, fast app launch. Differentiators: study streak, home screen widget.

**Research flags:** EAS Build setup well-documented. Widget implementation may benefit from research-phase if pursuing in v1.

### Phase Ordering Rationale

- **Phase 1 must come first:** Supabase client misconfiguration blocks all features. NativeWind setup enables UI development. Monorepo integration allows @lumio/core reuse.
- **Phase 2 before 3-4:** Auth required for protected routes. OAuth deep linking most complex—validate early before building dependent features.
- **Phase 3 before 4:** Study flow needs card rendering. FlatList performance optimization in Phase 3 prevents rework when quiz adds card transitions.
- **Phase 5 last:** Native enhancements are "polish" features. Push notifications and update mechanism important but non-blocking for core functionality validation.

**Architecture-driven groupings:**
- Phase 1: Infrastructure layer (providers, client setup)
- Phase 2: Auth & navigation layer
- Phase 3-4: Feature layer (core product functionality)
- Phase 5: Platform layer (native capabilities)

**Pitfall avoidance built into ordering:**
- Supabase client config issues caught in Phase 1 (before auth work)
- OAuth deep linking validated in Phase 2 (before building features that need auth)
- FlatList optimization enforced in Phase 3 (before study flow multiplies render complexity)
- Markdown performance strategy established in Phase 3 (before quiz intensive rendering)

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (Authentication):** If team lacks Android deep linking experience, run research-phase on OAuth callback handling, assetlinks.json configuration, and Android 13+ deep link verification. Medium confidence area in pitfalls research.
- **Phase 3 (Card Management):** If cards contain complex LaTeX formulas, run research-phase on react-native-math-view vs @caporeista/reactnative-math-latex (WebView fallback). Markdown rendering flagged as medium confidence.
- **Phase 5 (Widget):** If pursuing home screen widget in v1, run research-phase on Expo widget configuration and update limitations. Not extensively covered in research.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Expo SDK 54 setup well-documented in official docs, high confidence
- **Phase 4 (Study Flow):** React Native gesture handling and animations established patterns, high confidence

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified with Expo SDK 54 official docs, NativeWind 4 documentation, and package repositories. Version compatibility matrix confirmed. |
| Features | MEDIUM | Feature expectations based on multiple WebSearch sources (competitor analysis, UX patterns). Anti-features list is opinionated but well-reasoned from Lumio's PRD. |
| Architecture | HIGH | React Native community best practices verified with official Expo Router docs, TanStack Query integration patterns, and Supabase React Native quickstart guide. @lumio/core reusability confirmed from existing monorepo structure. |
| Pitfalls | MEDIUM | Pitfalls sourced from practitioner blog posts and community experiences, verified where possible with official docs. OAuth deep linking and FlatList performance are well-documented pain points. Markdown rendering performance is medium confidence based on library comparisons. |

**Overall confidence:** HIGH

The recommended stack (Expo SDK 54, Expo Router, NativeWind, TanStack Query + Zustand) is well-established with official documentation and large community adoption. The main architectural decisions (file-based routing, TanStack Query for server state, @lumio/core reuse) are standard React Native patterns. The critical pitfalls (Supabase client config, OAuth deep linking, FlatList performance) are known issues with documented solutions.

### Gaps to Address

**LaTeX rendering quality:** Medium confidence on react-native-math-view vs WebView-based solutions. Research recommends react-native-math-view for performance (native SVG rendering) but flags @caporeista/reactnative-math-latex (KaTeX via WebView) as fallback for complex formulas. **Mitigation:** Prototype both approaches in Phase 3 with real Lumio card content. If react-native-math-view has rendering issues, accept WebView performance hit and use React.memo to minimize re-renders.

**Widget implementation scope:** Research mentions home screen widgets as differentiator but doesn't detail Expo widget API limitations or update frequency constraints. **Mitigation:** If pursuing widget in v1, run focused research-phase on Expo widget configuration before Phase 5. Otherwise defer to v1.x.

**Google sideloading policy impact:** Research flags September 2026 restrictions in Brazil, Indonesia, Singapore, Thailand but unclear if affects all sideloading or specific use cases. **Mitigation:** Monitor Google's policy announcements. Have Play Store contingency plan ready (EAS Submit already configured in Phase 5). User base geography will inform urgency.

**Offline mode implementation:** Research identifies offline capability as table stakes but doesn't specify TanStack Query persistence patterns or sync queue architecture. **Mitigation:** Phase 1 sets up TanStack Query with default caching (covers basic offline reads). Full offline mode with sync queue can be v1.1 feature after validating usage patterns. Prioritize if user research shows connectivity issues.

## Sources

### Primary (HIGH confidence)
- [Expo SDK 54 Reference](https://docs.expo.dev/versions/latest/) — SDK version, React Native compatibility, New Architecture adoption
- [Expo Router Introduction](https://docs.expo.dev/router/introduction/) — File-based routing, deep linking patterns
- [Supabase React Native Quickstart](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth) — Google OAuth integration, AsyncStorage configuration
- [EAS Build APK Guide](https://docs.expo.dev/build-reference/apk/) — APK generation, distribution setup
- [React Navigation 7 Documentation](https://reactnavigation.org/docs/getting-started/) — Navigation patterns (Expo Router built on this)
- [NativeWind Installation](https://www.nativewind.dev/docs/getting-started/installation) — Tailwind CSS for React Native setup
- [Material Design 3 Gestures](https://m3.material.io/foundations/interaction/gestures) — Android gesture patterns, haptics principles
- [React Native Performance](https://reactnative.dev/docs/performance) — FlatList optimization, native driver animations

### Secondary (MEDIUM confidence)
- [React State Management 2025](https://www.developerway.com/posts/react-state-management-2025) — TanStack Query + Zustand patterns
- [React Native Wrapped 2025](https://www.callstack.com/blog/react-native-wrapped-2025-a-month-by-month-recap-of-the-year) — Ecosystem trends, New Architecture adoption
- [Expo vs Bare React Native 2025](https://www.godeltech.com/blog/expo-vs-bare-react-native-in-2025/) — Framework comparison
- [React Native Deep Linking That Actually Works](https://medium.com/@nikhithsomasani/react-native-deep-linking-that-actually-works-universal-links-cold-starts-oauth-aced7bffaa56) — OAuth callback patterns, assetlinks.json
- [FlatList Performance Optimization](https://www.obytes.com/blog/a-guide-to-optimizing-flatlists-in-react-native) — getItemLayout, memoization patterns
- [7 React Native Mistakes Slowing Your App in 2026](https://medium.com/@baheer224/7-react-native-mistakes-slowing-your-app-in-2026-19702572796a) — Common pitfalls
- [Supabase with React Native Integration Issues](https://medium.com/@kelvinpompey.me/things-to-look-out-for-using-supabase-with-react-native-9638b23e98c2) — Polyfill requirements, configuration
- [Quizlet vs Anki Comparison](https://www.aitooldiscovery.com/guides/quizlet-vs-anki) — Competitor feature analysis
- [Streaks for Gamification](https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps) — Retention mechanics (40-60% DAU increase)
- [Google Sideloading Policy 2026](https://www.medianama.com/2025/08/223-google-blocks-android-apk-sideloading-2026/) — Distribution restrictions

### Tertiary (LOW confidence)
- react-native-markdown-display npm package — Library features, needs validation with real content
- react-native-math-view GitHub — Native LaTeX rendering, needs complex formula testing
- Various practitioner blogs on React Native migration patterns — Anecdotal pitfalls, valuable but not verified

---
*Research completed: 2026-01-29*
*Ready for roadmap: yes*
