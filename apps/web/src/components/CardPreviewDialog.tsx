import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Card } from '@lumio/core';
import ReactMarkdown from 'react-markdown';

interface CardPreviewDialogProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CardPreviewDialog({ card, isOpen, onClose }: CardPreviewDialogProps) {
  if (!card) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{card.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{card.content}</ReactMarkdown>
          </div>
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
