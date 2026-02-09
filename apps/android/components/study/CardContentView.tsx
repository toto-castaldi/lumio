/**
 * Native markdown card content renderer.
 *
 * Renders markdown content using react-native-marked with:
 * - Syntax-highlighted code blocks (react-native-code-highlighter)
 * - LaTeX formula rendering (KaTeX via micro-WebView)
 * - Full-width images with aspect ratio preservation
 * - Dark/light theme adaptation
 *
 * Replaces the previous WebView-based implementation that caused
 * content cutoff (BUG-01) due to async height reporting.
 */

import React, { useMemo } from 'react';
import { type ViewStyle } from 'react-native';
import Markdown from 'react-native-marked';
import { CardRenderer } from './CardRenderer';
import { CardTokenizer } from './CardTokenizer';

interface CardContentViewProps {
  /** Markdown content to render (may include LaTeX, code blocks, images) */
  content: string;
  /** Whether to use dark theme colors */
  isDark: boolean;
  /** Optional additional styles for the container */
  style?: ViewStyle;
  /** Whether the internal FlatList should scroll (default: false) */
  scrollEnabled?: boolean;
}

/**
 * Renders card markdown content natively via react-native-marked with
 * full support for LaTeX formulas, syntax-highlighted code blocks,
 * and images.
 *
 * Uses FlatList internally (from react-native-marked). The scrollEnabled
 * prop controls whether this FlatList scrolls independently. When used
 * inside CardPreviewModal, scrollEnabled should be true so the FlatList
 * is the sole scroll container.
 */
/**
 * Pre-process markdown to wrap LaTeX delimiters in backticks so
 * marked treats them as codespan tokens. This lets CardRenderer.codespan()
 * detect and render them via KaTeXView.
 *
 * Skips content inside fenced code blocks (``` ... ```).
 */
function wrapLatexInCodespans(md: string): string {
  // Split by fenced code blocks to avoid replacing inside them
  const parts = md.split(/(```[\s\S]*?```)/g);
  return parts
    .map((part, i) => {
      // Odd indices are code blocks — leave them untouched
      if (i % 2 === 1) return part;
      // Display math: $$...$$ (may span lines)
      let result = part.replace(/\$\$([^$]+?)\$\$/g, '`$$$1$$`');
      // Inline math: $...$ (single line, not inside backticks)
      result = result.replace(/(?<!`)\$([^\$\n]+?)\$(?!`)/g, '`$$$1$$`');
      return result;
    })
    .join('');
}

export function CardContentView({
  content,
  isDark,
  style,
  scrollEnabled = false,
}: CardContentViewProps) {
  // Memoize renderer and tokenizer to avoid re-creation on every render
  const renderer = useMemo(() => new CardRenderer(isDark), [isDark]);
  const tokenizer = useMemo(() => new CardTokenizer(), []);

  // Pre-process content to wrap LaTeX in backticks for tokenizer detection
  const processedContent = useMemo(() => wrapLatexInCodespans(content), [content]);

  // Theme object for react-native-marked matching app theme
  const markdownTheme = useMemo(
    () => ({
      colors: {
        text: isDark ? '#f9fafb' : '#333333',
        link: isDark ? '#60a5fa' : '#3B82F6',
        border: isDark ? '#374151' : '#e5e7eb',
        code: isDark ? '#111827' : '#f3f4f6',
      },
    }),
    [isDark],
  );

  return (
    <Markdown
      value={processedContent}
      flatListProps={{
        style: [
          { backgroundColor: 'transparent' },
          style,
        ],
        scrollEnabled,
        contentContainerStyle: {
          paddingHorizontal: 16,
          paddingVertical: 8,
        },
      }}
      renderer={renderer}
      tokenizer={tokenizer}
      theme={markdownTheme}
    />
  );
}
