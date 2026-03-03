import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

// Same email validation as LoginScreen/SignUpScreen
const EMAIL_REGEX = /^.+@.+\..+$/;

const COOLDOWN_SECONDS = 60;

/**
 * ForgotPasswordScreen allows users to request a password reset code.
 *
 * Layout (top-to-bottom):
 * - Back arrow navigating to Login
 * - Title: "Reset Password"
 * - Email TextInput
 * - "Send reset code" button with loading state
 * - Error display area
 * - "Back to sign in" link
 *
 * After successful send: shows toast, navigates to UpdatePassword with email param.
 * Rate limiting errors show specific message. 60-second cooldown after send.
 */
export function ForgotPasswordScreen({ navigation }: Props) {
  const { resetPassword, resetLoading } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendCode = useCallback(async () => {
    setError(null);

    const trimmed = email.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setError(t('auth.login.invalidCredentials'));
      return;
    }

    try {
      await resetPassword(trimmed);
      // Start cooldown
      setCooldown(COOLDOWN_SECONDS);
      // Show success toast
      Toast.show({
        type: 'success',
        text1: t('auth.reset.codeSent'),
        text2: t('auth.reset.codeSentDescription'),
      });
      // Navigate to UpdatePassword with email
      navigation.navigate('UpdatePassword', { email: trimmed });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      if (message.includes('rate') || message.includes('limit')) {
        setError(t('auth.reset.rateLimited'));
      } else {
        setError(t('auth.reset.rateLimited'));
      }
    }
  }, [email, resetPassword, navigation, t]);

  const isSendDisabled = resetLoading || cooldown > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back arrow */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Login')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {t('auth.reset.title')}
          </Text>

          {/* Email field */}
          <Text style={[styles.label, { color: colors.text }]}>
            {t('auth.reset.emailLabel')}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder={t('auth.reset.emailLabel')}
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={handleSendCode}
            editable={!resetLoading}
          />

          {/* Error message */}
          {error && (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          )}

          {/* Send reset code button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary },
              isSendDisabled && styles.actionButtonDisabled,
            ]}
            onPress={handleSendCode}
            disabled={isSendDisabled}
            activeOpacity={0.8}
          >
            {resetLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : cooldown > 0 ? (
              <Text style={styles.actionButtonText}>
                {t('auth.otp.resendIn', { seconds: cooldown })}
              </Text>
            ) : (
              <Text style={styles.actionButtonText}>
                {t('auth.reset.sendCode')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Back to sign in link */}
          <TouchableOpacity
            style={styles.backToLoginContainer}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.backToLoginText, { color: colors.primary }]}>
              {t('auth.reset.backToLogin')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignSelf: 'flex-start',
  },
  content: {
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  error: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  actionButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
