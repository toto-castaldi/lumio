# Phase 4: Study & Cards - Research

**Researched:** 2026-02-08
**Domain:** React Native quiz UI, markdown/LaTeX/code rendering, gesture-based card navigation, haptic feedback
**Confidence:** HIGH

## Summary

Phase 4 builds the core learning experience: a study session where users answer quiz questions on pre-generated cards, navigate between cards with swipe gestures, and view card content with full markdown rendering (including LaTeX formulas and syntax-highlighted code blocks). The backend is already fully implemented -- `card_questions`, `question_votes` tables exist, and `@lumio/core` exposes all needed functions (`getStudyCardsWithQuestions`, `getPreGeneratedQuestion`, `voteQuestion`). The existing PWA mobile app (`apps/mobile/src/pages/StudyPage.tsx`) provides a complete reference implementation of the quiz flow that can be ported to React Native.

The main technical challenges are: (1) rendering markdown with LaTeX and code highlighting in React Native (the PWA uses `react-markdown` + `rehype-katex` + `rehype-highlight` which are web-only), (2) implementing swipe gestures for card navigation using the already-installed `react-native-gesture-handler`, and (3) adding haptic feedback via `expo-haptics`. No new database tables or backend changes are needed.

**Primary recommendation:** Use a WebView-based markdown renderer that bundles KaTeX CSS and highlight.js for card content display, keeping the quiz interaction UI as native React Native components. Use `Gesture.Fling` from `react-native-gesture-handler` for discrete swipe navigation (no `react-native-reanimated` dependency needed). Use `expo-haptics` for answer feedback.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Answer feedback: inline alongside the question (not a separate overlay screen)
- Like/dislike vote appears inline after answering, alongside the explanation (not a separate step)
- Skipped cards are gone for the session (not re-queued)
- User can freely go back to previous answered cards to review
- Haptic feedback MUST differentiate correct vs incorrect (light tap for correct, heavier buzz for incorrect)
- Images MUST be zoomable (pinch-to-zoom) -- useful for diagrams and code screenshots
- End of session: summary screen showing score, correct/incorrect count, time spent, then return to dashboard
- User can quit mid-session: back/X button shows "End session?" confirmation, progress is saved
- Empty state: Study button on dashboard is disabled/grayed when no cards exist

### Claude's Discretion
- Answer feedback presentation (inline vs overlay) -- recommend inline highlight
- Card advance mechanism (manual vs auto) -- recommend manual tap "Next" button
- Swipe direction convention -- recommend left-to-right = previous, right-to-left = next (standard reading direction)
- Progress bar style (continuous bar, dots, or fraction) -- recommend continuous bar with fraction text
- Code highlighting theme (adaptive vs always dark) -- recommend always dark (industry standard for code blocks)
- Long content scroll strategy -- recommend scrollable card content within a fixed quiz layout
- LaTeX rendering approach -- recommend WebView with KaTeX for card content
- Session card count -- recommend all available cards (matching existing PWA behavior)
- Loading states and transitions
- Error handling during study

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-haptics | ~15.0.8 | Haptic feedback for correct/incorrect answers | Expo's official haptics API, compatible with SDK 54, provides `notificationAsync` (Success/Error) and `impactAsync` (Light/Heavy) |
| react-native-webview | ^13.16.0 | Render markdown+LaTeX+code content in card preview | Only reliable way to render KaTeX math formulas in React Native; card-assets bucket is public so URLs work |
| react-native-gesture-handler | ^2.30.0 (already installed) | Swipe gestures for card navigation | Already in the project, provides Fling gesture for discrete swipe detection |
| @expo/vector-icons | ^15.0.3 (already installed) | Icons for quiz UI (checkmark, X, thumbs up/down, skip, etc.) | Already used throughout the app |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @likashefqet/react-native-image-zoom | ^4.3.0 | Pinch-to-zoom for images in card content | Required: user constraint mandates zoomable images |

