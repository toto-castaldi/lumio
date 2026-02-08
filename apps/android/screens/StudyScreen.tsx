import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { useTheme } from '../hooks/useTheme';
import { useStudySession } from '../hooks/useStudySession';
import { RootStackParamList } from '../navigation/AppNavigator';
import { QuizCard } from '../components/study/QuizCard';
import { ProgressBar } from '../components/study/ProgressBar';
import { CardPreviewModal } from '../components/study/CardPreviewModal';

type StudyNavProp = NativeStackNavigationProp<RootStackParamList, 'Study'>;

/**
 * StudyScreen is the main study session orchestrator.
 *
 * States:
 * - loading: Cards are being fetched from the backend
 * - no_cards: No study cards available (questions being prepared)
 * - studying (no question yet): Ready state with "Start" button
 * - studying (with question): Full quiz UI with answer options, haptics, explanation, vote
 * - completed: Session complete (Plan 04 will add StudySummary navigation)
 *
 * Features:
 * - Swipe left = next card (after answering)
 * - Swipe right = review previous answered card
 * - Skip button removes card from session
 * - Back/close button shows quit confirmation during active study
 * - Progress bar tracks session completion
 */
export function StudyScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<StudyNavProp>();
  const {
    session,
    isLoadingQuestion,
    isVoting,
    handleAnswer,
    handleVote,
    handleNext,
    handleSkip,
    handleGoToCard,
    isSkipping,
    cardsRemaining,
    progress,
  } = useStudySession();

  // Card preview modal state
  const [isCardPreviewOpen, setIsCardPreviewOpen] = useState(false);
  // Track whether we're reviewing a previously answered card
  const [isReviewing, setIsReviewing] = useState(false);
  // Store the "live" index (the furthest card the user has reached)
  const liveIndexRef = useRef(-1);

  // Keep liveIndex in sync with session progression
  useEffect(() => {
    if (
      session.state === 'studying' &&
      session.currentCard &&
      session.currentQuestion &&
      !isReviewing
    ) {
      liveIndexRef.current = session.currentIndex;
    }
  }, [session.currentIndex, session.state, session.currentCard, session.currentQuestion, isReviewing]);

  // ---------------------------------------------------------------------------
  // Quit confirmation on back press
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Only block if actively studying
      if (session.state !== 'studying') return;

      e.preventDefault();

      Alert.alert(
        'End Session?',
        'Your progress will be saved.',
        [
          { text: 'Continue Studying', style: 'cancel' },
          {
            text: 'End Session',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ],
      );
    });

    return unsubscribe;
  }, [navigation, session.state]);

  // ---------------------------------------------------------------------------
  // Auto-navigate to StudySummary on session completion
  // ---------------------------------------------------------------------------
  const hasNavigatedToSummary = useRef(false);

  useEffect(() => {
    if (session.state === 'completed' && !hasNavigatedToSummary.current) {
      hasNavigatedToSummary.current = true;
      navigation.replace('StudySummary', {
        totalCards: session.answeredCards.length + session.skippedCount,
        correctCount: session.answeredCards.filter(a => a.isCorrect).length,
        incorrectCount: session.answeredCards.filter(a => !a.isCorrect).length,
        skippedCount: session.skippedCount,
        timeSpentSeconds: Math.floor(
          (Date.now() - session.startedAt.getTime()) / 1000,
        ),
      });
    }
  }, [session.state, session.answeredCards, session.skippedCount, session.startedAt, navigation]);

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------
  const canGoNext = session.userAnswer !== null && !isReviewing;
  const canGoBack = session.answeredCards.length > 0;
  const isLastCard = cardsRemaining === 0;

  const goToNextCard = () => {
    if (!canGoNext) return;
    setIsReviewing(false);
    handleNext();
  };

  const goToPreviousCard = () => {
    if (!canGoBack) return;

    if (isReviewing) {
      // Find the current review position
      const currentReviewIndex = session.answeredCards.findIndex(
        (a) => a.card.id === session.currentCard?.id,
      );
      if (currentReviewIndex > 0) {
        setIsReviewing(true);
        handleGoToCard(currentReviewIndex - 1);
      }
    } else {
      // Go to most recent answered card
      setIsReviewing(true);
      handleGoToCard(session.answeredCards.length - 1);
    }
  };

  const returnFromReview = () => {
    if (!isReviewing) return;

    // Check if there's a next review card
    const currentReviewIndex = session.answeredCards.findIndex(
      (a) => a.card.id === session.currentCard?.id,
    );

    if (currentReviewIndex < session.answeredCards.length - 1) {
      // Go to next reviewed card
      handleGoToCard(currentReviewIndex + 1);
    } else {
      // Return to the live card (reload current question)
      setIsReviewing(false);
      // handleGoToCard to the live index triggers restore of the live card
      // We need to call handleNext to re-load a fresh question if live card was already answered
      handleNext();
    }
  };

  // ---------------------------------------------------------------------------
  // Swipe gestures
  // ---------------------------------------------------------------------------
  const flingLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => {
      if (isReviewing) {
        returnFromReview();
      } else if (canGoNext) {
        goToNextCard();
      }
    });

  const flingRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => {
      goToPreviousCard();
    });

  const swipeGesture = Gesture.Simultaneous(flingLeft, flingRight);

  // ---------------------------------------------------------------------------
  // Skip handler with toast
  // ---------------------------------------------------------------------------
  const onSkip = async () => {
    await handleSkip();
    Toast.show({
      type: 'info',
      text1: 'Card skipped',
      visibilityTime: 1500,
    });
  };

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------
  const showSkip =
    session.state === 'studying' &&
    session.currentQuestion &&
    session.userAnswer === null &&
    !isReviewing;

  const renderHeader = () => (
    <View style={[headerStyles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={headerStyles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={[headerStyles.title, { color: colors.text }]}>
        {isReviewing ? 'Review' : 'Study'}
      </Text>

      <View style={headerStyles.rightActions}>
        {session.currentCard && (
          <TouchableOpacity
            style={headerStyles.iconButton}
            onPress={() => setIsCardPreviewOpen(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="eye-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        {showSkip ? (
          <TouchableOpacity
            style={headerStyles.skipButton}
            onPress={onSkip}
            disabled={isSkipping}
            activeOpacity={0.7}
          >
            <Text style={[headerStyles.skipText, { color: colors.primary }]}>
              {isSkipping ? 'Skipping...' : 'Skip'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={headerStyles.spacer} />
        )}
      </View>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  const renderLoading = () => (
    <View style={contentStyles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[contentStyles.message, { color: colors.textSecondary }]}>
        Loading cards...
      </Text>
    </View>
  );

  // ---------------------------------------------------------------------------
  // No cards state
  // ---------------------------------------------------------------------------
  const renderNoCards = () => (
    <View style={contentStyles.centered}>
      <View style={[contentStyles.iconCircle, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="documents-outline" size={40} color={colors.primary} />
      </View>
      <Text style={[contentStyles.heading, { color: colors.text }]}>
        No cards available
      </Text>
      <Text style={[contentStyles.subtitle, { color: colors.textSecondary }]}>
        Questions are being prepared. Try again in a few minutes.
      </Text>
      <TouchableOpacity
        style={[contentStyles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={contentStyles.primaryButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Ready to study state (studying but no question loaded yet)
  // ---------------------------------------------------------------------------
  const renderReady = () => (
    <View style={contentStyles.centered}>
      <View style={[contentStyles.iconCircle, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="school-outline" size={40} color={colors.primary} />
      </View>
      <Text style={[contentStyles.heading, { color: colors.text }]}>
        Ready to study
      </Text>
      <Text style={[contentStyles.subtitle, { color: colors.textSecondary }]}>
        {session.cards.length} cards available
      </Text>
      <TouchableOpacity
        style={[contentStyles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={handleNext}
        disabled={isLoadingQuestion}
        activeOpacity={0.8}
      >
        {isLoadingQuestion ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Ionicons name="play" size={20} color="#ffffff" />
            <Text style={contentStyles.primaryButtonText}>Start</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Studying state with question — full quiz UI
  // ---------------------------------------------------------------------------
  const renderStudying = () => {
    if (isLoadingQuestion) {
      return (
        <View style={contentStyles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[contentStyles.message, { color: colors.textSecondary }]}>
            Loading question...
          </Text>
        </View>
      );
    }

    if (!session.currentCard || !session.currentQuestion) {
      return renderReady();
    }

    return (
      <View style={{ flex: 1 }}>
        <GestureDetector gesture={swipeGesture}>
          <View style={{ flex: 1 }}>
            <QuizCard
              card={session.currentCard}
              question={session.currentQuestion}
              userAnswer={session.userAnswer}
              userVote={session.userVote}
              onAnswer={handleAnswer}
              onVote={handleVote}
              isVoting={isVoting}
            />
          </View>
        </GestureDetector>

        {/* Bottom action: Next Card button (shown after answering, hidden during review) */}
        {session.userAnswer !== null && !isReviewing && (
          <View style={[bottomStyles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[bottomStyles.nextButton, { backgroundColor: colors.primary }]}
              onPress={goToNextCard}
              disabled={isLoadingQuestion}
              activeOpacity={0.8}
            >
              {isLoadingQuestion ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Text style={bottomStyles.nextButtonText}>
                    {isLastCard ? 'Finish' : 'Next Card'}
                  </Text>
                  <Ionicons
                    name={isLastCard ? 'checkmark' : 'arrow-forward'}
                    size={20}
                    color="#ffffff"
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Review navigation hint */}
        {isReviewing && (
          <View style={[bottomStyles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[bottomStyles.reviewButton, { borderColor: colors.primary }]}
              onPress={returnFromReview}
              activeOpacity={0.8}
            >
              <Text style={[bottomStyles.reviewButtonText, { color: colors.primary }]}>
                Back to Current Card
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // Completed state (placeholder for StudySummary navigation in plan 04)
  // ---------------------------------------------------------------------------
  const renderCompleted = () => (
    <View style={contentStyles.centered}>
      <View style={[contentStyles.iconCircle, { backgroundColor: '#d1fae5' }]}>
        <Ionicons name="checkmark-circle" size={40} color="#10b981" />
      </View>
      <Text style={[contentStyles.heading, { color: colors.text }]}>
        Session Complete
      </Text>
      <Text style={[contentStyles.subtitle, { color: colors.textSecondary }]}>
        You studied all available cards
      </Text>
      <TouchableOpacity
        style={[contentStyles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={contentStyles.primaryButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  // ---------------------------------------------------------------------------
  // Render based on session state
  // ---------------------------------------------------------------------------
  const renderContent = () => {
    switch (session.state) {
      case 'loading':
        return renderLoading();
      case 'no_cards':
        return renderNoCards();
      case 'studying':
        return renderStudying();
      case 'completed':
        return renderCompleted();
      default:
        return renderLoading();
    }
  };

  // Show progress bar when studying (has a current card or has answered cards)
  const showProgress =
    session.state === 'studying' &&
    (session.currentCard !== null || session.answeredCards.length > 0);

  const answeredCount = session.answeredCards.length + (session.userAnswer !== null && !isReviewing ? 1 : 0);

  return (
    <SafeAreaView style={[screenStyles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {showProgress && (
        <ProgressBar
          progress={progress}
          current={answeredCount}
          total={session.cards.length}
        />
      )}
      <View style={screenStyles.content}>
        {renderContent()}
      </View>
      <CardPreviewModal
        visible={isCardPreviewOpen}
        onClose={() => setIsCardPreviewOpen(false)}
        card={session.currentCard}
        repositoryMap={session.repositoryMap}
      />
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  spacer: {
    width: 40,
  },
});

const contentStyles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    marginTop: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
});

const bottomStyles = StyleSheet.create({
  container: {
    padding: 16,
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    gap: 8,
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
