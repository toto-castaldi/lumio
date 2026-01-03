// App metadata
export const APP_NAME = 'Lumio';

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

// API Key prefixes for validation
export const API_KEY_PREFIXES = {
  openai: 'sk-',
  anthropic: 'sk-ant-',
} as const;

// Supported LLM models per provider
export const LLM_MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] as const,
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'] as const,
} as const;

// Default LLM model per provider
export const DEFAULT_LLM_MODEL = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
} as const;
