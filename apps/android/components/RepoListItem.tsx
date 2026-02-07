import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface RepoListItemProps {
  repo: {
    id: string;
    name: string;
    url: string;
    isPrivate: boolean;
    syncStatus?: string;
  };
  onDelete: (id: string, name: string) => void;
}

/**
 * Swipeable repository list row.
 * Shows repo name, URL (truncated), and lock icon for private repos.
 * Swiping left reveals a delete action button.
 */
export function RepoListItem({ repo, onDelete }: RepoListItemProps) {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    _drag: Animated.AnimatedInterpolation<number>,
  ) => {
    return (
      <TouchableOpacity
        style={[styles.deleteAction, { backgroundColor: colors.danger }]}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete(repo.id, repo.name);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={24} color="#ffffff" />
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.row}>
          <Text
            style={[styles.name, { color: colors.text }]}
            numberOfLines={1}
          >
            {repo.name}
          </Text>
          {repo.isPrivate && (
            <Ionicons
              name="lock-closed"
              size={14}
              color={colors.textSecondary}
              style={styles.lockIcon}
            />
          )}
        </View>
        <Text
          style={[styles.url, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {repo.url}
        </Text>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  lockIcon: {
    marginLeft: 6,
  },
  url: {
    fontSize: 14,
    marginTop: 4,
  },
  deleteAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
