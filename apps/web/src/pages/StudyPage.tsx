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
// STUDY CONTROLS COMPONENT (Always visible at top)
// =============================================================================

interface StudyControlsProps {
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

function StudyControls({
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
}: StudyControlsProps) {
  const [isPromptOpen, setIsPromptOpen] = useState(false);

  const configuredProviders = availableModels.providers.filter(p => p.isConfigured);
  const currentModels = selectedProvider
    ? availableModels.providers.find(p => p.provider === selectedProvider)?.models || []
    : [];

  if (configuredProviders.length === 0) {
    return (
      <CardUI className="border-yellow-500">
        <CardHeader>
          <CardTitle className="text-yellow-600">Configurazione richiesta</CardTitle>
          <CardDescription>
            Configura almeno una API key per studiare.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/setup/api-keys">Configura API Keys</Link>
          </Button>
        </CardContent>
      </CardUI>
    );
  }

  return (
    <div className="space-y-3">
      {/* Provider/Model Selection Row */}
      <div className="flex flex-wrap gap-3 items-center p-3 bg-muted/50 rounded-lg">
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Provider:</label>
          <Select
            value={selectedProvider || undefined}
            onValueChange={(v) => onProviderChange(v as LLMProvider)}
            disabled={disabled}
          >
            <SelectTrigger className="w-[140px]">
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

        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium">Modello:</label>
          <Select
            value={selectedModel || undefined}
            onValueChange={onModelChange}
            disabled={disabled || !selectedProvider}
          >
            <SelectTrigger className="w-[180px]">
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

        <div className="flex-1" />

        {currentCard && (
          <Button variant="outline" size="sm" onClick={onViewCard}>
            Vedi carta
          </Button>
        )}
      </div>

      {/* Collapsible Prompt Settings */}
      <Collapsible open={isPromptOpen} onOpenChange={setIsPromptOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            <span>
              Impostazioni Prompt {isCustomPrompt && '(personalizzato)'}
            </span>
            <span>{isPromptOpen ? '▲' : '▼'}</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <CardUI>
            <CardContent className="pt-4 space-y-3">
              <textarea
                className="w-full h-40 p-3 text-sm border rounded-lg resize-y font-mono bg-muted/50"
                value={systemPrompt}
                onChange={(e) => onSystemPromptChange(e.target.value)}
                placeholder="Inserisci il prompt di sistema..."
                disabled={disabled}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onSavePrompt}
                  disabled={isSavingPrompt || disabled}
                >
                  {isSavingPrompt ? 'Salvando...' : 'Salva prompt'}
                </Button>
                {isCustomPrompt && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onResetPrompt}
                    disabled={isSavingPrompt || disabled}
                  >
                    Ripristina default
                  </Button>
                )}
              </div>
            </CardContent>
          </CardUI>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
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
  isValidating: boolean;
  isLoadingNext: boolean;
  cardsRemaining: number;
}

function QuizComponent({
  card,
  quiz,
  validationResult,
  onAnswer,
  onNext,
  isValidating,
  isLoadingNext,
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
      <div className="text-sm text-muted-foreground">
        <span className="font-medium">{card.title}</span>
        <span className="mx-2">•</span>
        <span>{cardsRemaining} carte rimanenti</span>
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

      // Set preferred provider/model if available
      const configuredProviders = modelsResponse.providers.filter(p => p.isConfigured);

      if (preferences.preferredProvider && preferences.preferredModel) {
        // Verify the preferred provider is still configured
        const providerStillConfigured = configuredProviders.some(
          p => p.provider === preferences.preferredProvider
        );
        if (providerStillConfigured) {
          setSelectedProvider(preferences.preferredProvider);
          setSelectedModel(preferences.preferredModel);
        }
      }

      // If no preference set, select first configured provider
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

      // Initialize session
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

  const handleProviderChange = async (provider: LLMProvider) => {
    setSelectedProvider(provider);
    setSelectedModel(null); // Reset model when provider changes

    // Auto-select first model of new provider
    const providerModels = availableModels?.providers.find(p => p.provider === provider)?.models;
    if (providerModels && providerModels.length > 0) {
      const newModelId = providerModels[0].modelId;
      setSelectedModel(newModelId);
      // Save preference
      try {
        await saveModelPreferences(provider, newModelId);
      } catch (err) {
        console.error('Failed to save model preference:', err);
      }
    }
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    // Save preference
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
      const canStart = selectedProvider && selectedModel;
      return (
        <CardUI>
          <CardHeader>
            <CardTitle>
              {canStart ? 'Pronto per studiare' : 'Seleziona provider e modello'}
            </CardTitle>
            <CardDescription>
              {canStart
                ? `Hai ${session?.cards.length || 0} carte disponibili. Premi il pulsante per iniziare.`
                : 'Scegli il provider e il modello AI per iniziare a studiare'}
            </CardDescription>
          </CardHeader>
          {canStart && (
            <CardContent>
              <Button onClick={loadNextCard} className="w-full">
                Genera domanda
              </Button>
            </CardContent>
          )}
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
        isValidating={isValidating}
        isLoadingNext={isLoadingQuiz}
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

        {/* Controls (always visible when models loaded) */}
        {availableModels && (
          <StudyControls
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
        )}

        {/* Content */}
        {renderContent()}

        {/* Card Preview Dialog */}
        <CardPreviewDialog
          card={session?.currentCard || null}
          isOpen={isCardPreviewOpen}
          onClose={() => setIsCardPreviewOpen(false)}
        />
      </div>
    </div>
  );
}
