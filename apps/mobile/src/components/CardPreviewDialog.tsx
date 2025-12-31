import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import type { Card } from "@lumio/shared";

interface CardPreviewDialogProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CardPreviewDialog({
  card,
  isOpen,
  onClose,
}: CardPreviewDialogProps) {
  if (!card) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex flex-col h-full">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl pr-8">{card.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="prose prose-sm max-w-none pb-4">
            <ReactMarkdown>{card.content}</ReactMarkdown>
          </div>
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
