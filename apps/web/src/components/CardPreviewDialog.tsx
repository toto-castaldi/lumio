import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Card, Repository } from '@lumio/core';
import { CardView, getSupabaseUrl } from '@lumio/core';
import { MarkdownRenderer } from '@/components/markdown';

interface CardPreviewDialogProps {
  card: Card | null;
  repository: Repository | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CardPreviewDialog({ card, repository, isOpen, onClose }: CardPreviewDialogProps) {
  // Transform card content with resolved image URLs (stateless approach)
  const transformedContent = useMemo(() => {
    if (!card || !repository) return null;

    const supabaseUrl = getSupabaseUrl();
    const cardView = new CardView(card, repository, supabaseUrl);
    return cardView.getContent();
  }, [card, repository]);

  if (!card) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{card.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <MarkdownRenderer content={transformedContent || card.content} />
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
