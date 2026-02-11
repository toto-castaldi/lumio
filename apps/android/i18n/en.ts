const en = {
  common: {
    cancel: 'Cancel',
    delete: 'Delete',
    back: 'Back',
    start: 'Start',
    unknownUser: 'Unknown user',
    unknownError: 'Unknown error',
  },
  login: {
    tagline: 'Your flashcards, supercharged',
    signInWithGoogle: 'Sign in with Google',
    googleNotConfigured:
      'Google Sign-In not configured.\nSet EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    signInFailed: 'Sign in failed',
    lumioLogo: 'Lumio logo',
  },
  dashboard: {
    repositories: 'Repositories',
    cards: 'Cards',
    lastStudied: 'Last Studied',
    notYet: 'Not yet',
    justNow: 'Just now',
    mAgo: '%{count}m ago',
    hAgo: '%{count}h ago',
    dAgo: '%{count}d ago',
    startStudySession: 'Start Study Session',
    emptyTitle: 'No Repositories Yet',
    emptySubtitle:
      'Add a repository to start studying. Your flashcards will appear here once a repo is synced.',
    goToRepos: 'Go to Repositories',
  },
  repos: {
    failedToLoad: 'Failed to load repositories',
    repoAdded: 'Repository added',
    syncingCards: 'Syncing cards from repository...',
    privateRepo: 'Private repository?',
    enterPat: 'Enter a Personal Access Token to add this repo.',
    failedToAdd: 'Failed to add repository',
    deleteConfirmTitle: 'Delete Repository',
    deleteConfirmBody:
      'Are you sure you want to delete "%{name}"? All associated cards will also be removed.',
    repoDeleted: 'Repository deleted',
    repoDeletedBody: '"%{name}" has been removed.',
    failedToDelete: 'Failed to delete repository',
    emptyTitle: 'No repositories yet',
    emptySubtitle:
      'Add a GitHub repository URL above to get started. Your flashcards will appear after syncing.',
  },
  study: {
    review: 'Review',
    studyTitle: 'Study',
    skip: 'Skip',
    skipping: 'Skipping...',
    cardSkipped: 'Card skipped',
    loadingCards: 'Loading cards...',
    noCardsTitle: 'No cards available',
    noCardsSubtitle:
      'Questions are being prepared. Try again in a few minutes.',
    backToDashboard: 'Back to Dashboard',
    readyTitle: 'Ready to study',
    studyingXOfY: 'Studying %{limit} of %{total} cards',
    cardsAvailable: '%{count} cards available',
    start: 'Start',
    loadingQuestion: 'Loading question...',
    endSessionTitle: 'End Session?',
    endSessionBody: 'Your progress will be saved.',
    continueStudying: 'Continue Studying',
    endSession: 'End Session',
    prevCard: 'Prev Card',
    nextCard: 'Next Card',
    finish: 'Finish',
    backToCurrentCard: 'Back to Current Card',
    sessionComplete: 'Session Complete',
    studiedAllCards: 'You studied all available cards',
  },
  summary: {
    title: 'Session Complete!',
    score: 'Score',
    correct: 'Correct',
    incorrect: 'Incorrect',
    skipped: 'Skipped',
    time: 'Time',
    returnToDashboard: 'Return to Dashboard',
  },
  settings: {
    account: 'Account',
    appearance: 'Appearance',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    study: 'Study',
    tenCards: '10 cards',
    twentyCards: '20 cards',
    fiftyCards: '50 cards',
    allCards: 'All cards',
    language: 'Language',
    logOut: 'Log out',
    versionCopied: 'Version copied',
  },
  components: {
    urlRequired: 'Repository URL is required',
    invalidGithubUrl: 'Enter a valid GitHub repository URL',
    privateRepoPatLabel:
      'This repository appears to be private. Enter a Personal Access Token (PAT) to access it.',
    submitWithToken: 'Submit with Token',
    noInternet: 'No internet connection',
    delete: 'Delete',
    correct: 'Correct!',
    incorrect: 'Incorrect',
    questionHelpful: 'Was this question helpful?',
    yes: 'Yes',
    no: 'No',
    cardContent: 'Card Content',
    noCardContent: 'No card content to display',
  },
  navigation: {
    repositories: 'Repositories',
    settings: 'Settings',
  },
} as const;

export default en;

/**
 * Translation type that preserves key structure but widens values to string.
 * This allows Italian (and future locales) to have different string values
 * while enforcing the same nested key shape.
 */
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends Record<string, unknown>
    ? DeepStringify<T[K]>
    : string;
};

export type Translations = DeepStringify<typeof en>;
