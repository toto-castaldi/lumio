import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>;

const COOLDOWN_SECONDS = 60;
const DIGIT_COUNT = 6;

/**
 * OtpVerificationScreen displays a 6-digit OTP input for email verification.
 *
 * Features:
 * - 6 separate digit boxes with auto-advance to next box on input
 * - Auto-submit when all 6 digits are entered (no manual button)
 * - Paste support: distributes pasted digits across boxes
 * - Backspace on empty box focuses previous box
 * - Wrong code triggers shake animation + clears all digits
 * - Resend code with 60-second cooldown timer
 * - Shows the email address the code was sent to
 * - After successful verification: auth state change auto-navigates to home
 */
export function OtpVerificationScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const { verifyEmailOtp, resendOtp, verifyLoading, resendLoading } = useAuth();
  const { colors } = useTheme();
  const { t } = useI18n();

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const [error, setError] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Cooldown timer - starts active since code was just sent
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
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleVerify = useCallback(async (token: string) => {
    setError(null);
    try {
      await verifyEmailOtp(email, token);
      // Success: onAuthStateChange fires SIGNED_IN, AppNavigator auto-switches to MainNavigator
      // No manual navigation needed -- AuthContext state change handles it
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      // Show error, shake, clear digits
      if (message.includes('expired') || message.includes('Token has expired')) {
        setError(t('auth.otp.expired'));
      } else {
        setError(t('auth.otp.invalidCode'));
      }
      triggerShake();
      // Clear all digits after shake
      setTimeout(() => {
        setDigits(Array(DIGIT_COUNT).fill(''));
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [email, verifyEmailOtp, t, triggerShake]);

  const handleChange = useCallback((text: string, index: number) => {
    // Handle paste: if text length > 1, distribute digits
    if (text.length > 1) {
      const pastedDigits = text.replace(/\D/g, '').slice(0, DIGIT_COUNT).split('');
      const newDigits = Array(DIGIT_COUNT).fill('');
      pastedDigits.forEach((d, i) => { newDigits[i] = d; });
      setDigits(newDigits);
      if (pastedDigits.length === DIGIT_COUNT) {
        handleVerify(newDigits.join(''));
      } else {
        inputRefs.current[pastedDigits.length]?.focus();
      }
      return;
    }

    // Single digit
    setDigits(prev => {
      const newDigits = [...prev];
      newDigits[index] = text.replace(/\D/g, ''); // Only digits

      if (text && index < DIGIT_COUNT - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all 6 filled
      if (newDigits.every(d => d !== '')) {
        // Use setTimeout to allow state to update before verify
        setTimeout(() => handleVerify(newDigits.join('')), 0);
      }

      return newDigits;
    });
  }, [handleVerify]);

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
    setError(null);
    try {
      await resendOtp(email);
      setCooldown(COOLDOWN_SECONDS);
      Toast.show({ type: 'success', text1: t('auth.otp.resent') });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '';
      if (message.includes('rate') || message.includes('limit')) {
        setError(t('auth.reset.rateLimited'));
      } else {
        setError(message || t('auth.otp.invalidCode'));
      }
    }
  }, [cooldown, email, resendOtp, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.popToTop()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>
          {t('auth.otp.title')}
        </Text>

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
              maxLength={index === 0 ? 6 : 1} // Allow paste on first box
              textAlign="center"
              selectTextOnFocus
              editable={!verifyLoading}
            />
          ))}
        </Animated.View>

        {/* Error message */}
        {error && (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        )}

        {/* Verifying indicator */}
        {verifyLoading && (
          <View style={styles.verifyingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.verifyingText, { color: colors.textSecondary }]}>
              {t('auth.otp.verifying')}
            </Text>
          </View>
        )}

        {/* Resend section */}
        <View style={styles.resendContainer}>
          {resendLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : cooldown > 0 ? (
            <Text style={[styles.resendTimer, { color: colors.textSecondary }]}>
              {t('auth.otp.resendIn').replace('%{seconds}', String(cooldown))}
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={[styles.resendLink, { color: colors.primary }]}>
                {t('auth.otp.resend')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 32,
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
});
