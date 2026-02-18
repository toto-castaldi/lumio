/**
 * Bottom-sheet modal for displaying repository sync error details.
 *
 * For auth-related errors: shows PAT input and submit button.
 * For non-auth errors: shows error details only (informational).
 *
 * Dismiss methods:
 * - Swipe down on the drag handle (PanResponder)
 * - Tap the dimmed backdrop
 * - Android back button (onRequestClose)
 */

import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
  PanResponder,
  Animated,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { updateRepositoryToken } from '@lumio/core';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';

interface RepoErrorModalProps {
  visible: boolean;
  onClose: () => void;
  repo: {
    id: string;
    name: string;
    syncErrorMessage?: string;
    syncErrorType?: string;
    isAuthError?: boolean;
  } | null;
  onTokenUpdated: () => void;
}

const DISMISS_THRESHOLD = 100;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export function RepoErrorModal({
  visible,
  onClose,
  repo,
  onTokenUpdated,
}: RepoErrorModalProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animated value for swipe-down dismiss gesture
  const translateY = useRef(new Animated.Value(0)).current;

  // PanResponder for the drag handle area only
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            handleClose();
            translateY.setValue(0);
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    }),
  ).current;

  const handleClose = () => {
    setToken('');
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!repo || !token.trim()) return;

    setIsSubmitting(true);
    try {
      await updateRepositoryToken(repo.id, token.trim());
      Toast.show({
        type: 'success',
        text1: t('tokenUpdate.tokenUpdated'),
        text2: t('tokenUpdate.tokenUpdatedBody'),
      });
      setToken('');
      onTokenUpdated();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.unknownError');
      Toast.show({
        type: 'error',
        text1: t('tokenUpdate.tokenUpdateFailed'),
        text2: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAuthError = repo?.isAuthError ?? false;
  const accentColor = isAuthError ? colors.warning : colors.danger;
  const iconName = isAuthError ? 'warning-outline' : 'alert-circle-outline';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      {/* Dimmed backdrop -- tap to close */}
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <View />
      </Pressable>

      {/* Bottom-sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.background },
          { transform: [{ translateY }] },
        ]}
      >
        {/* Drag handle */}
        <View {...panResponder.panHandlers}>
          <View style={styles.handleRow}>
            <View
              style={[styles.handle, { backgroundColor: colors.border }]}
            />
          </View>
        </View>

        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: colors.border }]}
        >
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {t('tokenUpdate.errorDetails')}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {repo?.name}
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon + Title */}
          <View style={styles.errorHeader}>
            <Ionicons
              name={iconName as 'warning-outline' | 'alert-circle-outline'}
              size={28}
              color={accentColor}
            />
            <Text style={[styles.errorTitle, { color: accentColor }]}>
              {isAuthError
                ? t('tokenUpdate.authErrorTitle')
                : t('tokenUpdate.syncErrorTitle')}
            </Text>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: colors.text }]}>
            {isAuthError
              ? t('tokenUpdate.authErrorDescription')
              : t('tokenUpdate.syncErrorDescription')}
          </Text>

          {/* Error message detail */}
          {repo?.syncErrorMessage ? (
            <Text
              style={[styles.errorDetail, { color: colors.textSecondary }]}
            >
              {repo.syncErrorMessage}
            </Text>
          ) : null}

          {/* PAT input (auth errors only) */}
          {isAuthError ? (
            <View style={styles.tokenSection}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t('tokenUpdate.newTokenLabel')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                value={token}
                onChangeText={setToken}
                placeholder={t('tokenUpdate.newTokenPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: token.trim()
                      ? colors.primary
                      : colors.border,
                  },
                ]}
                onPress={handleSubmit}
                disabled={!token.trim() || isSubmitting}
                activeOpacity={0.7}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : null}
                <Text style={styles.submitButtonText}>
                  {isSubmitting
                    ? t('tokenUpdate.updating')
                    : t('tokenUpdate.updateToken')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  errorDetail: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  tokenSection: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
