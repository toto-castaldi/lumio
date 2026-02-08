/**
 * WebView-based card content renderer.
 *
 * Renders markdown content with:
 * - Syntax-highlighted code blocks (highlight.js)
 * - LaTeX formula rendering (KaTeX)
 * - Supabase-hosted images with pinch-to-zoom
 * - Dark/light theme adaptation
 *
 * The WebView loads CDN resources and renders content client-side.
 * Height is dynamically adjusted based on content via postMessage.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { generateCardHtml } from '../../lib/cardHtml';

interface CardContentViewProps {
  /** Markdown content to render (may include LaTeX, code blocks, images) */
  content: string;
  /** Whether to use dark theme colors */
  isDark: boolean;
  /** Optional additional styles for the container */
  style?: ViewStyle;
}

/**
 * Renders card markdown content in a WebView with full support for
 * LaTeX formulas, syntax-highlighted code blocks, and zoomable images.
 *
 * The component dynamically adjusts its height based on the rendered
 * content size reported by the WebView via postMessage.
 */
export function CardContentView({ content, isDark, style }: CardContentViewProps) {
  const [webViewHeight, setWebViewHeight] = useState(300);

  // Memoize HTML generation to avoid re-rendering on every parent update
  const html = useMemo(
    () => generateCardHtml(content, isDark),
    [content, isDark],
  );

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'height' && typeof data.value === 'number' && data.value > 0) {
        setWebViewHeight(data.value);
      }
    } catch {
      // Ignore malformed messages
    }
  }, []);

  return (
    <WebView
      source={{ html }}
      style={[{ height: webViewHeight, opacity: 0.99 }, style]}
      scrollEnabled={false}
      originWhitelist={['*']}
      javaScriptEnabled={true}
      onMessage={handleMessage}
      // Allow mixed content for CDN resources
      mixedContentMode="compatibility"
      // Disable file access for security
      allowFileAccess={false}
      // Transparent background to match parent
      androidLayerType="hardware"
    />
  );
}
