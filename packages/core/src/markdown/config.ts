/**
 * Markdown plugin configuration for Lumio
 *
 * This module exports the remark and rehype plugins configuration
 * to be used with react-markdown in web and mobile apps.
 */

import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

/**
 * Remark plugins for markdown parsing
 * - remarkGfm: GitHub Flavored Markdown (tables, task lists, strikethrough)
 * - remarkMath: Parse LaTeX math expressions ($...$ and $$...$$)
 */
export const remarkPlugins = [
  remarkGfm,
  remarkMath,
];

/**
 * Rehype plugins for HTML transformation
 * - rehypeKatex: Render LaTeX math expressions
 * - rehypeHighlight: Syntax highlighting for code blocks
 */
export const rehypePlugins = [
  rehypeKatex,
  rehypeHighlight,
];

/**
 * Combined markdown configuration object
 */
export const markdownConfig = {
  remarkPlugins,
  rehypePlugins,
};
