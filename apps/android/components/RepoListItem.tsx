import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';

interface RepoListItemProps {
  repo: {
    id: string;
    name: string;
    url: string;
    isPrivate: boolean;
    syncStatus?: string;
    syncErrorMessage?: string;
    syncErrorType?: string;
    isAuthError?: boolean;
  };
  onPress: () => void;
  onDelete: (id: string, name: string) => void;
}

/**
 * Swipeable repository list row.
 * Shows repo name, URL (truncated), visibility icon, and sync status indicators.
 * Failed repos show error message as third line (auth errors in amber, others in red).
 * Syncing repos show a spinner, pending repos show a clock icon.
 * Swiping left reveals a delete action button.
 */
export function RepoListItem({ repo, onPress, onDelete }: RepoListItemProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const swipeableRef = useRef<Swipeable>(null);

  // Compute sync display state
  const isFailed = repo.syncStatus === 'failed';
  const isSyncing = repo.syncStatus === 'syncing';
  const isPending = repo.syncStatus === 'pending';
  const isAuthError = isFailed && repo.isAuthError;
  const isOtherError = isFailed && !repo.isAuthError;

  // Determine name text color based on sync state
  const nameColor = isAuthError
    ? colors.warning
    : isOtherError
      ? colors.danger
      : colors.text;

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
        <Text style={styles.deleteText}>{t('components.delete')}</Text>
      </TouchableOpacity>
    );
  };

  // Render trailing status indicator on the right side of the name row
  const renderStatusIndicator = () => {
    if (isAuthError) {
      return (
        <View style={styles.statusIndicator}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
        </View>
      );
    }
    if (isOtherError) {
      return (
        <View style={styles.statusIndicator}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
        </View>
      );
    }
    if (isSyncing) {
      return (
        <View style={styles.statusIndicator}>
          <ActivityIndicator size={14} color={colors.primary} />
        </View>
      );
    }
    if (isPending) {
      return (
        <View style={styles.statusIndicator}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
        </View>
      );
    }
    return null;
  };

  // Render third line: error message or status message
  const renderStatusMessage = () => {
    if (isFailed) {
      const statusLabel = isAuthError
        ? t('syncStatus.authError')
        : t('syncStatus.syncError');
      const messageColor = isAuthError ? colors.warning : colors.danger;
      const detail = repo.syncErrorMessage && repo.syncErrorMessage !== statusLabel
        ? repo.syncErrorMessage
        : null;

      return (
        <Text
          style={[styles.errorMessage, { color: messageColor }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {statusLabel}{detail ? ` - ${detail}` : ''}
        </Text>
      );
    }
    if (isPending) {
      return (
        <Text style={[styles.statusMessage, { color: colors.textSecondary }]}>
          {t('syncStatus.pending')}
        </Text>
      );
    }
    if (isSyncing) {
      return (
        <Text style={[styles.statusMessage, { color: colors.primary }]}>
          {t('syncStatus.syncing')}
        </Text>
      );
    }
    return null;
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <Text
            style={[styles.name, { color: nameColor }]}
            numberOfLines={1}
          >
            {repo.name}
          </Text>
          <Ionicons
            name={repo.isPrivate ? "lock-closed" : "globe-outline"}
            size={14}
            color={colors.textSecondary}
            style={styles.visibilityIcon}
          />
          {renderStatusIndicator()}
        </View>
        <Text
          style={[styles.url, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {repo.url}
        </Text>
        {renderStatusMessage()}
      </TouchableOpacity>
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
  visibilityIcon: {
    marginLeft: 6,
  },
  statusIndicator: {
    marginLeft: 'auto',
    paddingLeft: 8,
  },
  url: {
    fontSize: 14,
    marginTop: 4,
  },
  errorMessage: {
    fontSize: 13,
    marginTop: 2,
  },
  statusMessage: {
    fontSize: 13,
    marginTop: 2,
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
