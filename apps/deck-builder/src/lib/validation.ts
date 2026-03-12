/** Maximum allowed deck name length */
export const MAX_DECK_NAME_LENGTH = 50;

/** Regex for valid deck names: must start with alphanumeric, then alphanumeric/spaces/hyphens */
export const DECK_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9 -]*$/;

/** Reserved names that cannot be used as deck names */
const RESERVED_NAMES = ['.', '..', '.git'];

/**
 * Validate a deck name.
 * Returns an i18n error key string if invalid, or null if valid.
 */
export function validateDeckName(name: string): string | null {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return 'deck.validation.empty';
  }

  if (trimmed.length > MAX_DECK_NAME_LENGTH) {
    return 'deck.validation.tooLong';
  }

  if (RESERVED_NAMES.includes(trimmed)) {
    return 'deck.validation.reserved';
  }

  if (!DECK_NAME_REGEX.test(trimmed)) {
    return 'deck.validation.invalidChars';
  }

  return null;
}
