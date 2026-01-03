import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Card } from '@lumio/core';
import { getCardAssets, transformCardContentImages } from '@lumio/core';
import { MarkdownRenderer } from '@/components/markdown';

interface CardPreviewDialogProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  /** @deprecated No longer used - images are now fetched from Supabase Storage */
  repoUrl?: string;
}

export function CardPreviewDialog({ card, isOpen, onClose }: CardPreviewDialogProps) {
  const [transformedContent, setTransformedContent] = useState<string | null>(null);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Load and transform card content when card changes or dialog opens
  useEffect(() => {
    if (!card || !isOpen) {
      setTransformedContent(null);
      return;
    }

    let isCancelled = false;

    const loadAssets = async () => {
      setIsLoadingAssets(true);
      try {
        const assets = await getCardAssets(card.id);
        if (isCancelled) return;

        if (assets.length === 0) {
          // No assets to transform, use original content
          setTransformedContent(card.content);
        } else {
          // Transform image URLs with signed URLs from Supabase Storage
          const transformed = await transformCardContentImages(card.content, assets);
          if (!isCancelled) {
            setTransformedContent(transformed);
          }
        }
      } catch (err) {
        console.error('Failed to load card assets:', err);
        // Fallback to original content on error
        if (!isCancelled) {
          setTransformedContent(card.content);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingAssets(false);
        }
      }
    };

    loadAssets();

    return () => {
      isCancelled = true;
    };
  }, [card, isOpen]);

  if (!card) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{card.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          {isLoadingAssets ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-transparent animate-spin" />
            </div>
          ) : (
            <MarkdownRenderer content={transformedContent || card.content} />
          )}
        </ScrollArea>
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
