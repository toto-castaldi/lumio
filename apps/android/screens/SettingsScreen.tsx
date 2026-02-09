import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { getVersionString } from '@lumio/shared';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import { useStudySettings } from '../hooks/useStudySettings';
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
  const { user, signOut } = useAuth();
  const { colors, preference, setPreference } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const { cardsPerSession, setCardsPerSession } = useStudySettings();
  const version = getVersionString();

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
      {/* User info section */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('settings.signedInAs')}
        </Text>
        <Text style={[styles.email, { color: colors.text }]}>
          {user?.email ?? t('common.unknownUser')}
        </Text>
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
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    fontWeight: '500',
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
  },
  optionIcon: {
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
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
