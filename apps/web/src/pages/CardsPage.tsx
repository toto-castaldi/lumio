import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRepositoryCards, getUserRepositories, type Card, type Repository } from '@lumio/core';
import { Button } from '@/components/ui/button';
import {
  Card as CardUI,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

function getDifficultyLabel(difficulty: number): string {
  switch (difficulty) {
    case 1:
      return 'Molto Facile';
    case 2:
      return 'Facile';
    case 3:
      return 'Media';
    case 4:
      return 'Difficile';
    case 5:
      return 'Molto Difficile';
    default:
      return 'Media';
  }
}

function getDifficultyColor(difficulty: number): string {
  switch (difficulty) {
    case 1:
      return 'bg-green-100 text-green-800';
    case 2:
      return 'bg-green-50 text-green-700';
    case 3:
      return 'bg-yellow-50 text-yellow-700';
    case 4:
      return 'bg-orange-50 text-orange-700';
    case 5:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function CardsPage() {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const [cards, setCards] = useState<Card[]>([]);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  useEffect(() => {
    if (repositoryId) {
      loadData();
    }
  }, [repositoryId]);

  const loadData = async () => {
    if (!repositoryId) return;

    try {
      // Load repository info and cards in parallel
      const [repos, cardsData] = await Promise.all([
        getUserRepositories(),
        getRepositoryCards(repositoryId),
      ]);

      const repo = repos.find((r) => r.id === repositoryId);
      setRepository(repo || null);
      setCards(cardsData);
    } catch (err) {
      console.error('Failed to load cards:', err);
      toast.error('Errore nel caricamento delle card');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Repository non trovato</p>
          <Button variant="outline" asChild>
            <Link to="/repositories">← Torna ai Repository</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{repository.name}</h1>
            <p className="text-muted-foreground">
              {cards.length} card disponibili
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/repositories">← Repository</Link>
          </Button>
        </div>

        {/* Cards List */}
        {cards.length === 0 ? (
          <CardUI>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Nessuna card trovata in questo repository.
              </p>
            </CardContent>
          </CardUI>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <CardUI
                key={card.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedCard(card)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{card.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {card.filePath}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {card.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${getDifficultyColor(card.difficulty)}`}
                      >
                        {getDifficultyLabel(card.difficulty)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {card.language.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </CardUI>
            ))}
          </div>
        )}
      </div>

      {/* Card Preview Dialog */}
      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedCard?.title}</DialogTitle>
            <DialogDescription>
              {selectedCard?.filePath}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedCard?.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${getDifficultyColor(selectedCard?.difficulty || 3)}`}
              >
                {getDifficultyLabel(selectedCard?.difficulty || 3)}
              </span>
            </div>
            <div className="bg-muted rounded-lg p-4 overflow-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {selectedCard?.rawContent}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
