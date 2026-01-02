import { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  inline?: boolean;
}

/**
 * Custom code block component for mobile with:
 * - Language header
 * - Copy button with larger touch target (44px)
 * - Syntax highlighting (via rehype-highlight)
 * - Horizontal scroll for long lines
 */
export function CodeBlock({ children, className, inline }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  // Extract language from className (e.g., "language-typescript" -> "typescript")
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : null;

  // Get the text content for copying
  const getTextContent = useCallback(() => {
    if (typeof children === 'string') {
      return children;
    }
    // For complex children, try to extract text
    const extractText = (node: React.ReactNode): string => {
      if (typeof node === 'string') return node;
      if (typeof node === 'number') return String(node);
      if (Array.isArray(node)) return node.map(extractText).join('');
      if (node && typeof node === 'object' && 'props' in node) {
        const element = node as React.ReactElement<{ children?: React.ReactNode }>;
        return extractText(element.props.children);
      }
      return '';
    };
    return extractText(children);
  }, [children]);

  const handleCopy = useCallback(async () => {
    const text = getTextContent();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [getTextContent]);

  // Inline code
  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono text-slate-800 dark:text-slate-200">
        {children}
      </code>
    );
  }

  // Block code
  return (
    <div className="group relative my-4 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          {language || 'code'}
        </span>
        {/* Mobile-optimized copy button with 44px touch target */}
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center justify-center gap-1.5 min-w-[44px] min-h-[44px] -my-1 -mr-1 px-3 rounded-lg text-sm font-medium transition-colors active:scale-95',
            'hover:bg-slate-200 dark:hover:bg-slate-700',
            copied
              ? 'text-green-600 dark:text-green-400'
              : 'text-slate-600 dark:text-slate-400'
          )}
          title={copied ? 'Copiato!' : 'Copia codice'}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Copiato!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Copia</span>
            </>
          )}
        </button>
      </div>

      {/* Code content with word wrap */}
      <div className="overflow-x-auto">
        <pre className="p-4 m-0 text-sm leading-relaxed whitespace-pre-wrap break-words">
          <code className={cn('font-mono', className)}>
            {children}
          </code>
        </pre>
      </div>
    </div>
  );
}
