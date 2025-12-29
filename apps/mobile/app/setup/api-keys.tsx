import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { APP_NAME } from '@lumio/core';
import { useAuth } from '../../contexts/AuthContext';

export default function SetupRequiredScreen() {
  const { signOut } = useAuth();

  const openWebApp = () => {
    // TODO: Replace with production URL when available
    Linking.openURL('https://lumio.toto-castaldi.com');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚙️</Text>
        </View>

        <Text style={styles.title}>Configurazione Richiesta</Text>

        <Text style={styles.description}>
          Per utilizzare {APP_NAME}, devi prima configurare le tue API keys (OpenAI o Anthropic) dalla versione web.
        </Text>

        <Text style={styles.subdescription}>
          L'app mobile è dedicata allo studio. La configurazione delle API keys e la gestione dei deck avviene esclusivamente su web.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={openWebApp}>
          <Text style={styles.primaryButtonText}>Apri {APP_NAME} Web</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={signOut}>
          <Text style={styles.secondaryButtonText}>Logout</Text>
        </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  subdescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 14,
  },
});
