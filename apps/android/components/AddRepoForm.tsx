import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface AddRepoFormProps {
  onAdd: (url: string, accessToken?: string) => Promise<void>;
  isAdding: boolean;
  showPatPrompt?: boolean;
  onCancel?: () => void;
}

/**
 * Form to add a repository by URL.
 * When showPatPrompt is true, displays an additional PAT input for private repos.
 */
export function AddRepoForm({ onAdd, isAdding, showPatPrompt = false, onCancel }: AddRepoFormProps) {
  const { colors } = useTheme();
  const [url, setUrl] = useState('');
  const [pat, setPat] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setUrlError('Repository URL is required');
      return false;
    }
    // Basic GitHub URL validation
    const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i;
    if (!githubPattern.test(value.trim())) {
      setUrlError('Enter a valid GitHub repository URL');
      return false;
    }
    setUrlError(null);
    return true;
  };

  const handleSubmit = async () => {
    const trimmedUrl = url.trim();
    if (!validateUrl(trimmedUrl)) return;

    const accessToken = showPatPrompt && pat.trim() ? pat.trim() : undefined;
    try {
      await onAdd(trimmedUrl, accessToken);
      // Only clear form on success (no exception thrown)
      setUrl('');
      setPat('');
      setUrlError(null);
    } catch {
      // Parent handles the error (toast, showPatPrompt, etc.)
      // Keep URL in the field so user doesn't have to retype it
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: urlError ? colors.danger : colors.border,
            },
          ]}
          placeholder="https://github.com/user/repo"
          placeholderTextColor={colors.textSecondary}
          value={url}
          onChangeText={(text) => {
            setUrl(text);
            if (urlError) setUrlError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!isAdding && !showPatPrompt}
        />
        {!showPatPrompt && (
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: colors.primary },
              isAdding && styles.addButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isAdding}
            activeOpacity={0.7}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="add" size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {urlError && (
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {urlError}
        </Text>
      )}

      {showPatPrompt && (
        <View style={styles.patSection}>
          <Text style={[styles.patLabel, { color: colors.textSecondary }]}>
            This repository appears to be private. Enter a Personal Access Token:
          </Text>
          <TextInput
            style={[
              styles.patInput,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.primary,
              },
            ]}
            placeholder="ghp_xxxxxxxxxxxx"
            placeholderTextColor={colors.textSecondary}
            value={pat}
            onChangeText={setPat}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isAdding}
          />
          <View style={styles.patButtonRow}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => {
                setPat('');
                onCancel?.();
              }}
              disabled={isAdding}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={isAdding}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>Submit with Token</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  patSection: {
    marginTop: 12,
  },
  patLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  patInput: {
    height: 48,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  patButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
