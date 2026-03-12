import { parse as yamlParse, stringify as yamlStringify } from 'yaml';
import type { CardFrontmatter } from '@lumio/shared';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Parse a raw markdown string into CardFrontmatter + body.
 */
export function parseCard(raw: string): { frontmatter: CardFrontmatter; body: string } {
  const match = raw.match(FRONTMATTER_RE);
  const data: Record<string, unknown> = match ? (yamlParse(match[1]) ?? {}) : {};
  const content = match ? match[2] : raw;

  const frontmatter: CardFrontmatter = {
    title: typeof data.title === 'string' ? data.title : '',
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    ...(data.difficulty !== undefined && { difficulty: Number(data.difficulty) }),
    ...(data.language !== undefined && { language: String(data.language) }),
  };

  return { frontmatter, body: content };
}

/**
 * Serialize CardFrontmatter + body back into a markdown string with YAML frontmatter.
 */
export function serializeCard(frontmatter: CardFrontmatter, body: string): string {
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

  const yaml = yamlStringify(data).trimEnd();
  return `---\n${yaml}\n---\n${body}`;
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
