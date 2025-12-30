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
  type Card,
  type LLMProvider,
  type QuizQuestion,
  type AvailableModelsResponse,
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
import { toast } from 'sonner';

// =============================================================================
// TYPES
// =============================================================================

type StudyState = 'loading' | 'setup' | 'quiz' | 'completed' | 'error';

interface StudySession {
  provider: LLMProvider;
  modelId: string;
  cards: Card[];
  seenCardIds: Set<string>;
  currentCard: Card | null;
  currentQuiz: QuizQuestion | null;
  systemPrompt: string;
}

// =============================================================================
// PROVIDER MODEL SELECTOR COMPONENT
// =============================================================================

interface ProviderModelSelectorProps {
  availableModels: AvailableModelsResponse;
  systemPrompt: string;
  isCustomPrompt: boolean;
  onSystemPromptChange: (prompt: string) => void;
  onSavePrompt: () => void;
  onResetPrompt: () => void;
  onStart: (provider: LLMProvider, modelId: string) => void;
  isStarting: boolean;
  isSavingPrompt: boolean;
}

function ProviderModelSelector({
  availableModels,
  systemPrompt,
  isCustomPrompt,
  onSystemPromptChange,
  onSavePrompt,
  onResetPrompt,
  onStart,
  isStarting,
  isSavingPrompt,
}: ProviderModelSelectorProps) {
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);

  // Filter to only configured providers
  const configuredProviders = availableModels.providers.filter(p => p.isConfigured);

  // Get models for selected provider
  const currentModels = selectedProvider
    ? availableModels.providers.find(p => p.provider === selectedProvider)?.models || []
    : [];

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value as LLMProvider);
    setSelectedModel(null); // Reset model when provider changes
  };

  const handleModelChange = (value: string) => {
    setSelectedModel(value);
  };

  const handleStart = () => {
    if (selectedProvider && selectedModel) {
      onStart(selectedProvider, selectedModel);
    }
  };

  if (configuredProviders.length === 0) {
    return (
      <CardUI>
        <CardHeader>
          <CardTitle>Configurazione richiesta</CardTitle>
          <CardDescription>
            Per iniziare a studiare, devi prima configurare almeno una API key.
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
    <div className="space-y-4">
      {/* Collapsible Prompt Settings */}
      <CardUI>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setIsPromptExpanded(!isPromptExpanded)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Impostazioni Prompt</CardTitle>
              <CardDescription>
                {isCustomPrompt ? 'Prompt personalizzato' : 'Prompt predefinito'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              {isPromptExpanded ? '▲' : '▼'}
            </Button>
          </div>
        </CardHeader>
        {isPromptExpanded && (
          <CardContent className="space-y-3">
            <textarea
              className="w-full h-48 p-3 text-sm border rounded-lg resize-y font-mono bg-muted/50"
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              placeholder="Inserisci il prompt di sistema..."
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onSavePrompt}
                disabled={isSavingPrompt}
              >
                {isSavingPrompt ? 'Salvando...' : 'Salva prompt'}
              </Button>
              {isCustomPrompt && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onResetPrompt}
                  disabled={isSavingPrompt}
                >
                  Ripristina default
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </CardUI>

      {/* Provider/Model Selection */}
      <CardUI>
        <CardHeader>
          <CardTitle>Inizia a studiare</CardTitle>
          <CardDescription>
            Scegli il provider e il modello AI per generare le domande
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <Select onValueChange={handleProviderChange} value={selectedProvider || undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un provider" />
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

        {/* Model Selection */}
        {selectedProvider && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Modello</label>
            <Select onValueChange={handleModelChange} value={selectedModel || undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un modello" />
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
        )}

          {/* Start Button */}
          <Button
            onClick={handleStart}
            disabled={!selectedProvider || !selectedModel || isStarting}
            className="w-full"
          >
            {isStarting ? 'Caricamento...' : 'Inizia a studiare'}
          </Button>
        </CardContent>
      </CardUI>
    </div>
  );
}

// =============================================================================
// QUIZ CARD COMPONENT
// =============================================================================

interface QuizCardProps {
  card: Card;
  quiz: QuizQuestion;
  onNext: () => void;
  isLoadingNext: boolean;
  cardsRemaining: number;
}

function QuizCard({ card, quiz, onNext, isLoadingNext, cardsRemaining }: QuizCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  // Reset state when quiz changes (new card)
  useEffect(() => {
    setSelectedAnswer(null);
    setHasAnswered(false);
  }, [quiz]);

  const handleAnswer = (label: string) => {
    if (hasAnswered) return;
    setSelectedAnswer(label);
    setHasAnswered(true);
  };

  const isCorrect = selectedAnswer === quiz.correctAnswer;

  const getOptionStyle = (label: string) => {
    if (!hasAnswered) {
      return 'border-border hover:border-primary hover:bg-muted/50 cursor-pointer';
    }

    if (label === quiz.correctAnswer) {
      return 'border-green-500 bg-green-50';
    }

    if (label === selectedAnswer && label !== quiz.correctAnswer) {
      return 'border-red-500 bg-red-50';
    }

    return 'border-border opacity-50';
  };

  return (
    <div className="space-y-6">
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
              onClick={() => handleAnswer(option.label)}
              className={`p-4 border rounded-lg transition-colors ${getOptionStyle(option.label)}`}
            >
              <span className="font-semibold mr-2">{option.label}.</span>
              {option.text}
            </div>
          ))}
        </CardContent>
      </CardUI>

      {/* Feedback */}
      {hasAnswered && (
        <CardUI className={isCorrect ? 'border-green-500' : 'border-red-500'}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {isCorrect ? 'Corretto!' : 'Sbagliato!'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{quiz.explanation}</p>
            <Button onClick={onNext} className="mt-4" disabled={isLoadingNext}>
              {isLoadingNext ? 'Caricamento...' : 'Prossima carta'}
            </Button>
          </CardContent>
        </CardUI>
      )}
    </div>
  );
}

// =============================================================================
// STUDY COMPLETED COMPONENT
// =============================================================================

interface StudyCompletedProps {
  totalCards: number;
}

function StudyCompleted({ totalCards }: StudyCompletedProps) {
  const navigate = useNavigate();

  return (
    <CardUI>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Completato!</CardTitle>
        <CardDescription>
          Hai studiato tutte le {totalCards} carte disponibili
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

// =============================================================================
// MAIN STUDY PAGE COMPONENT
// =============================================================================

export function StudyPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<StudyState>('loading');
  const [availableModels, setAvailableModels] = useState<AvailableModelsResponse | null>(null);
  const [session, setSession] = useState<StudySession | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prompt customization state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isCustomPrompt, setIsCustomPrompt] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

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

      if (cards.length === 0) {
        setError('Non hai carte da studiare. Aggiungi un repository prima di iniziare.');
        setState('error');
        return;
      }

      // Store cards in session for later use
      setSession({
        provider: 'openai',
        modelId: '',
        cards,
        seenCardIds: new Set(),
        currentCard: null,
        currentQuiz: null,
        systemPrompt: preferences.systemPrompt,
      });

      setState('setup');
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Errore nel caricamento dei dati');
      setState('error');
    }
  };

  // Handle system prompt change
  const handleSystemPromptChange = (prompt: string) => {
    setSystemPrompt(prompt);
  };

  // Save custom prompt to DB
  const handleSavePrompt = async () => {
    setIsSavingPrompt(true);
    try {
      await saveStudyPreferences(systemPrompt);
      setIsCustomPrompt(true);
      // Update session with new prompt
      setSession(prev => prev ? { ...prev, systemPrompt } : null);
      toast.success('Prompt salvato');
    } catch (err) {
      console.error('Failed to save prompt:', err);
      toast.error('Errore nel salvataggio del prompt');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  // Reset prompt to default
  const handleResetPrompt = async () => {
    setIsSavingPrompt(true);
    try {
      await resetStudyPreferences();
      const defaultPrompt = await getDefaultPrompt();
      setSystemPrompt(defaultPrompt);
      setIsCustomPrompt(false);
      // Update session with default prompt
      setSession(prev => prev ? { ...prev, systemPrompt: defaultPrompt } : null);
      toast.success('Prompt ripristinato');
    } catch (err) {
      console.error('Failed to reset prompt:', err);
      toast.error('Errore nel ripristino del prompt');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  // Select a random unseen card
  const selectRandomCard = useCallback((cards: Card[], seenIds: Set<string>): Card | null => {
    const unseenCards = cards.filter(c => !seenIds.has(c.id));
    if (unseenCards.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * unseenCards.length);
    return unseenCards[randomIndex];
  }, []);

  // Generate quiz for a card
  const generateQuizForCard = useCallback(async (
    card: Card,
    provider: LLMProvider,
    modelId: string,
    customSystemPrompt?: string
  ): Promise<QuizQuestion> => {
    return await generateQuiz(provider, modelId, card.rawContent, customSystemPrompt);
  }, []);

  // Start study session
  const handleStartStudy = async (provider: LLMProvider, modelId: string) => {
    if (!session) return;

    setIsLoadingQuiz(true);

    try {
      const firstCard = selectRandomCard(session.cards, session.seenCardIds);
      if (!firstCard) {
        setState('completed');
        return;
      }

      // Use the current systemPrompt from state (allows immediate effect without saving)
      const quiz = await generateQuizForCard(firstCard, provider, modelId, systemPrompt);

      setSession(prev => ({
        ...prev!,
        provider,
        modelId,
        currentCard: firstCard,
        currentQuiz: quiz,
        seenCardIds: new Set([firstCard.id]),
        systemPrompt, // Lock in the current prompt for this session
      }));

      setState('quiz');
    } catch (err) {
      console.error('Failed to generate quiz:', err);
      toast.error(err instanceof Error ? err.message : 'Errore nella generazione della domanda');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // Move to next card
  const handleNextCard = async () => {
    if (!session) return;

    setIsLoadingQuiz(true);

    try {
      const nextCard = selectRandomCard(session.cards, session.seenCardIds);

      if (!nextCard) {
        setState('completed');
        return;
      }

      const quiz = await generateQuizForCard(nextCard, session.provider, session.modelId, session.systemPrompt);

      setSession(prev => ({
        ...prev!,
        currentCard: nextCard,
        currentQuiz: quiz,
        seenCardIds: new Set([...prev!.seenCardIds, nextCard.id]),
      }));
    } catch (err) {
      console.error('Failed to generate quiz:', err);
      toast.error(err instanceof Error ? err.message : 'Errore nella generazione della domanda');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // Render based on state
  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="flex min-h-[50vh] items-center justify-center">
            <p className="text-muted-foreground">Caricamento...</p>
          </div>
        );

      case 'error':
        return (
          <CardUI>
            <CardHeader>
              <CardTitle>Errore</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/dashboard')}>
                Torna alla Dashboard
              </Button>
            </CardContent>
          </CardUI>
        );

      case 'setup':
        return availableModels ? (
          <ProviderModelSelector
            availableModels={availableModels}
            systemPrompt={systemPrompt}
            isCustomPrompt={isCustomPrompt}
            onSystemPromptChange={handleSystemPromptChange}
            onSavePrompt={handleSavePrompt}
            onResetPrompt={handleResetPrompt}
            onStart={handleStartStudy}
            isStarting={isLoadingQuiz}
            isSavingPrompt={isSavingPrompt}
          />
        ) : null;

      case 'quiz':
        return session?.currentCard && session?.currentQuiz ? (
          <QuizCard
            card={session.currentCard}
            quiz={session.currentQuiz}
            onNext={handleNextCard}
            isLoadingNext={isLoadingQuiz}
            cardsRemaining={session.cards.length - session.seenCardIds.size}
          />
        ) : null;

      case 'completed':
        return <StudyCompleted totalCards={session?.cards.length || 0} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sessione di Studio</h1>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Esci</Link>
          </Button>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
}
