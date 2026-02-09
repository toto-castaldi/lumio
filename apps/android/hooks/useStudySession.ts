import { useState, useEffect, useCallback, useRef } from 'react';
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
import type { CardsPerSession } from '../lib/studySettings';

// =============================================================================
// TYPES
// =============================================================================

export type StudyState = 'loading' | 'no_cards' | 'studying' | 'completed';

export interface AnsweredCard {
  card: StudyCard;
  question: ShuffledQuestion;
  userAnswer: string;
  isCorrect: boolean;
  vote: QuestionVote | null;
}

export interface StudySessionState {
  state: StudyState;
  cards: StudyCard[];
  currentIndex: number;
  currentCard: StudyCard | null;
  currentQuestion: ShuffledQuestion | null;
  userAnswer: string | null;
  userVote: QuestionVote | null;
  answeredCards: AnsweredCard[];
  skippedCount: number;
  startedAt: Date;
  repositoryMap: Map<string, Repository>;
}

export interface UseStudySessionReturn {
  session: StudySessionState;
  isLoadingQuestion: boolean;
  isSkipping: boolean;
  isVoting: boolean;
  handleAnswer: (answer: string) => void;
  handleVote: (vote: QuestionVote) => Promise<void>;
  handleSkip: () => Promise<void>;
  handleNext: () => Promise<void>;
  handleGoToCard: (index: number) => void;
  cardsRemaining: number;
  progress: number;
  effectiveLimit: number;
}

// =============================================================================
// HOOK
// =============================================================================

