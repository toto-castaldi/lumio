import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getAvailableModels,
  generateQuiz,
  getStudyCards,
  getStudyPreferences,
  saveStudyPreferences,
  resetStudyPreferences,
  getDefaultPrompt,
  saveModelPreferences,
  validateAnswer,
  type Card,
  type LLMProvider,
  type QuizQuestion,
  type AvailableModelsResponse,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CardPreviewDialog } from '@/components/CardPreviewDialog';
import { ChevronDown, ChevronLeft, Eye, Settings, Sparkles, Check, X, ExternalLink } from 'lucide-react';

const WEB_APP_URL = 'https://lumio.toto-castaldi.com';

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
// MOBILE STUDY CONTROLS
// =============================================================================

interface MobileStudyControlsProps {
  availableModels: AvailableModelsResponse;
  selectedProvider: LLMProvider | null;
  selectedModel: string | null;
  systemPrompt: string;
  isCustomPrompt: boolean;
  onProviderChange: (provider: LLMProvider) => void;
  onModelChange: (modelId: string) => void;
  onSystemPromptChange: (prompt: string) => void;
  onSavePrompt: () => void;
  onResetPrompt: () => void;
  onViewCard: () => void;
  isSavingPrompt: boolean;
  currentCard: Card | null;
  disabled: boolean;
}

