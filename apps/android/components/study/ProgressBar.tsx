import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

interface ProgressBarProps {
  /** Progress fraction from 0 to 1 */
  progress: number;
  /** Current card number (1-based) */
  current: number;
  /** Total cards in session */
  total: number;
}

/**
 * Session progress indicator showing a horizontal bar and fraction text.
 */
export function ProgressBar({ progress, current, total }: ProgressBarProps) {
  const { colors } = useTheme();
  const clampedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: colors.primary,
              width: `${clampedProgress * 100}%`,
            },
          ]}
        />
      </View>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {current} / {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
  },
});
