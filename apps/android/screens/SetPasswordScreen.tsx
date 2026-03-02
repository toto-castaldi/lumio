import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'SetPassword'>;

/**
 * SetPasswordScreen allows Google-only users to add email/password authentication.
 *
 * Layout (top-to-bottom):
 * - Title: "Set Password"
 * - Email TextInput (pre-filled from Google email, editable)
 * - Password TextInput with eye toggle
 * - Confirm Password TextInput with eye toggle
 * - Error message display
 * - Submit button with loading state
 *
 * After submission, sends OTP via sendPasswordSetupOtp and navigates to SetPasswordOtp screen.
 */
export function SetPasswordScreen({ route, navigation }: Props) {
  const { sendPasswordSetupOtp } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();

  const [email, setEmail] = useState(route.params.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);

    // Validate password length
    if (password.length < 6) {
      setError(t('auth.linking.weakPassword'));
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError(t('auth.linking.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordSetupOtp(email);
      Toast.show({ type: 'success', text1: t('auth.linking.codeSent') });
      navigation.navigate('SetPasswordOtp', { email, password });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      setError(message || t('auth.linking.linkFailed'));
      Toast.show({ type: 'error', text1: t('auth.linking.linkFailed') });
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, confirmPassword, sendPasswordSetupOtp, navigation, t]);

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
        <View style={styles.content}>
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {t('auth.linking.setPasswordTitle')}
          </Text>

          {/* Email field */}
          <Text style={[styles.label, { color: colors.text }]}>
            {t('auth.linking.emailLabel')}
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
            placeholder={t('auth.linking.emailLabel')}
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!isSubmitting}
          />

          {/* Password field with eye toggle */}
          <Text style={[styles.label, { color: colors.text }]}>
            {t('auth.linking.passwordLabel')}
          </Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={t('auth.linking.passwordLabel')}
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.eyeToggle}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password field with eye toggle */}
          <Text style={[styles.label, { color: colors.text }]}>
            {t('auth.linking.confirmPasswordLabel')}
          </Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={t('auth.linking.confirmPasswordLabel')}
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.eyeToggle}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Error message */}
          {error && (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          )}

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary },
              isSubmitting && styles.actionButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={[styles.actionButtonText, styles.loadingText]}>
                  {t('auth.linking.settingPassword')}
                </Text>
              </View>
            ) : (
              <Text style={styles.actionButtonText}>
                {t('auth.linking.setPassword')}
              </Text>
            )}
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
    justifyContent: 'center',
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeToggle: {
    position: 'absolute',
    right: 12,
    top: 13,
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
    marginTop: 4,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
  },
});