function MobileStudyControls({
  availableModels,
  selectedProvider,
  selectedModel,
  systemPrompt,
  isCustomPrompt,
  onProviderChange,
  onModelChange,
  onSystemPromptChange,
  onSavePrompt,
  onResetPrompt,
  onViewCard,
  isSavingPrompt,
  currentCard,
  disabled,
}: MobileStudyControlsProps) {
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const configuredProviders = availableModels.providers.filter(p => p.isConfigured);
  const currentModels = selectedProvider
    ? availableModels.providers.find(p => p.provider === selectedProvider)?.models || []
    : [];

  if (configuredProviders.length === 0) {
    const handleOpenWebSettings = () => {
      window.open(`${WEB_APP_URL}/settings`, '_blank');
    };

    return (
      <div className="mx-4 p-5 rounded-2xl bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">Configurazione richiesta</h3>
            <p className="text-sm text-amber-700 mt-1">
              Configura almeno una API key per studiare.
            </p>
            <Button className="mt-3 h-11 rounded-xl" variant="outline" onClick={handleOpenWebSettings}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Apri Lumio Web
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-3">
      {/* Provider & Model Selectors */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/60 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">
              Provider
            </label>
            <Select
              value={selectedProvider || undefined}
              onValueChange={(v) => onProviderChange(v as LLMProvider)}
              disabled={disabled}
            >
              <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                {configuredProviders.map(p => (
                  <SelectItem key={p.provider} value={p.provider}>
                    {p.provider === 'openai' ? 'OpenAI' : 'Anthropic'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">
              Modello
            </label>
            <Select
              value={selectedModel || undefined}
              onValueChange={onModelChange}
              disabled={disabled || !selectedProvider}
            >
              <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200">
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                {currentModels.map(m => (
                  <SelectItem key={m.modelId} value={m.modelId}>
                    {m.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* View Card Button */}
        {currentCard && (
          <Button
            variant="outline"
            onClick={onViewCard}
            className="w-full h-12 rounded-xl bg-white border-slate-200 text-slate-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            Vedi carta completa
          </Button>
        )}
      </div>

      {/* Collapsible Prompt Settings */}
      <Collapsible open={isPromptOpen} onOpenChange={setIsPromptOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/60 text-sm font-medium text-slate-600 active:bg-slate-100 transition-colors">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Impostazioni Prompt
              {isCustomPrompt && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                  personalizzato
                </span>
              )}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isPromptOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
          <div className="pt-3 space-y-3">
            <Textarea
              className="min-h-[160px] rounded-xl bg-white border-slate-200 text-base resize-none"
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              placeholder="Inserisci il prompt di sistema..."
              disabled={disabled}
            />
            <div className="flex gap-2">
              <Button
                onClick={onSavePrompt}
                disabled={isSavingPrompt || disabled}
                className="flex-1 h-12 rounded-xl"
              >
                {isSavingPrompt ? 'Salvando...' : 'Salva prompt'}
              </Button>
              {isCustomPrompt && (
                <Button
                  variant="outline"
                  onClick={onResetPrompt}
                  disabled={isSavingPrompt || disabled}
                  className="h-12 rounded-xl px-4"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
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
  isValidating: boolean;
  isLoadingNext: boolean;
  cardsRemaining: number;
}

function MobileQuiz({
  card,
  quiz,
  validationResult,
  onAnswer,
  onNext,
  isValidating,
  isLoadingNext,
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
        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
          {cardsRemaining} rimanenti
        </span>
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
  const [availableModels, setAvailableModels] = useState<AvailableModelsResponse | null>(null);
  const [session, setSession] = useState<StudySession | null>(null);

  // Selected provider/model
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Prompt state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isCustomPrompt, setIsCustomPrompt] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // Loading states
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Card preview dialog
  const [isCardPreviewOpen, setIsCardPreviewOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [modelsResponse, cards, preferences] = await Promise.all([
        getAvailableModels(),
        getStudyCards(),
        getStudyPreferences(),
      ]);

      setAvailableModels(modelsResponse);
      setSystemPrompt(preferences.systemPrompt);
      setIsCustomPrompt(preferences.isCustom);

      const configuredProviders = modelsResponse.providers.filter(p => p.isConfigured);

      if (preferences.preferredProvider && preferences.preferredModel) {
        const providerStillConfigured = configuredProviders.some(
          p => p.provider === preferences.preferredProvider
        );
        if (providerStillConfigured) {
          setSelectedProvider(preferences.preferredProvider);
          setSelectedModel(preferences.preferredModel);
        }
      }

      if (!preferences.preferredProvider && configuredProviders.length > 0) {
        setSelectedProvider(configuredProviders[0].provider);
        if (configuredProviders[0].models.length > 0) {
          setSelectedModel(configuredProviders[0].models[0].modelId);
        }
      }

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
    if (!session || !selectedProvider || !selectedModel) return;

    setIsLoadingQuiz(true);

    try {
      const nextCard = selectRandomCard(session.cards, session.seenCardIds);

      if (!nextCard) {
        setState('completed');
        return;
      }

      const quiz = await generateQuiz(selectedProvider, selectedModel, nextCard.rawContent, systemPrompt);

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
    if (!session?.currentCard || !session?.currentQuiz || !selectedProvider || !selectedModel) return;

    setIsValidating(true);

    try {
      const validation = await validateAnswer(
        selectedProvider,
        selectedModel,
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

  const handleProviderChange = async (provider: LLMProvider) => {
    setSelectedProvider(provider);
    setSelectedModel(null);

    const providerModels = availableModels?.providers.find(p => p.provider === provider)?.models;
    if (providerModels && providerModels.length > 0) {
      const newModelId = providerModels[0].modelId;
      setSelectedModel(newModelId);
      try {
        await saveModelPreferences(provider, newModelId);
      } catch (err) {
        console.error('Failed to save model preference:', err);
      }
    }
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    if (selectedProvider) {
      try {
        await saveModelPreferences(selectedProvider, modelId);
      } catch (err) {
        console.error('Failed to save model preference:', err);
      }
    }
  };

  const handleSavePrompt = async () => {
    setIsSavingPrompt(true);
    try {
      await saveStudyPreferences(systemPrompt);
      setIsCustomPrompt(true);
      toast.success('Prompt salvato');
    } catch (err) {
      console.error('Failed to save prompt:', err);
      toast.error('Errore nel salvataggio del prompt');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleResetPrompt = async () => {
    setIsSavingPrompt(true);
    try {
      await resetStudyPreferences();
      const defaultPrompt = await getDefaultPrompt();
      setSystemPrompt(defaultPrompt);
      setIsCustomPrompt(false);
      toast.success('Prompt ripristinato');
    } catch (err) {
      console.error('Failed to reset prompt:', err);
      toast.error('Errore nel ripristino del prompt');
    } finally {
      setIsSavingPrompt(false);
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

      const canStart = selectedProvider && selectedModel;
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {canStart ? 'Pronto per studiare' : 'Seleziona provider e modello'}
          </h2>
          <p className="text-slate-500 mb-6">
            {canStart
              ? `Hai ${session?.cards.length || 0} carte disponibili`
              : 'Scegli il provider AI per iniziare'}
          </p>
          {canStart && (
            <Button
              onClick={loadNextCard}
              className="h-14 px-8 rounded-2xl text-base font-semibold shadow-lg shadow-primary/20"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Genera domanda
            </Button>
          )}
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
        isValidating={isValidating}
        isLoadingNext={isLoadingQuiz}
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

      {/* Controls (always visible when models loaded) */}
      {availableModels && state === 'studying' && (
        <div className="py-4">
          <MobileStudyControls
            availableModels={availableModels}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            systemPrompt={systemPrompt}
            isCustomPrompt={isCustomPrompt}
            onProviderChange={handleProviderChange}
            onModelChange={handleModelChange}
            onSystemPromptChange={setSystemPrompt}
            onSavePrompt={handleSavePrompt}
            onResetPrompt={handleResetPrompt}
            onViewCard={() => setIsCardPreviewOpen(true)}
            isSavingPrompt={isSavingPrompt}
            currentCard={session?.currentCard || null}
            disabled={isLoadingQuiz || isValidating}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col pb-8">
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
