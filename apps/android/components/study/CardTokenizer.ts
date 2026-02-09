/**
 * Custom MarkedTokenizer for detecting LaTeX math delimiters.
 *
 * Extends MarkedTokenizer from react-native-marked to intercept
 * inline LaTeX expressions ($...$) and display LaTeX ($$...$$)
 * before the default markdown tokenizer processes them.
 *
 * Detected LaTeX is emitted as codespan tokens so the custom
 * CardRenderer can render them via KaTeXView.
 */

import { MarkedTokenizer } from 'react-native-marked';
import type { Tokens } from 'react-native-marked';

class CardTokenizer extends MarkedTokenizer {
  /**
   * Override codespan to detect inline LaTeX $...$ and display LaTeX $$...$$.
   *
   * Display LaTeX ($$...$$) is checked first since it starts with the same
   * character as inline LaTeX ($...$).
   *
   * The raw match is preserved so CardRenderer.codespan() can detect it
   * by checking if the text starts with $ or $$.
   */
  codespan(src: string): Tokens.Codespan | undefined {
    // Display LaTeX: $$...$$
    const displayMatch = src.match(/^\$\$([^$]+?)\$\$/);
    if (displayMatch?.[1]) {
      return {
        type: 'codespan',
        raw: displayMatch[0],
        // Preserve $$ delimiters so CardRenderer can detect display mode
        text: displayMatch[0],
      };
    }

    // Inline LaTeX: $...$  (single dollar, non-greedy, no newlines)
    const inlineMatch = src.match(/^\$([^\$\n]+?)\$/);
    if (inlineMatch?.[1]) {
      return {
        type: 'codespan',
        raw: inlineMatch[0],
        // Preserve $ delimiters so CardRenderer can detect LaTeX
        text: inlineMatch[0],
      };
    }

    return super.codespan(src);
  }
}

export { CardTokenizer };
