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
import Toast from 'react-native-toast-message';
import { useTheme } from '../hooks/useTheme';
import { useStudySession } from '../hooks/useStudySession';
import { RootStackParamList } from '../navigation/AppNavigator';
import { QuizCard } from '../components/study/QuizCard';
import { ProgressBar } from '../components/study/ProgressBar';
import { CardPreviewModal } from '../components/study/CardPreviewModal';

type StudyNavProp = NativeStackNavigationProp<RootStackParamList, 'Study'>;

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

  // ---------------------------------------------------------------------------
  // Quit confirmation on back press
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
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
  const canGoBack = session.answeredCards.length > 0 && !isReviewing;
  const isLastCard = cardsRemaining === 0;

  const goToNextCard = () => {
    if (!canGoNext) return;
    setIsReviewing(false);
    handleNext();
  };

  const goToPreviousCard = () => {
    if (session.answeredCards.length === 0) return;

    if (isReviewing) {
      const currentReviewIndex = session.answeredCards.findIndex(
        (a) => a.card.id === session.currentCard?.id,
      );
      if (currentReviewIndex > 0) {
        handleGoToCard(currentReviewIndex - 1);
      }
    } else {
      setIsReviewing(true);
      handleGoToCard(session.answeredCards.length - 1);
    }
  };

  const returnFromReview = () => {
    if (!isReviewing) return;
    setIsReviewing(false);
    handleNext();
  };

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
  // Ready to study state
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
        <QuizCard
          card={session.currentCard}
          question={session.currentQuestion}
          userAnswer={session.userAnswer}
          userVote={session.userVote}
          onAnswer={handleAnswer}
          onVote={handleVote}
          isVoting={isVoting}
        />

        {/* Bottom actions */}
        {session.userAnswer !== null && !isReviewing && (
          <View style={[bottomStyles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={bottomStyles.buttonRow}>
              {canGoBack && (
                <TouchableOpacity
                  style={[bottomStyles.prevButton, { borderColor: colors.border, flex: 1 }]}
                  onPress={goToPreviousCard}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                  <Text style={[bottomStyles.prevButtonText, { color: colors.text }]}>
                    Prev Card
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[bottomStyles.nextButton, { backgroundColor: colors.primary, flex: 1 }]}
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
          </View>
        )}

        {/* Review mode bottom bar */}
        {isReviewing && (
          <View style={[bottomStyles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={bottomStyles.buttonRow}>
              {session.answeredCards.findIndex(a => a.card.id === session.currentCard?.id) > 0 && (
                <TouchableOpacity
                  style={[bottomStyles.prevButton, { borderColor: colors.border, flex: 1 }]}
                  onPress={goToPreviousCard}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                  <Text style={[bottomStyles.prevButtonText, { color: colors.text }]}>
                    Prev Card
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[bottomStyles.reviewButton, { borderColor: colors.primary, flex: 1 }]}
                onPress={returnFromReview}
                activeOpacity={0.8}
              >
                <Text style={[bottomStyles.reviewButtonText, { color: colors.primary }]}>
                  Back to Current Card
                </Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // Completed state
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
  // Render
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  prevButtonText: {
    fontSize: 17,
    fontWeight: '600',
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
