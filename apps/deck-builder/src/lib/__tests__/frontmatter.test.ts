import { describe, it, expect } from 'vitest';
import { parseCard, serializeCard, generateCardTemplate } from '../frontmatter';

describe('parseCard', () => {
  it('extracts title, tags, difficulty, language from valid frontmatter + body', () => {
    const raw = `---
title: My Card
tags:
  - math
  - algebra
difficulty: 3
language: en
---

# Hello

Some body content.`;

    const result = parseCard(raw);
    expect(result.frontmatter.title).toBe('My Card');
    expect(result.frontmatter.tags).toEqual(['math', 'algebra']);
    expect(result.frontmatter.difficulty).toBe(3);
    expect(result.frontmatter.language).toBe('en');
    expect(result.body.trim()).toContain('# Hello');
    expect(result.body.trim()).toContain('Some body content.');
  });

  it('returns empty CardFrontmatter fields when frontmatter is missing/minimal', () => {
    const raw = 'Just some plain text without frontmatter.';

    const result = parseCard(raw);
    expect(result.frontmatter.title).toBe('');
    expect(result.frontmatter.tags).toEqual([]);
    expect(result.frontmatter.difficulty).toBeUndefined();
    expect(result.frontmatter.language).toBeUndefined();
  });
});

describe('serializeCard', () => {
  it('produces markdown string with YAML frontmatter block (--- delimiters) + body', () => {
    const fm = { title: 'Test Card', tags: ['a', 'b'], difficulty: 2, language: 'en' };
    const body = '# Content\n\nSome text.';

    const result = serializeCard(fm, body);
    expect(result).toContain('---');
    expect(result).toContain('title: Test Card');
    expect(result).toContain('# Content');
    expect(result).toContain('Some text.');
  });

  it('round-trips with parseCard (parse(serialize(fm, body)) equals original)', () => {
    const fm = { title: 'Round Trip', tags: ['x', 'y'], difficulty: 5, language: 'it' };
    const body = 'Body text here.\n\nAnother paragraph.';

    const serialized = serializeCard(fm, body);
    const parsed = parseCard(serialized);
    expect(parsed.frontmatter.title).toBe(fm.title);
    expect(parsed.frontmatter.tags).toEqual(fm.tags);
    expect(parsed.frontmatter.difficulty).toBe(fm.difficulty);
    expect(parsed.frontmatter.language).toBe(fm.language);
    expect(parsed.body.trim()).toBe(body);
  });
});

describe('generateCardTemplate', () => {
  it("produces string with language: en, empty title, empty tags array, no difficulty field for locale 'en'", () => {
    const result = generateCardTemplate('en');
    const parsed = parseCard(result);
    expect(parsed.frontmatter.language).toBe('en');
    expect(parsed.frontmatter.title).toBe('');
    expect(parsed.frontmatter.tags).toEqual([]);
    expect(parsed.frontmatter.difficulty).toBeUndefined();
  });

  it("uses language: it for locale 'it'", () => {
    const result = generateCardTemplate('it');
    const parsed = parseCard(result);
    expect(parsed.frontmatter.language).toBe('it');
  });

  it('includes example code block and math block in body', () => {
    const result = generateCardTemplate('en');
    const parsed = parseCard(result);
    expect(parsed.body).toContain('```');
    expect(parsed.body).toContain('$$');
  });

  it('output is parseable by parseCard', () => {
    const result = generateCardTemplate('en');
    const parsed = parseCard(result);
    expect(parsed.frontmatter).toBeDefined();
    expect(parsed.body).toBeDefined();
    expect(parsed.body.length).toBeGreaterThan(0);
  });
});
