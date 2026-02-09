# Phase 7: Branding - Research

**Researched:** 2026-02-09
**Domain:** Logo asset integration across React Native (Expo) app and static HTML landing page
**Confidence:** HIGH

## Summary

Phase 7 is a straightforward asset integration task. The Lumio logo already exists as SVG files at the project root (`logo.svg` and `logo-circle.svg`) -- a tri-color pie-chart design with three rays in amber (#FFA726), coral (#FF7061), and violet (#9C68D4). The work involves: (1) converting these SVGs to PNG at required sizes, (2) replacing the text placeholder on the Login screen with an `<Image>` component, (3) adding a logo icon to the Dashboard navigation header via `headerTitle` or `headerLeft`, and (4) adding the logo to the landing page header (either as inline SVG or PNG `<img>`).

All current app icons (`icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`) are Expo default placeholders and should also be replaced with the Lumio logo, though this is a bonus beyond the explicit requirements.

**Primary recommendation:** Convert `logo.svg` to PNG at multiple sizes (32px, 48px, 128px, 512px, 1024px). Use `require()` with `<Image>` from React Native for the app screens. Use inline SVG or `<img>` for the landing page. No new dependencies needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native` (Image) | 0.81.5 | Render PNG logo in Login and header | Built-in, no dependency needed |
| `@react-navigation/bottom-tabs` | 7.12.0 | `headerTitle` / `headerLeft` option for logo in nav header | Already installed, documented API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ImageMagick (`convert`) | system | Convert SVG to PNG at build/dev time | One-time asset generation |
| `rsvg-convert` (librsvg) | system | Alternative SVG-to-PNG converter (better SVG fidelity) | If ImageMagick SVG rendering is poor |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PNG via `<Image>` | `react-native-svg` (v15.12.1, already installed) | SVG renders crisply at any size but was explicitly ruled out for logo to avoid native rebuild + SDK 54 press regressions |
| Static PNG `<img>` on landing | Inline `<svg>` in HTML | SVG inline scales perfectly and avoids an extra HTTP request; slightly more HTML but logo SVG is small (1.3KB) |

**Installation:**
```bash
# No new packages needed. For PNG conversion (one-time):
# Option A: ImageMagick
convert -background none logo.svg -resize 128x128 logo-128.png

# Option B: librsvg (better SVG fidelity)
rsvg-convert -w 128 -h 128 logo.svg > logo-128.png
```

## Architecture Patterns

### Recommended Asset Structure
```
apps/android/assets/
  logo-login.png        # ~128-192px, for Login screen (large display)
  logo-header.png       # ~32px, for navigation header icon
  logo-header@2x.png    # ~64px, for 2x screens
  logo-header@3x.png    # ~96px, for 3x screens
  icon.png              # 1024x1024, Expo app icon (replace placeholder)
  adaptive-icon.png     # 1024x1024, Android adaptive icon foreground
  splash-icon.png       # 1024x1024, splash screen icon
  favicon.png           # 48x48, web favicon

apps/landing/
  logo.svg              # Copy or symlink from root, for landing page header
  # OR use inline SVG directly in index.html
```

### Pattern 1: Login Screen Logo (BRAND-01)
**What:** Replace `<Text style={styles.logo}>Lumio</Text>` with `<Image>` component
**When to use:** Login screen, large centered logo display
**Example:**
```typescript
// Source: React Native docs + Expo asset docs (Context7 verified)
import { Image } from 'react-native';

// In LoginScreen component, replace:
//   <Text style={[styles.logo, { color: colors.primary }]}>Lumio</Text>
// With:
<Image
  source={require('../assets/logo-login.png')}
  style={styles.logoImage}
  resizeMode="contain"
  accessibilityLabel="Lumio logo"
/>

// In styles:
logoImage: {
  width: 128,
  height: 128,
  marginBottom: 8,
},
```

### Pattern 2: Navigation Header Logo (BRAND-02)
**What:** Add logo icon to Dashboard tab header using `headerTitle` or `headerLeft`
**When to use:** Bottom tab navigator header customization
**Example:**
```typescript
// Source: React Navigation v7 docs (Context7 verified)
// In MainNavigator.tsx, Dashboard screen options:
<Tab.Screen
  name="Dashboard"
  component={DashboardScreen}
  options={{
    headerTitle: () => (
      <Image
        source={require('../assets/logo-header.png')}
        style={{ width: 28, height: 28 }}
        resizeMode="contain"
      />
    ),
    // ... existing tabBarIcon
  }}
/>
```

### Pattern 3: Landing Page Logo (BRAND-03)
**What:** Replace text "Lumio" in header `<a>` with logo image or inline SVG
**When to use:** Static HTML landing page
**Example (inline SVG approach):**
```html
<!-- In index.html, replace <a href="/" class="logo">Lumio</a> with: -->
<a href="/" class="logo" aria-label="Lumio">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"
       width="36" height="36" role="img" aria-hidden="true">
    <!-- Paste logo paths here -->
  </svg>
  <span>Lumio</span>
</a>
```

### Anti-Patterns to Avoid
- **Using `react-native-svg` for logo rendering:** Explicitly out of scope. Avoids native rebuild and SDK 54 press regressions. Use PNG `<Image>` instead.
- **Hardcoding pixel sizes without density awareness:** React Native handles `@2x`/`@3x` suffixes automatically when using `require()`. Always provide multi-density assets for the small header icon.
- **Forgetting `resizeMode="contain"`:** Without this, the logo may be stretched or cropped. Always use `contain` for logo images.
- **Using remote URLs for the logo:** Always use local assets via `require()`. No network dependency, instant loading, bundled into the binary.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG to PNG conversion | Manual pixel-by-pixel rendering | `rsvg-convert` or `convert` CLI tools | One-time operation, battle-tested tools |
| Multi-density asset generation | Manual resizing for each density | React Native `@2x`/`@3x` naming convention | Metro bundler handles density selection automatically |
| Header customization | Custom header component from scratch | `headerTitle` / `headerLeft` option from @react-navigation | Documented API, handles safe areas and layout correctly |

**Key insight:** This phase requires zero custom rendering logic. Every piece is a standard asset-placement pattern that React Native and HTML already support natively.

## Common Pitfalls

### Pitfall 1: Blurry Header Logo on High-DPI Screens
**What goes wrong:** Logo appears blurry in the 28-32px navigation header on 3x devices
**Why it happens:** Only a single-resolution PNG is provided; React Native scales up the 1x image
**How to avoid:** Provide `logo-header.png` (32px), `logo-header@2x.png` (64px), `logo-header@3x.png` (96px). Metro bundler selects the right one automatically via `require()`.
**Warning signs:** Logo looks fine on emulator but blurry on physical device

### Pitfall 2: Logo Not Visible on Dark Header Background
**What goes wrong:** The logo's signature line (`stroke="#282828"`) disappears against the dark primary-colored header (`#3B82F6` light / `#60a5fa` dark)
**Why it happens:** The SVG has a dark signature line at the bottom that may not be visible on colored backgrounds
**How to avoid:** For the header icon variant, omit the signature line from the SVG before converting to PNG. The tri-color pie + rays are sufficient for a small icon. Consider whether the Login screen logo on light/dark backgrounds needs the signature line removed too.
**Warning signs:** Part of the logo invisible on certain backgrounds

### Pitfall 3: Expo Prebuild Required After Changing App Icons
**What goes wrong:** Updating `icon.png`, `adaptive-icon.png`, or `splash-icon.png` has no visible effect
**Why it happens:** These are embedded in the native Android build at prebuild time, not hot-reloaded by Metro
**How to avoid:** After replacing Expo app icons, run `npx expo prebuild --platform android --clean` then rebuild the APK with `cd android && ./gradlew assembleDebug` then `adb install`
**Warning signs:** Metro reloads but app icon unchanged on device/launcher

### Pitfall 4: Landing Page Logo Breaks on Deploy
**What goes wrong:** Logo image shows broken image icon on production landing page
**Why it happens:** Deploy pipeline (`scp-action` with `strip_components: 2`) only copies files from `apps/landing/*` -- if logo PNG is placed in a subdirectory, the path structure changes
**How to avoid:** Keep logo assets flat in `apps/landing/` (not in a subdirectory), or use inline SVG which needs no separate file
**Warning signs:** Works locally but broken on lumio.toto-castaldi.com

## Code Examples

Verified patterns from official sources:

### Loading Local PNG with React Native Image
```typescript
// Source: Expo docs (Context7 verified)
// Metro bundler resolves require() at build time
// Automatically picks @2x/@3x variants based on device density
import { Image } from 'react-native';

<Image
  source={require('./assets/logo-login.png')}
  style={{ width: 128, height: 128 }}
  resizeMode="contain"
/>
```

### Custom Header Title in Bottom Tab Navigator
```typescript
// Source: React Navigation v7 docs (Context7 verified)
// headerTitle accepts a function returning a React element
<Tab.Screen
  name="Dashboard"
  component={DashboardScreen}
  options={{
    headerTitle: () => (
      <Image
        source={require('../assets/logo-header.png')}
        style={{ width: 28, height: 28 }}
        resizeMode="contain"
      />
    ),
  }}
/>
```

### Inline SVG in HTML Landing Page
```html
<!-- No external tooling needed. The logo SVG is 1.3KB. -->
<a href="/" class="logo" aria-label="Lumio home">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"
       width="36" height="36" class="logo-icon">
    <path d="M 200 200 L 200 100 A 100 100 0 0 1 286.6 250 Z" fill="#FFA726"/>
    <path d="M 200 200 L 286.6 250 A 100 100 0 0 1 113.4 250 Z" fill="#FF7061"/>
    <path d="M 200 200 L 113.4 250 A 100 100 0 0 1 200 100 Z" fill="#9C68D4"/>
    <rect x="115" y="-12" width="85" height="24" rx="6" fill="#FFA726"
          transform="translate(200, 200) rotate(-90)"/>
    <rect x="115" y="-12" width="85" height="24" rx="6" fill="#FF7061"
          transform="translate(200, 200) rotate(30)"/>
    <rect x="115" y="-12" width="85" height="24" rx="6" fill="#9C68D4"
          transform="translate(200, 200) rotate(150)"/>
  </svg>
  Lumio
</a>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-native-svg` for in-app SVG rendering | PNG via `require()` for static logos | Decision: v1.2 | Avoids native rebuild, avoids SDK 54 press regressions |
| Expo default placeholder icons | Custom Lumio brand assets | This phase | Consistent brand identity |

**Deprecated/outdated:**
- Using `Image` from `expo-image` instead of `react-native`: Both work, but the app currently uses `react-native` `Image` consistently. No need to introduce `expo-image` for this use case.

## Existing Assets Inventory

### Logo Source Files (project root)
| File | Size | Description |
|------|------|-------------|
| `logo.svg` | 1.3KB | Full logo: tri-color pie + 3 rays + signature line, transparent background, 400x400 viewBox |
| `logo-circle.svg` | 1.4KB | Same logo with white circle background (for use on dark/colored surfaces) |

### Current App Assets (all Expo default placeholders)
| File | Dimensions | Current State | Needed |
|------|-----------|---------------|--------|
| `apps/android/assets/icon.png` | 1024x1024 | Expo placeholder (gray concentric circles) | Replace with Lumio logo |
| `apps/android/assets/adaptive-icon.png` | 1024x1024 | Expo placeholder | Replace with Lumio logo (use `logo-circle.svg` variant) |
| `apps/android/assets/splash-icon.png` | 1024x1024 | Expo placeholder | Replace with Lumio logo |
| `apps/android/assets/favicon.png` | 48x48 | Small cube icon | Replace with Lumio logo |

### Logo Design Details
- **Colors:** Amber (#FFA726), Coral (#FF7061), Violet (#9C68D4)
- **Structure:** 3-segment pie circle (radius 100 in 400x400 viewBox) + 3 rounded-rectangle rays extending outward + signature line at bottom
- **Variants:** Transparent background (`logo.svg`), white circle background (`logo-circle.svg`)
- **Signature line:** Dark horizontal line at y=330. Should be **omitted** for small icons (header) where it would be invisible or confusing.

## Open Questions

1. **Exact Login Logo Size**
   - What we know: Current text placeholder is `fontSize: 48`. The logo is a detailed graphic, so it needs to be larger than 48px to be readable.
   - What's unclear: Whether 128px, 160px, or 192px looks best on the Login screen
   - Recommendation: Start with 128px width/height, adjust based on visual testing. The `resizeMode="contain"` makes runtime tweaking trivial.

2. **Whether to Replace Expo App Icons in This Phase**
   - What we know: All current app icons are Expo placeholders. Replacing them would complete the branding story.
   - What's unclear: The explicit requirements (BRAND-01, BRAND-02, BRAND-03) don't mention app icons. Replacing them also requires a native rebuild (`expo prebuild` + `gradlew assembleDebug` + `adb install`).
   - Recommendation: Include app icon replacement as a bonus task in the plan. It's the same logo, just different sizes. But flag the native rebuild requirement clearly.

3. **Landing Page: Inline SVG vs PNG `<img>`**
   - What we know: The SVG is only 1.3KB. Inline avoids an extra HTTP request. The current landing page has no image assets in the header.
   - What's unclear: Whether the developer prefers the simplicity of inline SVG or wants a separate file for maintainability.
   - Recommendation: Use inline SVG (without the signature line) next to the "Lumio" text. Simplest, fastest, most maintainable.

## Sources

### Primary (HIGH confidence)
- React Navigation v7 docs (Context7 `/react-navigation/react-navigation.github.io`) - headerTitle customization with Image component
- Expo asset docs (Context7 `/llmstxt/expo_dev_llms_txt`) - local PNG loading via require(), Image component usage
- Codebase inspection - `logo.svg`, `logo-circle.svg`, `LoginScreen.tsx`, `MainNavigator.tsx`, `apps/landing/index.html`

### Secondary (MEDIUM confidence)
- React Native Image docs - `resizeMode` prop, `@2x`/`@3x` density suffixes

### Tertiary (LOW confidence)
- None. All findings verified against codebase and official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed, all APIs verified in Context7
- Architecture: HIGH - Direct codebase inspection of all three target files
- Pitfalls: HIGH - Based on known Expo/RN patterns and codebase specifics (header colors, deploy pipeline)

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (stable domain, no fast-moving dependencies)
