# Feature Research: Native Study/Flashcard App

**Domain:** Mobile study/flashcard application (Android native)
**Researched:** 2026-01-29
**Confidence:** MEDIUM (based on multiple WebSearch sources with cross-verification)

## Context: Lumio's Unique Position

Lumio differs from traditional flashcard apps in fundamental ways that affect feature prioritization:

| Traditional Flashcard Apps | Lumio |
|---------------------------|-------|
| Card = Q&A pair | Card = Concept only |
| User creates questions | AI generates questions dynamically |
| Content created in-app | Content from GitHub repositories |
| Static question set | Questions vary each session |
| Success = recite answer | Success = understand concept |

**Implication:** Some "table stakes" features for traditional flashcard apps are anti-features for Lumio, and vice versa.

---

## Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Smooth study session UX** | Core product value | MEDIUM | Swipe gestures, responsive transitions, no jank |
| **Progress visualization** | Users need feedback on learning | MEDIUM | Daily/weekly stats, cards studied, mastery progress |
| **Dark mode** | 79% of students prefer it; reduces eye strain at night | LOW | System setting respect + manual toggle |
| **Offline capability (basic)** | Study happens in transit, without reliable internet | HIGH | Cache pre-generated questions, sync when online |
| **Push notifications** | Study reminders drive retention | LOW | Configurable, not aggressive |
| **Fast app launch** | < 3 second cold start expected | MEDIUM | Native advantage over PWA |
| **Authentication persistence** | Don't make users re-login | LOW | Secure token storage, biometric unlock option |
| **Markdown rendering** | Cards contain formatted content | MEDIUM | Already have in PWA; need native equivalent |
| **Question voting (like/dislike)** | Existing Lumio feature users expect | LOW | Already implemented in PWA |
| **Repository management** | Add/remove GitHub repos | LOW | Mirror PWA functionality |

### Mobile-Specific Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Native gestures** | Tinder-style swipe is now standard for card-based UX | MEDIUM | Swipe right = correct, left = review later |
| **Haptic feedback** | Confirmation of actions feels premium | LOW | Light haptic on card flip, success, error |
| **Bottom navigation** | Thumb-friendly zone; modern Android pattern | LOW | Material Design 3 bottom nav |
| **Pull-to-refresh** | Standard mobile pattern for data sync | LOW | Refresh study queue, check repo updates |
| **Device back button handling** | Android users expect it to work | LOW | Proper navigation stack management |

---

## Differentiators (Competitive Advantage)

Features that set Lumio apart. Not required, but create significant value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI-generated questions** | Core Lumio value - already built | N/A | Migrate existing functionality |
| **Home screen widget** | Study right from home screen; passive learning | MEDIUM | Show daily card, streak, quick-study button |
| **Goal-based study** | Study with purpose, not just repetition | LOW | Already in PWA - migrate |
| **Deadline tracking** | "On track / behind" status motivates | LOW | Already in PWA - migrate |
| **Study streak** | 40-60% higher DAU with streaks; loss aversion drives engagement | LOW | Simple counter with notifications |
| **Quick session mode** | 5-minute micro-study sessions | LOW | Perfect for native - instant launch |
| **Confidence-based rating** | Brainscape-style 1-5 confidence vs binary right/wrong | MEDIUM | More nuanced than yes/no; better spaced repetition |
| **Voice input for answers** | Hands-free study (walking, commuting) | HIGH | Android Speech-to-Text API |
| **Focus timer integration** | Pomodoro built-in | MEDIUM | 25-min sessions with breaks |
| **Biometric app lock** | Protect study data | LOW | Fingerprint/face unlock |

### Native-Exclusive Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Background sync** | Repos sync while app closed | MEDIUM | WorkManager for periodic sync |
| **True offline mode** | PWA offline is limited; native can do better | HIGH | SQLite local DB, queue operations |
| **Share to Lumio** | Share text/URLs to create study notes | MEDIUM | Android share intent handling |
| **System notification actions** | "Study now" button in notification | LOW | NotificationCompat with actions |

---

## Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for Lumio specifically.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **In-app card creation** | "I want to add my own content" | Violates Lumio's Git-based content model; requires maintaining editor | Point users to creating cards in Git repo; provide templates |
| **Social/community decks** | "I want to see what others study" | Quality control nightmare; Quizlet has 500M+ cards of variable quality; Lumio's value is curated Git repos | Repository discovery page (already planned) |
| **Real-time multiplayer study** | Gamification appeal | Complex to build; distracts from core learning; Duolingo shows streaks hurt actual learning | Async leaderboards if needed later |
| **Extensive gamification** | Points, badges, XP, levels | Explicitly excluded in PRD; shifts focus from learning to game; Duolingo critique applies | Simple streak only; focus on mastery |
| **Multiple simultaneous goals** | "I want to study everything" | Cognitive overload; one goal = focus | Single active goal (current design) |
| **Custom study algorithms** | "Let me configure spaced repetition" | Anki's complexity is a barrier; Lumio should "just work" | SM-2 with sensible defaults; AI handles adaptation |
| **Video content support** | "I learn better with video" | Scope creep; Lumio is text/concept focused | Cards can link to external video resources |
| **Full offline AI** | "Generate questions without internet" | On-device LLM quality insufficient; massive app size | Pre-cache questions in batch (Milestone 12) |
| **Cross-platform sync editing** | "Edit cards on mobile" | Git is source of truth; editing creates merge conflicts | Read-only on mobile; edit via Git on desktop |
| **Achievement badges galore** | "I want more motivation" | Proven to distract from learning; shifts motivation from intrinsic to extrinsic | Goal completion celebration only |

---

## Feature Dependencies

```
[Authentication]
    |
    +---> [Repository Management]
    |         |
    |         +---> [Card Sync/Cache]
    |                   |
    |                   +---> [Offline Study]
    |                   |
    |                   +---> [Study Session]
    |                             |
    |                             +---> [Progress Tracking]
    |                             |
    |                             +---> [Question Voting]
    |                             |
    |                             +---> [Goal Progress]
    |
    +---> [Goal Management]
              |
              +---> [Goal Progress]
              |
              +---> [Deadline Tracking]
              |
              +---> [Push Notifications]

[Native Features - Independent]
    |
    +---> [Dark Mode] (standalone)
    +---> [Home Screen Widget] (requires Study Session)
    +---> [Haptic Feedback] (requires Study Session)
    +---> [Biometric Lock] (requires Authentication)
```

### Dependency Notes

- **Study Session requires Card Sync**: Cannot study without cached questions
- **Offline Study requires Card Sync with local storage**: Pre-cached questions essential
- **Widget requires Study Session**: Widget triggers study, needs session logic
- **Push Notifications require Goal Management**: Reminders based on goal deadlines
- **Progress Tracking depends on Study Session**: Need data to visualize

---

## MVP Definition

### Launch With (v1 Native)

Minimum viable native app - feature parity with PWA, plus essential native enhancements.

- [x] **Google OAuth login** - Existing functionality, migrate
- [x] **Dashboard with stats** - Existing functionality, migrate
- [x] **Repository management** - Existing functionality, migrate
- [x] **Study mode with AI questions** - Core value proposition
- [x] **Card preview with markdown** - Existing functionality, migrate
- [ ] **Native gestures (swipe)** - Essential for native feel
- [ ] **Dark mode** - User expectation, easy win
- [ ] **Haptic feedback** - Polish that signals "native"
- [ ] **Bottom navigation** - Android convention
- [ ] **Push notifications** - Study reminders

### Add After Validation (v1.x)

Features to add once core native app is stable.

- [ ] **Home screen widget** - Trigger: Users request quick access
- [ ] **Study streak** - Trigger: Need to improve retention metrics
- [ ] **Offline mode (basic)** - Trigger: Users report connectivity issues
- [ ] **Background repo sync** - Trigger: Users want fresher content
- [ ] **Quick session mode (5 min)** - Trigger: Usage data shows short sessions preferred

### Future Consideration (v2+)

Features to defer until native app has traction.

