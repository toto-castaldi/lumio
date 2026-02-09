# Phase 6: Bugfix & Version - Research

**Researched:** 2026-02-09
**Domain:** React Native native markdown/LaTeX rendering, app version display, bottom-sheet UX
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Card preview behavior: Dismiss by swiping down or tapping the overlay -- no close button (X)
- Claude's discretion on scroll vs expand pattern for long content
- Claude's discretion on vertical alignment (top vs centered for short content)
- Version display: Show version number only: "v1.2.0" format -- no app name prefix, no build number
- Version tappable: tap to copy version to clipboard, with toast confirmation
- Preview content rendering: Switch from WebView to native rendering -- but must keep LaTeX support
- Syntax highlighting for code blocks (color-coded with language detection)
- Images displayed at full width, maintaining aspect ratio
- Content must respect the app's dark/light theme (background, text colors, code blocks adapt)
- Cards do NOT have a front/back concept -- they are single-content items

### Claude's Discretion
- Bottom-sheet height and scroll behavior for card preview
- Vertical alignment of short content in preview
- Version placement within Settings screen
- Choice of native markdown/LaTeX rendering library
- Loading skeleton design if applicable
- Error state handling for failed renders

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Summary

This phase has two distinct workstreams: (1) replacing the WebView-based card content renderer with native React Native components that support markdown, LaTeX, syntax highlighting, and images; and (2) displaying the actual installed app version in Settings with copy-to-clipboard.

The card preview bug is caused by a WebView (`scrollEnabled={false}`, dynamic height via `postMessage`) nested inside a ScrollView inside a Modal bottom-sheet. The WebView starts at 300px height and relies on a JavaScript-injected height measurement that arrives asynchronously, causing content cutoff. The user has decided to replace WebView entirely with native rendering.

The version display is straightforward: the hardcoded "Lumio v1.0.0" in `SettingsScreen.tsx` must be replaced with the real version from `@lumio/shared`. The version string and clipboard copy require consideration around native rebuild impact.

**Primary recommendation:** Use `react-native-marked` for markdown + custom tokenizer/renderer for LaTeX (via small WebView per math expression using `react-native-katex` pattern), paired with `react-native-code-highlighter` for syntax-highlighted code blocks. For version, use `@lumio/shared`'s `getVersionString()` directly (no new native deps). For clipboard, install `expo-clipboard` (requires native rebuild, but the rebuild is already needed for `react-native-svg` which `react-native-marked` requires).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-marked | ^8.0.0 | Native markdown rendering | Pure JS rendering using marked.js parser, FlatList-based, built-in theming, custom renderer/tokenizer support. Same maintainer as the project's WebView marked.js approach. |
| react-native-svg | >=12.3.0 | SVG rendering (peer dep of react-native-marked) | Required peer dependency. Native module -- triggers rebuild. |
| react-native-code-highlighter | ^2.0.0 | Syntax highlighting for code blocks | Pure JS, uses react-syntax-highlighter under the hood. Same maintainer (gmsgowtham) as react-native-marked. |
| react-syntax-highlighter | ^15.0.0 | Syntax highlighting engine (peer dep) | Industry standard, Prism/highlight.js styles available as JS objects. Pure JS. |
| expo-clipboard | ~7.0.0 | Copy version to clipboard | Expo SDK 54 compatible. Native module -- triggers rebuild. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-toast-message | ^2.3.3 | Toast for clipboard copy confirmation | Already installed. Use for "Version copied!" toast. |
| expo-constants | ~18.0.13 | Access app version at runtime | Already installed. `Constants.expoConfig.version` reads from app.json. |
| @lumio/shared | workspace:* | VERSION constant (source of truth) | Already available. `getVersionString()` returns "v1.1.4" format. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-native-marked | react-native-markdown-display | Less maintained, no built-in FlatList optimization, same react-native-svg dep |
| react-native-marked | Keep WebView (fix height only) | User explicitly decided against WebView -- locked decision |
| react-native-code-highlighter | react-native-syntax-highlighter | Older, less maintained; same underlying engine |
| expo-clipboard | @react-native-clipboard/clipboard | Both require native rebuild; expo-clipboard better fits Expo ecosystem |
| expo-application | @lumio/shared getVersionString() | expo-application reads native build version but adds another native dep; @lumio/shared VERSION is the single source of truth, already synced by release-please |

**Installation:**
```bash
cd apps/android
pnpm add react-native-marked react-native-svg react-native-code-highlighter react-syntax-highlighter expo-clipboard
pnpm add -D @types/react-syntax-highlighter
```

