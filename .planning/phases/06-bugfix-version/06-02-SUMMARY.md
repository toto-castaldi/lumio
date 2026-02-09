---
phase: 06-bugfix-version
plan: 02
subsystem: ui
tags: [react-native-marked, react-native-code-highlighter, katex, webview, markdown, native-rendering, panresponder, bottom-sheet]

# Dependency graph
requires:
  - phase: 06-bugfix-version
    plan: 01
    provides: "react-native-marked, react-native-code-highlighter, react-native-svg, react-syntax-highlighter deps"
provides:
  - "Native markdown rendering in card preview (no WebView for markdown)"
  - "Syntax-highlighted code blocks via react-native-code-highlighter"
  - "LaTeX math rendering via KaTeX micro-WebView"
  - "PanResponder swipe-down dismiss on bottom-sheet (no close button)"
  - "FlatList-based scrolling inside bottom-sheet (no nested VirtualizedList)"
affects: [future-card-rendering, study-screen]

# Tech tracking
tech-stack:
  added: []
  patterns: [custom-renderer-tokenizer-pattern, latex-codespan-preprocessor, metro-server-module-shimming, panresponder-bottom-sheet-dismiss]

key-files:
  created:
    - apps/android/components/study/CardRenderer.ts
    - apps/android/components/study/CardTokenizer.ts
    - apps/android/components/study/KaTeXView.tsx
    - apps/android/empty-module.js
  modified:
    - apps/android/components/study/CardContentView.tsx
    - apps/android/components/study/CardPreviewModal.tsx
    - apps/android/metro.config.js

key-decisions:
  - "LaTeX preprocessor wraps $...$ in backticks before marked tokenization, since marked only calls codespan() for backtick-delimited content"
  - "Bottom-sheet uses fixed height (not maxHeight) so FlatList scrolling works inside absolute-positioned container"
  - "Server-only modules (rehype-katex, parse5, entities) shimmed to empty module in Metro resolver"
  - "trim-newlines forced to v5 for react-native-code-highlighter ESM named exports compatibility"

patterns-established:
  - "Custom Renderer/Tokenizer pattern: extend react-native-marked classes, memoize instances per isDark"
  - "LaTeX preprocessor: wrapLatexInCodespans() converts $...$ to backtick-wrapped spans before markdown parsing"
  - "Metro resolveRequest hook: shim server-only packages to empty module for React Native bundling"
  - "PanResponder dismiss: attach to drag handle only, threshold 100px, Animated.spring back"

# Metrics
duration: multi-session (device testing required human verification)
completed: 2026-02-09
---

# Phase 6 Plan 2: Card Preview Native Rendering Summary

**Replaced WebView card preview with native react-native-marked renderer, KaTeX micro-WebViews for LaTeX, syntax-highlighted code blocks, and PanResponder swipe-down dismiss -- fixing BUG-01 content cutoff**

## Performance

- **Duration:** Multi-session (required native rebuild + device testing)
- **Started:** 2026-02-09
- **Completed:** 2026-02-09
- **Tasks:** 3 (2 auto + 1 human-verify)
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- Eliminated BUG-01 root cause: replaced WebView-in-ScrollView (async height, scroll conflicts) with native react-native-marked FlatList rendering
- Created three reusable support components: CardRenderer (theme-aware code/image/LaTeX rendering), CardTokenizer (LaTeX delimiter detection), KaTeXView (minimal WebView for math expressions)
- Implemented PanResponder-based swipe-down dismiss on bottom-sheet drag handle, removed close button per design decision
- Fixed Metro bundling issues: shimmed server-only modules (rehype-katex chain) and forced trim-newlines v5 for ESM compatibility
- Added LaTeX preprocessor that wraps math delimiters in backticks for correct tokenizer detection

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CardRenderer, CardTokenizer, and KaTeXView** - `70cd498` (feat)
2. **Task 2: Rewrite CardContentView and CardPreviewModal** - `a0073b8` (feat)
3. **Task 3: Human verification on device** - N/A (checkpoint, approved)

Additional fixes from device testing:

4. **Metro config: shim server-only modules + fix trim-newlines** - `0ce457f` (fix)
5. **LaTeX preprocessor + bottom-sheet height fix** - `46b3578` (fix)

## Files Created/Modified
- `apps/android/components/study/CardRenderer.ts` - Custom react-native-marked renderer with theme-aware code highlighting, LaTeX detection in codespan, and full-width images
- `apps/android/components/study/CardTokenizer.ts` - Custom MarkedTokenizer detecting LaTeX `$...$` and `$$...$$` delimiters
- `apps/android/components/study/KaTeXView.tsx` - Micro-WebView rendering single LaTeX expressions via KaTeX CDN with height auto-sizing
- `apps/android/components/study/CardContentView.tsx` - Rewritten from WebView to native react-native-marked with custom renderer/tokenizer and LaTeX preprocessor
- `apps/android/components/study/CardPreviewModal.tsx` - Rewritten: removed close button, removed ScrollView, added PanResponder swipe dismiss, fixed height for FlatList scrolling
- `apps/android/metro.config.js` - Added resolveRequest hook to shim server-only modules and force trim-newlines v5
- `apps/android/empty-module.js` - Empty module shim for server-only packages (rehype-katex, parse5, entities)

