import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getPreGeneratedQuestion,
  getStudyCardsWithQuestions,
  getUserRepositories,
  voteQuestion,
  Deck,
  type StudyCard,
  type Repository,
  type ShuffledQuestion,
  type QuestionVote,
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
import { ThumbsUp, ThumbsDown } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type StudyState = 'loading' | 'no_cards' | 'preparing' | 'studying' | 'completed';

interface StudySession {
  cards: StudyCard[];
  seenCardIds: Set<string>;
  currentCard: StudyCard | null;
  currentQuestion: ShuffledQuestion | null;
  userAnswer: string | null;
  userVote: QuestionVote | null;
}

// =============================================================================
// QUIZ COMPONENT
// =============================================================================

interface QuizComponentProps {
  card: StudyCard;
  question: ShuffledQuestion;
  userAnswer: string | null;
  userVote: QuestionVote | null;
  onAnswer: (answer: string) => void;
  onVote: (vote: QuestionVote) => void;
  onNext: () => void;
  onSkip: () => void;
  onViewCard: () => void;
  isLoadingNext: boolean;
  isSkipping: boolean;
  isVoting: boolean;
  cardsRemaining: number;
}

function QuizComponent({
  card,
  question,
  userAnswer,
  userVote,
  onAnswer,
  onVote,
  onNext,
  onSkip,
  onViewCard,
  isLoadingNext,
  isSkipping,
  isVoting,
  cardsRemaining,
}: QuizComponentProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const hasAnswered = userAnswer !== null;
  const isCorrect = userAnswer === question.correctAnswer;

  // Reset when question changes
  useEffect(() => {
    setSelectedAnswer(null);
  }, [question]);

  const handleSelect = (label: string) => {
    if (hasAnswered) return;
    setSelectedAnswer(label);
    onAnswer(label);
  };

  const getOptionStyle = (label: string) => {
    if (!hasAnswered) {
      const baseStyle = 'border-border cursor-pointer';
      if (selectedAnswer === label) {
        return `${baseStyle} border-primary bg-primary/10`;
      }
      return `${baseStyle} hover:border-primary hover:bg-muted/50`;
    }

    if (label === question.correctAnswer) {
      return 'border-green-500 bg-green-50 dark:bg-green-950/30';
    }

    if (label === userAnswer && label !== question.correctAnswer) {
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
          {!hasAnswered && (
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
          <CardTitle className="text-lg">{question.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {question.options.map(option => (
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

      {/* Result with Pre-generated Explanation */}
      {hasAnswered && (
        <CardUI className={isCorrect ? 'border-green-500' : 'border-red-500'}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {isCorrect ? 'Corretto!' : 'Sbagliato!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {question.explanation}
            </p>

            {/* Vote Section */}
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Questa domanda ti è stata utile?
              </p>
              <div className="flex gap-2">
                <Button
                  variant={userVote === 'like' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onVote('like')}
                  disabled={isVoting}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Sì
                </Button>
                <Button
                  variant={userVote === 'dislike' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onVote('dislike')}
                  disabled={isVoting}
                  className="flex items-center gap-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  No
                </Button>
              </div>
            </div>

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
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // Card preview dialog
  const [isCardPreviewOpen, setIsCardPreviewOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load repositories and cards with pre-generated questions in parallel
      const [repositories, studyCards] = await Promise.all([
        getUserRepositories(),
        getStudyCardsWithQuestions(),
      ]);

      // Filter cards per repository using Deck class
      const repoMap = new Map(repositories.map(r => [r.id, r]));
      setRepositoryMap(repoMap);
      const filteredCards: StudyCard[] = [];

      // Group cards by repository
      const cardsByRepo = new Map<string, StudyCard[]>();
      for (const card of studyCards) {
        const repoCards = cardsByRepo.get(card.repositoryId) || [];
        repoCards.push(card);
        cardsByRepo.set(card.repositoryId, repoCards);
      }

      // Filter each group using Deck
      for (const [repoId, repoCards] of cardsByRepo) {
        const repo = repoMap.get(repoId);
        if (repo) {
          const deck = new Deck(repo, repoCards);
          filteredCards.push(...deck.getActiveCards() as StudyCard[]);
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
        currentQuestion: null,
        userAnswer: null,
        userVote: null,
      });

      setState('studying');
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Errore nel caricamento dei dati');
      navigate('/dashboard');
    }
  };

  const selectRandomCard = useCallback((cards: StudyCard[], seenIds: Set<string>): StudyCard | null => {
    const unseenCards = cards.filter(c => !seenIds.has(c.id));
    if (unseenCards.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * unseenCards.length);
    return unseenCards[randomIndex];
  }, []);

  const loadNextCard = async () => {
    if (!session) return;

    setIsLoadingQuestion(true);

    try {
      const nextCard = selectRandomCard(session.cards, session.seenCardIds);

      if (!nextCard) {
        setState('completed');
        return;
      }

      // Get pre-generated question for this card
      const question = await getPreGeneratedQuestion(nextCard.id);

      if (!question) {
        // Card has no questions yet, skip it and try next
        console.log(`Card ${nextCard.id} has no questions, skipping...`);
        setSession(prev => ({
          ...prev!,
          seenCardIds: new Set([...prev!.seenCardIds, nextCard.id]),
        }));
        // Try loading next card
        setIsLoadingQuestion(false);
        await loadNextCard();
        return;
      }

      setSession(prev => ({
        ...prev!,
        currentCard: nextCard,
        currentQuestion: question,
        userAnswer: null,
        userVote: null,
        seenCardIds: new Set([...prev!.seenCardIds, nextCard.id]),
      }));
    } catch (err) {
      console.error('Failed to load question:', err);
      toast.error(err instanceof Error ? err.message : 'Errore nel caricamento della domanda');
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const handleAnswer = (answer: string) => {
    if (!session?.currentQuestion) return;

    setSession(prev => ({
      ...prev!,
      userAnswer: answer,
    }));
  };

  const handleVote = async (vote: QuestionVote) => {
    if (!session?.currentQuestion) return;

    setIsVoting(true);

    try {
      await voteQuestion(session.currentQuestion.questionId, vote);
      setSession(prev => ({
        ...prev!,
        userVote: vote,
      }));
      toast.success('Grazie per il feedback!');
    } catch (err) {
      console.error('Failed to vote:', err);
      toast.error('Errore nel salvataggio del voto');
    } finally {
      setIsVoting(false);
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

      // Get pre-generated question for next card
      const question = await getPreGeneratedQuestion(nextCard.id);

      if (!question) {
        // Skip card without question and try next
        setSession(prev => ({
          ...prev!,
          seenCardIds: new Set([...prev!.seenCardIds, nextCard.id]),
        }));
        setIsSkipping(false);
        await handleSkip();
        return;
      }

      setSession(prev => ({
        ...prev!,
        currentCard: nextCard,
        currentQuestion: question,
        userAnswer: null,
        userVote: null,
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
              Le domande per le tue carte sono in preparazione. Riprova tra qualche minuto.
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

    if (state === 'preparing') {
      return (
        <CardUI>
          <CardHeader>
            <CardTitle>Preparazione in corso</CardTitle>
            <CardDescription>
              Stiamo preparando le domande per le tue carte. Riprova tra qualche minuto.
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
    if (!session?.currentCard || !session?.currentQuestion) {
      if (isLoadingQuestion) {
        return (
          <CardUI>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Caricamento domanda...</p>
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
              Inizia
            </Button>
          </CardContent>
        </CardUI>
      );
    }

    return (
      <QuizComponent
        card={session.currentCard}
        question={session.currentQuestion}
        userAnswer={session.userAnswer}
        userVote={session.userVote}
        onAnswer={handleAnswer}
        onVote={handleVote}
        onNext={loadNextCard}
        onSkip={handleSkip}
        onViewCard={() => setIsCardPreviewOpen(true)}
        isLoadingNext={isLoadingQuestion}
        isSkipping={isSkipping}
        isVoting={isVoting}
        cardsRemaining={session.cards.length - session.seenCardIds.size}
      />
    );
  };

  // Map StudyCard to Card type for CardPreviewDialog compatibility
  const currentCardForPreview = session?.currentCard ? {
    ...session.currentCard,
    contentHash: '',
    language: 'it',
    createdAt: '',
    updatedAt: '',
  } : null;

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
          card={currentCardForPreview}
          repository={session?.currentCard ? repositoryMap.get(session.currentCard.repositoryId) || null : null}
          isOpen={isCardPreviewOpen}
          onClose={() => setIsCardPreviewOpen(false)}
        />
      </div>
    </div>
  );
}
