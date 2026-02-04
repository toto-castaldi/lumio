# Pitfalls Research

**Domain:** React Native Android development (PWA-to-native migration)
**Researched:** 2026-01-29
**Confidence:** MEDIUM (WebSearch findings verified with official docs where possible)

---

## Critical Pitfalls

### Pitfall 1: Using Web Primitives Instead of Native Components

**What goes wrong:**
Web developers instinctively reach for `<div>`, `<span>`, CSS flexbox tricks, and DOM-based patterns. In React Native, there is no DOM — components render to native views. Using web patterns results in apps that feel sluggish, look wrong, and miss platform conventions.

**Why it happens:**
React web experience creates muscle memory. The JSX looks similar, so developers assume web patterns transfer directly. They don't realize that `<View>` is not a `<div>` and `<Text>` is not a `<span>`.

**How to avoid:**
- Learn the core RN primitives immediately: `View`, `Text`, `Image`, `ScrollView`, `FlatList`, `TouchableOpacity`
- Use `StyleSheet.create()` instead of inline styles — it's not just convention, it's performance
- Never try to render text outside a `<Text>` component (crashes the app)
- Accept that styling is a subset of CSS written in JS objects, not CSS files

**Warning signs:**
- Attempting to use `className` or CSS modules
- Using string-based styles instead of `StyleSheet.create()`
- Text not rendering or app crashing on text render
- Trying to use `:hover`, `:focus`, or CSS pseudo-selectors

**Phase to address:**
Phase 1 (Project Setup) — Establish conventions immediately

---

### Pitfall 2: FlatList Performance Disaster on Large Card Lists

**What goes wrong:**
Using `ScrollView` for the card list or misconfiguring `FlatList` causes severe performance issues, especially on low-end Android devices. Symptoms include laggy scrolling, blank spaces appearing, UI freezes, and even crashes.

**Why it happens:**
Web developers are used to browser virtualization being handled automatically or via libraries. FlatList requires explicit configuration. Without `getItemLayout`, `keyExtractor`, and proper memoization, every scroll triggers expensive re-renders.

**How to avoid:**
1. **Always use `FlatList`** (or `FlashList` by Shopify for better performance) — never `ScrollView` for lists > 10 items
2. **Implement `getItemLayout`** if card heights are fixed — eliminates measurement overhead
3. **Use `React.memo()`** on list item components — prevents re-render of off-screen items
4. **Never use inline functions** in `renderItem` — creates new function every render
5. **Configure `windowSize`** (default 21 is often too high for memory-constrained devices)
6. **Optimize images** — Android struggles with HD images in lists; use thumbnails, max 720p

**Warning signs:**
- Scrolling feels janky or stuttery
- Blank white spaces appear between items while scrolling fast
- App crashes with large datasets
- High memory usage in Android profiler
- Testing only on high-end devices masks the problem

**Phase to address:**
Phase 3 (Repository and Card Management) — when building card lists

---

### Pitfall 3: Supabase Client Configuration Incompatibilities

**What goes wrong:**
Supabase's JavaScript client assumes browser APIs that don't exist in React Native: `localStorage`, `URL`, `WebSocket` streams, `location.href`. App crashes on startup or auth flows silently fail.

**Why it happens:**
The Supabase client is designed for web first. React Native is not a browser — it lacks Web APIs. The PWA version of Lumio works because PWA runs in a browser context.

**How to avoid:**
1. **Install polyfills** — `react-native-url-polyfill` is mandatory
2. **Use AsyncStorage** — replace localStorage with `@react-native-async-storage/async-storage`
3. **Disable `detectSessionInUrl`** — set to `false` in client config (RN has no URL bar)
4. **Import polyfill first** — `import 'react-native-url-polyfill/auto'` at the top of entry file
5. **Use Expo SecureStore** (if using Expo) or `expo-secure-store` for sensitive data

```typescript
// Correct Supabase client setup for React Native
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // CRITICAL for React Native
  },
});
```

**Warning signs:**
- `TypeError: URL is not a constructor`
- Auth state not persisting between app restarts
- `stream` module errors
- `location is not defined` errors

**Phase to address:**
Phase 1 (Project Setup) — core infrastructure, before any auth work

---

### Pitfall 4: Google OAuth Deep Linking Failures on Android

**What goes wrong:**
OAuth redirect after Google sign-in doesn't return to the app. User completes Google auth, then gets stuck in the browser or the redirect silently fails. The app chooser appears instead of direct app open.

