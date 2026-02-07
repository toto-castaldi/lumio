import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface StatCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBgColor: string;
  label: string;
  value: string | number;
  subtitle?: string;
  isLoading?: boolean;
}

/**
 * Reusable stat tile with icon, label, value, and optional loading skeleton.
 * Used on the Dashboard to display metrics like repo count, card count, etc.
 */
export function StatCard({
  icon,
  iconColor,
  iconBgColor,
  label,
  value,
  subtitle,
  isLoading = false,
}: StatCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      {isLoading ? (
        <View
          style={[styles.skeleton, { backgroundColor: colors.border }]}
        />
      ) : (
        <Text style={[styles.value, { color: colors.text }]}>
          {value}
        </Text>
      )}
      {subtitle != null && !isLoading && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  skeleton: {
    width: 40,
    height: 28,
    borderRadius: 4,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