export function useStudySession(cardsPerSession: CardsPerSession = 'all'): UseStudySessionReturn {
  const [session, setSession] = useState<StudySessionState>({
    state: 'loading',
    cards: [],
    currentIndex: -1,
    currentCard: null,
    currentQuestion: null,
    userAnswer: null,
    userVote: null,
    answeredCards: [],
    skippedCount: 0,
    startedAt: new Date(),
    repositoryMap: new Map(),
  });

  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // Track seen card IDs to avoid repeats
  const seenCardIds = useRef<Set<string>>(new Set());

  // -------------------------------------------------------------------------
  // Load initial data on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load repositories and study cards in parallel
      const [repositories, studyCards] = await Promise.all([
        getUserRepositories(),
        getStudyCardsWithQuestions(),
      ]);

      // Build repository map
      const repoMap = new Map(repositories.map(r => [r.id, r]));

      // Filter cards per repository using Deck class (same pattern as PWA)
      const filteredCards: StudyCard[] = [];

      // Group cards by repository
      const cardsByRepo = new Map<string, StudyCard[]>();
      for (const card of studyCards) {
        const repoCards = cardsByRepo.get(card.repositoryId) || [];
        repoCards.push(card);
        cardsByRepo.set(card.repositoryId, repoCards);
      }

      // Filter each group using Deck (.lumioignore)
      for (const [repoId, repoCards] of cardsByRepo) {
        const repo = repoMap.get(repoId);
        if (repo) {
          const deck = new Deck(repo, repoCards);
          filteredCards.push(...(deck.getActiveCards() as StudyCard[]));
        }
      }

      if (filteredCards.length === 0) {
        setSession(prev => ({ ...prev, state: 'no_cards', repositoryMap: repoMap }));
        return;
      }

      // Initialize session with filtered cards - don't auto-load first question
      setSession(prev => ({
        ...prev,
        state: 'studying',
        cards: filteredCards,
        repositoryMap: repoMap,
      }));
    } catch (err) {
      console.error('Failed to load study data:', err);
      setSession(prev => ({ ...prev, state: 'no_cards' }));
    }
  };

  // -------------------------------------------------------------------------
  // Select a random unseen card
  // -------------------------------------------------------------------------
  const selectRandomCard = useCallback((cards: StudyCard[]): StudyCard | null => {
    const effectiveLimit = cardsPerSession === 'all' ? cards.length : cardsPerSession;
    if (seenCardIds.current.size >= effectiveLimit) return null;
    const unseenCards = cards.filter(c => !seenCardIds.current.has(c.id));
    if (unseenCards.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * unseenCards.length);
    return unseenCards[randomIndex];
  }, [cardsPerSession]);

  // -------------------------------------------------------------------------
  // Load the next card's question
  // -------------------------------------------------------------------------
  const loadNextQuestion = useCallback(async (cards: StudyCard[]): Promise<{
    card: StudyCard;
    question: ShuffledQuestion;
  } | null> => {
    const maxAttempts = cards.length;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const nextCard = selectRandomCard(cards);
      if (!nextCard) return null;

      // Mark as seen regardless of whether it has a question
      seenCardIds.current.add(nextCard.id);

      try {
        const question = await getPreGeneratedQuestion(nextCard.id);
        if (question) {
          return { card: nextCard, question };
        }
        // No question for this card, silently skip and try next
        console.log(`Card ${nextCard.id} has no questions, skipping...`);
      } catch (err) {
        console.error(`Failed to get question for card ${nextCard.id}:`, err);
      }

      attempts++;
    }

    return null;
  }, [selectRandomCard]);

  // -------------------------------------------------------------------------
  // handleNext: Save current answer (if any) and load next card
  // -------------------------------------------------------------------------
  const handleNext = useCallback(async () => {
    setIsLoadingQuestion(true);

    try {
      // If there's a current answered card, save it to answeredCards
      setSession(prev => {
        if (prev.currentCard && prev.currentQuestion && prev.userAnswer !== null) {
          const answered: AnsweredCard = {
            card: prev.currentCard,
            question: prev.currentQuestion,
            userAnswer: prev.userAnswer,
            isCorrect: prev.userAnswer === prev.currentQuestion.correctAnswer,
            vote: prev.userVote,
          };
          return {
            ...prev,
            answeredCards: [...prev.answeredCards, answered],
          };
        }
        return prev;
      });

      // Load next card + question
      const result = await loadNextQuestion(session.cards);

      if (!result) {
        setSession(prev => ({ ...prev, state: 'completed', currentCard: null, currentQuestion: null }));
        return;
      }

      setSession(prev => ({
        ...prev,
        currentCard: result.card,
        currentQuestion: result.question,
        currentIndex: prev.currentIndex + 1,
        userAnswer: null,
        userVote: null,
      }));
    } catch (err) {
      console.error('Failed to load next card:', err);
    } finally {
      setIsLoadingQuestion(false);
    }
  }, [session.cards, loadNextQuestion]);

  // -------------------------------------------------------------------------
  // handleAnswer: Set the user's answer (does NOT advance)
  // -------------------------------------------------------------------------
  const handleAnswer = useCallback((answer: string) => {
    setSession(prev => ({
      ...prev,
      userAnswer: answer,
    }));
  }, []);

  // -------------------------------------------------------------------------
  // handleVote: Vote on the current question
  // -------------------------------------------------------------------------
  const handleVote = useCallback(async (vote: QuestionVote) => {
    if (!session.currentQuestion) return;

    setIsVoting(true);
    try {
      await voteQuestion(session.currentQuestion.questionId, vote);
      setSession(prev => ({
        ...prev,
        userVote: vote,
      }));
    } catch (err) {
      console.error('Failed to vote:', err);
    } finally {
      setIsVoting(false);
    }
  }, [session.currentQuestion]);

  // -------------------------------------------------------------------------
  // handleSkip: Skip the current card and load next
  // -------------------------------------------------------------------------
  const handleSkip = useCallback(async () => {
    setIsSkipping(true);

    try {
      setSession(prev => ({
        ...prev,
        skippedCount: prev.skippedCount + 1,
      }));

      const result = await loadNextQuestion(session.cards);

      if (!result) {
        setSession(prev => ({ ...prev, state: 'completed', currentCard: null, currentQuestion: null }));
        return;
      }

      setSession(prev => ({
        ...prev,
        currentCard: result.card,
        currentQuestion: result.question,
        currentIndex: prev.currentIndex + 1,
        userAnswer: null,
        userVote: null,
      }));
    } catch (err) {
      console.error('Failed to skip card:', err);
    } finally {
      setIsSkipping(false);
    }
  }, [session.cards, loadNextQuestion]);

  // -------------------------------------------------------------------------
  // handleGoToCard: Navigate to a previously answered card for review
  // -------------------------------------------------------------------------
  const handleGoToCard = useCallback((index: number) => {
    setSession(prev => {
      if (index < 0 || index >= prev.answeredCards.length) return prev;

      const answered = prev.answeredCards[index];
      return {
        ...prev,
        currentIndex: index,
        currentCard: answered.card,
        currentQuestion: answered.question,
        userAnswer: answered.userAnswer,
        userVote: answered.vote,
      };
    });
  }, []);

  // -------------------------------------------------------------------------
  // Computed values
  // -------------------------------------------------------------------------
  const totalCards = session.cards.length;
  const effectiveLimit = cardsPerSession === 'all' ? totalCards : Math.min(cardsPerSession as number, totalCards);
  const seenCount = seenCardIds.current.size;
  const cardsRemaining = Math.max(0, effectiveLimit - seenCount);
  const progress = effectiveLimit > 0 ? Math.min(1, seenCount / effectiveLimit) : 0;

  return {
    session,
    isLoadingQuestion,
    isSkipping,
    isVoting,
    handleAnswer,
    handleVote,
    handleSkip,
    handleNext,
    handleGoToCard,
    cardsRemaining,
    progress,
    effectiveLimit,
  };
}