**Why it happens:**
Android deep linking requires precise configuration in `AndroidManifest.xml` and `assetlinks.json`. Small mismatches between intent filters, redirect URIs in Google Cloud Console, and Supabase URL configuration break the flow. Additionally, Android 13+ has stricter deep link verification.

**How to avoid:**
1. **Configure `AndroidManifest.xml`** correctly:
   - Set `launchMode="singleTask"` on MainActivity
   - Add intent-filter for your scheme (e.g., `com.toto_castaldi.lumio://`)
   - Add intent-filter for Universal Links (your domain)

2. **Set up `assetlinks.json`** on your domain:
   - File must be at `/.well-known/assetlinks.json`
   - SHA-256 fingerprint must match your signing key
   - Use Google's validator to verify

3. **Configure Supabase URL settings**:
   - Add `com.toto_castaldi.lumio://auth/callback` as redirect URL
   - Add `https://lumio.toto-castaldi.com/auth/callback` as fallback

4. **Use Expo AuthSession** (if using Expo) — handles much of this automatically

5. **Test both scenarios**:
   - Cold start (app not running)
   - Warm start (app in background)

**Warning signs:**
- Auth works in Expo Go but fails in production build
- Browser opens for OAuth but doesn't return to app
- App chooser dialog appears instead of direct app launch
- `Linking.addEventListener` never fires

**Phase to address:**
Phase 2 (Authentication Flow) — the entire phase depends on this working

---

### Pitfall 5: Markdown Rendering Performance with Complex Content

**What goes wrong:**
Rendering markdown cards with code blocks, LaTeX formulas, and images causes severe UI lag. Quiz transitions feel sluggish. The card preview dialog is slow to open. On complex cards, the entire UI freezes.

**Why it happens:**
1. **Markdown parsing is expensive** — parsing happens on JS thread, blocking UI
2. **LaTeX rendering is very expensive** — KaTeX/MathJax computations are heavy
3. **Syntax highlighting is expensive** — Prism/Highlight.js parse entire code blocks
4. **Multiple renders compound** — list of cards each parsing markdown = disaster
5. **Images blocking render** — large images without proper sizing cause layout thrash

**How to avoid:**

1. **Don't render markdown in list items**:
   - Show only title/preview text in FlatList
   - Render full markdown only when card is opened for preview

2. **Use native-first markdown libraries**:
   - `react-native-markdown-display` (recommended by Expo docs)
   - `@docren/react-native-markdown` (lighter, MDAST-based)
   - Avoid WebView-based markdown renderers

3. **LaTeX: use native solutions**:
   - `react-native-math-view` — native rendering, no WebView
   - Avoid `react-native-webview` + KaTeX (creates heavy WebView per formula)

4. **Syntax highlighting: optimize aggressively**:
   - Use `react-native-syntax-highlighter` with async/light build
   - Import only needed languages
   - Memoize highlighted code blocks

5. **Image optimization**:
   - Use `react-native-fast-image` for caching and performance
   - Provide explicit `width`/`height` to prevent layout shifts
   - Use Supabase Storage signed URLs with size transforms

**Warning signs:**
- Visible delay when opening card preview
- Scroll performance degrades with markdown content
- App feels unresponsive during quiz transitions
- High JS thread usage in profiler

**Phase to address:**
Phase 3 (Card list) and Phase 4 (Quiz flow) — different strategies for each

---

### Pitfall 6: APK Distribution and Update Management

**What goes wrong:**
Users install the APK but have no way to know when updates are available. Users are stuck on old buggy versions. Manual distribution becomes a nightmare. Google's evolving sideloading policies may block installation entirely in certain regions starting September 2026.

**Why it happens:**
Unlike Play Store apps, sideloaded APKs have no built-in update mechanism. There's no automatic check, no notification, no seamless upgrade path. Additionally, Google is tightening sideloading restrictions in Brazil, Indonesia, Singapore, and Thailand.

**How to avoid:**

1. **Implement in-app update checking**:
   - Use `react-native-update-apk` library
   - Host version.json on your server with latest version info
   - On app start, check version and prompt user to download new APK

2. **CodePush for JS-only updates**:
   - Microsoft's CodePush can push JS bundle updates without new APK
   - Limitations: can't update native code or dependencies
   - Good for hotfixes and minor UI changes

3. **Clear versioning strategy**:
   - Version code must increment for every APK
   - Semantic versioning for user-facing version name
   - Store version in-app for comparison

