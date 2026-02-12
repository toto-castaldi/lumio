import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

export type AnswerOptionState = 'default' | 'selected' | 'correct' | 'incorrect' | 'dimmed';

interface AnswerOptionProps {
  label: string;
  text: string;
  onPress: () => void;
  state: AnswerOptionState;
  disabled: boolean;
}

/**
 * Individual answer option button with visual states for correct/incorrect/dimmed.
 * Shows a circular label badge (A/B/C/D) on the left and option text on the right.
 */
export function AnswerOption({ label, text, onPress, state, disabled }: AnswerOptionProps) {
  const { colors, isDark } = useTheme();

  // Derive colors from state
  const borderColor = (() => {
    switch (state) {
      case 'correct': return '#10b981';
      case 'incorrect': return '#ef4444';
      case 'selected': return colors.primary;
      case 'dimmed': return colors.border;
      default: return colors.border;
    }
  })();

  const backgroundColor = (() => {
    switch (state) {
      case 'correct': return isDark ? '#064e3b' : '#ecfdf5';
      case 'incorrect': return isDark ? '#7f1d1d' : '#fef2f2';
      default: return colors.surface;
    }
  })();

  const labelBgColor = (() => {
    switch (state) {
      case 'correct': return '#10b981';
      case 'incorrect': return '#ef4444';
      case 'selected': return colors.primary;
      case 'dimmed': return colors.border;
      default: return colors.border;
    }
  })();

  const labelTextColor = (() => {
    switch (state) {
      case 'correct':
      case 'incorrect':
      case 'selected':
        return '#ffffff';
      case 'dimmed':
        return colors.textSecondary;
      default:
        return colors.text;
    }
  })();

  const opacity = state === 'dimmed' ? 0.5 : 1;

  const renderLabelContent = () => {
    if (state === 'correct') {
      return <Ionicons name="checkmark" size={16} color="#ffffff" />;
    }
    if (state === 'incorrect') {
      return <Ionicons name="close" size={16} color="#ffffff" />;
    }
    return (
      <Text style={[styles.labelText, { color: labelTextColor }]}>
        {label}
      </Text>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          borderColor,
          backgroundColor,
          opacity,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.labelBadge, { backgroundColor: labelBgColor }]}>
        {renderLabelContent()}
      </View>
      <Text style={[styles.optionText, { color: colors.text }]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
    minHeight: 64,
  },
  labelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
});
