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
        text1: 'Failed to load repositories',
        text2: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, []);

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
          text1: 'Repository added',
          text2: 'Syncing cards from repository...',
        });
        setShowPatPrompt(false);
        await fetchRepos();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';

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
            text1: 'Private repository?',
            text2: 'Enter a Personal Access Token to add this repo.',
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Failed to add repository',
            text2: message,
          });
        }
      } finally {
        setIsAdding(false);
      }
    },
    [fetchRepos],
  );

  const handleDeleteRepo = useCallback(
    (id: string, name: string) => {
      Alert.alert(
        'Delete Repository',
        `Are you sure you want to delete "${name}"? All associated cards will also be removed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteRepository(id);
                Toast.show({
                  type: 'success',
                  text1: 'Repository deleted',
                  text2: `"${name}" has been removed.`,
                });
                await fetchRepos();
              } catch (error) {
                Toast.show({
                  type: 'error',
                  text1: 'Failed to delete repository',
                  text2:
                    error instanceof Error ? error.message : 'Unknown error',
                });
              }
            },
          },
        ],
      );
    },
    [fetchRepos],
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
        onUrlChange={() => setShowPatPrompt(false)}
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
            title="No repositories yet"
            subtitle="Add a GitHub repository URL above to start importing study cards."
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