**Native rebuild required after install:**
```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Architecture Patterns

### Current Architecture (being replaced)
```
CardPreviewModal
  -> Modal (transparent, slide)
    -> Pressable backdrop
    -> View (bottom-sheet, 80% height)
      -> ScrollView
        -> CardContentView (WebView)
          -> generateCardHtml() builds full HTML document
          -> CDN loads: marked.js, KaTeX, highlight.js
          -> postMessage reports height back
```

**Why it breaks:** WebView with `scrollEnabled={false}` inside ScrollView. WebView starts at 300px, then async height update arrives after CDN resources load. Timing, double-scroll conflicts, and height miscalculation cause content cutoff.

### New Architecture (recommended)
```
CardPreviewModal (rewritten)
  -> Modal (transparent, slide)
    -> Pressable backdrop (tap to dismiss)
    -> View (bottom-sheet, 80% height)
      -> Drag handle (swipe down to dismiss)
      -> Header (title only, NO close button per CONTEXT)
      -> react-native-marked (FlatList-based, handles own scrolling)
        -> Custom Renderer:
          -> code blocks: react-native-code-highlighter
          -> LaTeX inline: KaTeX WebView micro-component
          -> LaTeX display: KaTeX WebView micro-component
          -> images: RN Image with full width
        -> Custom Tokenizer:
          -> Detects $...$ and $$...$$ LaTeX delimiters
