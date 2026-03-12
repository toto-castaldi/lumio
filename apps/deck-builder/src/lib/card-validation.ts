/** Maximum allowed card title length */
export const MAX_CARD_TITLE_LENGTH = 100;

/**
 * Convert a title to a URL/filename-safe slug.
 * - lowercase
 * - trim whitespace
 * - spaces to hyphens
 * - strip non-alphanumeric except hyphens
 * - collapse multiple hyphens
 * - strip leading/trailing hyphens
 */
export function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/[^a-z0-9-]/g, '')     // strip non-alphanumeric except hyphens
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');       // strip leading/trailing hyphens
}

/**
 * Validate a card title.
 * Returns an i18n error key string if invalid, or null if valid.
 * Same pattern as validateDeckName.
 */
export function validateCardTitle(title: string): string | null {
  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return 'card.validation.empty';
  }

  if (trimmed.length > MAX_CARD_TITLE_LENGTH) {
    return 'card.validation.tooLong';
  }

  return null;
}