### Not Needed (already available)
| Library | Already In | Purpose |
|---------|-----------|---------|
| @lumio/core | workspace | `getStudyCardsWithQuestions()`, `getPreGeneratedQuestion()`, `voteQuestion()`, `CardView`, `Deck` |
| @lumio/shared | via @lumio/core | `StudyCard`, `ShuffledQuestion`, `QuestionVote` types |
| react-native-toast-message | installed | Toast notifications for skip, vote, errors |
| react-native-safe-area-context | installed | Safe area insets for quiz screen |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| WebView markdown | react-native-markdown-display | No built-in LaTeX support; last updated Dec 2023; would need separate KaTeX WebView anyway |
| WebView markdown | react-native-marked | LaTeX support is partial/buggy per GitHub issues; adds complexity |
| Gesture.Fling | Gesture.Pan + react-native-reanimated | Smoother card slide animation but adds reanimated dependency (needs babel plugin, native rebuild); Fling is simpler for discrete next/prev |
| @likashefqet/react-native-image-zoom | react-native-zoomable-view | Both work; @likashefqet is built on reanimated but has minimal peer dep requirements |

**Installation:**
```bash
cd apps/android && pnpm add expo-haptics react-native-webview @likashefqet/react-native-image-zoom
```

**CRITICAL: native rebuild required after adding these packages:**
```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

**Note on @likashefqet/react-native-image-zoom:** This library has peer dependencies on `react-native-reanimated` and `react-native-gesture-handler`. Since we already have `react-native-gesture-handler`, we would need to also install `react-native-reanimated`. This adds complexity (babel plugin, native rebuild). **Alternative approach:** implement pinch-to-zoom via a WebView image viewer (open images in a modal WebView with native pinch-zoom support), avoiding the reanimated dependency entirely. **Recommendation:** Use the simpler WebView-based zoom for images rendered inside the already-WebView card content, and only add reanimated if the UX is insufficient.

## Architecture Patterns

### Recommended Project Structure
```
apps/android/
├── screens/
│   ├── StudyScreen.tsx           # Main study session orchestrator
│   └── StudySummaryScreen.tsx    # End-of-session summary
├── components/
│   ├── study/
│   │   ├── QuizCard.tsx          # Single quiz question display with options
│   │   ├── AnswerOption.tsx      # Individual answer button (A/B/C/D)
│   │   ├── ExplanationPanel.tsx  # Post-answer explanation + vote
│   │   ├── ProgressBar.tsx       # Session progress indicator
│   │   ├── QuitConfirmDialog.tsx # "End session?" confirmation
│   │   └── CardContentView.tsx   # WebView-based markdown/LaTeX/code renderer
│   └── ...existing components
├── hooks/
│   ├── useStudySession.ts        # Study session state management hook
│   └── useHaptics.ts             # Haptic feedback abstraction
├── navigation/
│   ├── AppNavigator.tsx          # Add StudyStack
│   └── MainNavigator.tsx         # Existing (unchanged)
└── lib/
    └── cardHtml.ts               # Generate HTML for WebView card rendering
```

### Pattern 1: Study Session State Machine
**What:** Manage study session as a state machine with clear transitions
**When to use:** Orchestrating the study flow (loading -> ready -> studying -> answered -> next -> completed)
**Example:**
```typescript
// Based on existing PWA pattern in apps/mobile/src/pages/StudyPage.tsx
type StudyState = 'loading' | 'no_cards' | 'studying' | 'completed';

interface StudySession {
  cards: StudyCard[];
  currentIndex: number;        // For back-navigation to reviewed cards
  answeredCards: AnsweredCard[]; // Track answers for summary + review
  currentQuestion: ShuffledQuestion | null;
  userAnswer: string | null;
  userVote: QuestionVote | null;
  startedAt: Date;
}

