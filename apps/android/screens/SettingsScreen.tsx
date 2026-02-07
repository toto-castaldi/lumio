import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import type { ThemePreference } from '../lib/theme';

type ThemeOption = {
  value: ThemePreference;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const themeOptions: ThemeOption[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

/**
 * SettingsScreen with user info, dark mode toggle, and logout functionality.
 *
 * Layout:
 * - User email section
 * - Appearance section with system/light/dark toggle
 * - Logout button (immediate logout, no confirmation per CONTEXT)
 * - App version footer
 */
export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { colors, preference, setPreference } = useTheme();

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
          Signed in as
        </Text>
        <Text style={[styles.email, { color: colors.text }]}>
          {user?.email ?? 'Unknown user'}
        </Text>
      </View>

      {/* Appearance section */}
      <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
        Appearance
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

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Logout section */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.danger }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {/* App version */}
      <Text style={[styles.version, { color: colors.textSecondary }]}>
        Lumio v1.0.0
      </Text>
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
