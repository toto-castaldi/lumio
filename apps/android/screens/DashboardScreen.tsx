import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * DashboardScreen with prominent Study button.
 * Full content will be implemented in Phase 3.
 */
export function DashboardScreen() {
  const handleStudyPress = () => {
    console.log('Study pressed - will navigate to Study screen in Phase 4');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Coming in Phase 3</Text>
      </View>

      <TouchableOpacity
        style={styles.studyButton}
        onPress={handleStudyPress}
        activeOpacity={0.8}
      >
        <Ionicons name="play" size={24} color="#ffffff" />
        <Text style={styles.studyButtonText}>Start Study Session</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  studyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    // Android elevation
    elevation: 4,
    // iOS shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  studyButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