interface AnsweredCard {
  card: StudyCard;
  question: ShuffledQuestion;
  userAnswer: string;
  isCorrect: boolean;
  vote: QuestionVote | null;
}
```

### Pattern 2: Navigation Architecture (Stack inside Tab)
**What:** StudyScreen lives in a Stack navigator, presented modally from the Tab navigator
**When to use:** Study is a focused full-screen experience, not a tab
**Example:**
```typescript
// AppNavigator.tsx wraps MainNavigator in a Stack
// Study is a screen in the root Stack, presented over the tabs
export type RootStackParamList = {
  Main: undefined;
  Study: undefined;
  StudySummary: {
    totalCards: number;
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
    timeSpentSeconds: number;
  };
};
```

### Pattern 3: WebView Card Content Renderer
**What:** Render card markdown content in a WebView with bundled KaTeX + highlight.js
**When to use:** Displaying card content with LaTeX formulas, syntax-highlighted code, and images
**Example:**
```typescript
// lib/cardHtml.ts - Generate self-contained HTML
function generateCardHtml(content: string, isDark: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/${isDark ? 'github-dark' : 'github'}.min.css">
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/highlight.min.js"></script>
  <style>
    body { font-family: system-ui; padding: 16px; margin: 0;
           color: ${isDark ? '#f9fafb' : '#333'};
           background: ${isDark ? '#1f2937' : '#fff'}; }
    img { max-width: 100%; border-radius: 8px; }
    pre { overflow-x: auto; border-radius: 8px; padding: 12px; }
    code { font-size: 14px; }
    /* ...additional styles... */
  </style>
</head>
<body>
  <div id="content"></div>
  <script>
    document.getElementById('content').innerHTML = marked.parse(${JSON.stringify(content)});
    renderMathInElement(document.body, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ]
    });
    hljs.highlightAll();
    // Send height to React Native
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'height', value: document.body.scrollHeight })
    );
  </script>
</body>
</html>`;
}
```

### Pattern 4: Fling Gesture for Card Navigation
**What:** Use Fling gesture from react-native-gesture-handler for discrete next/prev navigation
**When to use:** Swiping between answered cards for review
**Example:**
```typescript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Directions } from 'react-native-gesture-handler';

function StudyScreen() {
  const flingLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => { goToNextCard(); });

  const flingRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => { goToPreviousCard(); });

  const composed = Gesture.Simultaneous(flingLeft, flingRight);

  return (
    <GestureDetector gesture={composed}>
      <View style={{ flex: 1 }}>
        {/* Quiz content */}
      </View>
    </GestureDetector>
  );
}
```

### Anti-Patterns to Avoid
- **Don't create study_sessions / user_cards / user_card_responses tables:** These are documented in DATA-MODEL.md but do NOT exist in the actual database. The phase scope says "backend unchanged." Session tracking is client-side only for now.
- **Don't use react-markdown in React Native:** It's a web library that renders HTML elements, not React Native components.
- **Don't add react-native-reanimated unless absolutely necessary:** It requires a babel plugin (`react-native-reanimated/plugin` must be last in babel.config.js) and a native rebuild. Fling gestures work without it.
- **Don't fetch questions one-by-one on each card advance:** Load all study cards upfront with `getStudyCardsWithQuestions()`, then fetch individual questions as the user advances. This is the same pattern as the PWA.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LaTeX rendering | Custom math parser | WebView + KaTeX CDN | KaTeX handles thousands of LaTeX commands; hand-rolling is months of work |
| Syntax highlighting | Custom token colorizer | WebView + highlight.js CDN | 190+ languages supported; hand-rolling even 10 languages is weeks |
| Markdown parsing | Custom parser | WebView + marked.js CDN (or similar) | CommonMark spec is complex; edge cases everywhere |
| Haptic patterns | Vibration API directly | expo-haptics | Provides proper haptic engine integration vs raw vibration |
| Image zoom | Custom gesture math | WebView native zoom or @likashefqet/react-native-image-zoom | Pinch-to-zoom with proper momentum and bounds is complex |
| Quiz shuffle | Custom shuffle | Shuffle is already done server-side in `get_random_question_for_card` RPC | Server shuffles options and remaps correct answer |

**Key insight:** The card content rendering (markdown + LaTeX + code + images) is by far the most complex part of this phase. A WebView approach reuses the entire web rendering ecosystem (KaTeX, highlight.js, marked.js) without any native library complexity. The quiz interaction itself is straightforward native UI.

## Common Pitfalls

