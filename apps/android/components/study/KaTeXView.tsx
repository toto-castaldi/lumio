/**
 * Micro-WebView component for rendering individual LaTeX expressions via KaTeX.
 *
 * Each KaTeXView renders a single LaTeX expression (inline or display mode)
 * using KaTeX loaded from CDN. The WebView auto-sizes to its content height
 * and fades in once rendering completes to prevent visual flash.
 *
 * Props:
 * - expression: The LaTeX expression string (without delimiters)
 * - displayMode: true for display math (centered, larger), false for inline
 * - isDark: Theme adaptation for text and background colors
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

interface KaTeXViewProps {
  /** LaTeX expression to render (without $ or $$ delimiters) */
  expression: string;
  /** Whether to render in display mode (centered block) or inline */
  displayMode: boolean;
  /** Whether dark theme is active */
  isDark: boolean;
}

/**
 * Renders a single LaTeX expression using KaTeX in a minimal WebView.
 *
 * Starts with opacity 0 and a reasonable default height, then fades in
 * once KaTeX has rendered and reported the actual content height.
 */
function KaTeXView({ expression, displayMode, isDark }: KaTeXViewProps) {
  const defaultHeight = displayMode ? 60 : 24;
  const [height, setHeight] = useState(defaultHeight);
  const [loaded, setLoaded] = useState(false);

  const textColor = isDark ? '#f9fafb' : '#333333';

  const html = useMemo(() => {
    // Escape the expression for safe embedding in HTML
    const safeExpression = expression
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: transparent;
      color: ${textColor};
      display: ${displayMode ? 'flex' : 'inline-flex'};
      ${displayMode ? 'justify-content: center; width: 100%;' : ''}
      padding: ${displayMode ? '8px 0' : '0 2px'};
    }
    .katex { font-size: ${displayMode ? '1.2em' : '1em'}; }
    .katex .base { color: ${textColor}; }
  </style>
</head>
<body>
  <div id="math"></div>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script>
    try {
      katex.render('${safeExpression}', document.getElementById('math'), {
        displayMode: ${displayMode},
        throwOnError: false
      });
    } catch(e) {
      document.getElementById('math').textContent = '${safeExpression}';
    }
    setTimeout(function() {
      var h = document.documentElement.scrollHeight;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', value: h }));
      }
    }, 100);
  </script>
</body>
</html>`;
  }, [expression, displayMode, isDark, textColor]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'height' && typeof data.value === 'number' && data.value > 0) {
        setHeight(data.value);
        setLoaded(true);
      }
    } catch {
      // Ignore malformed messages
    }
  }, []);

  const containerStyle: ViewStyle = displayMode
    ? { width: '100%', alignSelf: 'center', marginVertical: 4 }
    : { alignSelf: 'flex-start' };

  return (
    <View style={[containerStyle, { height, opacity: loaded ? 1 : 0 }]}>
      <WebView
        source={{ html }}
        style={{ backgroundColor: 'transparent', height }}
        scrollEnabled={false}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        onMessage={handleMessage}
        androidLayerType="hardware"
      />
    </View>
  );
}

export { KaTeXView };
