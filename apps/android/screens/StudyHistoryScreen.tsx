import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getStudyHistory } from '@lumio/core';
import type { StudySession } from '@lumio/core';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import { RootStackParamList } from '../navigation/AppNavigator';
import { EmptyState } from '../components/EmptyState';

type HistoryNavProp = NativeStackNavigationProp<RootStackParamList, 'StudyHistory'>;

/**
 * Format a session date into a short date + time string.
 * E.g. "Feb 11, 14:30"
 */
function formatSessionDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format seconds into a human-readable duration string.
 * E.g. 125 -> "2m 5s", 45 -> "45s"
 */
function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/**
 * Get the score color based on percentage.
 * Green >= 70%, Yellow >= 40%, Red otherwise.
 */
function getScoreColor(correct: number, total: number): string {
  if (total === 0) return '#9ca3af';
  const pct = (correct / total) * 100;
  if (pct >= 70) return '#10b981';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}

/**
 * Get the score icon based on percentage.
 */
function getScoreIcon(correct: number, total: number): React.ComponentProps<typeof Ionicons>['name'] {
  if (total === 0) return 'help-circle';
  const pct = (correct / total) * 100;
  if (pct >= 70) return 'checkmark-circle';
  if (pct >= 40) return 'alert-circle';
  return 'close-circle';
}

/**
 * StudyHistoryScreen displays the user's completed study sessions.
 *
 * Features:
 * - FlatList of session rows with date, repo label, score, and duration
 * - Loading state with ActivityIndicator
 * - Empty state using the reusable EmptyState component
 * - Error state with retry button
 * - Pull-to-refresh via RefreshControl
 */
export function StudyHistoryScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<HistoryNavProp>();

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set the screen header title using translations
  useLayoutEffect(() => {
    navigation.setOptions({ headerTitle: t('history.title') });
  }, [navigation, t]);

  const fetchHistory = useCallback(async () => {
    try {
      setError(null);
      const data = await getStudyHistory();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load study history:', err);
      setError(t('history.failedToLoad'));
    }
  }, [t]);

  useEffect(() => {
    fetchHistory().finally(() => setIsLoading(false));
  }, [fetchHistory]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchHistory();
    setIsRefreshing(false);
  }, [fetchHistory]);

  const renderSessionItem = ({ item }: { item: StudySession }) => {
    const scoreColor = getScoreColor(item.correctCount, item.totalCount);
    const scoreIcon = getScoreIcon(item.correctCount, item.totalCount);
    const repoLabel = item.repositoryName ?? t('history.allRepos');

    return (
      <View style={[styles.sessionCard, { backgroundColor: colors.surface }]}>
        <View style={styles.sessionRow}>
          {/* Left: date */}
          <View style={styles.dateColumn}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]} numberOfLines={1}>
              {formatSessionDate(item.completedAt)}
            </Text>
          </View>

          {/* Center: repo name */}
          <View style={styles.repoColumn}>
            <Text style={[styles.repoText, { color: colors.text }]} numberOfLines={1}>
              {repoLabel}
            </Text>
          </View>

          {/* Right: score and duration */}
          <View style={styles.scoreColumn}>
            <View style={styles.scoreRow}>
              <Ionicons name={scoreIcon} size={16} color={scoreColor} />
              <Text style={[styles.scoreText, { color: scoreColor }]}>
                {item.correctCount}/{item.totalCount}
              </Text>
            </View>
            <Text style={[styles.durationText, { color: colors.textSecondary }]}>
              {formatDuration(item.durationSeconds)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="warning-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            setIsLoading(true);
            fetchHistory().finally(() => setIsLoading(false));
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.retryButtonText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (sessions.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="time-outline"
          title={t('history.emptyTitle')}
          subtitle={t('history.emptySubtitle')}
        />
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.list, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.listContent}
      data={sessions}
      keyExtractor={(item) => item.id}
      renderItem={renderSessionItem}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sessionCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '400',
    flexShrink: 1,
  },
  repoColumn: {
    flex: 1.2,
    alignItems: 'center',
    paddingHorizontal: 8,
    minWidth: 0,
  },
  repoText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  scoreColumn: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '700',
  },
  durationText: {
    fontSize: 11,
    marginTop: 2,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
