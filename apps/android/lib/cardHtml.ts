/**
 * HTML generation for WebView-based card content rendering.
 *
 * Produces self-contained HTML with CDN-loaded libraries:
 * - marked.js for markdown parsing
 * - KaTeX for LaTeX formula rendering
 * - highlight.js for syntax-highlighted code blocks
 *
 * The generated HTML is designed to be loaded directly into a
 * react-native-webview WebView component.
 */

/**
 * Generate self-contained HTML for rendering markdown card content
 * in a WebView, with support for LaTeX formulas, syntax-highlighted
 * code blocks, and Supabase-hosted images.
 *
 * @param markdownContent - Raw markdown string (with optional LaTeX and code blocks)
 * @param isDark - Whether to use dark theme colors
 * @returns Complete HTML document string for WebView source
 */
export function generateCardHtml(markdownContent: string, isDark: boolean): string {
  // Safely embed markdown content as a JSON string to avoid injection
  const safeContent = JSON.stringify(markdownContent).replace(/<\/script>/gi, '<\\/script>');

  const bgColor = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#1f2937';
  const secondaryColor = isDark ? '#9ca3af' : '#6b7280';
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const codeBg = isDark ? '#111827' : '#f3f4f6';
  const blockquoteBorder = isDark ? '#60a5fa' : '#3b82f6';
  const linkColor = isDark ? '#60a5fa' : '#3b82f6';
  const hljsTheme = isDark ? 'github-dark' : 'github';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">

  <!-- KaTeX CSS -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">

  <!-- highlight.js theme -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/${hljsTheme}.min.css">

  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: ${textColor};
      background-color: ${bgColor};
      padding: 16px;
      word-wrap: break-word;
      overflow-wrap: break-word;
      -webkit-text-size-adjust: 100%;
    }

    /* Headings */
    h1, h2, h3, h4 {
      margin-top: 1.2em;
      margin-bottom: 0.6em;
      font-weight: 600;
      line-height: 1.3;
    }
    h1 { font-size: 1.6em; }
    h2 { font-size: 1.4em; }
    h3 { font-size: 1.2em; }
    h4 { font-size: 1.1em; }
    h1:first-child, h2:first-child, h3:first-child, h4:first-child {
      margin-top: 0;
    }

    /* Paragraphs and lists */
    p { margin-bottom: 0.8em; }
    ul, ol {
      margin-bottom: 0.8em;
      padding-left: 1.5em;
    }
    li { margin-bottom: 0.3em; }

    /* Links */
    a {
      color: ${linkColor};
      text-decoration: underline;
    }

    /* Images */
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 0.8em 0;
      display: block;
    }

    /* Code blocks */
    pre {
      background-color: ${codeBg};
      border: 1px solid ${borderColor};
      border-radius: 8px;
      padding: 12px;
      margin: 0.8em 0;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    pre code {
      font-size: 14px;
      line-height: 1.5;
      background: none;
      padding: 0;
      border: none;
      border-radius: 0;
    }
    code {
      font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
      font-size: 0.9em;
      background-color: ${codeBg};
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid ${borderColor};
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0.8em 0;
      font-size: 0.95em;
    }
    th, td {
      border: 1px solid ${borderColor};
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: ${codeBg};
      font-weight: 600;
    }

    /* Blockquotes */
    blockquote {
      border-left: 4px solid ${blockquoteBorder};
      margin: 0.8em 0;
      padding: 0.5em 1em;
      color: ${secondaryColor};
      background-color: ${codeBg};
      border-radius: 0 8px 8px 0;
    }
    blockquote p:last-child {
      margin-bottom: 0;
    }

    /* Horizontal rules */
    hr {
      border: none;
      border-top: 1px solid ${borderColor};
      margin: 1.2em 0;
    }

    /* KaTeX display math */
    .katex-display {
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      padding: 0.5em 0;
      margin: 0.8em 0;
    }

    /* Strong and emphasis */
    strong { font-weight: 600; }
    em { font-style: italic; }

  </style>
</head>
<body>
  <div id="content"></div>

  <!-- marked.js for markdown parsing -->
  <script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>

  <!-- KaTeX JS + auto-render -->
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>

  <!-- highlight.js -->
  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js"></script>

  <script>
    (function() {
      try {
        // 1. Parse markdown with marked
        var raw = ${safeContent};
        var html = marked.parse(raw, { breaks: true });
        document.getElementById('content').innerHTML = html;

        // 2. Render LaTeX formulas with KaTeX auto-render
        if (typeof renderMathInElement === 'function') {
          renderMathInElement(document.getElementById('content'), {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
              { left: '\\\\(', right: '\\\\)', display: false },
              { left: '\\\\[', right: '\\\\]', display: true }
            ],
            throwOnError: false
          });
        }

        // 3. Syntax highlight code blocks
        if (typeof hljs !== 'undefined') {
          hljs.highlightAll();
        }

        // 4. Report content height to React Native after rendering settles
        setTimeout(function() {
          var height = document.documentElement.scrollHeight;
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', value: height }));
          }
        }, 100);
      } catch (err) {
        document.getElementById('content').innerText = 'Error rendering content: ' + err.message;
      }
    })();
  </script>
</body>
</html>`;
}
