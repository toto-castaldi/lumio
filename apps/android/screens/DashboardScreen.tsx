import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserStats } from '@lumio/core';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
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

  if (diffMinutes < 1) return t('dashboard.justNow');
  if (diffMinutes < 60) return t('dashboard.mAgo', { count: diffMinutes });
  if (diffHours < 24) return t('dashboard.hAgo', { count: diffHours });
  if (diffDays < 7) return t('dashboard.dAgo', { count: diffDays });

  return date.toLocaleDateString();
}

/**
 * DashboardScreen is the app's home screen.
 * Shows study statistics (repo count, card count, last studied),
 * a prominent Study CTA, pull-to-refresh, and an empty state when no repos exist.
 */
export function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<
    CompositeNavigationProp<
      BottomTabNavigationProp<MainTabParamList>,
      NativeStackNavigationProp<RootStackParamList>
    >
  >();

  const [repoCount, setRepoCount] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [lastStudied, setLastStudied] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      // Fetch repo and card counts via @lumio/core API
      const stats = await getUserStats();
      setRepoCount(stats.repositoryCount);
      setCardCount(stats.cardCount);

      // Fetch last studied timestamp from local storage
      const stored = await AsyncStorage.getItem('@lumio/lastStudiedAt');
      setLastStudied(stored);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats().finally(() => setIsLoading(false));
  }, [fetchStats]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
  }, [fetchStats]);

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

      {/* Last studied card */}
      <View style={styles.lastStudiedRow}>
        <StatCard
          icon="time-outline"
          iconColor="#F59E0B"
          iconBgColor={isDark ? '#78350f' : '#FEF3C7'}
          label={t('dashboard.lastStudied')}
          value={formatLastStudied(lastStudied, t)}
          isLoading={isLoading}
        />
      </View>

      {/* Study CTA button */}
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
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Ionicons name="play" size={24} color="#ffffff" />
        )}
        <Text style={styles.studyButtonText}>{t('dashboard.startStudySession')}</Text>
      </TouchableOpacity>
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
  lastStudiedRow: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  studyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  studyButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
