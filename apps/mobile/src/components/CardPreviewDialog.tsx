import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/markdown";
import type { Card, Repository } from "@lumio/shared";
import { CardView, getSupabaseUrl } from "@lumio/core";

interface CardPreviewDialogProps {
  card: Card | null;
  repository: Repository | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CardPreviewDialog({
  card,
  repository,
  isOpen,
  onClose,
}: CardPreviewDialogProps) {
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
      <DialogContent className="flex flex-col h-full">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl pr-8">{card.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <MarkdownRenderer
            content={transformedContent || card.content}
            className="pb-4"
          />
        </ScrollArea>

        <div className="flex-shrink-0 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full h-12 text-base"
          >
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
