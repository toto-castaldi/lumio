import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import {
  getRepositoryCards,
  getUserRepositories,
  Deck,
  type Card,
  type Repository,
} from '@lumio/core';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import { CardListItem } from '../components/CardListItem';
import { EmptyState } from '../components/EmptyState';

type CardListRouteProp = RouteProp<RootStackParamList, 'CardList'>;
type CardListNavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * Scrollable list of cards for a repository.
 * Fetches cards via getRepositoryCards, filters with .lumioignore via Deck,
 * sorts alphabetically, and navigates to CardDetail on tap.
 */
export function CardListScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const route = useRoute<CardListRouteProp>();
  const navigation = useNavigation<CardListNavigationProp>();
  const { repoId } = route.params;

  const [cards, setCards] = useState<Card[]>([]);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCards = useCallback(async () => {
    try {
      const [allCards, repos] = await Promise.all([
        getRepositoryCards(repoId),
        getUserRepositories(),
      ]);

      const repo = repos.find((r) => r.id === repoId) ?? null;
      setRepository(repo);

      // Apply .lumioignore filtering via Deck
      let activeCards = allCards;
      if (repo) {
        const deck = new Deck(repo, allCards);
        activeCards = deck.getActiveCards();
      }

      // Sort alphabetically by title
      activeCards.sort((a, b) => a.title.localeCompare(b.title));
      setCards(activeCards);
    } catch (error) {
      console.error('[CardListScreen] fetchCards error:', error);
      Toast.show({
        type: 'error',
        text1: t('cardList.failedToLoad'),
        text2: error instanceof Error ? error.message : t('common.unknownError'),
      });
    }
  }, [repoId, t]);

  useEffect(() => {
    fetchCards().finally(() => setIsLoading(false));
  }, [fetchCards]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchCards();
    setIsRefreshing(false);
  }, [fetchCards]);

  const handleCardPress = useCallback(
    (card: Card) => {
      if (repository) {
        navigation.navigate('CardDetail', { card, repository });
      }
    },
    [navigation, repository],
  );

  if (isLoading) {
    return (
      <View
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CardListItem card={item} onPress={() => handleCardPress(item)} />
        )}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={
          cards.length === 0 ? styles.emptyContainer : undefined
        }
        ListEmptyComponent={
          <EmptyState
            icon="documents-outline"
            title={t('cardList.emptyTitle')}
            subtitle={t('cardList.emptySubtitle')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
  },
});