- [ ] **Voice input** - Why defer: Complex integration, niche use case
- [ ] **Focus timer** - Why defer: Not core to Lumio's value proposition
- [ ] **Confidence-based rating** - Why defer: Requires algorithm changes
- [ ] **Share to Lumio** - Why defer: Content model unclear
- [ ] **Wearable support** - Why defer: Small user base

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Study session with swipe gestures | HIGH | MEDIUM | P1 |
| Dark mode | HIGH | LOW | P1 |
| Google OAuth login | HIGH | LOW | P1 |
| Dashboard/stats | HIGH | MEDIUM | P1 |
| Repository management | HIGH | LOW | P1 |
| Push notifications | MEDIUM | LOW | P1 |
| Haptic feedback | MEDIUM | LOW | P1 |
| Bottom navigation | MEDIUM | LOW | P1 |
| Question voting | MEDIUM | LOW | P1 |
| Card markdown rendering | HIGH | MEDIUM | P1 |
| Home screen widget | MEDIUM | MEDIUM | P2 |
| Study streak | MEDIUM | LOW | P2 |
| Offline mode (basic) | HIGH | HIGH | P2 |
| Background sync | MEDIUM | MEDIUM | P2 |
| Quick session mode | MEDIUM | LOW | P2 |
| Voice input | LOW | HIGH | P3 |
| Focus timer | LOW | MEDIUM | P3 |
| Biometric lock | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch (feature parity + native essentials)
- P2: Should have, add in subsequent releases
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Anki | Quizlet | Brainscape | Lumio Approach |
|---------|------|---------|------------|----------------|
| Spaced repetition | SM-2, highly configurable | Limited (removed from free) | Confidence-Based Repetition | SM-2, AI-enhanced |
| Card creation | In-app, complex | In-app, simple | In-app, guided | Git-based (NOT in-app) |
| Question generation | Manual | Manual + AI assist | Manual | **AI-generated (core differentiator)** |
| Offline | Full offline | Limited | Limited | Cached questions (P2) |
| Social features | Community decks | 500M+ shared sets | Classroom features | Repository discovery only |
| Gamification | None | Badges, streaks | Progress bars | **Minimal - streak only** |
| Pricing | Free (iOS $25) | Freemium ($36/yr) | Freemium | Free (BYOK for AI) |
| Study modes | 1 (card flip) | 5 modes | 1 (confidence rating) | 1 (AI quiz) |
| Widget | AnkiDroid has widget | No | No | **Native widget (P2)** |
| Dark mode | Yes | Yes | Yes | Yes (P1) |

### Lumio's Competitive Positioning

1. **Not competing on card quantity** - Quality over quantity via curated Git repos
2. **Not competing on gamification** - Learning > engagement theater
3. **Competing on AI-generated questions** - Unique value proposition
4. **Competing on simplicity** - Anki is powerful but complex; Lumio "just works"
5. **Native experience** - PWA limitations addressed with native app

---

## Sources

### Flashcard App Comparisons
- [Quizlet vs Anki 2026 Comparison - ToolDiscovery](https://www.aitooldiscovery.com/guides/quizlet-vs-anki) (MEDIUM confidence)
- [Flashcard App Showdown - Lexplorers](https://lexplorers.com/flashcard-app-showdown-quizlet-vs-anki-vs-memrise/) (MEDIUM confidence)
- [20 Best Quizlet Alternatives 2026 - TriviaMaker](https://triviamaker.com/quizlet-alternatives/) (MEDIUM confidence)

### Mobile UX Patterns
- [Mobile Navigation UX Best Practices 2026 - DesignStudioUIUX](https://www.designstudiouiux.com/blog/mobile-navigation-ux/) (MEDIUM confidence)
- [Material Design 3 Gestures](https://m3.material.io/foundations/interaction/gestures) (HIGH confidence - official docs)
- [Android Haptics Principles - Android Developers](https://developer.android.com/develop/ui/views/haptics/haptics-principles) (HIGH confidence - official docs)

### Gamification & Engagement
- [Duolingo's Gamification Secrets - Orizon](https://www.orizon.co/blog/duolingos-gamification-secrets) (MEDIUM confidence)
- [Streaks for Gamification - Plotline](https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps) (MEDIUM confidence)
- [Why Gamification Fails 2026 - Medium](https://medium.com/design-bootcamp/why-gamification-fails-new-findings-for-2026-fff0d186722f) (LOW confidence - opinion piece)

### Feature Creep Prevention
- [Feature Creep Anti-Pattern - DevIQ](https://deviq.com/antipatterns/feature-creep/) (MEDIUM confidence)
- [Feature Creep - Wikipedia](https://en.wikipedia.org/wiki/Feature_creep) (MEDIUM confidence)

### Dark Mode Research
- [Benefits of Dark Mode 2026 - Superhuman](https://blog.superhuman.com/why-do-people-use-dark-mode/) (MEDIUM confidence)
- [Light vs Dark Mode Visual Fatigue - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12027292/) (HIGH confidence - peer-reviewed)

### Widget & Native Features
- [AnkiDroid - Google Play](https://play.google.com/store/apps/details?id=com.ichi2.anki) (HIGH confidence - official app)
- [Flashcard Widget](https://flashcardwidget.com/) (MEDIUM confidence)

---

*Feature research for: Native Android study/flashcard app (Lumio)*
*Researched: 2026-01-29*