### Pitfall 1: WebView Height Calculation
**What goes wrong:** WebView renders with fixed height, content gets cut off or has excessive whitespace
**Why it happens:** WebView doesn't communicate its content height to React Native by default
**How to avoid:** Use `onMessage` to receive content height from JavaScript, then set WebView height dynamically:
```typescript
<WebView
  onMessage={(event) => {
    const { type, value } = JSON.parse(event.nativeEvent.data);
    if (type === 'height') setWebViewHeight(value);
  }}
  style={{ height: webViewHeight }}
  scrollEnabled={false} // Let parent ScrollView handle scrolling
/>
```
**Warning signs:** Card content appears cut off at bottom, or has large blank space below content

### Pitfall 2: Native Rebuild After Adding expo-haptics / react-native-webview
**What goes wrong:** App crashes on launch or haptics/WebView don't work
**Why it happens:** These packages contain native modules that need to be compiled into the APK
**How to avoid:** Run `npx expo prebuild --platform android --clean` then rebuild APK after adding native dependencies. NEVER use Expo Go for this app.
**Warning signs:** "Module not found" or "Native module not available" errors

### Pitfall 3: Gesture Conflicts with ScrollView
**What goes wrong:** Swipe gestures don't fire, or scrolling inside card content stops working
**Why it happens:** ScrollView and gesture handler both try to claim the touch event
**How to avoid:** Use `Gesture.Fling()` (discrete, velocity-based) instead of `Gesture.Pan()` (continuous). Fling has a higher velocity threshold and doesn't conflict with scroll. Also: apply swipe gestures to the quiz area, not to the card content WebView.
**Warning signs:** Card content won't scroll, or swipe gestures are unreliable

### Pitfall 4: Card Content Images Not Loading
**What goes wrong:** Images in card markdown show as broken/missing
**Why it happens:** Card content has relative image paths (`/assets/diagram.png`) that need to be resolved to Supabase Storage URLs
**How to avoid:** Use `CardView` class from `@lumio/core` to transform content before rendering:
```typescript
const cardView = new CardView(card, repository, supabaseUrl);
const transformedContent = cardView.getContent(); // Images resolved
```
**Warning signs:** Broken image icons in card content

### Pitfall 5: Session State Lost on Android Back Button
**What goes wrong:** User presses Android hardware back button and loses study progress without confirmation
**Why it happens:** React Navigation's default back behavior immediately pops the screen
**How to avoid:** Use `usePreventRemove` hook or `beforeRemove` event listener to intercept navigation and show confirmation dialog
**Warning signs:** No "End session?" dialog when pressing back button

### Pitfall 6: Haptics Not Working on Android Emulator
**What goes wrong:** `expo-haptics` calls succeed silently but no vibration is felt
**Why it happens:** Android emulators don't have haptic hardware
**How to avoid:** Test on physical device (FP5). In development, add console.log before haptic calls for debugging. Don't treat missing haptics as an error.
**Warning signs:** No haptic feedback during testing (expected on emulator)

## Code Examples

### Loading Study Cards (from @lumio/core)
```typescript
// Source: apps/mobile/src/pages/StudyPage.tsx (existing PWA pattern)
import {
  getStudyCardsWithQuestions,
  getPreGeneratedQuestion,
  voteQuestion,
  getUserRepositories,
  Deck,
  CardView,
  getSupabaseUrl,
  type StudyCard,
  type ShuffledQuestion,
  type QuestionVote,
} from '@lumio/core';

// Load all study cards with pre-generated questions
const [repositories, studyCards] = await Promise.all([
  getUserRepositories(),
  getStudyCardsWithQuestions(),
]);

// Filter cards per repository using Deck class
const repoMap = new Map(repositories.map(r => [r.id, r]));
const filteredCards: StudyCard[] = [];
const cardsByRepo = new Map<string, StudyCard[]>();

for (const card of studyCards) {
  const repoCards = cardsByRepo.get(card.repositoryId) || [];
  repoCards.push(card);
  cardsByRepo.set(card.repositoryId, repoCards);
}

for (const [repoId, repoCards] of cardsByRepo) {
  const repo = repoMap.get(repoId);
  if (repo) {
    const deck = new Deck(repo, repoCards);
    filteredCards.push(...deck.getActiveCards() as StudyCard[]);
  }
}
```

