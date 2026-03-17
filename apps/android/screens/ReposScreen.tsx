import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import {
  getUserRepositories,
  addRepository,
  deleteRepository,
  getUserDeckSubscriptions,
  unsubscribeDeckRpc,
  type Repository,
  type DeckSubscription,
} from '@lumio/core';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import { RepoListItem } from '../components/RepoListItem';
import { SharedDeckListItem } from '../components/SharedDeckListItem';
import { AddRepoForm } from '../components/AddRepoForm';
import { EmptyState } from '../components/EmptyState';
import { RepoErrorModal } from '../components/RepoErrorModal';

type ListItem =
  | { kind: 'deck'; deck: DeckSubscription }
  | { kind: 'repo'; repo: Repository };

/**
 * Repository management screen.
 * - FlatList of user repositories and shared deck subscriptions (unified list)
 * - Add repository form with auto-detection of public/private
 * - Swipe-to-delete repos, swipe-to-unsubscribe shared decks
 * - Pull-to-refresh
 * - Empty state when no repositories or shared decks exist
 */
export function ReposScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [sharedDecks, setSharedDecks] = useState<DeckSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showPatPrompt, setShowPatPrompt] = useState(false);
  const [errorRepo, setErrorRepo] = useState<Repository | null>(null);

  const unifiedList = useMemo(() => {
    const deckItems: ListItem[] = sharedDecks
      .slice()
      .sort((a, b) => a.display_name.localeCompare(b.display_name))
      .map((deck) => ({ kind: 'deck' as const, deck }));
    const repoItems: ListItem[] = repositories
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((repo) => ({ kind: 'repo' as const, repo }));
    return [...deckItems, ...repoItems];
  }, [repositories, sharedDecks]);

  const fetchRepos = useCallback(async () => {
    try {
      const [repos, subs] = await Promise.all([
        getUserRepositories(),
        getUserDeckSubscriptions(),
      ]);
      // Deduplicate repos by id — subfolder subscriptions can cause
      // the same repository to appear multiple times in the join
      const seen = new Set<string>();
      const uniqueRepos = repos.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
      setRepositories(uniqueRepos);
      setSharedDecks(subs);
    } catch (error) {
      console.error('[ReposScreen] fetchRepos error:', error);
      Toast.show({
        type: 'error',
        text1: t('repos.failedToLoad'),
        text2: error instanceof Error ? error.message : t('common.unknownError'),
      });
    }
  }, [t]);

  useEffect(() => {
    fetchRepos().finally(() => setIsLoading(false));
  }, [fetchRepos]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchRepos();
    setIsRefreshing(false);
  }, [fetchRepos]);

  const handleAddRepo = useCallback(
    async (url: string, accessToken?: string) => {
      setIsAdding(true);
      try {
        await addRepository({
          url,
          isPrivate: !!accessToken,
          accessToken,
        });
        Toast.show({
          type: 'success',
          text1: t('repos.repoAdded'),
          text2: t('repos.syncingCards'),
        });
        setShowPatPrompt(false);
        await fetchRepos();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t('common.unknownError');

        // Check if the URL matches a platform repository
        const isPlatformRepo = message === 'PLATFORM_REPO';
        if (isPlatformRepo) {
          Toast.show({
            type: 'info',
            text1: t('repos.platformRepoTitle'),
            text2: t('repos.platformRepoBody'),
          });
          throw error; // Re-throw so form doesn't clear
        }

        // If the error indicates private/not-found and no PAT was provided,
        // prompt the user for a Personal Access Token
        const isPrivateError =
          message.toLowerCase().includes('not found') ||
          message.toLowerCase().includes('private') ||
          message.toLowerCase().includes('404');

        if (isPrivateError && !accessToken) {
          setShowPatPrompt(true);
          Toast.show({
            type: 'info',
            text1: t('repos.privateRepo'),
            text2: t('repos.enterPat'),
          });
        } else {
          Toast.show({
            type: 'error',
            text1: t('repos.failedToAdd'),
            text2: message,
          });
        }
        // Re-throw so the form knows not to clear the URL
        throw error;
      } finally {
        setIsAdding(false);
      }
    },
    [fetchRepos, t],
  );

  const handleDeleteRepo = useCallback(
    (id: string, name: string) => {
      Alert.alert(
        t('repos.deleteConfirmTitle'),
        t('repos.deleteConfirmBody', { name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteRepository(id);
                Toast.show({
                  type: 'success',
                  text1: t('repos.repoDeleted'),
                  text2: t('repos.repoDeletedBody', { name }),
                });
                await fetchRepos();
              } catch (error) {
                Toast.show({
                  type: 'error',
                  text1: t('repos.failedToDelete'),
                  text2:
                    error instanceof Error ? error.message : t('common.unknownError'),
                });
              }
            },
          },
        ],
      );
    },
    [fetchRepos, t],
  );

  const handleUnsubscribeDeck = useCallback(
    (repositoryId: string, subfolderPath: string, displayName: string) => {
      Alert.alert(
        t('repos.unsubscribeTitle', { name: displayName }),
        t('repos.unsubscribeBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('repos.unsubscribe'),
            style: 'destructive',
            onPress: async () => {
              try {
                await unsubscribeDeckRpc(repositoryId, subfolderPath);
                Toast.show({
                  type: 'success',
                  text1: t('repos.unsubscribed'),
                  text2: t('repos.unsubscribedBody', { name: displayName }),
                });
                await fetchRepos();
              } catch (error) {
                Toast.show({
                  type: 'error',
                  text1: t('repos.unsubscribeFailed'),
                  text2: error instanceof Error ? error.message : t('common.unknownError'),
                });
              }
            },
          },
        ],
      );
    },
    [fetchRepos, t],
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AddRepoForm
        onAdd={handleAddRepo}
        isAdding={isAdding}
        showPatPrompt={showPatPrompt}
        onCancel={() => setShowPatPrompt(false)}
      />
      <FlatList
        data={unifiedList}
        keyExtractor={(item) =>
          item.kind === 'deck'
            ? `deck:${item.deck.repository_id}:${item.deck.subfolder_path}`
            : `repo:${item.repo.id}`
        }
        renderItem={({ item }) =>
          item.kind === 'deck' ? (
            <SharedDeckListItem
              deck={item.deck}
              onPress={() =>
                navigation.navigate('CardList', {
                  repoId: item.deck.repository_id,
                  repoName: item.deck.display_name,
                  subfolderPath: item.deck.subfolder_path,
                })
              }
              onUnsubscribe={handleUnsubscribeDeck}
            />
          ) : (
            <RepoListItem
              repo={item.repo}
              onPress={() => {
                if (item.repo.syncStatus === 'failed') {
                  setErrorRepo(item.repo);
                } else {
                  navigation.navigate('CardList', { repoId: item.repo.id, repoName: item.repo.name });
                }
              }}
              onDelete={handleDeleteRepo}
            />
          )
        }
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={
          unifiedList.length === 0 ? styles.emptyContainer : undefined
        }
        ListEmptyComponent={
          <EmptyState
            icon="git-branch-outline"
            title={t('repos.emptyTitle')}
            subtitle={t('repos.emptySubtitle')}
          />
        }
      />
      <RepoErrorModal
        visible={!!errorRepo}
        onClose={() => setErrorRepo(null)}
        repo={errorRepo}
        onTokenUpdated={() => {
          setErrorRepo(null);
          fetchRepos();
        }}
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
