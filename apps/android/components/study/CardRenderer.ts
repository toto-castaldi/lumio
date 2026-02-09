/**
 * Custom react-native-marked Renderer with syntax-highlighted code blocks,
 * LaTeX expression detection, and full-width image support.
 *
 * Extends the default Renderer to provide:
 * - Code blocks: Uses react-native-code-highlighter with hljs themes
 * - Codespan: Detects LaTeX expressions (from CardTokenizer) and renders
 *   them via KaTeXView; otherwise renders default inline code
 * - Images: Full-width with 16:9 aspect ratio default
 *
 * Theme-aware: Accepts isDark in constructor for dark/light adaptation.
 */

import React, { type ReactNode } from 'react';
import {
  Image,
  Text,
  View,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Renderer } from 'react-native-marked';
import type { RendererInterface } from 'react-native-marked';
import CodeHighlighter from 'react-native-code-highlighter';
import {
  atomOneDark,
  atomOneLight,
} from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { KaTeXView } from './KaTeXView';

class CardRenderer extends Renderer implements RendererInterface {
  private isDark: boolean;

  constructor(isDark: boolean) {
    super();
    this.isDark = isDark;
  }

  code(
    text: string,
    language?: string,
    containerStyle?: ViewStyle,
    textStyle?: TextStyle,
  ): ReactNode {
    return React.createElement(CodeHighlighter, {
      key: this.getKey(),
      hljsStyle: this.isDark ? atomOneDark : atomOneLight,
      language: language || 'text',
      scrollViewProps: {
        contentContainerStyle: {
          ...(containerStyle as object),
          borderRadius: 8,
          padding: 12,
          marginVertical: 8,
          backgroundColor: this.isDark ? '#111827' : '#f3f4f6',
        },
      },
      textStyle: {
        ...(textStyle as object),
        fontSize: 14,
        fontFamily: 'monospace',
      },
      children: text,
    });
  }

  codespan(text: string, styles?: TextStyle): ReactNode {
    // Detect LaTeX expressions passed through by CardTokenizer.
    // The tokenizer emits inline LaTeX ($...$) as codespan tokens,
    // preserving the original text. We detect LaTeX by checking for
    // common delimiters.
    const isLatex =
      text.startsWith('$') ||
      text.startsWith('\\(') ||
      text.startsWith('\\[');

    if (isLatex) {
      // Strip wrapping delimiters for KaTeX rendering
      let expression = text;
      let displayMode = false;

      if (text.startsWith('$$') && text.endsWith('$$')) {
        expression = text.slice(2, -2).trim();
        displayMode = true;
      } else if (text.startsWith('$') && text.endsWith('$')) {
        expression = text.slice(1, -1).trim();
      } else if (text.startsWith('\\[') && text.endsWith('\\]')) {
        expression = text.slice(2, -2).trim();
        displayMode = true;
      } else if (text.startsWith('\\(') && text.endsWith('\\)')) {
        expression = text.slice(2, -2).trim();
      }

      return React.createElement(KaTeXView, {
        key: this.getKey(),
        expression,
        displayMode,
        isDark: this.isDark,
      });
    }

    // Default inline code rendering with theme-aware background
    return React.createElement(
      Text,
      {
        key: this.getKey(),
        style: {
          ...styles,
          backgroundColor: this.isDark ? '#111827' : '#f3f4f6',
          color: this.isDark ? '#f9fafb' : '#333333',
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
          fontFamily: 'monospace',
          fontSize: 14,
        },
      },
      text,
    );
  }

  image(
    uri: string,
    alt?: string,
    style?: ImageStyle,
    _title?: string,
  ): ReactNode {
    return React.createElement(Image, {
      key: this.getKey(),
      source: { uri },
      style: {
        width: '100%' as unknown as number,
        aspectRatio: 16 / 9,
        borderRadius: 8,
        marginVertical: 8,
        ...(style as object),
      },
      resizeMode: 'contain',
      accessibilityLabel: alt || 'Card image',
    });
  }
}

export { CardRenderer };