### Haptic Feedback for Answer
```typescript
// Source: expo-haptics official docs
import * as Haptics from 'expo-haptics';

async function handleAnswer(selectedAnswer: string, correctAnswer: string) {
  const isCorrect = selectedAnswer === correctAnswer;

  if (isCorrect) {
    // Light success tap
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    // Heavier error buzz
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}
```

### Vote on Question
```typescript
// Source: apps/mobile/src/pages/StudyPage.tsx (existing PWA pattern)
import { voteQuestion } from '@lumio/core';

async function handleVote(questionId: string, vote: QuestionVote) {
  try {
    await voteQuestion(questionId, vote);
    // Update local state
    setUserVote(vote);
    Toast.show({ type: 'success', text1: 'Thanks for the feedback!' });
  } catch (err) {
    Toast.show({ type: 'error', text1: 'Failed to save vote' });
  }
}
```

### Card Content HTML Generation
```typescript
// lib/cardHtml.ts
export function generateCardHtml(
  markdownContent: string,
  isDark: boolean,
): string {
  const bgColor = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#1f2937';
  const codeTheme = isDark ? 'github-dark' : 'github';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/${codeTheme}.min.css">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: ${textColor};
      background: ${bgColor};
      padding: 16px;
      margin: 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0; }
    pre { overflow-x: auto; border-radius: 8px; padding: 12px; font-size: 14px; }
    code { font-family: 'SF Mono', Menlo, monospace; font-size: 14px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { border: 1px solid ${isDark ? '#374151' : '#e5e7eb'}; padding: 8px 12px; text-align: left; }
    th { background: ${isDark ? '#374151' : '#f9fafb'}; font-weight: 600; }
    blockquote { border-left: 4px solid ${isDark ? '#4b5563' : '#d1d5db'}; margin: 12px 0; padding: 8px 16px; color: ${isDark ? '#9ca3af' : '#6b7280'}; }
    h1, h2, h3, h4 { margin-top: 20px; margin-bottom: 8px; }
    a { color: #3b82f6; }
    .katex-display { overflow-x: auto; overflow-y: hidden; }
  </style>
</head>
<body>
  <div id="content"></div>
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/highlight.min.js"><\/script>
  <script>
    const content = ${JSON.stringify(markdownContent)};
    document.getElementById('content').innerHTML = marked.parse(content);
    renderMathInElement(document.body, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ],
      throwOnError: false
    });
    hljs.highlightAll();
    // Report height to RN
    setTimeout(() => {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'height', value: document.body.scrollHeight })
      );
    }, 100);
  <\/script>
</body>
</html>`;
}
```

### Prevent Back Navigation Without Confirmation
```typescript
// Source: React Navigation docs
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';

