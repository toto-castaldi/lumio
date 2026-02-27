import React, { useState, useRef, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

type SignUpNavProp = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

// Basic email validation
const EMAIL_REGEX = /^.+@.+\..+$/;

/**
 * SignUpScreen displays a signup form with email and password fields.
 *
 * Layout (top-to-bottom):
 * - Title: "Create Account"
 * - Email TextInput with label
 * - Password TextInput with eye toggle (single field, no confirm)
 * - Error message display
 * - Sign Up button with loading state
 * - "Already have an account? Sign in" link
 *
 * After successful signup, shows toast and navigates to OTP verification screen.
 */
export function SignUpScreen() {
  const { signUpWithEmail, signUpLoading } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<SignUpNavProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Auto-focus email field on mount
  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 100);
  }, []);

  const handleSignUp = async () => {
    setError(null);

    const trimmedEmail = email.trim();

    // Basic email validation
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setError(t('auth.login.invalidCredentials'));
      return;
    }

    try {
      await signUpWithEmail(trimmedEmail, password);
      // Success: show toast and navigate to OTP screen
      Toast.show({ type: 'success', text1: t('auth.signup.codeSentToast') });
      navigation.navigate('OtpVerification', { email: trimmedEmail });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      // Map known errors to i18n keys
      if (message === 'email_exists') {
        setError(t('auth.signup.emailExists'));
      } else if (message.includes('weak') || message.includes('password')) {
        setError(t('auth.signup.weakPassword'));
      } else {
        setError(message || t('auth.signup.emailExists'));
      }
    }
  };

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
            {t('auth.signup.title')}
          </Text>

          {/* Email field */}
          <Text style={[styles.label, { color: colors.text }]}>
            {t('auth.signup.emailLabel')}
          </Text>
          <TextInput
            ref={emailRef}
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder={t('auth.signup.emailLabel')}
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!signUpLoading}
          />

          {/* Password field with eye toggle */}
          <Text style={[styles.label, { color: colors.text }]}>
            {t('auth.signup.passwordLabel')}
          </Text>
          <View style={styles.passwordContainer}>
            <TextInput
              ref={passwordRef}
              style={[
                styles.input,
                styles.passwordInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={t('auth.signup.passwordLabel')}
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password-new"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
              editable={!signUpLoading}
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

          {/* Error message */}
          {error && (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          )}

          {/* Sign Up button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.primary },
              signUpLoading && styles.actionButtonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={signUpLoading}
            activeOpacity={0.8}
          >
            {signUpLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={[styles.actionButtonText, styles.loadingText]}>
                  {t('auth.signup.signingUp')}
                </Text>
              </View>
            ) : (
              <Text style={styles.actionButtonText}>
                {t('auth.signup.signUp')}
              </Text>
            )}
          </TouchableOpacity>

          {/* "Already have an account? Sign in" link */}
          <View style={styles.signInContainer}>
            <Text style={[styles.signInPrompt, { color: colors.textSecondary }]}>
              {t('auth.signup.hasAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.signInLink, { color: colors.primary }]}>
                {t('auth.signup.signInLink')}
              </Text>
            </TouchableOpacity>
          </View>
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
  signInContainer: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInPrompt: {
    fontSize: 14,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
