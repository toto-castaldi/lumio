import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveStudySession } from '@lumio/core';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import { useStudySettings } from '../hooks/useStudySettings';
import { useStudySession } from '../hooks/useStudySession';
import { RootStackParamList } from '../navigation/AppNavigator';
import { QuizCard } from '../components/study/QuizCard';
import { ProgressBar } from '../components/study/ProgressBar';
import { CardPreviewModal } from '../components/study/CardPreviewModal';

type StudyNavProp = NativeStackNavigationProp<RootStackParamList, 'Study'>;

export function StudyScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<StudyNavProp>();
  const insets = useSafeAreaInsets();
  const { cardsPerSession } = useStudySettings();
  const {
    session,
    isLoadingQuestion,
    isVoting,
    handleAnswer,
    handleVote,
    handleNext,
    handleSkip,
    isSkipping,
    cardsRemaining,
    progress,
    effectiveLimit,
  } = useStudySession(cardsPerSession);

  // Card preview modal state
  const [isCardPreviewOpen, setIsCardPreviewOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Auto-navigate to StudySummary on session completion
  // ---------------------------------------------------------------------------
  const hasNavigatedToSummary = useRef(false);

  useEffect(() => {
    if (session.state === 'completed' && !hasNavigatedToSummary.current) {
      hasNavigatedToSummary.current = true;

      const totalCards = session.answeredCards.length + session.skippedCount;
      const correctCount = session.answeredCards.filter(a => a.isCorrect).length;
      const incorrectCount = session.answeredCards.filter(a => !a.isCorrect).length;
      const timeSpentSeconds = Math.floor(
        (Date.now() - session.startedAt.getTime()) / 1000,
      );

      // Fire-and-forget: persist session to database
      saveStudySession({
        correctCount,
        totalCount: totalCards,
        skippedCount: session.skippedCount,
        durationSeconds: timeSpentSeconds,
      }).catch(err => console.error('Failed to save study session:', err));

      // Fire-and-forget: persist last studied timestamp for dashboard display
      AsyncStorage.setItem('@lumio/lastStudiedAt', new Date().toISOString());

      navigation.replace('StudySummary', {
        totalCards,
        correctCount,
        incorrectCount,
        skippedCount: session.skippedCount,
        timeSpentSeconds,
      });
    }
  }, [session.state, session.answeredCards, session.skippedCount, session.startedAt, navigation]);

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------
  const canGoNext = session.userAnswer !== null;
  const isLastCard = cardsRemaining === 0;

  const goToNextCard = () => {
    if (!canGoNext) return;
    handleNext();
  };

  // ---------------------------------------------------------------------------
  // Skip handler
  // ---------------------------------------------------------------------------
  const onSkip = async () => {
    await handleSkip();
  };

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------
  const showSkip =
    session.state === 'studying' &&
    session.currentQuestion &&
    session.userAnswer === null;

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
        {t('study.studyTitle')}
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
              {isSkipping ? t('study.skipping') : t('study.skip')}
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
        {t('study.loadingCards')}
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
        {t('study.noCardsTitle')}
      </Text>
      <Text style={[contentStyles.subtitle, { color: colors.textSecondary }]}>
        {t('study.noCardsSubtitle')}
      </Text>
      <TouchableOpacity
        style={[contentStyles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={contentStyles.primaryButtonText}>{t('study.backToDashboard')}</Text>
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
        {t('study.readyTitle')}
      </Text>
      <Text style={[contentStyles.subtitle, { color: colors.textSecondary }]}>
        {effectiveLimit < session.cards.length
          ? t('study.studyingXOfY', { limit: effectiveLimit, total: session.cards.length })
          : t('study.cardsAvailable', { count: session.cards.length })}
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
            <Text style={contentStyles.primaryButtonText}>{t('study.start')}</Text>
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
            {t('study.loadingQuestion')}
          </Text>
        </View>
      );
    }

    if (!session.currentCard || !session.currentQuestion) {
      return renderReady();
    }

    // Height of the bottom button area so QuizCard content isn't hidden behind it
    // SafeAreaView already accounts for insets.bottom, so no need to add it here
    const bottomButtonHeight = 80;

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
          bottomInset={session.userAnswer !== null ? bottomButtonHeight : 0}
        />

        {/* Bottom actions — absolutely positioned at the bottom of the screen */}
        {session.userAnswer !== null && (
          <View style={[bottomStyles.container, { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={bottomStyles.buttonRow}>
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
                      {isLastCard ? t('study.finish') : t('study.nextCard')}
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
        {t('study.sessionComplete')}
      </Text>
      <Text style={[contentStyles.subtitle, { color: colors.textSecondary }]}>
        {t('study.studiedAllCards')}
      </Text>
      <TouchableOpacity
        style={[contentStyles.primaryButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={contentStyles.primaryButtonText}>{t('study.backToDashboard')}</Text>
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

  const answeredCount = session.answeredCards.length + (session.userAnswer !== null ? 1 : 0);

  return (
    <SafeAreaView style={[screenStyles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {showProgress && (
        <ProgressBar
          progress={progress}
          current={answeredCount}
          total={effectiveLimit}
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
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
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
});
