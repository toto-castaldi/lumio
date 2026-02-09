import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useI18n } from '../../hooks/useI18n';
import type { QuestionVote } from '@lumio/core';

interface ExplanationPanelProps {
  isCorrect: boolean;
  explanation: string;
  userVote: QuestionVote | null;
  onVote: (vote: QuestionVote) => void;
  isVoting: boolean;
}

/**
 * Post-answer explanation panel with inline vote buttons.
 * Shows a green border for correct answers, red for incorrect.
 * Includes thumbs-up/thumbs-down vote buttons for question quality feedback.
 */
export function ExplanationPanel({
  isCorrect,
  explanation,
  userVote,
  onVote,
  isVoting,
}: ExplanationPanelProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const accentColor = isCorrect ? '#10b981' : '#ef4444';
  const bgColor = isCorrect ? '#ecfdf5' : '#fef2f2';
  const borderColor = isCorrect ? '#a7f3d0' : '#fecaca';
  const resultText = isCorrect ? t('components.correct') : t('components.incorrect');
  const resultIcon = isCorrect ? 'checkmark-circle' : 'close-circle';

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      {/* Result header */}
      <View style={styles.resultRow}>
        <View style={[styles.resultIcon, { backgroundColor: accentColor }]}>
          <Ionicons name={resultIcon} size={20} color="#ffffff" />
        </View>
        <Text style={[styles.resultText, { color: accentColor }]}>
          {resultText}
        </Text>
      </View>

      {/* Explanation body */}
      <Text style={[styles.explanation, { color: colors.text }]}>
        {explanation}
      </Text>

      {/* Vote section */}
      <View style={[styles.voteSection, { backgroundColor: colors.surface }]}>
        <Text style={[styles.voteLabel, { color: colors.textSecondary }]}>
          {t('components.questionHelpful')}
        </Text>
        <View style={styles.voteButtons}>
          <TouchableOpacity
            style={[
              styles.voteButton,
              {
                backgroundColor: userVote === 'like' ? '#10b981' : colors.background,
                borderColor: userVote === 'like' ? '#10b981' : colors.border,
              },
            ]}
            onPress={() => onVote('like')}
            disabled={isVoting}
            activeOpacity={0.7}
          >
            <Ionicons
              name={userVote === 'like' ? 'thumbs-up' : 'thumbs-up-outline'}
              size={18}
              color={userVote === 'like' ? '#ffffff' : colors.textSecondary}
            />
            <Text
              style={[
                styles.voteButtonText,
                { color: userVote === 'like' ? '#ffffff' : colors.textSecondary },
              ]}
            >
              {t('components.yes')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.voteButton,
              {
                backgroundColor: userVote === 'dislike' ? '#ef4444' : colors.background,
                borderColor: userVote === 'dislike' ? '#ef4444' : colors.border,
              },
            ]}
            onPress={() => onVote('dislike')}
            disabled={isVoting}
            activeOpacity={0.7}
          >
            <Ionicons
              name={userVote === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'}
              size={18}
              color={userVote === 'dislike' ? '#ffffff' : colors.textSecondary}
            />
            <Text
              style={[
                styles.voteButtonText,
                { color: userVote === 'dislike' ? '#ffffff' : colors.textSecondary },
              ]}
            >
              {t('components.no')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    fontSize: 20,
    fontWeight: '700',
  },
  explanation: {
    fontSize: 15,
    lineHeight: 22,
  },
  voteSection: {
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
  },
  voteLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  voteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
