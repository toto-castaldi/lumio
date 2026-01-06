import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  generateQuiz,
  getStudyCards,
  validateAnswer,
  type Card,
  type QuizQuestion,
  type ValidationResponse,
} from '@lumio/core';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CardPreviewDialog } from '@/components/CardPreviewDialog';
import { ChevronLeft, Eye, Sparkles, Check, X, SkipForward } from 'lucide-react';

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
// MOBILE QUIZ COMPONENT
// =============================================================================

interface MobileQuizProps {
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

function MobileQuiz({
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
}: MobileQuizProps) {
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
    const baseClasses = 'relative p-4 rounded-2xl border-2 transition-all duration-200 min-h-[64px] flex items-start gap-3';

    if (!validationResult) {
      if (selectedAnswer === label) {
        return `${baseClasses} border-primary bg-primary/5 shadow-sm`;
      }
      return `${baseClasses} border-slate-200 bg-white active:scale-[0.98] active:border-slate-300`;
    }

    // After validation
    if (label === quiz.correctAnswer) {
      return `${baseClasses} border-emerald-500 bg-emerald-50`;
    }

    if (label === selectedAnswer && label !== quiz.correctAnswer) {
      return `${baseClasses} border-rose-400 bg-rose-50`;
    }

    return `${baseClasses} border-slate-100 bg-slate-50/50 opacity-50`;
  };

  const getLabelStyle = (label: string) => {
    const baseClasses = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0';

    if (!validationResult) {
      if (selectedAnswer === label) {
        return `${baseClasses} bg-primary text-white`;
      }
      return `${baseClasses} bg-slate-100 text-slate-600`;
    }

    if (label === quiz.correctAnswer) {
      return `${baseClasses} bg-emerald-500 text-white`;
    }

    if (label === selectedAnswer && label !== quiz.correctAnswer) {
      return `${baseClasses} bg-rose-400 text-white`;
    }

    return `${baseClasses} bg-slate-100 text-slate-400`;
  };

  return (
    <div className="px-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">
          <span className="font-medium text-slate-700">{card.title}</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
            {cardsRemaining} rimanenti
          </span>
          {!validationResult && !isValidating && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              disabled={isSkipping}
              className="h-8 px-3 rounded-full"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onViewCard}
            className="h-8 px-3 rounded-full"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Question Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-sm">
        <div className="flex items-start gap-3 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 leading-snug pt-1">
            {quiz.question}
          </h2>
        </div>
      </div>

      {/* Answer Options */}
      <div className="space-y-3">
        {quiz.options.map(option => (
          <button
            key={option.label}
            onClick={() => handleSelect(option.label)}
            disabled={!!validationResult || isValidating}
            className={getOptionStyle(option.label)}
          >
            <span className={getLabelStyle(option.label)}>
              {validationResult && option.label === quiz.correctAnswer ? (
                <Check className="w-4 h-4" />
              ) : validationResult && option.label === selectedAnswer && option.label !== quiz.correctAnswer ? (
                <X className="w-4 h-4" />
              ) : (
                option.label
              )}
            </span>
            <span className="text-base text-slate-700 text-left leading-snug pt-1">
              {option.text}
            </span>
          </button>
        ))}
      </div>

      {/* Loading Validation */}
      {isValidating && (
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center animate-pulse">
          <div className="w-8 h-8 rounded-full bg-primary/20 mx-auto mb-3 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary animate-spin" />
          </div>
          <p className="text-slate-600 font-medium">Validando risposta...</p>
        </div>
      )}

      {/* Validation Result */}
      {validationResult && (
        <div
          className={`p-5 rounded-2xl border-2 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            validationResult.isCorrect
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-rose-50 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                validationResult.isCorrect ? 'bg-emerald-500' : 'bg-rose-400'
              }`}
            >
              {validationResult.isCorrect ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <X className="w-5 h-5 text-white" />
              )}
            </div>
            <h3
              className={`text-xl font-bold ${
                validationResult.isCorrect ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {validationResult.isCorrect ? 'Corretto!' : 'Sbagliato'}
            </h3>
          </div>

          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {validationResult.explanation}
          </p>

          {validationResult.tips && validationResult.tips.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-white/60">
              <p className="font-semibold text-sm text-slate-600 mb-2">Suggerimenti:</p>
              <ul className="space-y-1.5">
                {validationResult.tips.map((tip, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            onClick={onNext}
            disabled={isLoadingNext}
            className="w-full h-14 mt-5 rounded-2xl text-base font-semibold shadow-lg shadow-primary/20"
          >
            {isLoadingNext ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                Caricamento...
              </span>
            ) : (
              'Prossima carta'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN STUDY PAGE
// =============================================================================

export function StudyPage() {
  const navigate = useNavigate();

  // State
  const [state, setState] = useState<StudyState>('loading');
  const [session, setSession] = useState<StudySession | null>(null);

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
      const cards = await getStudyCards();

      if (cards.length === 0) {
        setState('no_cards');
        return;
      }

      setSession({
        cards,
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

      const quiz = await generateQuiz(nextCard.rawContent);

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
      const validation = await validateAnswer(
        session.currentCard.rawContent,
        session.currentQuiz.question,
        answer,
        session.currentQuiz.correctAnswer
      );

      setSession(prev => ({
        ...prev!,
        validationResult: validation,
      }));
    } catch (err) {
      console.error('Failed to validate answer:', err);
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

      const quiz = await generateQuiz(nextCard.rawContent);

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

  // Render content based on state
  const renderContent = () => {
    if (state === 'loading') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <p className="text-slate-500 font-medium">Caricamento...</p>
        </div>
      );
    }

    if (state === 'no_cards') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-5">
            <span className="text-4xl">📚</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Nessuna carta disponibile</h2>
          <p className="text-slate-500 mb-6">
            Aggiungi un repository dalla dashboard per iniziare a studiare.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="h-12 px-6 rounded-xl">
            Torna alla Dashboard
          </Button>
        </div>
      );
    }

    if (state === 'completed') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30">
            <Check className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Completato!</h2>
          <p className="text-slate-500 mb-8">
            Hai studiato tutte le {session?.cards.length || 0} carte disponibili
          </p>
          <Button onClick={() => navigate('/dashboard')} className="h-12 px-8 rounded-xl">
            Torna alla Dashboard
          </Button>
        </div>
      );
    }

    // Studying state
    if (!session?.currentCard || !session?.currentQuiz) {
      if (isLoadingQuiz) {
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary animate-spin" />
            </div>
            <p className="text-slate-600 font-medium">Generando domanda...</p>
            <p className="text-sm text-slate-400 mt-1">L'AI sta preparando il quiz</p>
          </div>
        );
      }

      return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Pronto per studiare</h2>
          <p className="text-slate-500 mb-6">
            Hai {session?.cards.length || 0} carte disponibili
          </p>
          <Button
            onClick={loadNextCard}
            className="h-14 px-8 rounded-2xl text-base font-semibold shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Genera domanda
          </Button>
        </div>
      );
    }

    return (
      <MobileQuiz
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-slate-600 font-medium active:text-slate-900 transition-colors h-11 px-2 -ml-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Esci</span>
          </button>
          <h1 className="text-lg font-bold text-slate-800">Studio</h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col py-4">
        {renderContent()}
      </main>

      {/* Card Preview Dialog */}
      <CardPreviewDialog
        card={session?.currentCard || null}
        isOpen={isCardPreviewOpen}
        onClose={() => setIsCardPreviewOpen(false)}
      />
    </div>
  );
}
