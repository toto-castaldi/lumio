import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Animated,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'UpdatePassword'>;

const COOLDOWN_SECONDS = 60;
const DIGIT_COUNT = 6;
const MIN_PASSWORD_LENGTH = 6;

/**
 * UpdatePasswordScreen has two phases:
 *
 * Phase 1 (OTP Entry):
 * - Title: "Set New Password"
 * - Subtitle: "Enter the 6-digit code sent to {email}"
 * - 6-digit OTP input with auto-advance, paste support, shake animation
 * - Resend button with 60-second cooldown
 *
 * Phase 2 (New Password):
 * - New password TextInput with eye toggle
 * - Client-side validation: minimum 6 characters
 * - "Update password" button
 * - On success: global signOut triggers navigation back to Login
 */
export function UpdatePasswordScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const {
    verifyRecoveryOtp,
    verifyRecoveryLoading,
    updatePassword,
    updatePasswordLoading,
    resetPassword,
    resetLoading,
  } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();

  // Phase state
  const [phase, setPhase] = useState<'otp' | 'password'>('otp');

  // OTP state (same pattern as OtpVerificationScreen)
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const [otpError, setOtpError] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  // Cooldown for resend (starts active since code was just sent)
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);

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

  // Auto-focus first digit on mount
  useEffect(() => {
    if (phase === 'otp') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [phase]);

  // Auto-focus password field when entering phase 2
  useEffect(() => {
    if (phase === 'password') {
      setTimeout(() => passwordRef.current?.focus(), 100);
    }
  }, [phase]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // --- OTP Handlers (replicated from OtpVerificationScreen) ---

  const handleVerifyOtp = useCallback(async (token: string) => {
    setOtpError(null);
    try {
      await verifyRecoveryOtp(email, token);
      // Success: transition to password phase
      setPhase('password');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      if (message.includes('expired') || message.includes('Token has expired')) {
        setOtpError(t('auth.otp.expired'));
      } else {
        setOtpError(t('auth.otp.invalidCode'));
      }
      triggerShake();
      // Clear all digits after shake
      setTimeout(() => {
        setDigits(Array(DIGIT_COUNT).fill(''));
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [email, verifyRecoveryOtp, t, triggerShake]);

  const handleChange = useCallback((text: string, index: number) => {
    // Handle paste: if text length > 1, distribute digits
    if (text.length > 1) {
      const pastedDigits = text.replace(/\D/g, '').slice(0, DIGIT_COUNT).split('');
      const newDigits = Array(DIGIT_COUNT).fill('');
      pastedDigits.forEach((d, i) => { newDigits[i] = d; });
      setDigits(newDigits);
      if (pastedDigits.length === DIGIT_COUNT) {
        handleVerifyOtp(newDigits.join(''));
      } else {
        inputRefs.current[pastedDigits.length]?.focus();
      }
      return;
    }

    // Single digit
    setDigits(prev => {
      const newDigits = [...prev];
      newDigits[index] = text.replace(/\D/g, '');

      if (text && index < DIGIT_COUNT - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all 6 filled
      if (newDigits.every(d => d !== '')) {
        setTimeout(() => handleVerifyOtp(newDigits.join('')), 0);
      }

      return newDigits;
    });
  }, [handleVerifyOtp]);

  const handleKeyPress = useCallback((e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      setDigits(prev => {
        if (!prev[index] && index > 0) {
          const newDigits = [...prev];
          newDigits[index - 1] = '';
          inputRefs.current[index - 1]?.focus();
          return newDigits;
        }
        return prev;
      });
    }
  }, []);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;
    setOtpError(null);
    try {
      await resetPassword(email);
      setCooldown(COOLDOWN_SECONDS);
      Toast.show({ type: 'success', text1: t('auth.otp.resent') });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      if (message.includes('rate') || message.includes('limit')) {
        setOtpError(t('auth.reset.rateLimited'));
      } else {
        setOtpError(message || t('auth.otp.invalidCode'));
      }
    }
  }, [cooldown, email, resetPassword, t]);

  // --- Password Handler ---

  const handleUpdatePassword = useCallback(async () => {
    setPasswordError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(t('auth.signup.weakPassword'));
      return;
    }

    try {
      await updatePassword(newPassword);
      // updatePassword: updates password -> global signOut -> recoveryState='idle'
      Toast.show({
        type: 'success',
        text1: t('auth.updatePassword.success'),
        text2: t('auth.updatePassword.successDescription'),
      });
      // Navigate back to Login so the user can sign in with their new password
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      if (message.includes('same_password') || message.includes('different')) {
        setPasswordError(t('auth.updatePassword.samePassword'));
      } else {
        setPasswordError(message || t('auth.updatePassword.samePassword'));
      }
    }
  }, [newPassword, updatePassword, navigation, t]);

  // --- Render ---

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
        {/* Back button */}
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
            {t('auth.updatePassword.title')}
          </Text>

          {phase === 'otp' ? (
            <>
              {/* Subtitle with email */}
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t('auth.otp.subtitle')}
              </Text>
              <Text style={[styles.email, { color: colors.text }]}>
                {email}
              </Text>

              {/* 6 digit boxes */}
              <Animated.View
                style={[
                  styles.digitsContainer,
                  { transform: [{ translateX: shakeAnim }] },
                ]}
              >
                {digits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => { inputRefs.current[index] = ref; }}
                    style={[
                      styles.digitBox,
                      {
                        backgroundColor: colors.surface,
                        borderColor: digit ? colors.primary : colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={digit}
                    onChangeText={text => handleChange(text, index)}
                    onKeyPress={e => handleKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? 6 : 1}
                    textAlign="center"
                    selectTextOnFocus
                    editable={!verifyRecoveryLoading}
                  />
                ))}
              </Animated.View>

              {/* OTP Error */}
              {otpError && (
                <Text style={[styles.error, { color: colors.danger }]}>{otpError}</Text>
              )}

              {/* Verifying indicator */}
              {verifyRecoveryLoading && (
                <View style={styles.verifyingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.verifyingText, { color: colors.textSecondary }]}>
                    {t('auth.otp.verifying')}
                  </Text>
                </View>
              )}

              {/* Resend section */}
              <View style={styles.resendContainer}>
                {resetLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : cooldown > 0 ? (
                  <Text style={[styles.resendTimer, { color: colors.textSecondary }]}>
                    {t('auth.otp.resendIn', { seconds: cooldown })}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResend}>
                    <Text style={[styles.resendLink, { color: colors.primary }]}>
                      {t('auth.otp.resend')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <>
              {/* New password field with eye toggle */}
              <Text style={[styles.label, { color: colors.text }]}>
                {t('auth.updatePassword.newPasswordLabel')}
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
                  placeholder={t('auth.updatePassword.newPasswordLabel')}
                  placeholderTextColor={colors.textSecondary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password-new"
                  returnKeyType="done"
                  onSubmitEditing={handleUpdatePassword}
                  editable={!updatePasswordLoading}
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

              {/* Password error */}
              {passwordError && (
                <Text style={[styles.error, { color: colors.danger }]}>{passwordError}</Text>
              )}

              {/* Update password button */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.primary },
                  updatePasswordLoading && styles.actionButtonDisabled,
                ]}
                onPress={handleUpdatePassword}
                disabled={updatePasswordLoading}
                activeOpacity={0.8}
              >
                {updatePasswordLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.actionButtonText}>
                    {t('auth.updatePassword.update')}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
  },
  // OTP digit boxes (same as OtpVerificationScreen)
  digitsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  digitBox: {
    width: 48,
    height: 48,
    borderWidth: 2,
    borderRadius: 8,
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  verifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  resendContainer: {
    marginTop: 16,
    alignItems: 'center',
    minHeight: 32,
    justifyContent: 'center',
  },
  resendTimer: {
    fontSize: 14,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Password phase styles (same as LoginScreen/SignUpScreen)
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    width: '100%',
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeToggle: {
    position: 'absolute',
    right: 12,
    top: 13,
  },
  actionButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
