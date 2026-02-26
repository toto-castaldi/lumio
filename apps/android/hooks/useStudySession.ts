import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getPreGeneratedQuestion,
  getStudyCardsForSession,
  getUserRepositories,
  recordCardReview,
  voteQuestion,
  Deck,
  type SRSStudyCard,
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
  card: SRSStudyCard;
  question: ShuffledQuestion;
  userAnswer: string;
  isCorrect: boolean;
  vote: QuestionVote | null;
}

export interface StudySessionState {
  state: StudyState;
  cards: SRSStudyCard[];
  currentIndex: number;
  currentCard: SRSStudyCard | null;
  currentQuestion: ShuffledQuestion | null;
  userAnswer: string | null;
  userVote: QuestionVote | null;
  answeredCards: AnsweredCard[];
  skippedCount: number;
  startedAt: Date;
  repositoryMap: Map<string, Repository>;
  overdueCount: number;
  newCount: number;
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
// FIRE-AND-FORGET SRS WRITE-BACK WITH SINGLE RETRY
// =============================================================================

async function recordCardReviewWithRetry(
  cardId: string,
  quality: number,
  contentHash: string
): Promise<void> {
  try {
    await recordCardReview(cardId, quality, contentHash);
  } catch (err) {
    // Retry once silently
    try {
      await recordCardReview(cardId, quality, contentHash);
    } catch (retryErr) {
      // Drop the update — card will appear again as if not reviewed
      console.error('SRS write-back failed after retry:', retryErr);
    }
  }
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
    overdueCount: 0,
    newCount: 0,
  });

  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // Sequential card index — replaces random selection
  const nextCardIndex = useRef(0);

  // Track which cards have had SRS write-back to avoid double writes
  const writtenBackCardIds = useRef<Set<string>>(new Set());

  // -------------------------------------------------------------------------
  // Load initial data on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const limit = cardsPerSession === 'all' ? 9999 : cardsPerSession;

      // Load repositories and SRS-ordered study cards in parallel
      const [repositories, srsCards] = await Promise.all([
        getUserRepositories(),
        getStudyCardsForSession(limit),
      ]);

      // Build repository map
      const repoMap = new Map(repositories.map(r => [r.id, r]));

      // Filter cards per repository using Deck class (same pattern as PWA)
      const filteredCards: SRSStudyCard[] = [];

      // Group cards by repository
      const cardsByRepo = new Map<string, SRSStudyCard[]>();
      for (const card of srsCards) {
        const repoCards = cardsByRepo.get(card.repositoryId) || [];
        repoCards.push(card);
        cardsByRepo.set(card.repositoryId, repoCards);
      }

      // Filter each group using Deck (.lumioignore)
      for (const [repoId, repoCards] of cardsByRepo) {
        const repo = repoMap.get(repoId);
        if (repo) {
          const deck = new Deck(repo, repoCards);
          filteredCards.push(...(deck.getActiveCards() as SRSStudyCard[]));
        }
      }

      if (filteredCards.length === 0) {
        setSession(prev => ({ ...prev, state: 'no_cards', repositoryMap: repoMap }));
        return;
      }

      // Compute SRS composition counts
      const overdueCount = filteredCards.filter(c => c.isReview).length;
      const newCount = filteredCards.filter(c => !c.isReview).length;

      // Initialize session with filtered cards - don't auto-load first question
      setSession(prev => ({
        ...prev,
        state: 'studying',
        cards: filteredCards,
        repositoryMap: repoMap,
        overdueCount,
        newCount,
      }));
    } catch (err) {
      console.error('Failed to load study data:', err);
      setSession(prev => ({ ...prev, state: 'no_cards' }));
    }
  };

  // -------------------------------------------------------------------------
  // Load the next card's question (sequential iteration)
  // -------------------------------------------------------------------------
  const loadNextQuestion = useCallback(async (cards: SRSStudyCard[]): Promise<{
    card: SRSStudyCard;
    question: ShuffledQuestion;
  } | null> => {
    while (nextCardIndex.current < cards.length) {
      const nextCard = cards[nextCardIndex.current];
      nextCardIndex.current++;

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
    }

    return null;
  }, []);

  // -------------------------------------------------------------------------
  // handleNext: Save current answer (if any) to answeredCards, load next card
  // -------------------------------------------------------------------------
  const handleNext = useCallback(async () => {
    setIsLoadingQuestion(true);

    try {
      // If there's a current answered card, save it to answeredCards
      setSession(prev => {
        if (prev.currentCard && prev.currentQuestion && prev.userAnswer !== null) {
          const answered: AnsweredCard = {
            card: prev.currentCard as SRSStudyCard,
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
  // handleAnswer: Set the user's answer and fire SRS write-back immediately
  // -------------------------------------------------------------------------
  const handleAnswer = useCallback((answer: string) => {
    setSession(prev => ({
      ...prev,
      userAnswer: answer,
    }));

    // Fire SRS write-back immediately on answer (not on Next)
    if (session.currentCard && session.currentQuestion) {
      const isCorrect = answer === session.currentQuestion.correctAnswer;
      const quality = isCorrect ? 4 : 1;
      const card = session.currentCard as SRSStudyCard;

      if (!writtenBackCardIds.current.has(card.id)) {
        writtenBackCardIds.current.add(card.id);
        recordCardReviewWithRetry(card.id, quality, card.contentHash);
      }
    }
  }, [session.currentCard, session.currentQuestion]);

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
  // handleSkip: Skip the current card and load next (NO SRS write-back)
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
  const effectiveLimit = totalCards;
  const answeredCount = session.answeredCards.length + (session.userAnswer !== null ? 1 : 0);
  const cardsRemaining = Math.max(0, totalCards - nextCardIndex.current);
  const progress = totalCards > 0 ? Math.min(1, answeredCount / totalCards) : 0;

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
