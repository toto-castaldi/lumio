import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useHaptics } from '../../hooks/useHaptics';
import { AnswerOption, type AnswerOptionState } from './AnswerOption';
import { ExplanationPanel } from './ExplanationPanel';
import type { StudyCard as StudyCardType, ShuffledQuestion, QuestionVote } from '@lumio/core';

interface QuizCardProps {
  card: StudyCardType;
  question: ShuffledQuestion;
  userAnswer: string | null;
  userVote: QuestionVote | null;
  onAnswer: (answer: string) => void;
  onVote: (vote: QuestionVote) => void;
  isVoting: boolean;
  /** Extra bottom padding to prevent content from being hidden behind an absolute-positioned button */
  bottomInset?: number;
}

/**
 * Quiz question display with 4 answer options, haptic feedback, and inline explanation.
 *
 * Flow: User taps an option -> haptic fires (correct=success, incorrect=error) ->
 * options lock -> ExplanationPanel appears below with vote buttons.
 */
export function QuizCard({
  card,
  question,
  userAnswer,
  userVote,
  onAnswer,
  onVote,
  isVoting,
  bottomInset = 0,
}: QuizCardProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { correctFeedback, incorrectFeedback } = useHaptics();

  const hasAnswered = userAnswer !== null;
  const isCorrect = userAnswer === question.correctAnswer;

  const handleSelect = (label: string) => {
    if (hasAnswered) return;

    // Fire haptic feedback based on correctness
    if (label === question.correctAnswer) {
      correctFeedback();
    } else {
      incorrectFeedback();
    }

    onAnswer(label);
  };

  const getOptionState = (label: string): AnswerOptionState => {
    if (!hasAnswered) {
      return 'default';
    }

    // After answering: show correct answer in green
    if (label === question.correctAnswer) {
      return 'correct';
    }

    // Show user's wrong answer in red
    if (label === userAnswer && label !== question.correctAnswer) {
      return 'incorrect';
    }

    // Dim all other options
    return 'dimmed';
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom + bottomInset }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Card title */}
      <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
        {card.title}
      </Text>

      {/* Question text */}
      <View style={[styles.questionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.questionText, { color: colors.text }]}>
          {question.question}
        </Text>
      </View>

      {/* Answer options */}
      <View style={styles.options}>
        {question.options.map((option) => (
          <AnswerOption
            key={option.label}
            label={option.label}
            text={option.text}
            onPress={() => handleSelect(option.label)}
            state={getOptionState(option.label)}
            disabled={hasAnswered}
          />
        ))}
      </View>

      {/* Explanation panel (shown after answering) */}
      {hasAnswered && (
        <ExplanationPanel
          isCorrect={isCorrect}
          explanation={question.explanation}
          userVote={userVote}
          onVote={onVote}
          isVoting={isVoting}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  questionContainer: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  options: {
    gap: 12,
  },
});