useEffect(() => {
  const unsubscribe = navigation.addListener('beforeRemove', (e) => {
    if (state !== 'studying') return; // Allow navigation if not actively studying

    e.preventDefault();
    Alert.alert(
      'End Session?',
      'Your progress will be saved. Are you sure you want to quit?',
      [
        { text: 'Continue Studying', style: 'cancel' },
        { text: 'End Session', style: 'destructive', onPress: () => {
          // Save progress, then navigate
          navigation.dispatch(e.data.action);
        }},
      ]
    );
  });
  return unsubscribe;
}, [navigation, state]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Real-time AI question generation | Pre-generated questions (batch mode) | Milestone 12 (Jan 2026) | No LLM latency during study; instant question display |
| Signed URLs for card assets | Public bucket URLs via CardView | Migration 20260114 | Simpler, stateless image resolution |
| Per-user API keys for LLM | Platform-level config | Phase 10 (Jan 2026) | Users don't need their own API keys |
| User-scoped repositories | Shared repositories (user_repositories) | Phase 12 (Jan 2026) | Same card data shared between users |

**Deprecated/outdated:**
- `generateQuiz()` / `validateAnswer()`: Still exported from @lumio/core but replaced by pre-generated questions. Use `getPreGeneratedQuestion()` instead.
- `getStudyCards()`: Replaced by `getStudyCardsWithQuestions()` which only returns cards that have at least one pre-generated question.
- `study_sessions` / `user_cards` / `user_card_responses` tables: Documented in DATA-MODEL.md but NEVER migrated to the database. Do NOT attempt to use or create them -- session tracking is client-side only for this phase.

## Database Reality Check

**Tables that EXIST and are used by this phase:**
- `cards` - Card content with markdown body
- `card_questions` - Pre-generated quiz questions
- `question_votes` - User votes on question quality
- `card_assets` - Image asset mappings
- `repositories` - Repository metadata
- `user_repositories` - User-to-repo associations

**Tables that DO NOT EXIST (despite DATA-MODEL.md documenting them):**
- `study_sessions` - NOT CREATED
- `user_cards` - NOT CREATED
- `user_card_responses` - NOT CREATED
- `goals` - NOT CREATED

**Implication:** Session statistics (score, time spent) are computed client-side and shown on the summary screen, but NOT persisted to the database. This is consistent with the phase scope: "backend unchanged."

## RPC Functions Available
- `get_study_cards_with_questions(p_user_id)` -- Returns cards with at least 1 active question
- `get_random_question_for_card(p_card_id)` -- Returns a random active question (server-side)
- `upsert_question_vote(p_question_id, p_user_id, p_vote_value)` -- Insert/update vote

## Open Questions

1. **Image zoom inside WebView vs native**
   - What we know: WebView already supports pinch-to-zoom natively (`scalesPageToFit`/`setBuiltInZoomControls`). The `<meta viewport>` with `maximum-scale=5.0` enables it.
   - What's unclear: Whether WebView pinch-to-zoom provides good enough UX for the "zoomable images" requirement, or if a separate modal image viewer is needed.
   - Recommendation: Start with WebView native zoom. If UX is insufficient, add a modal image viewer that opens when an image is tapped (intercept image clicks via `onMessage`).

2. **CDN dependency for KaTeX/highlight.js**
   - What we know: Card content rendering via WebView loads KaTeX, highlight.js, and marked.js from CDN URLs.
   - What's unclear: Whether the app should work offline (cards are not cached offline in v1 per REQUIREMENTS).
   - Recommendation: CDN approach is fine for v1. Offline mode is deferred to NAT-04 (v2). If needed later, bundle the JS/CSS files as assets.

3. **Session card count**
   - What we know: The PWA loads ALL available cards and studies them sequentially.
   - What's unclear: Whether this is the right UX for native (could be 100+ cards).
   - Recommendation: Load all cards (matching PWA behavior). The quit-mid-session feature + summary screen handles the "too many cards" scenario naturally.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `apps/mobile/src/pages/StudyPage.tsx` - Complete PWA study flow reference
- Codebase inspection: `packages/core/src/supabase/study.ts` - All study API functions
- Codebase inspection: `packages/shared/src/types/index.ts` - All study types
- Codebase inspection: `supabase/migrations/20260123000001_card_questions.sql` - Question tables and RPC functions
- Database verification: `psql \dt public.*` - Confirmed which tables actually exist
- Expo docs: expo-haptics API - `notificationAsync(Success/Error)`, `impactAsync(Light/Heavy)`, SDK 54 compatible

### Secondary (MEDIUM confidence)
- npm registry: react-native-webview 13.16.0, peer deps react/react-native wildcard
- npm registry: @likashefqet/react-native-image-zoom 4.3.0, requires reanimated + gesture-handler
- npm registry: react-native-markdown-display 7.0.2, last updated Dec 2023, no LaTeX support

### Tertiary (LOW confidence)
- WebSearch: WebView-based markdown+KaTeX rendering approach is standard for React Native apps needing LaTeX
- WebSearch: Fling gesture vs Pan gesture for card navigation -- Fling recommended for discrete transitions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Based on codebase inspection, existing PWA patterns, and npm registry data
- Architecture: HIGH - Direct port of proven PWA architecture to React Native patterns
- Pitfalls: HIGH - Based on known React Native / Expo constraints documented in MEMORY.md
- Card rendering: MEDIUM - WebView approach is well-established but CDN loading pattern needs validation
- Image zoom: MEDIUM - WebView native zoom may or may not meet the "zoomable" requirement fully

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable domain, well-understood patterns)
