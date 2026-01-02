import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Card } from '@lumio/core';
import { MarkdownRenderer } from '@/components/markdown';

interface CardPreviewDialogProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  /** Optional repository URL for transforming relative image paths */
  repoUrl?: string;
}

export function CardPreviewDialog({ card, isOpen, onClose, repoUrl }: CardPreviewDialogProps) {
  if (!card) return null;

  // Create image URL transformer if repoUrl is provided
  const transformImageUrl = repoUrl
    ? (src: string) => {
        // If already absolute URL, return as-is
        if (src.startsWith('http://') || src.startsWith('https://')) {
          return src;
        }
        // Parse GitHub URL and construct raw URL
        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
        if (!match) return src;
        const cleanPath = src.replace(/^\/+/, '').replace(/^\.\.\/+/, '');
        return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/main/${cleanPath}`;
      }
    : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{card.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <MarkdownRenderer
            content={card.content}
            transformImageUrl={transformImageUrl}
          />
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