4. **Distribution infrastructure**:
   - Host APKs on your own server (not Google Drive for production)
   - Use proper content-type headers for APK downloads
   - Provide clear installation instructions for users

5. **Monitor Google's sideloading policy changes**:
   - September 2026 changes may affect users in specific regions
   - Have a Play Store contingency plan ready

**Warning signs:**
- Users reporting bugs you've already fixed
- No visibility into what versions are in use
- Users unable to install APK in certain regions
- Manual tracking of who has which version

**Phase to address:**
Phase 5 (Build and Distribution) — must be architected upfront

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using Expo Go for all testing | Fast iteration, no build needed | Masks production-only bugs (OAuth, deep links) | Early prototyping only — switch to dev builds ASAP |
| Inline styles everywhere | Faster initial coding | Performance hit, unmaintainable | Never for production code |
| Single shared component for card preview | Less code | Performance bottleneck as card complexity grows | Never — optimize from start |
| Skipping `keyExtractor` on FlatList | Seems to work | Random re-renders, flickering | Never |
| Not memoizing list items | Simpler code | O(n) re-renders on any state change | Never for lists > 10 items |
| Using ScrollView for card list | Works initially | Crashes with large decks | Never |
| Hardcoding API URLs | Quick setup | Painful environment switching | Only in earliest prototype |
| Ignoring Android back button | Seems to work | App feels broken, users get stuck | Never |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth | Using `signInWithOAuth` without proper redirect handling | Configure deep links, use `signInWithIdToken` for native Google Sign-In |
| Supabase Storage | Expecting signed URLs to work like web URLs | Handle image loading with proper headers, use `react-native-fast-image` |
| Google OAuth | Testing only in Expo Go | Test with development builds — Expo Go can't handle native OAuth modules |
| Sentry | Using `@sentry/browser` | Use `@sentry/react-native` — different SDK for mobile |
| AsyncStorage | Storing large data (> 2MB) | Use SQLite or file system for large data |
| Deep Links | Testing only warm start | Test cold start (app killed) — different code path |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Rendering markdown in FlatList items | Scrolling lag | Show preview text only, render full markdown on tap | > 20 cards |
| No image caching | Slow image loading, data usage | Use `react-native-fast-image` | Any production use |
| Parsing markdown on every render | UI freezes | Memoize parsed result | Any complex markdown |
| console.log in production | JS thread bottleneck | Use `babel-plugin-transform-remove-console` | Release builds |
| JS-thread animations | Choppy transitions | Use `useNativeDriver: true` or Reanimated | Any visible animation |
| Synchronous storage operations | UI freezes on startup | Use async patterns for all storage | > 100ms startup |
| Large bundle size (Expo default) | Slow install, slow cold start | Use bare workflow or custom dev client | App size > 50MB |
| Testing only on emulator | False confidence | Test on low-end physical device | Always |

---

## Security Mistakes

