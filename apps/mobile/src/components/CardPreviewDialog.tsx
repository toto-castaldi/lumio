import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/markdown";
import type { Card } from "@lumio/shared";

interface CardPreviewDialogProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  /** Optional repository URL for transforming relative image paths */
  repoUrl?: string;
}

export function CardPreviewDialog({
  card,
  isOpen,
  onClose,
  repoUrl,
}: CardPreviewDialogProps) {
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
      <DialogContent className="flex flex-col h-full">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl pr-8">{card.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <MarkdownRenderer
            content={card.content}
            transformImageUrl={transformImageUrl}
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
