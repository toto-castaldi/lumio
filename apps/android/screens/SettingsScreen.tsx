import React, { useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import type { UserIdentity } from '@supabase/supabase-js';
import { getDisplayVersion } from '@lumio/shared';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import { useStudySettings } from '../hooks/useStudySettings';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { ThemePreference } from '../lib/theme';
import type { AppLocale } from '../lib/i18n';
import type { CardsPerSession } from '../lib/studySettings';

type OptionItem<T> = {
  value: T;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

/**
 * SettingsScreen with user info, appearance toggle, study options,
 * language selector, and logout functionality.
 *
 * Layout:
 * - User email section
 * - Appearance section with system/light/dark toggle
 * - Study section with cards-per-session options
 * - Language section with English/Italiano toggle
 * - Logout button (immediate logout, no confirmation per CONTEXT)
 * - App version footer
 */
export function SettingsScreen() {
  const { user, signOut, linkGoogle, unlinkIdentity, linkGoogleLoading, unlinkLoading } = useAuth();
  const { colors, preference, setPreference } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const { cardsPerSession, setCardsPerSession } = useStudySettings();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const version = getDisplayVersion();

  // Google profile data from Supabase user metadata
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = user?.user_metadata?.full_name as string | undefined;

  // Connected accounts computation
  const identities: UserIdentity[] = user?.identities ?? [];
  const googleIdentity = identities.find(i => i.provider === 'google');
  const emailIdentity = identities.find(i => i.provider === 'email');
  const hasMultipleIdentities = identities.length > 1;

  const handleLinkGoogle = useCallback(async () => {
    try {
      await linkGoogle();
      Toast.show({ type: 'success', text1: t('auth.linking.googleConnected') });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'google_already_linked') {
        Toast.show({ type: 'error', text1: t('auth.linking.googleAlreadyLinked') });
      } else {
        Toast.show({ type: 'error', text1: t('auth.linking.linkFailed') });
      }
    }
  }, [linkGoogle, t]);

  const handleUnlinkGoogle = useCallback(async () => {
    if (!googleIdentity) return;
    try {
      await unlinkIdentity(googleIdentity);
      Toast.show({ type: 'success', text1: t('auth.linking.googleDisconnected') });
    } catch {
      Toast.show({ type: 'error', text1: t('auth.linking.unlinkFailed') });
    }
  }, [googleIdentity, unlinkIdentity, t]);

  const handleUnlinkEmail = useCallback(async () => {
    if (!emailIdentity) return;
    try {
      await unlinkIdentity(emailIdentity);
      Toast.show({ type: 'success', text1: t('auth.linking.emailDisconnected') });
    } catch {
      Toast.show({ type: 'error', text1: t('auth.linking.unlinkFailed') });
    }
  }, [emailIdentity, unlinkIdentity, t]);

  const handleAddPassword = useCallback(() => {
    navigation.navigate('SetPassword', { email: user?.email ?? '' });
  }, [navigation, user?.email]);

  // Option arrays inside component body so t() picks up current locale
  const themeOptions: OptionItem<ThemePreference>[] = [
    { value: 'system', label: t('settings.system'), icon: 'phone-portrait-outline' },
    { value: 'light', label: t('settings.light'), icon: 'sunny-outline' },
    { value: 'dark', label: t('settings.dark'), icon: 'moon-outline' },
  ];

  const studyOptions: OptionItem<CardsPerSession>[] = [
    { value: 10, label: t('settings.tenCards'), icon: 'flash-outline' },
    { value: 20, label: t('settings.twentyCards'), icon: 'layers-outline' },
    { value: 50, label: t('settings.fiftyCards'), icon: 'library-outline' },
    { value: 'all', label: t('settings.allCards'), icon: 'infinite-outline' },
  ];

  // Language names use autonyms (the language's own name for itself) -- NOT translated
  const languageOptions: OptionItem<AppLocale>[] = [
    { value: 'en', label: 'English', icon: 'language-outline' },
    { value: 'it', label: 'Italiano', icon: 'language-outline' },
  ];

  const handleCopyVersion = async () => {
    await Clipboard.setStringAsync(version);
    Toast.show({
      type: 'success',
      text1: t('settings.versionCopied'),
      text2: version,
      visibilityTime: 2000,
    });
  };

  const handleLogout = async () => {
    await signOut();
    // Navigation happens automatically via AuthContext state change
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Account section */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: 16 }]}>
        {t('settings.account')}
      </Text>
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <View style={styles.accountRow}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
          )}
          <View style={styles.accountInfo}>
            {displayName && (
              <Text style={[styles.accountName, { color: colors.text }]}>
                {displayName}
              </Text>
            )}
            <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>
              {user?.email ?? t('common.unknownUser')}
            </Text>
          </View>
        </View>

        {/* Connected accounts — inside same section, below account info */}
        <View style={[styles.identitySeparator, { borderTopColor: colors.border }]} />

        <Text style={[styles.identitySubLabel, { color: colors.textSecondary }]}>
          {t('settings.connectedAccounts')}
        </Text>

        {/* Google row */}
        <View style={[styles.identityRow, styles.optionBorder, { borderBottomColor: colors.border }]}>
          <View style={styles.optionLeft}>
            <Ionicons name="logo-google" size={20} color={colors.textSecondary} style={styles.optionIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: colors.text }]}>{t('settings.google')}</Text>
              {googleIdentity && (
                <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>
                  {googleIdentity.identity_data?.email as string}
                </Text>
              )}
            </View>
          </View>
          {googleIdentity ? (
            hasMultipleIdentities && (
              <TouchableOpacity onPress={handleUnlinkGoogle} disabled={unlinkLoading} activeOpacity={0.6}>
                <Text style={{ color: colors.danger, fontSize: 14, fontWeight: '500' }}>
                  {t('settings.disconnect')}
                </Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity onPress={handleLinkGoogle} disabled={linkGoogleLoading} activeOpacity={0.6}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '500' }}>
                {linkGoogleLoading ? '...' : t('settings.add')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Email row */}
        <View style={styles.identityRow}>
          <View style={styles.optionLeft}>
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.optionIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: colors.text }]}>{t('settings.emailPassword')}</Text>
              {emailIdentity && (
                <Text style={[styles.accountEmail, { color: colors.textSecondary }]}>
                  {(emailIdentity.identity_data?.email as string) ?? user?.email}
                </Text>
              )}
            </View>
          </View>
          {emailIdentity ? (
            hasMultipleIdentities && (
              <TouchableOpacity onPress={handleUnlinkEmail} disabled={unlinkLoading} activeOpacity={0.6}>
                <Text style={{ color: colors.danger, fontSize: 14, fontWeight: '500' }}>
                  {t('settings.disconnect')}
                </Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity onPress={handleAddPassword} activeOpacity={0.6}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '500' }}>
                {t('settings.add')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Appearance section */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        {t('settings.appearance')}
      </Text>
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        {themeOptions.map((option, index) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionRow,
              index < themeOptions.length - 1 && [
                styles.optionBorder,
                { borderBottomColor: colors.border },
              ],
            ]}
            onPress={() => setPreference(option.value)}
            activeOpacity={0.6}
          >
            <View style={styles.optionLeft}>
              <Ionicons
                name={option.icon}
                size={20}
                color={colors.textSecondary}
                style={styles.optionIcon}
              />
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {option.label}
              </Text>
            </View>
            {preference === option.value && (
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Study section */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        {t('settings.study')}
      </Text>
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        {studyOptions.map((option, index) => (
          <TouchableOpacity
            key={String(option.value)}
            style={[
              styles.optionRow,
              index < studyOptions.length - 1 && [
                styles.optionBorder,
                { borderBottomColor: colors.border },
              ],
            ]}
            onPress={() => setCardsPerSession(option.value)}
            activeOpacity={0.6}
          >
            <View style={styles.optionLeft}>
              <Ionicons
                name={option.icon}
                size={20}
                color={colors.textSecondary}
                style={styles.optionIcon}
              />
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {option.label}
              </Text>
            </View>
            {cardsPerSession === option.value && (
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Language section */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        {t('settings.language')}
      </Text>
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        {languageOptions.map((option, index) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionRow,
              index < languageOptions.length - 1 && [
                styles.optionBorder,
                { borderBottomColor: colors.border },
              ],
            ]}
            onPress={() => setLocale(option.value)}
            activeOpacity={0.6}
          >
            <View style={styles.optionLeft}>
              <Ionicons
                name={option.icon}
                size={20}
                color={colors.textSecondary}
                style={styles.optionIcon}
              />
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {option.label}
              </Text>
            </View>
            {locale === option.value && (
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Logout section */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.danger }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>{t('settings.logOut')}</Text>
        </TouchableOpacity>
      </View>

      {/* App version */}
      <TouchableOpacity onPress={handleCopyVersion} activeOpacity={0.6}>
        <Text style={[styles.version, { color: colors.textSecondary }]}>
          {version}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
  },
  identitySeparator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    marginBottom: 8,
  },
  identitySubLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  spacer: {
    flex: 1,
    minHeight: 32,
  },
  logoutSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 8,
  },
});
