import { useState, useEffect, useRef } from 'react';
import { parse as yamlParse } from 'yaml';
import toast from 'react-hot-toast';
import { useI18n } from '../contexts/I18nContext';
import { getDeckYaml, commitYaml, type DeckMetadata } from '../lib/api';
import TagInput from './TagInput';

interface DeckMetadataFormProps {
  deckName: string;
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'it', label: 'Italiano' },
  { value: 'es', label: 'Espanol' },
  { value: 'fr', label: 'Francais' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Portugues' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
] as const;

function parseDeckYaml(content: string): DeckMetadata {
  const data = yamlParse(content) ?? {};
  return {
    display_name: typeof data.display_name === 'string' ? data.display_name : '',
    description: typeof data.description === 'string' ? data.description : '',
    tags: Array.isArray(data.tags)
      ? data.tags.filter((t: unknown): t is string => typeof t === 'string')
      : [],
    language: typeof data.language === 'string' ? data.language : 'en',
  };
}

export default function DeckMetadataForm({ deckName }: DeckMetadataFormProps) {
  const { t } = useI18n();

  const [collapsed, setCollapsed] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef<string>('');

  // Load metadata when deckName changes
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setDisplayName('');
      setDescription('');
      setTags([]);
      setLanguage('en');
      loadedRef.current = '';

      try {
        const result = await getDeckYaml(deckName);
        if (cancelled) return;

        if (result) {
          const meta = parseDeckYaml(result.content);
          setDisplayName(meta.display_name);
          setDescription(meta.description);
          setTags(meta.tags);
          setLanguage(meta.language);
          loadedRef.current = JSON.stringify({
            display_name: meta.display_name,
            description: meta.description,
            tags: meta.tags,
            language: meta.language,
          });
        } else {
          // No deck.yaml yet -- pre-fill display name from folder name
          setDisplayName(deckName);
          setDescription('');
          setTags([]);
          setLanguage('en');
          loadedRef.current = JSON.stringify({
            display_name: deckName,
            description: '',
            tags: [],
            language: 'en',
          });
        }
      } catch {
        if (cancelled) return;
        toast.error(t('deckMeta.loadError'));
        // Show empty form pre-filled with folder name
        setDisplayName(deckName);
        setDescription('');
        setTags([]);
        setLanguage('en');
        loadedRef.current = JSON.stringify({
          display_name: deckName,
          description: '',
          tags: [],
          language: 'en',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [deckName, t]);

  // Dirty + valid tracking
  const isDirty =
    JSON.stringify({ display_name: displayName, description, tags, language }) !==
    loadedRef.current;
  const isValid = displayName.trim().length > 0 && description.trim().length > 0;
  const canSave = isDirty && isValid && !saving && !loading;

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      await commitYaml(deckName, {
        display_name: displayName,
        description,
        tags,
        language,
      });
      toast.success(t('deckMeta.saveSuccess'));
      loadedRef.current = JSON.stringify({
        display_name: displayName,
        description,
        tags,
        language,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const inputClasses =
    'w-full rounded-md border border-lumio-border bg-lumio-bg px-3 py-2 text-sm text-lumio-text focus:outline-none focus:ring-2 focus:ring-lumio-primary';
  const labelClasses = 'mb-1 block text-xs font-medium text-lumio-text-secondary';

  return (
    <div className="rounded-lg border border-lumio-border bg-lumio-surface">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-lumio-text hover:bg-lumio-border/20"
      >
        <span className="flex items-center gap-2">
          {t('deckMeta.metadata')}
          {loading && (
            <svg
              className="h-4 w-4 animate-spin text-lumio-text-secondary"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
        </span>
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
          {/* Display Name */}
          <div>
            <label htmlFor="deck-display-name" className={labelClasses}>
              {t('deckMeta.displayName')}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="deck-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading || saving}
              placeholder={t('deckMeta.displayNamePlaceholder')}
              className={inputClasses}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="deck-description" className={labelClasses}>
              {t('deckMeta.description')}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <textarea
              id="deck-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading || saving}
              placeholder={t('deckMeta.descriptionPlaceholder')}
              className={`${inputClasses} resize-y`}
            />
          </div>

          {/* Tags */}
          <div>
            <label className={labelClasses}>
              {t('deckMeta.tags')}
            </label>
            <TagInput
              tags={tags}
              onChange={setTags}
              disabled={loading || saving}
            />
          </div>

          {/* Language */}
          <div>
            <label htmlFor="deck-language" className={labelClasses}>
              {t('deckMeta.language')}
            </label>
            <select
              id="deck-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={loading || saving}
              className={inputClasses}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${
              canSave
                ? 'bg-lumio-primary hover:bg-lumio-primary/90'
                : 'bg-lumio-primary opacity-50 cursor-not-allowed'
            }`}
          >
            {saving ? t('deckMeta.saving') : t('deckMeta.saveButton')}
          </button>
        </div>
      )}
    </div>
  );
}
