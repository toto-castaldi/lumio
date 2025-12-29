// App metadata
export const APP_NAME = 'Lumio';
export const APP_DESCRIPTION = 'AI-powered flashcard study platform';

// SM-2 Algorithm defaults
export const SM2_DEFAULTS = {
  initialEasiness: 2.5,
  minEasiness: 1.3,
  initialInterval: 1,
} as const;

// Study defaults
export const STUDY_DEFAULTS = {
  defaultMasteryTarget: 85,
  maxCardsPerSession: 50,
} as const;

// Card format
export const CARD_FORMAT = {
  version: 1,
  minDifficulty: 1,
  maxDifficulty: 5,
  defaultDifficulty: 3,
  defaultLanguage: 'en',
} as const;
