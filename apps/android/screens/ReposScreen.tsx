import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {
  getUserRepositories,
  addRepository,
  deleteRepository,
  type Repository,
} from '@lumio/core';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import { RepoListItem } from '../components/RepoListItem';
import { AddRepoForm } from '../components/AddRepoForm';
import { EmptyState } from '../components/EmptyState';

/**
 * Repository management screen.
 * - FlatList of user repositories with swipe-to-delete
 * - Add repository form with auto-detection of public/private
 * - Pull-to-refresh
 * - Empty state when no repositories exist
 */
export function ReposScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showPatPrompt, setShowPatPrompt] = useState(false);

  const fetchRepos = useCallback(async () => {
    try {
      const repos = await getUserRepositories();
      setRepositories(repos);
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
        data={repositories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RepoListItem repo={item} onDelete={handleDeleteRepo} />
        )}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={
          repositories.length === 0 ? styles.emptyContainer : undefined
        }
        ListEmptyComponent={
          <EmptyState
            icon="git-branch-outline"
            title={t('repos.emptyTitle')}
            subtitle={t('repos.emptySubtitle')}
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
