import { useState, useCallback } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkdownImageProps {
  src?: string;
  alt?: string;
  title?: string;
  transformUrl?: (src: string) => string;
}

/**
 * Custom image component with:
 * - Lazy loading
 * - Loading placeholder
 * - Error fallback
 * - Responsive sizing
 */
export function MarkdownImage({ src, alt, title, transformUrl }: MarkdownImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Transform URL if transformer is provided (for GitHub raw URLs)
  const imageSrc = src && transformUrl ? transformUrl(src) : src;

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  if (!imageSrc) {
    return null;
  }

  if (hasError) {
    // Use span with block display to avoid HTML nesting issues (figure/div can't be inside p)
    return (
      <span className="block my-4 flex items-center justify-center gap-2 p-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
        <ImageOff className="w-5 h-5" />
        <span className="text-sm">Immagine non disponibile</span>
      </span>
    );
  }

  // Use span elements with block display to avoid HTML nesting issues
  // (figure/div can't be descendants of p, but span can)
  return (
    <span className="block my-4">
      <span className="block relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Loading placeholder */}
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 animate-pulse">
            <span className="block w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-transparent animate-spin" />
          </span>
        )}

        {/* Actual image */}
        <img
          src={imageSrc}
          alt={alt || ''}
          title={title}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-auto transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
        />
      </span>

      {/* Caption from alt text */}
      {alt && (
        <span className="block mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          {alt}
        </span>
      )}
    </span>
  );
}
