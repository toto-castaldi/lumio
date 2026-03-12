import { describe, it, expect } from 'vitest';

// Pure functions duplicated from the edge function for unit testing.
// The edge function runs in Deno and cannot be imported directly into Vitest.
// These MUST stay in sync with supabase/functions/deck-commit/index.ts.

function validateUserPath(userId: string, filePath: string): string {
  const normalized = filePath.startsWith('/') ? filePath.slice(1) : filePath;
  if (normalized.includes('..')) {
    throw new Error('Access denied: path traversal not allowed');
  }
  if (!normalized.startsWith(`${userId}/`)) {
    throw new Error('Access denied: cannot write outside your directory');
  }
  if (!normalized.endsWith('.md')) {
    throw new Error('Only .md files are supported');
  }
  return normalized;
}

function encodeContent(content: string): string {
  return btoa(unescape(encodeURIComponent(content)));
}

describe('validateUserPath', () => {
  const userId = 'user-uuid-123';

  it('does NOT throw for a valid path owned by the user', () => {
    expect(() => validateUserPath(userId, 'user-uuid-123/deck-name/card.md')).not.toThrow();
  });

  it('returns the normalized path for valid input', () => {
    const result = validateUserPath(userId, 'user-uuid-123/deck-name/card.md');
    expect(result).toBe('user-uuid-123/deck-name/card.md');
  });

  it('throws "Access denied" for a path owned by a different user', () => {
    expect(() => validateUserPath(userId, 'other-user/deck-name/card.md')).toThrow(
      'Access denied: cannot write outside your directory',
    );
  });

  it('throws "path traversal" for paths containing ..', () => {
    expect(() => validateUserPath(userId, 'user-uuid-123/../other-user/card.md')).toThrow(
      'Access denied: path traversal not allowed',
    );
  });

  it('normalizes leading slash and does NOT throw', () => {
    const result = validateUserPath(userId, '/user-uuid-123/deck-name/card.md');
    expect(result).toBe('user-uuid-123/deck-name/card.md');
  });

  it('throws "Only .md files" for non-markdown files', () => {
    expect(() => validateUserPath(userId, 'user-uuid-123/deck/file.txt')).toThrow(
      'Only .md files are supported',
    );
  });
});

describe('encodeContent', () => {
  it('returns valid base64 for ASCII content', () => {
    const encoded = encodeContent('Hello');
    expect(encoded).toBe(btoa('Hello'));
    expect(atob(encoded)).toBe('Hello');
  });

  it('handles UTF-8 correctly (Italian accented characters)', () => {
    const input = 'Ciao, come stai? Ecco i concetti piu importanti';
    const encoded = encodeContent(input);
    // Decode and verify round-trip
    const decoded = decodeURIComponent(escape(atob(encoded)));
    expect(decoded).toBe(input);
  });

  it('handles emoji and multibyte characters', () => {
    const input = 'Studia bene! \u{1F4DA}';
    const encoded = encodeContent(input);
    const decoded = decodeURIComponent(escape(atob(encoded)));
    expect(decoded).toBe(input);
  });
});
