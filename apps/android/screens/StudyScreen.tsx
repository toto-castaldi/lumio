import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useStudySession } from '../hooks/useStudySession';
import { RootStackParamList } from '../navigation/AppNavigator';

type StudyNavProp = NativeStackNavigationProp<RootStackParamList, 'Study'>;

/**
 * StudyScreen is the main study session orchestrator.
 *
 * States:
 * - loading: Cards are being fetched from the backend
 * - no_cards: No study cards available (questions being prepared)
 * - studying (no question yet): Ready state with "Start" button
 * - studying (with question): Quiz UI placeholder (Plan 02)
 * - completed: Session complete placeholder (Plan 04)
 */
export function StudyScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<StudyNavProp>();
  const {
    session,
    isLoadingQuestion,
    handleNext,
    handleSkip,
    isSkipping,
    cardsRemaining,
  } = useStudySession();

  // -------------------------------------------------------------------------
  // Header
  // -------------------------------------------------------------------------
  const renderHeader = () => (
    <View style={[headerStyles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={headerStyles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={24} color={colors.text} />
      </TouchableOpacity>

      <Text style={[headerStyles.title, { color: colors.text }]}>Study</Text>

      {session.state === 'studying' && session.currentQuestion && session.userAnswer === null ? (
        <TouchableOpacity
          style={headerStyles.skipButton}
          onPress={handleSkip}
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
  );

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  const renderLoading = () => (
    <View style={contentStyles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[contentStyles.message, { color: colors.textSecondary }]}>
        Loading cards...
      </Text>
    </View>
  );

  // -------------------------------------------------------------------------
  // No cards state
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Ready to study state (studying but no question loaded yet)
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Studying state with question (placeholder for Plan 02 quiz UI)
  // -------------------------------------------------------------------------
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

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={contentStyles.studyingContent}
      >
        {/* Cards remaining badge */}
        <View style={[contentStyles.badge, { backgroundColor: colors.border }]}>
          <Text style={[contentStyles.badgeText, { color: colors.textSecondary }]}>
            {cardsRemaining} remaining
          </Text>
        </View>

        {/* Card title */}
        {session.currentCard && (
          <Text style={[contentStyles.cardTitle, { color: colors.text }]}>
            {session.currentCard.title}
          </Text>
        )}

        {/* Question */}
        {session.currentQuestion && (
          <View style={[contentStyles.questionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[contentStyles.questionText, { color: colors.text }]}>
              {session.currentQuestion.question}
            </Text>
          </View>
        )}

        {/* Placeholder for quiz UI */}
        <View style={[contentStyles.placeholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="construct-outline" size={24} color={colors.textSecondary} />
          <Text style={[contentStyles.placeholderText, { color: colors.textSecondary }]}>
            Quiz UI coming in Plan 02
          </Text>
        </View>
      </ScrollView>
    );
  };

  // -------------------------------------------------------------------------
  // Completed state (placeholder for StudySummary navigation in plan 04)
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Render based on session state
  // -------------------------------------------------------------------------
  const renderContent = () => {
    switch (session.state) {
      case 'loading':
        return renderLoading();
      case 'no_cards':
        return renderNoCards();
      case 'studying':
        // If no current question loaded yet, show ready state
        if (!session.currentCard || !session.currentQuestion) {
          return renderReady();
        }
        return renderStudying();
      case 'completed':
        return renderCompleted();
      default:
        return renderLoading();
    }
  };

  return (
    <SafeAreaView style={[screenStyles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      <View style={screenStyles.content}>
        {renderContent()}
      </View>
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
  studyingContent: {
    padding: 16,
    gap: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  questionCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  placeholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  placeholderText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
