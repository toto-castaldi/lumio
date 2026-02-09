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
export function CardContentView({
  content,
  isDark,
  style,
  scrollEnabled = false,
}: CardContentViewProps) {
  // Memoize renderer and tokenizer to avoid re-creation on every render
  const renderer = useMemo(() => new CardRenderer(isDark), [isDark]);
  const tokenizer = useMemo(() => new CardTokenizer(), []);

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
      value={content}
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
