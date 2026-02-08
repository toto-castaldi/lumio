import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { RootStackParamList } from '../navigation/AppNavigator';

type SummaryNavProp = NativeStackNavigationProp<RootStackParamList, 'StudySummary'>;
type SummaryRouteProp = RouteProp<RootStackParamList, 'StudySummary'>;

/**
 * Format seconds into a human-readable duration string.
 * E.g. 125 -> "2m 5s", 45 -> "45s", 3661 -> "61m 1s"
 */
function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/**
 * StudySummaryScreen displays end-of-session statistics after a study session completes.
 *
 * Route params:
 * - totalCards: Total number of cards in the session
 * - correctCount: Number of correct answers
 * - incorrectCount: Number of incorrect answers
 * - skippedCount: Number of skipped cards
 * - timeSpentSeconds: Duration of the session in seconds
 *
 * Features:
 * - Score percentage displayed prominently
 * - Stats breakdown (correct, incorrect, skipped, time)
 * - "Return to Dashboard" button navigates back to Main tab navigator
 * - Back gesture disabled to prevent returning to completed study session
 */
export function StudySummaryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<SummaryNavProp>();
  const route = useRoute<SummaryRouteProp>();

  const {
    totalCards,
    correctCount,
    incorrectCount,
    skippedCount,
    timeSpentSeconds,
  } = route.params;

  const scorePercent =
    totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;

  const handleReturnToDashboard = () => {
    navigation.navigate('Main');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Result icon */}
        <View style={[styles.iconCircle, { backgroundColor: '#d1fae5' }]}>
          <Ionicons name="checkmark-circle" size={56} color="#10b981" />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          Session Complete!
        </Text>

        {/* Score percentage */}
        <View style={[styles.scoreContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.scoreValue, { color: colors.primary }]}>
            {scorePercent}%
          </Text>
          <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
            Score
          </Text>
        </View>

        {/* Stats grid */}
        <View style={[styles.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Correct */}
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Ionicons name="checkmark-circle" size={22} color="#10b981" />
              <Text style={[styles.statLabel, { color: colors.text }]}>Correct</Text>
            </View>
            <Text style={[styles.statValue, { color: '#10b981' }]}>
              {correctCount}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Incorrect */}
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Ionicons name="close-circle" size={22} color="#ef4444" />
              <Text style={[styles.statLabel, { color: colors.text }]}>Incorrect</Text>
            </View>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>
              {incorrectCount}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Skipped */}
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Ionicons name="play-skip-forward" size={22} color="#9ca3af" />
              <Text style={[styles.statLabel, { color: colors.text }]}>Skipped</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.textSecondary }]}>
              {skippedCount}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Time */}
          <View style={styles.statRow}>
            <View style={styles.statLeft}>
              <Ionicons name="time-outline" size={22} color="#f59e0b" />
              <Text style={[styles.statLabel, { color: colors.text }]}>Time</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatDuration(timeSpentSeconds)}
            </Text>
          </View>
        </View>

        {/* Return to Dashboard button */}
        <TouchableOpacity
          style={[styles.dashboardButton, { backgroundColor: colors.primary }]}
          onPress={handleReturnToDashboard}
          activeOpacity={0.8}
        >
          <Ionicons name="home-outline" size={20} color="#ffffff" />
          <Text style={styles.dashboardButtonText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  statsCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    marginBottom: 32,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  dashboardButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
});
