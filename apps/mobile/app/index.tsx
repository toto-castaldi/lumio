import { View, Text, StyleSheet, Platform } from 'react-native';
import { VERSION, APP_NAME } from '@lumio/shared';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>AI-powered flashcard study platform</Text>

        <View style={styles.versionBox}>
          <View style={styles.versionRow}>
            <Text style={styles.label}>Version:</Text>
            <Text style={styles.value}>{VERSION.version}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.label}>Build:</Text>
            <Text style={styles.value}>{VERSION.buildNumber}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.label}>Commit:</Text>
            <Text style={styles.value}>{VERSION.commitSha.slice(0, 7)}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>
              {new Date(VERSION.buildDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <Text style={styles.platform}>Platform: Mobile</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fafafa',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#0a0a0a',
  },
  subtitle: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    marginBottom: 20,
  },
  versionBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: '#737373',
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#0a0a0a',
  },
  platform: {
    fontSize: 12,
    color: '#a3a3a3',
    textAlign: 'center',
  },
});
