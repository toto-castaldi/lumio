import ReactMarkdown from 'react-markdown';
import { remarkPlugins, rehypePlugins } from '@lumio/core';
import { CodeBlock } from './CodeBlock';
import { MarkdownImage } from './MarkdownImage';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  /** Optional URL transformer for images (e.g., to convert relative paths to GitHub raw URLs) */
  transformImageUrl?: (src: string) => string;
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * Centralized Markdown renderer for mobile with:
 * - GitHub Flavored Markdown (tables, task lists, strikethrough)
 * - LaTeX math formulas (inline and block)
 * - Syntax highlighted code blocks with copy button
 * - Responsive images with lazy loading
 * - Touch-optimized styling
 */
export function MarkdownRenderer({
  content,
  transformImageUrl,
  className = '',
}: MarkdownRendererProps) {
  // Custom components for react-markdown
  const components: Components = {
    // Code blocks with syntax highlighting and copy button
    code: ({ children, className, ...props }) => {
      // Check if this is inline code (no className with language)
      const isInline = !className?.includes('language-');
      return (
        <CodeBlock className={className} inline={isInline} {...props}>
          {children}
        </CodeBlock>
      );
    },

    // Pre tag wrapper - just pass through, CodeBlock handles styling
    pre: ({ children }) => <>{children}</>,

    // Images with lazy loading and error handling
    img: ({ src, alt, title }) => (
      <MarkdownImage
        src={src}
        alt={alt}
        title={title}
        transformUrl={transformImageUrl}
      />
    ),

    // Enhanced table styling for mobile (word wrap instead of scroll)
    table: ({ children }) => (
      <div className="my-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full border-collapse text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        {children}
      </thead>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-300 break-words">
        {children}
      </th>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
        {children}
      </tbody>
    ),
    tr: ({ children }) => (
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        {children}
      </tr>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 break-words">
        {children}
      </td>
    ),

    // Links open in new tab
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline active:opacity-70"
      >
        {children}
      </a>
    ),

    // Blockquotes with styled left border
    blockquote: ({ children }) => (
      <blockquote className="my-4 pl-4 border-l-4 border-slate-300 dark:border-slate-600 italic text-slate-600 dark:text-slate-400">
        {children}
      </blockquote>
    ),

    // Horizontal rules
    hr: () => (
      <hr className="my-6 border-slate-200 dark:border-slate-700" />
    ),

    // Task list items (from remark-gfm)
    li: ({ children, className }) => {
      // Check if this is a task list item
      const isTask = className?.includes('task-list-item');
      return (
        <li className={isTask ? 'list-none flex items-start gap-2' : undefined}>
          {children}
        </li>
      );
    },

    // Checkbox for task lists - larger for mobile touch
    input: ({ type, checked, disabled }) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            readOnly
            className="mt-1 h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-blue-600"
          />
        );
      }
      return <input type={type} />;
    },
  };

  return (
    <div className={`lumio-markdown prose prose-sm dark:prose-invert max-w-none break-words overflow-hidden ${className}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