## Decisions Made
- **LaTeX preprocessing approach:** marked's tokenizer only calls `codespan()` for backtick-delimited content, so a `wrapLatexInCodespans()` preprocessor converts `$...$` and `$$...$$` to backtick-wrapped spans before parsing. This avoids forking or monkey-patching marked internals.
- **Fixed height vs maxHeight:** Bottom-sheet changed from `maxHeight: 80%` to `height: 80%` because FlatList requires a fixed parent height to calculate its scroll region inside an absolute-positioned container.
- **Server module shimming:** rehype-katex and its dependency chain (parse5, entities) are pulled in transitively by `@lumio/core` but are server-only. Shimming them to an empty module in Metro's resolveRequest is cleaner than restructuring the core package.
- **trim-newlines v5 force resolution:** pnpm hoists v3 to root, but react-native-code-highlighter needs v5 ESM named exports. Direct path resolution to the v5 copy avoids version conflicts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Metro bundler failing on server-only modules**
- **Found during:** Device testing (after Task 2)
- **Issue:** Metro tried to bundle rehype-katex, parse5, entities from @lumio/core transitive deps, causing build errors
- **Fix:** Added resolveRequest hook in metro.config.js to shim these to an empty module
- **Files modified:** apps/android/metro.config.js, apps/android/empty-module.js
- **Verification:** Metro bundles successfully, app loads on device
- **Committed in:** `0ce457f`

**2. [Rule 3 - Blocking] trim-newlines v3 incompatible with react-native-code-highlighter**
- **Found during:** Device testing (after Task 2)
- **Issue:** pnpm hoisted trim-newlines v3 but react-native-code-highlighter needs v5 ESM named exports
- **Fix:** Added explicit path resolution in metro.config.js resolveRequest to force v5
- **Files modified:** apps/android/metro.config.js
- **Verification:** Code highlighting renders correctly on device
- **Committed in:** `0ce457f`

**3. [Rule 1 - Bug] LaTeX expressions not detected by tokenizer**
- **Found during:** Device testing (after Task 2)
- **Issue:** marked's tokenizer only calls codespan() for backtick-delimited content; raw `$...$` passed through as plain text
- **Fix:** Added `wrapLatexInCodespans()` preprocessor in CardContentView that wraps LaTeX delimiters in backticks before markdown parsing
- **Files modified:** apps/android/components/study/CardContentView.tsx
- **Verification:** LaTeX expressions render via KaTeXView on device
- **Committed in:** `46b3578`

**4. [Rule 1 - Bug] FlatList not scrollable inside bottom-sheet**
- **Found during:** Device testing (after Task 2)
- **Issue:** `maxHeight` on the absolute-positioned sheet container prevented FlatList from calculating its scroll region
- **Fix:** Changed `maxHeight: SCREEN_HEIGHT * 0.8` to `height: SCREEN_HEIGHT * 0.8` in sheet style
- **Files modified:** apps/android/components/study/CardPreviewModal.tsx
- **Verification:** Card content scrolls smoothly in bottom-sheet on device
- **Committed in:** `46b3578`

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bugs)
**Impact on plan:** All fixes were necessary for the feature to work on device. No scope creep -- all relate directly to making the planned native rendering work correctly.

## Issues Encountered
- Server-only module bundling is a recurring pattern with @lumio/core in React Native -- the Metro shim approach works but may need extension if core adds more server-only deps
- marked's tokenizer architecture assumes backtick delimiters for codespans, requiring a preprocessing step for LaTeX -- this is a stable workaround but worth documenting for future markdown/LaTeX work

## User Setup Required

None - no external service configuration required. Native rebuild was handled during the human verification checkpoint.

## Next Phase Readiness
- BUG-01 (card preview content cutoff) is fully resolved
- BUG-02 (version display) was resolved in plan 06-01
- Phase 06 (Bugfix & Version) is complete, ready for Phase 07
- WebView blocker concern from STATE.md (ResizeObserver for older Android) is no longer relevant since card preview no longer uses WebView for markdown

## Self-Check: PASSED

All 7 files exist, all 4 commits verified, all content checks passed.
Note: "WebView" appears in CardContentView.tsx only in JSDoc comments describing the architecture change, not as actual WebView usage.

---
*Phase: 06-bugfix-version*
*Completed: 2026-02-09*