Domain-specific security issues beyond general mobile security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing API keys in JS bundle | Keys extracted via APK decompilation | Keys already in Supabase backend — good! Don't regress. |
| Exposing Supabase anon key in APK | Less severe but enables API abuse | Rate limiting, RLS policies (already implemented) |
| OAuth state not validated | CSRF attacks on auth | Use state parameter in OAuth flow |
| Deep link scheme hijacking | Malicious app intercepts auth callbacks | Use Android App Links with domain verification |
| Sensitive data in AsyncStorage | Data accessible if device compromised | Use `expo-secure-store` for tokens |
| Not pinning SSL certificates | MITM attacks | Enable certificate pinning in production (Phase 2+) |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Ignoring Android back button | Users feel trapped, force-close app | Implement proper back navigation at every screen |
| Web-style loading spinners | Feels foreign on mobile | Use skeleton screens, native activity indicators |
| No offline indication | Users confused why things fail | Clear "no connection" state with retry action |
| Tiny touch targets | Frustrating tap experience | Minimum 44x44px touch targets (already in design system) |
| Modal overuse | Feels heavy, disrupts flow | Use bottom sheets, inline expansion |
| Ignoring platform conventions | App feels "off" | Study Material Design guidelines |
| Blocking UI during API calls | App feels frozen | Optimistic UI updates, background refresh |
| Quiz transition without feedback | Did my answer register? | Clear visual feedback, animations |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **OAuth Login:** Often missing cold-start deep link handling — verify app killed, then link opens app correctly
- [ ] **FlatList:** Often missing `getItemLayout` — verify scrolling to specific index works
- [ ] **Image loading:** Often missing error states — verify broken image URL shows fallback
- [ ] **Card preview:** Often missing LaTeX rendering — verify math formulas display correctly
- [ ] **Code blocks:** Often missing horizontal scroll — verify long lines don't overflow
- [ ] **Back navigation:** Often missing per-screen handling — verify back works from every screen
- [ ] **Offline state:** Often missing error UI — verify graceful failure without network
- [ ] **Orientation lock:** Often missing AndroidManifest config — verify app stays portrait
- [ ] **Status bar:** Often missing styling — verify status bar style matches screens
- [ ] **Splash screen:** Often missing proper config — verify no white flash on app start
- [ ] **APK signing:** Often missing release keystore — verify APK installs on non-dev devices

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Used ScrollView for lists | MEDIUM | Replace with FlatList, implement `renderItem` pattern |
| OAuth deep links broken | HIGH | Audit entire Manifest, assetlinks.json, Supabase config; may need app re-release |
| Supabase client crashes | LOW | Add missing polyfills, update client config |
| Markdown performance issues | MEDIUM | Add memoization, split preview from list, consider different library |
| APK distribution chaos | MEDIUM | Implement version checking, set up proper hosting |
| FlatList blank spaces | LOW | Add `getItemLayout`, tune `windowSize`, memoize items |
| App size too large | HIGH | Migrate from Expo managed to bare/custom dev client |
| Images not loading | LOW | Switch to `react-native-fast-image`, add error handling |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Web primitives usage | Phase 1 (Setup) | Code review: no div/span, StyleSheet.create everywhere |
| Supabase client config | Phase 1 (Setup) | App starts without URL/storage errors |
| OAuth deep linking | Phase 2 (Auth) | Complete OAuth flow on physical device, both warm and cold start |
| FlatList performance | Phase 3 (Cards) | Scroll 100+ cards smoothly on low-end device |
| Markdown rendering | Phase 3-4 (Cards/Quiz) | Complex card with code + LaTeX opens in < 500ms |
| APK distribution | Phase 5 (Distribution) | Version check works, update flow tested |
| Android back button | All phases | Back button works correctly from every screen |
| Offline handling | All phases | Clear error states when network unavailable |

---

## Sources

- [React Native Performance Overview](https://reactnative.dev/docs/performance) (Official Docs, HIGH confidence)
- [Supabase React Native Auth Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native) (Official Docs, HIGH confidence)
- [I learned React Native as a web developer, and I got everything wrong](https://fernandorojo.co/mistakes) (Blog, MEDIUM confidence)
- [7 React Native Mistakes Slowing Your App in 2026](https://medium.com/@baheer224/7-react-native-mistakes-slowing-your-app-in-2026-19702572796a) (Blog, MEDIUM confidence)
- [From Zero to Production: Building a React Native App in 2026](https://medium.com/@andy.a.g/from-zero-to-production-building-a-react-native-app-in-2026-2a664a967193) (Blog, MEDIUM confidence)
- [Supabase React Native Integration Issues](https://medium.com/@kelvinpompey.me/things-to-look-out-for-using-supabase-with-react-native-9638b23e98c2) (Blog, MEDIUM confidence)
- [React Native Deep Linking That Actually Works](https://medium.com/@nikhithsomasani/react-native-deep-linking-that-actually-works-universal-links-cold-starts-oauth-aced7bffaa56) (Blog, MEDIUM confidence)
- [FlatList Performance Optimization](https://www.obytes.com/blog/a-guide-to-optimizing-flatlists-in-react-native) (Blog, MEDIUM confidence)
- [FlashList vs FlatList](https://medium.com/whitespectre/flashlist-vs-flatlist-understanding-the-key-differences-for-react-native-performance-15f59236a39c) (Blog, MEDIUM confidence)
- [Google Sideloading Policy Changes 2026](https://www.medianama.com/2025/08/223-google-blocks-android-apk-sideloading-2026/) (News, MEDIUM confidence)
- [Expo vs Bare React Native 2025](https://www.godeltech.com/blog/expo-vs-bare-react-native-in-2025/) (Blog, MEDIUM confidence)
- [React Native Reanimated 4 Guide](https://dev.to/erenelagz/react-native-reanimated-3-the-ultimate-guide-to-high-performance-animations-in-2025-4ae4) (Blog, MEDIUM confidence)

---
*Pitfalls research for: React Native Android development (Lumio PWA migration)*
*Researched: 2026-01-29*
