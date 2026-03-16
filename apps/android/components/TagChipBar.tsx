import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';

interface TagChipBarProps {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

/**
 * Horizontal scrollable chip bar for tag filtering.
 * First chip is always "All" (selected when no tag is active).
 */
export function TagChipBar({ tags, selectedTag, onSelectTag }: TagChipBarProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const isAllSelected = selectedTag === null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* "All" chip */}
      <TouchableOpacity
        style={[
          styles.chip,
          isAllSelected
            ? { backgroundColor: colors.primary }
            : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
        ]}
        onPress={() => onSelectTag(null)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.chipText,
            { color: isAllSelected ? '#ffffff' : colors.textSecondary },
          ]}
        >
          {t('discovery.allTags')}
        </Text>
      </TouchableOpacity>

      {/* Tag chips */}
      {tags.map((tag) => {
        const isSelected = selectedTag === tag;
        return (
          <TouchableOpacity
            key={tag}
            style={[
              styles.chip,
              isSelected
                ? { backgroundColor: colors.primary }
                : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={() => onSelectTag(isSelected ? null : tag)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? '#ffffff' : colors.textSecondary },
              ]}
            >
              {tag}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
