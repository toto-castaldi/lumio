import { describe, it, expect } from 'vitest';
import { validateDeckName } from '../validation';

describe('validateDeckName', () => {
  it('returns empty error for empty string', () => {
    expect(validateDeckName('')).toBe('deck.validation.empty');
  });

  it('returns empty error for whitespace-only string', () => {
    expect(validateDeckName('   ')).toBe('deck.validation.empty');
  });

  it('returns tooLong error for names over 50 chars', () => {
    expect(validateDeckName('a'.repeat(51))).toBe('deck.validation.tooLong');
  });

  it('returns reserved error for "."', () => {
    expect(validateDeckName('.')).toBe('deck.validation.reserved');
  });

  it('returns reserved error for ".."', () => {
    expect(validateDeckName('..')).toBe('deck.validation.reserved');
  });

  it('returns reserved error for ".git"', () => {
    expect(validateDeckName('.git')).toBe('deck.validation.reserved');
  });

  it('returns invalidChars error for name containing "/"', () => {
    expect(validateDeckName('my/deck')).toBe('deck.validation.invalidChars');
  });

  it('returns invalidChars error for name containing "@"', () => {
    expect(validateDeckName('my@deck')).toBe('deck.validation.invalidChars');
  });

  it('returns invalidChars error for name starting with hyphen', () => {
    expect(validateDeckName('-starts-with-hyphen')).toBe('deck.validation.invalidChars');
  });

  it('returns null for valid name with spaces and numbers', () => {
    expect(validateDeckName('My Deck 1')).toBeNull();
  });

  it('returns null for valid name with hyphens', () => {
    expect(validateDeckName('math-101')).toBeNull();
  });

  it('returns null for valid single character name', () => {
    expect(validateDeckName('A')).toBeNull();
  });

  it('returns null for valid name at max length (50 chars)', () => {
    expect(validateDeckName('a'.repeat(50))).toBeNull();
  });

  it('trims whitespace before validation', () => {
    // " My Deck " should be trimmed to "My Deck" which is valid
    expect(validateDeckName(' My Deck ')).toBeNull();
  });
});
