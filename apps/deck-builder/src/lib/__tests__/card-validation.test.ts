import { describe, it, expect } from 'vitest';
import { slugify, validateCardTitle, MAX_CARD_TITLE_LENGTH } from '../card-validation';

describe('slugify', () => {
  it('converts "My First Card" to "my-first-card"', () => {
    expect(slugify('My First Card')).toBe('my-first-card');
  });

  it('converts "Algoritmo SM-2" to "algoritmo-sm-2"', () => {
    expect(slugify('Algoritmo SM-2')).toBe('algoritmo-sm-2');
  });

  it('trims and handles "  spaces  " correctly', () => {
    expect(slugify('  spaces  ')).toBe('spaces');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('strips special chars from "Hello! World?"', () => {
    expect(slugify('Hello! World?')).toBe('hello-world');
  });

  it('removes leading/trailing hyphens', () => {
    expect(slugify('-leading-and-trailing-')).toBe('leading-and-trailing');
  });
});

describe('validateCardTitle', () => {
  it('returns null for a valid title', () => {
    expect(validateCardTitle('Valid Title')).toBeNull();
  });

  it('returns "card.validation.empty" for empty string', () => {
    expect(validateCardTitle('')).toBe('card.validation.empty');
  });

  it('returns "card.validation.empty" for whitespace-only string', () => {
    expect(validateCardTitle('   ')).toBe('card.validation.empty');
  });

  it('returns "card.validation.tooLong" for string over 100 chars', () => {
    const longTitle = 'a'.repeat(MAX_CARD_TITLE_LENGTH + 1);
    expect(validateCardTitle(longTitle)).toBe('card.validation.tooLong');
  });
});
