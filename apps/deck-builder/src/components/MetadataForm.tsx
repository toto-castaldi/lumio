import { useState } from 'react';
import type { CardFrontmatter } from '@lumio/shared';
import { useI18n } from '../contexts/I18nContext';
import { validateCardTitle } from '../lib/card-validation';
import TagInput from './TagInput';

interface MetadataFormProps {
  frontmatter: CardFrontmatter;
  onChange: (fm: CardFrontmatter) => void;
  disabled?: boolean;
}

const DIFFICULTY_OPTIONS = [
  { value: '', labelKey: 'card.difficulty.placeholder' },
  { value: '1', labelKey: 'card.difficulty.easy' },
  { value: '3', labelKey: 'card.difficulty.medium' },
  { value: '5', labelKey: 'card.difficulty.hard' },
] as const;

export default function MetadataForm({ frontmatter, onChange, disabled = false }: MetadataFormProps) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);

  const titleError = frontmatter.title.trim().length > 0
    ? validateCardTitle(frontmatter.title)
    : null;

  const handleTitleChange = (value: string) => {
    onChange({ ...frontmatter, title: value });
  };

  const handleTagsChange = (tags: string[]) => {
    onChange({ ...frontmatter, tags });
  };

  const handleDifficultyChange = (value: string) => {
    onChange({
      ...frontmatter,
      difficulty: value === '' ? undefined : Number(value),
    });
  };

  const handleLanguageChange = (value: string) => {
    onChange({ ...frontmatter, language: value || undefined });
  };

  return (
    <div className="rounded-lg border border-lumio-border bg-lumio-surface">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-lumio-text hover:bg-lumio-border/20"
      >
        <span>{t('card.meta.metadata')}</span>
        <svg
          className={`h-4 w-4 text-lumio-text-secondary transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible content */}
      {!collapsed && (
        <div className="space-y-4 border-t border-lumio-border px-4 pb-4 pt-3">
          {/* Title */}
          <div>
            <label htmlFor="card-title" className="mb-1 block text-xs font-medium text-lumio-text-secondary">
              {t('card.meta.title')}
            </label>
            <input
              id="card-title"
              type="text"
              value={frontmatter.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              disabled={disabled}
              className="w-full rounded-md border border-lumio-border bg-lumio-bg px-3 py-2 text-sm text-lumio-text placeholder:text-lumio-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-lumio-primary"
              placeholder={t('card.untitled')}
            />
            {titleError && (
              <p className="mt-1 text-xs text-red-500">{t(titleError)}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1 block text-xs font-medium text-lumio-text-secondary">
              {t('card.meta.tags')}
            </label>
            <TagInput
              tags={frontmatter.tags}
              onChange={handleTagsChange}
              disabled={disabled}
            />
          </div>

          {/* Difficulty + Language row */}
          <div className="flex gap-4">
            {/* Difficulty */}
            <div className="flex-1">
              <label htmlFor="card-difficulty" className="mb-1 block text-xs font-medium text-lumio-text-secondary">
                {t('card.meta.difficulty')}
              </label>
              <select
                id="card-difficulty"
                value={frontmatter.difficulty !== undefined ? String(frontmatter.difficulty) : ''}
                onChange={(e) => handleDifficultyChange(e.target.value)}
                disabled={disabled}
                className="w-full rounded-md border border-lumio-border bg-lumio-bg px-3 py-2 text-sm text-lumio-text focus:outline-none focus:ring-2 focus:ring-lumio-primary"
              >
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div className="w-24">
              <label htmlFor="card-language" className="mb-1 block text-xs font-medium text-lumio-text-secondary">
                {t('card.meta.language')}
              </label>
              <input
                id="card-language"
                type="text"
                value={frontmatter.language ?? ''}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={disabled}
                placeholder="en"
                className="w-full rounded-md border border-lumio-border bg-lumio-bg px-3 py-2 text-sm text-lumio-text placeholder:text-lumio-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-lumio-primary"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