```

### Pattern 1: Custom Renderer for Code Blocks
**What:** Override react-native-marked's `code()` method to use react-native-code-highlighter
**When to use:** Every code block in card content

```typescript
// Source: Context7 /gmsgowtham/react-native-marked + react-native-code-highlighter README
import { Renderer } from 'react-native-marked';
import type { RendererInterface } from 'react-native-marked';
import CodeHighlighter from 'react-native-code-highlighter';
import { atomOneDark, atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';

class CardRenderer extends Renderer implements RendererInterface {
  private isDark: boolean;

  constructor(isDark: boolean) {
    super();
    this.isDark = isDark;
  }

  code(text: string, language?: string, containerStyle?: ViewStyle, textStyle?: TextStyle): ReactNode {
    return (
      <CodeHighlighter
        key={this.getKey()}
        hljsStyle={this.isDark ? atomOneDark : atomOneLight}
        language={language || 'text'}
        containerStyle={[containerStyle, { borderRadius: 8, padding: 12 }]}
        textStyle={[textStyle, { fontSize: 14 }]}
      >
        {text}
      </CodeHighlighter>
    );
  }
}
```

### Pattern 2: Custom Tokenizer + Renderer for LaTeX
**What:** Override `codespan()` tokenizer to detect `$...$` syntax, render with KaTeX in a tiny WebView
**When to use:** Cards containing LaTeX math expressions

```typescript
// Source: Context7 /gmsgowtham/react-native-marked LaTeX example
import { MarkedTokenizer } from 'react-native-marked';
import type { Tokens } from 'marked';

class CardTokenizer extends MarkedTokenizer {
  codespan(src: string): Tokens.Codespan | undefined {
    // Detect inline LaTeX: $...$
    const match = src.match(/^\$+([^\$\n]+?)\$+/);
    if (match?.[1]) {
      return {
        type: 'codespan',
        raw: match[0],
        text: match[1].trim(),
      };
    }
    return super.codespan(src);
  }
}
```

For the LaTeX rendering component itself, since react-native-math-view is archived/unmaintained, the recommended approach is a minimal KaTeX WebView component that:
- Loads KaTeX CSS/JS from CDN (same as current approach, but scoped to math only)
- Auto-sizes to content height
- Has transparent background matching theme

### Pattern 3: Theme-Aware Markdown Configuration
**What:** Pass theme colors to react-native-marked's `theme` prop
**When to use:** Always -- content must adapt to dark/light mode

```typescript
// Source: Context7 /gmsgowtham/react-native-marked theming example
const markdownTheme = {
  colors: {
    background: isDark ? '#111827' : '#f5f5f5',
    text: isDark ? '#f9fafb' : '#333333',
    link: isDark ? '#60a5fa' : '#3B82F6',
    border: isDark ? '#374151' : '#e5e7eb',
    code: isDark ? '#1f2937' : '#f3f4f6',
    codeText: isDark ? '#f9fafb' : '#333333',
    blockquoteBorder: isDark ? '#60a5fa' : '#3b82f6',
    blockquoteBackground: isDark ? '#1f2937' : '#f3f4f6',
    hr: isDark ? '#374151' : '#e5e7eb',
  },
  spacing: {
    paragraph: 12,
    heading: 20,
    code: 12,
    blockquote: 12,
    list: 12,
    listItem: 6,
    table: 12,
    tableCell: 8,
    hr: 16,
  },
};
```

### Pattern 4: Version Display with Clipboard Copy
**What:** Tappable version text at bottom of Settings that copies to clipboard with toast
**When to use:** SettingsScreen footer

```typescript
// Source: Context7 Expo clipboard docs + existing @lumio/shared version.ts
import * as Clipboard from 'expo-clipboard';
import { getVersionString } from '@lumio/shared';
import Toast from 'react-native-toast-message';

const handleCopyVersion = async () => {
  const version = getVersionString(); // "v1.1.4"
  await Clipboard.setStringAsync(version);
  Toast.show({
    type: 'success',
    text1: 'Version copied',
    text2: version,
    visibilityTime: 2000,
  });
};
```

### Pattern 5: Bottom-Sheet Dismiss Gestures
**What:** Dismiss card preview by swiping down or tapping backdrop -- no close button
**When to use:** CardPreviewModal

The current implementation uses `<Modal animationType="slide">` with a Pressable backdrop. The swipe-down dismiss can be achieved by:
1. Keeping the existing `<Modal onRequestClose>` for Android back button
2. Using `PanResponder` on the sheet to detect downward swipe gesture
3. When swipe distance exceeds threshold (e.g., 100px), dismiss
4. Removing the close button (X) per user decision

Alternatively, consider `@gorhom/bottom-sheet` which provides swipe-to-dismiss natively, but this adds another native dependency (react-native-reanimated). Since this project avoids adding unnecessary native deps, the PanResponder approach is lighter.

### Anti-Patterns to Avoid
- **WebView inside ScrollView:** This is the current bug. Never nest a height-dynamic WebView inside ScrollView with `scrollEnabled={false}`.
- **CDN-dependent rendering:** Current approach loads marked.js, KaTeX, highlight.js from CDN. If offline or slow connection, content fails silently. react-native-marked bundles marked.js and renders natively.
- **Re-creating renderer on every render:** The custom Renderer instance should be memoized (useMemo with isDark dependency), not recreated on each render.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown to native RN components | Custom markdown parser | react-native-marked | CommonMark compliance, edge cases in tables, nested lists, GFM |
| Syntax highlighting | Custom regex-based coloring | react-native-code-highlighter + react-syntax-highlighter | Language detection, 190+ languages, tested themes |
| LaTeX rendering | Custom math parser | KaTeX (via mini-WebView or react-native-katex pattern) | Math typesetting is deeply complex, KaTeX handles thousands of edge cases |
| Clipboard access | Direct native bridge calls | expo-clipboard | Cross-platform, handles permissions, async API |
| Bottom-sheet gestures | Custom gesture math | PanResponder (built-in) or @gorhom/bottom-sheet | Gesture physics, edge cases, accessibility |

**Key insight:** The user wants "native rendering" which means using React Native `<Text>`, `<View>`, `<Image>` components for markdown output instead of a WebView. However, LaTeX rendering has no viable pure-native solution in the React Native ecosystem -- every maintained library uses either WebView (KaTeX) or was WebView-free but is now archived (react-native-math-view, archived Sept 2024). The pragmatic approach is native rendering for 95% of content (markdown, code, images) with micro-WebViews only for LaTeX expressions.

## Common Pitfalls

### Pitfall 1: react-native-svg Native Rebuild
**What goes wrong:** Installing react-native-marked without rebuilding the native app causes "Module not found" crash at runtime.
**Why it happens:** react-native-marked depends on react-native-svg which contains native modules (iOS: CocoaPods, Android: native Java/Kotlin).
**How to avoid:** After `pnpm add`, run full prebuild + gradlew assembleDebug + adb install workflow (documented in MEMORY.md).
**Warning signs:** App crashes immediately on launch with "Cannot find module" error.

### Pitfall 2: ScrollView Inside FlatList Conflict
**What goes wrong:** react-native-marked uses FlatList internally. Wrapping it in ScrollView causes "VirtualizedLists should never be nested inside plain ScrollViews" warning and broken scrolling.
**Why it happens:** React Native doesn't support nested virtualizing lists.
**How to avoid:** Let react-native-marked's FlatList handle all scrolling. Do NOT wrap it in ScrollView. The bottom-sheet container should use `flex: 1` and let the FlatList fill available space.
**Warning signs:** Yellow box warning about VirtualizedLists, janky/double scrolling.

### Pitfall 3: Custom Renderer Key Management
**What goes wrong:** Duplicate key warnings or missing content when using custom renderer.
**Why it happens:** react-native-marked's Renderer class uses `this.getKey()` to generate unique keys. If custom render methods forget to use it, React's reconciliation breaks.
**How to avoid:** Always use `key={this.getKey()}` as the first prop on the root element returned by every custom render method.
**Warning signs:** "Each child in a list should have a unique key" warnings.

### Pitfall 4: LaTeX WebView Height Flashing
**What goes wrong:** Mini-WebViews for LaTeX start with 0 or minimal height, then jump to final height, causing content reflow.
**Why it happens:** KaTeX rendering in WebView is async; height measurement arrives after initial layout.
**How to avoid:** Set a reasonable initial height estimate (e.g., 24px for inline, 60px for display math). Use `opacity: 0` until height is reported, then fade in. Cache known expression heights.
**Warning signs:** Visual "jumps" when scrolling through content with LaTeX.

### Pitfall 5: Hardcoded Version vs Source of Truth
**What goes wrong:** Version string gets out of sync between app.json, @lumio/shared, and display.
**Why it happens:** Multiple places define version: `app.json` (Expo), `packages/shared/src/version.ts` (runtime), `package.json` (npm).
**How to avoid:** Use `@lumio/shared`'s `getVersionString()` as the single import. It returns `"v1.1.4"` format which matches the user's requirement. Do NOT read from `Constants.expoConfig.version` (which would return "1.0.0" from the stale `app.json`).
**Warning signs:** Version shows "v1.0.0" instead of "v1.1.4".

### Pitfall 6: expo-clipboard Requires Rebuild
**What goes wrong:** Adding expo-clipboard without native rebuild leads to "Cannot find native module 'ExpoClipboard'" crash.
**Why it happens:** expo-clipboard contains native code that must be compiled into the development build.
**How to avoid:** Bundle the native rebuild with the react-native-svg rebuild (both needed in this phase). One rebuild covers both.
**Warning signs:** Invariant Violation error on clipboard copy attempt.

## Code Examples

### Example 1: Complete CardContentView Replacement
```typescript
// New native CardContentView (replaces WebView version)
import React, { useMemo } from 'react';
import { Image, View, type ViewStyle } from 'react-native';
import Markdown, { Renderer, MarkedTokenizer } from 'react-native-marked';
import type { RendererInterface } from 'react-native-marked';
import CodeHighlighter from 'react-native-code-highlighter';
import { atomOneDark, atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useTheme } from '../../hooks/useTheme';

// Theme colors aligned with existing lib/theme.ts values
function getMarkdownTheme(isDark: boolean) {
  return {
    colors: {
      background: 'transparent', // Let parent control background
      text: isDark ? '#f9fafb' : '#333333',
      link: isDark ? '#60a5fa' : '#3B82F6',
      border: isDark ? '#374151' : '#e5e7eb',
      code: isDark ? '#111827' : '#f3f4f6',
      codeText: isDark ? '#f9fafb' : '#333333',
    },
  };
}
```

### Example 2: Version Footer in Settings
```typescript
// SettingsScreen version footer
import { getVersionString } from '@lumio/shared';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

// In component:
const version = getVersionString(); // "v1.1.4"

<TouchableOpacity onPress={async () => {
  await Clipboard.setStringAsync(version);
  Toast.show({ type: 'success', text1: 'Version copied', visibilityTime: 2000 });
}}>
  <Text style={[styles.version, { color: colors.textSecondary }]}>
    {version}
  </Text>
</TouchableOpacity>
```

### Example 3: Image Rendering with Full Width
```typescript
// Custom renderer image method
image(uri: string, alt?: string, style?: ImageStyle): ReactNode {
  return (
    <Image
      key={this.getKey()}
      source={{ uri }}
      style={[{
        width: '100%',
        aspectRatio: 16 / 9, // Default, adjusted on load
        borderRadius: 8,
        marginVertical: 8,
      }, style]}
      resizeMode="contain"
      accessibilityLabel={alt || 'Card image'}
    />
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-native-math-view (native LaTeX) | Archived Sept 2024 | 2024 | No WebView-free LaTeX option for RN; must use KaTeX via mini-WebView |
| WebView-based markdown (full HTML) | Native component rendering (react-native-marked) | 2023+ | Better performance, no CDN dependency, proper scroll behavior |
| Clipboard from react-native core | expo-clipboard / @react-native-clipboard/clipboard | RN 0.70+ | Core Clipboard deprecated and removed |
| Constants.manifest | Constants.expoConfig | Expo SDK 46+ | manifest deprecated, expoConfig is current |

**Deprecated/outdated:**
- `react-native-math-view`: Archived September 2024, last release 3.4.9 (Sept 2022). Do not use.
- `Clipboard` from `react-native`: Removed from core. Use `expo-clipboard`.
- `Constants.manifest`: Deprecated since SDK 46. Use `Constants.expoConfig`.

## Open Questions

1. **LaTeX micro-WebView performance with many expressions**
   - What we know: Cards can contain multiple LaTeX expressions. Each becomes a small WebView.
   - What's unclear: Performance impact of 10+ small WebViews in a single card's FlatList. CDN load time per expression.
   - Recommendation: Bundle KaTeX CSS/JS as local assets rather than CDN. If performance is poor, consider rendering all LaTeX for a card in a single hidden WebView and extracting SVG output. Test with a LaTeX-heavy card first.

2. **react-native-marked FlatList vs bottom-sheet scroll interaction**
   - What we know: react-native-marked renders content as a FlatList. The bottom-sheet is a View inside a Modal.
   - What's unclear: Whether the FlatList scroll correctly constrained within the bottom-sheet's maxHeight. PanResponder on the drag handle may conflict with FlatList scroll gestures.
   - Recommendation: Implement and test early. If gesture conflicts arise, the drag handle area should be a separate non-scrollable zone, and only handle swipe-to-dismiss when the FlatList is scrolled to top.

3. **react-native-svg version compatibility with Expo SDK 54 / RN 0.81**
   - What we know: react-native-marked requires react-native-svg >=12.3.0. Expo SDK 54 uses its own version of react-native-svg.
   - What's unclear: Whether Expo's react-native-svg version satisfies the peer dep. Need to check `npx expo install react-native-svg` for the correct version.
   - Recommendation: Use `npx expo install` instead of `pnpm add` for react-native-svg to ensure Expo-compatible version.

4. **app.json version sync with @lumio/shared VERSION**
   - What we know: `app.json` says version "1.0.0", `@lumio/shared` says VERSION = "1.1.4". These are out of sync.
   - What's unclear: Whether the build pipeline updates app.json. Since we're using `getVersionString()` from @lumio/shared (not Constants.expoConfig.version), this mismatch doesn't affect the displayed version.
   - Recommendation: Use `@lumio/shared`'s `getVersionString()` for display. Separately consider syncing app.json in CI (out of scope for this phase).

## Sources

### Primary (HIGH confidence)
- Context7 `/gmsgowtham/react-native-marked` - Theming, custom renderer, custom tokenizer, LaTeX integration patterns
- Context7 `/llmstxt/expo_dev_llms_txt` - expo-clipboard API (setStringAsync), expo-constants (expoConfig.version), expo-application (nativeApplicationVersion)
- Codebase analysis of `apps/android/components/study/CardPreviewModal.tsx`, `CardContentView.tsx`, `lib/cardHtml.ts`, `screens/SettingsScreen.tsx`, `packages/shared/src/version.ts`

### Secondary (MEDIUM confidence)
- [Expo Application Documentation](https://docs.expo.dev/versions/latest/sdk/application/) - nativeApplicationVersion API
- [Expo Clipboard Documentation](https://docs.expo.dev/versions/latest/sdk/clipboard/) - setStringAsync API, installation
- [react-native-math-view GitHub](https://github.com/ShaMan123/react-native-math-view) - Confirmed archived September 2024
- [react-native-marked LaTeX issue #853](https://github.com/gmsgowtham/react-native-marked/issues/853) - Community discussion on LaTeX approach
- [react-native-code-highlighter GitHub](https://github.com/gmsgowtham/react-native-code-highlighter) - Pure JS, same maintainer as react-native-marked

### Tertiary (LOW confidence)
- WebSearch for react-native-svg Expo SDK 54 compatibility - needs validation with `npx expo install`
- WebSearch for react-native-marked v8.0.0 RN 0.81 compatibility - peer dep says >=0.76.0 but not tested

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - react-native-marked is well-documented with Context7, but LaTeX integration requires custom work and the micro-WebView approach for LaTeX is pragmatic but untested in this exact configuration
- Architecture: HIGH - Clear replacement pattern. Current code is well-understood. New architecture eliminates root cause of the bug.
- Pitfalls: HIGH - Well-documented issues with native rebuilds, nested scroll views, WebView height. All verified from official sources and codebase analysis.
- Version display: HIGH - Straightforward. @lumio/shared already has getVersionString(). expo-clipboard has clear API.

**Native rebuild impact:** This phase REQUIRES a native rebuild due to react-native-svg (peer dep of react-native-marked) and expo-clipboard. Both are added in one rebuild cycle. Developer should plan for prebuild + gradlew + adb install.

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable libraries, no fast-moving changes expected)
