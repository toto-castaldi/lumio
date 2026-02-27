import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

// Basic email validation
const EMAIL_REGEX = /^.+@.+\..+$/;

// Check if Google Sign-In is configured
const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const isGoogleConfigured = !!googleClientId;

/**
 * LoginScreen displays the dual-auth login UI with Google Sign-In and email-first
 * progressive disclosure.
 *
 * Layout (top-to-bottom):
 * - Lumio logo + brand name + tagline
 * - Google Sign-In button
 * - "oppure"/"or" separator line
 * - Email form with progressive disclosure:
 *   - Step 1 (email): email TextInput + "Continua" button
 *   - Step 2 (password): read-only email + password TextInput + "Sign in" button + "Forgot password?"
 * - Error display
 * - "Non hai un account? Registrati" link
 */
export function LoginScreen() {
  const { signInWithGoogle, signInWithEmail, signInLoading } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<LoginNavProp>();

  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const handleContinue = useCallback(() => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setError(t('auth.login.invalidCredentials'));
      return;
    }
    setStep('password');
    // Auto-focus password field after transition
    setTimeout(() => passwordRef.current?.focus(), 100);
  }, [email, t]);

  const handleSignIn = useCallback(async () => {
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
      // Navigation happens automatically via AuthContext state change
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message.includes('Email not confirmed')) {
          setError(t('auth.login.emailNotConfirmed'));
        } else {
          setError(t('auth.login.invalidCredentials'));
        }
      } else {
        setError(t('auth.login.invalidCredentials'));
      }
    }
  }, [email, password, signInWithEmail, t]);

  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('login.signInFailed');
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  }, [signInWithGoogle, t]);

  const handleBackToEmail = useCallback(() => {
    setStep('email');
    setPassword('');
    setError(null);
  }, []);

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
          {/* Lumio logo */}
          <Image
            source={require('../assets/logo-login.png')}
            style={styles.logoImage}
            resizeMode="contain"
            accessibilityLabel={t('login.lumioLogo')}
          />

          {/* Brand name */}
          <Text style={[styles.logoText, { color: colors.text }]}>Lumio</Text>

          {/* Tagline */}
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            {t('login.tagline')}
          </Text>

          {/* Google Sign-In button */}
          {googleLoading ? (
            <View style={styles.googleLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={googleLoading || signInLoading}
              activeOpacity={0.8}
            >
              <View style={styles.googleButtonContent}>
                <View style={styles.googleIconContainer}>
                  <Text style={styles.googleIcon}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>
                  {t('login.signInWithGoogle')}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {!isGoogleConfigured && (
            <Text style={[styles.configWarning, { color: colors.danger }]}>
              {t('login.googleNotConfigured')}
            </Text>
          )}

          {/* Separator */}
          <View style={styles.separatorContainer}>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.separatorText, { color: colors.textSecondary }]}>
              {t('auth.login.or')}
            </Text>
            <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Error message */}
          {error && (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          )}

          {/* Email form section */}
          <View style={styles.formContainer}>
            {/* Email field */}
            {step === 'password' ? (
              <TouchableOpacity onPress={handleBackToEmail} activeOpacity={0.7}>
                <View
                  style={[
                    styles.input,
                    styles.readOnlyInput,
                    {
                      backgroundColor: colors.border,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.readOnlyText, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {email.trim()}
                  </Text>
                  <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ) : (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder={t('auth.login.emailLabel')}
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={handleContinue}
                editable={!signInLoading}
              />
            )}

            {step === 'email' ? (
              /* Continue button */
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>
                  {t('auth.login.continue')}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                {/* Password field with eye toggle */}
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
                    placeholder={t('auth.login.passwordLabel')}
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                    editable={!signInLoading}
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

                {/* Forgot password link */}
                <TouchableOpacity
                  style={styles.forgotPasswordContainer}
                  onPress={() => {
                    // Phase 30 implements the actual screen - no-op for now
                    console.log('[LoginScreen] Forgot password tapped - coming in Phase 30');
                  }}
                >
                  <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                    {t('auth.login.forgotPassword')}
                  </Text>
                </TouchableOpacity>

                {/* Sign in button */}
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.primary },
                    signInLoading && styles.actionButtonDisabled,
                  ]}
                  onPress={handleSignIn}
                  disabled={signInLoading}
                  activeOpacity={0.8}
                >
                  {signInLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.actionButtonText}>
                      {t('auth.login.signInAction')}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Sign up link */}
          <View style={styles.signUpContainer}>
            <Text style={[styles.signUpPrompt, { color: colors.textSecondary }]}>
              {t('auth.login.noAccount')}{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={[styles.signUpLink, { color: colors.primary }]}>
                {t('auth.login.signUpLink')}
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
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  logoImage: {
    width: 128,
    height: 128,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  // Google brand colors are kept as-is per brand guidelines
  googleButton: {
    backgroundColor: '#4285F4',
    borderRadius: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    width: '100%',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    paddingRight: 12,
  },
  googleIconContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    marginRight: 12,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  googleLoadingContainer: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  configWarning: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  // Separator
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  // Error
  error: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  // Form
  formContainer: {
    width: '100%',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  readOnlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readOnlyText: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 14,
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
  // Sign up link
  signUpContainer: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'center',
  },
  signUpPrompt: {
    fontSize: 14,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
