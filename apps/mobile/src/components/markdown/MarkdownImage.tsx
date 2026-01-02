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
 * Custom image component for mobile with:
 * - Lazy loading
 * - Loading placeholder
 * - Error fallback
 * - Full-width responsive sizing
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
    return (
      <div className="my-4 flex items-center justify-center gap-2 p-6 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
        <ImageOff className="w-5 h-5" />
        <span className="text-sm">Immagine non disponibile</span>
      </div>
    );
  }

  return (
    <figure className="my-4">
      <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Loading placeholder */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 animate-pulse">
            <div className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-transparent animate-spin" />
          </div>
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
      </div>

      {/* Caption from alt text */}
      {alt && (
        <figcaption className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          {alt}
        </figcaption>
      )}
    </figure>
  );
}
