import matter from 'gray-matter';
import type { CardFrontmatter } from '@lumio/shared';

/**
 * Parse a raw markdown string into CardFrontmatter + body.
 * Uses gray-matter to extract YAML frontmatter.
 */
export function parseCard(raw: string): { frontmatter: CardFrontmatter; body: string } {
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;

  const frontmatter: CardFrontmatter = {
    title: typeof data.title === 'string' ? data.title : '',
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    ...(data.difficulty !== undefined && { difficulty: Number(data.difficulty) }),
    ...(data.language !== undefined && { language: String(data.language) }),
  };

  return { frontmatter, body: parsed.content };
}

/**
 * Serialize CardFrontmatter + body back into a markdown string with YAML frontmatter.
 * Uses gray-matter stringify.
 */
export function serializeCard(frontmatter: CardFrontmatter, body: string): string {
  // Build a clean data object, omitting undefined fields
  const data: Record<string, unknown> = {
    title: frontmatter.title,
    tags: frontmatter.tags,
  };
  if (frontmatter.difficulty !== undefined) {
    data.difficulty = frontmatter.difficulty;
  }
  if (frontmatter.language !== undefined) {
    data.language = frontmatter.language;
  }

  return matter.stringify(body, data);
}

/**
 * Generate a card template for a given locale.
 * Produces a markdown string with frontmatter (title: '', tags: [], language: locale, NO difficulty)
 * and an example body with heading, paragraph, code block, and math block.
 */
export function generateCardTemplate(locale: string): string {
  const frontmatter: CardFrontmatter = {
    title: '',
    tags: [],
    language: locale,
  };

  const body = `# Card Title

Write your card content here.

## Code Example

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Math Example

The quadratic formula:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

Inline math: $E = mc^2$
`;

  return serializeCard(frontmatter, body);
}
