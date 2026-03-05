import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserStats, getDueCardCount } from '@lumio/core';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import { useStudySettings } from '../hooks/useStudySettings';
import { MainTabParamList } from '../navigation/MainNavigator';
import { RootStackParamList } from '../navigation/AppNavigator';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';

/**
 * Format a date string into relative time (e.g., "2 hours ago")
 * or 'Not yet' if null.
 */
function formatLastStudied(
  dateString: string | null,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (!dateString) return t('dashboard.notYet');

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 5) return t('dashboard.justNow');
  if (diffMinutes < 60) {
    if (diffMinutes === 1) return t('dashboard.oneMinuteAgo');
    return t('dashboard.minutesAgo', { count: diffMinutes });
  }
  if (diffHours < 24) {
    if (diffHours === 1) return t('dashboard.oneHourAgo');
    return t('dashboard.hoursAgo', { count: diffHours });
  }
  if (diffDays < 7) {
    if (diffDays === 1) return t('dashboard.yesterday');
    return t('dashboard.daysAgo', { count: diffDays });
  }
  if (diffDays < 30) {
    if (diffWeeks === 1) return t('dashboard.oneWeekAgo');
    return t('dashboard.weeksAgo', { count: diffWeeks });
  }
  if (diffDays < 365) {
    if (diffMonths === 1) return t('dashboard.oneMonthAgo');
    return t('dashboard.monthsAgo', { count: diffMonths });
  }
  if (diffYears === 1) return t('dashboard.oneYearAgo');
  return t('dashboard.yearsAgo', { count: diffYears });
}

/**
 * DashboardScreen is the app's home screen.
 * Shows study statistics (repo count, card count, last studied),
 * a prominent Study CTA, pull-to-refresh, and an empty state when no repos exist.
 */
export function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const { cardsPerSession } = useStudySettings();
  const limit = cardsPerSession === 'auto' ? null : cardsPerSession;
  const navigation = useNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<MainTabParamList>,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();

  const [repoCount, setRepoCount] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [lastStudied, setLastStudied] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // Only show loading spinner on first mount (not on refocus)
      setIsLoading(prev => repoCount === 0 && cardCount === 0 ? true : prev);

      const refresh = async () => {
        try {
          const [stats, due] = await Promise.all([
            getUserStats(),
            getDueCardCount(limit),
          ]);
          if (!cancelled) {
            setRepoCount(stats.repositoryCount);
            setCardCount(stats.cardCount);
            setDueCount(due);
          }
        } catch (error) {
          console.error('Failed to fetch dashboard stats:', error);
          if (!cancelled) setDueCount(0);
        }
      };

      refresh().finally(() => { if (!cancelled) setIsLoading(false); });

      AsyncStorage.getItem('@lumio/lastStudiedAt').then(stored => {
        if (!cancelled) setLastStudied(stored);
      });

      return () => { cancelled = true; };
    }, [cardsPerSession])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [stats, due] = await Promise.all([
        getUserStats(),
        getDueCardCount(limit),
      ]);
      setRepoCount(stats.repositoryCount);
      setCardCount(stats.cardCount);
      setDueCount(due);
      const stored = await AsyncStorage.getItem('@lumio/lastStudiedAt');
      setLastStudied(stored);
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [limit]);

  const handleStudyPress = () => {
    navigation.navigate('Study');
  };

  const isStudyDisabled = isLoading || cardCount === 0;

  // Empty state: no repos found after loading completes
  if (!isLoading && repoCount === 0) {
    return (
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.emptyScrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <EmptyState
          icon="folder-open-outline"
          title={t('dashboard.emptyTitle')}
          subtitle={t('dashboard.emptySubtitle')}
          actionLabel={t('dashboard.goToRepos')}
          onAction={() => navigation.navigate('Repos')}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Stat cards row */}
      <View style={styles.statRow}>
        <StatCard
          icon="folder-outline"
          iconColor={colors.primary}
          iconBgColor={colors.primaryLight}
          label={t('dashboard.repositories')}
          value={repoCount}
          isLoading={isLoading}
        />
        <StatCard
          icon="documents-outline"
          iconColor="#8B5CF6"
          iconBgColor={isDark ? '#2e1065' : '#EDE9FE'}
          label={t('dashboard.cards')}
          value={cardCount}
          isLoading={isLoading}
        />
      </View>

      {/* Row 2: Last studied + Due today */}
      <View style={styles.secondStatRow}>
        <StatCard
          icon="time-outline"
          iconColor="#F59E0B"
          iconBgColor={isDark ? '#78350f' : '#FEF3C7'}
          label={t('dashboard.lastStudied')}
          value={formatLastStudied(lastStudied, t)}
          isLoading={isLoading}
          compact
        />
        <StatCard
          icon={dueCount === 0 ? 'checkmark-circle-outline' : 'alarm-outline'}
          iconColor={dueCount === 0 ? '#10b981' : '#F59E0B'}
          iconBgColor={
            dueCount === 0
              ? (isDark ? '#064e3b' : '#d1fae5')
              : (isDark ? '#78350f' : '#FEF3C7')
          }
          label={t('dashboard.dueToday')}
          value={dueCount === 0 ? t('dashboard.allCaughtUp') : (dueCount ?? '\u2014')}
          isLoading={dueCount === null && isLoading}
          compact
        />
      </View>

      {/* Study CTA button */}
      <View style={styles.studyButtonContainer}>
        <TouchableOpacity
          style={[
            styles.studyButton,
            {
              backgroundColor: isStudyDisabled ? colors.border : colors.primary,
              opacity: isStudyDisabled ? 0.5 : 1,
            },
          ]}
          onPress={handleStudyPress}
          activeOpacity={0.8}
          disabled={isStudyDisabled}
        >
          {isLoading ? (
            <ActivityIndicator size={28} color="#ffffff" />
          ) : (
            <Ionicons name="play" size={28} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  secondStatRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  studyButtonContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  studyButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});
