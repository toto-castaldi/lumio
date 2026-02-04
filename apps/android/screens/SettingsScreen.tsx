import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

/**
 * SettingsScreen with user info and logout functionality.
 *
 * Layout:
 * - User email at top
 * - Logout button at bottom (immediate logout, no confirmation per CONTEXT)
 */
export function SettingsScreen() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    // Navigation happens automatically via AuthContext state change
  };

  return (
    <View style={styles.container}>
      {/* User info section */}
      <View style={styles.userSection}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.email}>{user?.email ?? 'Unknown user'}</Text>
      </View>

      {/* Spacer to push logout to bottom */}
      <View style={styles.spacer} />

      {/* Logout button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  userSection: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
  },
  logoutSection: {
    padding: 16,
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
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
});
