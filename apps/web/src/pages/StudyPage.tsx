import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  generateQuiz,
  getStudyCards,
  getUserRepositories,
  validateAnswer,
  Deck,
  type Card,
  type Repository,
  type QuizQuestion,
  type ValidationResponse,
} from '@lumio/core';
import { Button } from '@/components/ui/button';
import {
  Card as CardUI,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { CardPreviewDialog } from '@/components/CardPreviewDialog';

// =============================================================================
// TYPES
// =============================================================================

type StudyState = 'loading' | 'no_cards' | 'studying' | 'completed';

interface StudySession {
  cards: Card[];
  seenCardIds: Set<string>;
  currentCard: Card | null;
  currentQuiz: QuizQuestion | null;
  validationResult: ValidationResponse | null;
}

// =============================================================================
// QUIZ COMPONENT (with two-step validation)
// =============================================================================

interface QuizComponentProps {
  card: Card;
  quiz: QuizQuestion;
  validationResult: ValidationResponse | null;
  onAnswer: (answer: string) => void;
  onNext: () => void;
  onSkip: () => void;
  onViewCard: () => void;
  isValidating: boolean;
  isLoadingNext: boolean;
  isSkipping: boolean;
  cardsRemaining: number;
}

function QuizComponent({
  card,
  quiz,
  validationResult,
  onAnswer,
  onNext,
  onSkip,
  onViewCard,
  isValidating,
  isLoadingNext,
  isSkipping,
  cardsRemaining,
}: QuizComponentProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  // Reset when quiz changes
  useEffect(() => {
    setSelectedAnswer(null);
  }, [quiz]);

  const handleSelect = (label: string) => {
    if (validationResult || isValidating) return;
    setSelectedAnswer(label);
    onAnswer(label);
  };

  const getOptionStyle = (label: string) => {
    if (!validationResult) {
      const baseStyle = 'border-border cursor-pointer';
      if (selectedAnswer === label) {
        return `${baseStyle} border-primary bg-primary/10`;
      }
      return `${baseStyle} hover:border-primary hover:bg-muted/50`;
    }

    if (label === quiz.correctAnswer) {
      return 'border-green-500 bg-green-50 dark:bg-green-950/30';
    }

    if (label === selectedAnswer && label !== quiz.correctAnswer) {
      return 'border-red-500 bg-red-50 dark:bg-red-950/30';
    }

    return 'border-border opacity-50';
  };

  return (
    <div className="space-y-4">
      {/* Card Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          <span className="font-medium">{card.title}</span>
          <span className="mx-2">•</span>
          <span>{cardsRemaining} carte rimanenti</span>
        </div>
        <div className="flex items-center gap-2">
          {!validationResult && !isValidating && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              disabled={isSkipping}
            >
              {isSkipping ? 'Saltando...' : 'Salta'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onViewCard}>
            Vedi carta
          </Button>
        </div>
      </div>

      {/* Question */}
      <CardUI>
        <CardHeader>
          <CardTitle className="text-lg">{quiz.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quiz.options.map(option => (
            <div
              key={option.label}
              onClick={() => handleSelect(option.label)}
              className={`p-4 border rounded-lg transition-colors ${getOptionStyle(option.label)}`}
            >
              <span className="font-semibold mr-2">{option.label}.</span>
              {option.text}
            </div>
          ))}
        </CardContent>
      </CardUI>

      {/* Loading validation */}
      {isValidating && (
        <CardUI>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Validando risposta...</p>
          </CardContent>
        </CardUI>
      )}

      {/* Validation Result */}
      {validationResult && (
        <CardUI className={validationResult.isCorrect ? 'border-green-500' : 'border-red-500'}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg ${validationResult.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {validationResult.isCorrect ? 'Corretto!' : 'Sbagliato!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {validationResult.explanation}
            </p>

            {validationResult.tips && validationResult.tips.length > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-medium text-sm mb-2">Suggerimenti:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {validationResult.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={onNext} disabled={isLoadingNext} className="w-full">
              {isLoadingNext ? 'Caricamento...' : 'Prossima carta'}
            </Button>
          </CardContent>
        </CardUI>
      )}
    </div>
  );
}

// =============================================================================
// MAIN STUDY PAGE COMPONENT
// =============================================================================

export function StudyPage() {
  const navigate = useNavigate();

  // State
  const [state, setState] = useState<StudyState>('loading');
  const [session, setSession] = useState<StudySession | null>(null);
  const [repositoryMap, setRepositoryMap] = useState<Map<string, Repository>>(new Map());

  // Loading states
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // Card preview dialog
  const [isCardPreviewOpen, setIsCardPreviewOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load repositories and cards in parallel
      const [repositories, allCards] = await Promise.all([
        getUserRepositories(),
        getStudyCards(),
      ]);

      // Filter cards per repository using Deck class
      const repoMap = new Map(repositories.map(r => [r.id, r]));
      setRepositoryMap(repoMap);
      const filteredCards: Card[] = [];

      // Group cards by repository
      const cardsByRepo = new Map<string, Card[]>();
      for (const card of allCards) {
        const repoCards = cardsByRepo.get(card.repositoryId) || [];
        repoCards.push(card);
        cardsByRepo.set(card.repositoryId, repoCards);
      }

      // Filter each group using Deck
      for (const [repoId, repoCards] of cardsByRepo) {
        const repo = repoMap.get(repoId);
        if (repo) {
          const deck = new Deck(repo, repoCards);
          filteredCards.push(...deck.getActiveCards());
        }
      }

      if (filteredCards.length === 0) {
        setState('no_cards');
        return;
      }

      // Initialize session with filtered cards
      setSession({
        cards: filteredCards,
        seenCardIds: new Set(),
        currentCard: null,
        currentQuiz: null,
        validationResult: null,
      });

      setState('studying');
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Errore nel caricamento dei dati');
      navigate('/dashboard');
    }
  };

  const selectRandomCard = useCallback((cards: Card[], seenIds: Set<string>): Card | null => {
    const unseenCards = cards.filter(c => !seenIds.has(c.id));
    if (unseenCards.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * unseenCards.length);
    return unseenCards[randomIndex];
  }, []);

  const loadNextCard = async () => {
    if (!session) return;

    setIsLoadingQuiz(true);

    try {
      const nextCard = selectRandomCard(session.cards, session.seenCardIds);

      if (!nextCard) {
        setState('completed');
        return;
      }

      // Generate quiz for this card
      const quiz = await generateQuiz(
        nextCard.rawContent,
        nextCard.repositoryId
      );

      setSession(prev => ({
        ...prev!,
        currentCard: nextCard,
        currentQuiz: quiz,
        validationResult: null,
        seenCardIds: new Set([...prev!.seenCardIds, nextCard.id]),
      }));
    } catch (err) {
      console.error('Failed to generate quiz:', err);
      toast.error(err instanceof Error ? err.message : 'Errore nella generazione della domanda');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (!session?.currentCard || !session?.currentQuiz) return;

    setIsValidating(true);

    try {
      // Validate the answer
      const validation = await validateAnswer(
        session.currentCard.rawContent,
        session.currentQuiz.question,
        answer,
        session.currentQuiz.correctAnswer,
        session.currentCard.repositoryId
      );

      setSession(prev => ({
        ...prev!,
        validationResult: validation,
      }));
    } catch (err) {
      console.error('Failed to validate answer:', err);
      // Fallback: show basic result without AI validation
      const isCorrect = answer === session.currentQuiz.correctAnswer;
      setSession(prev => ({
        ...prev!,
        validationResult: {
          isCorrect,
          explanation: isCorrect
            ? 'Risposta corretta!'
            : `La risposta corretta era: ${session.currentQuiz?.correctAnswer}. ${session.currentQuiz?.explanation || ''}`,
        },
      }));
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkip = async () => {
    if (!session) return;

    setIsSkipping(true);

    try {
      const nextCard = selectRandomCard(session.cards, session.seenCardIds);

      if (!nextCard) {
        setState('completed');
        return;
      }

      // Generate quiz for next card
      const quiz = await generateQuiz(
        nextCard.rawContent,
        nextCard.repositoryId
      );

      setSession(prev => ({
        ...prev!,
        currentCard: nextCard,
        currentQuiz: quiz,
        validationResult: null,
        seenCardIds: new Set([...prev!.seenCardIds, nextCard.id]),
      }));

      toast.info('Carta saltata');
    } catch (err) {
      console.error('Failed to skip card:', err);
      toast.error(err instanceof Error ? err.message : 'Errore nel saltare la carta');
    } finally {
      setIsSkipping(false);
    }
  };

  // Render based on state
  const renderContent = () => {
    if (state === 'loading') {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      );
    }

    if (state === 'no_cards') {
      return (
        <CardUI>
          <CardHeader>
            <CardTitle>Nessuna carta disponibile</CardTitle>
            <CardDescription>
              Aggiungi un repository per iniziare a studiare.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')}>
              Torna alla Dashboard
            </Button>
          </CardContent>
        </CardUI>
      );
    }

    if (state === 'completed') {
      return (
        <CardUI>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Completato!</CardTitle>
            <CardDescription>
              Hai studiato tutte le {session?.cards.length || 0} carte disponibili
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/dashboard')}>
              Torna alla Dashboard
            </Button>
          </CardContent>
        </CardUI>
      );
    }

    // Studying state
    if (!session?.currentCard || !session?.currentQuiz) {
      if (isLoadingQuiz) {
        return (
          <CardUI>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Generando domanda...</p>
            </CardContent>
          </CardUI>
        );
      }

      // Ready to start - show button
      return (
        <CardUI>
          <CardHeader>
            <CardTitle>Pronto per studiare</CardTitle>
            <CardDescription>
              Hai {session?.cards.length || 0} carte disponibili. Premi il pulsante per iniziare.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadNextCard} className="w-full">
              Genera domanda
            </Button>
          </CardContent>
        </CardUI>
      );
    }

    return (
      <QuizComponent
        card={session.currentCard}
        quiz={session.currentQuiz}
        validationResult={session.validationResult}
        onAnswer={handleAnswer}
        onNext={loadNextCard}
        onSkip={handleSkip}
        onViewCard={() => setIsCardPreviewOpen(true)}
        isValidating={isValidating}
        isLoadingNext={isLoadingQuiz}
        isSkipping={isSkipping}
        cardsRemaining={session.cards.length - session.seenCardIds.size}
      />
    );
  };

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sessione di Studio</h1>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Esci</Link>
          </Button>
        </div>

        {/* Content */}
        {renderContent()}

        {/* Card Preview Dialog */}
        <CardPreviewDialog
          card={session?.currentCard || null}
          repository={session?.currentCard ? repositoryMap.get(session.currentCard.repositoryId) || null : null}
          isOpen={isCardPreviewOpen}
          onClose={() => setIsCardPreviewOpen(false)}
        />
      </div>
    </div>
  );
}
