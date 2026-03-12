import { useState, useEffect, useMemo, useCallback } from 'react';
import MDEditor, { commands, type ICommand } from '@uiw/react-md-editor';
import { renderToString } from 'katex';
import 'katex/dist/katex.css';
import type { CardFrontmatter } from '@lumio/shared';
import { useCard } from '../contexts/CardContext';
import { useDeck } from '../contexts/DeckContext';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';
import { parseCard, serializeCard, generateCardTemplate } from '../lib/frontmatter';
import { slugify, validateCardTitle } from '../lib/card-validation';
import { getFile } from '../lib/api';
import ConfirmDialog from './ConfirmDialog';
import MetadataForm from './MetadataForm';

interface CardEditorProps {
  isCreatingNew: boolean;
  setIsCreatingNew: (v: boolean) => void;
}

// ---------------------------------------------------------------------------
// Custom commands
// ---------------------------------------------------------------------------

const mathCommand: ICommand = {
  name: 'math',
  keyCommand: 'math',
  icon: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <text x="2" y="18" fontSize="16" fontFamily="serif" fontStyle="italic">
        &Sigma;
      </text>
    </svg>
  ),
  execute: (state, api) => {
    const selected = state.selectedText;
    if (selected) {
      api.replaceSelection(`$$\n${selected}\n$$`);
    } else {
      api.replaceSelection('$$\nx^2 + y^2 = z^2\n$$');
    }
  },
};

const imageUrlCommand: ICommand = {
  name: 'image-url',
  keyCommand: 'image-url',
  icon: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  execute: (state, api) => {
    const selected = state.selectedText;
    if (selected) {
      api.replaceSelection(`![${selected}](https://)`);
    } else {
      api.replaceSelection('![alt text](https://)');
    }
  },
};

// ---------------------------------------------------------------------------
// Responsive hook
// ---------------------------------------------------------------------------

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CardEditor({ isCreatingNew, setIsCreatingNew }: CardEditorProps) {
  const { selectedCard, saveCard, deleteCard, saving, selectCard } = useCard();
  const { selectedDeck } = useDeck();
  const { t, locale } = useI18n();
  const { isDark } = useTheme();
  const isDesktop = useIsDesktop();

  // State
  const [frontmatter, setFrontmatter] = useState<CardFrontmatter>({
    title: '',
    tags: [],
    language: locale,
  });
  const [body, setBody] = useState('');
  const [currentSha, setCurrentSha] = useState<string | undefined>(undefined);
  const [currentFilename, setCurrentFilename] = useState('');
  const [hasBeenSaved, setHasBeenSaved] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [mobilePreview, setMobilePreview] = useState<'edit' | 'preview'>('edit');

  // Toolbar commands
  const toolbarCommands = useMemo<ICommand[]>(
    () => [
      commands.bold,
      commands.italic,
      commands.code,
      mathCommand,
      commands.title1,
      commands.unorderedListCommand,
      commands.link,
      imageUrlCommand,
    ],
    [],
  );

  // Load existing card content
  useEffect(() => {
    if (!selectedCard) return;
    let cancelled = false;
    setLoadingContent(true);
    setValidationErrors([]);
    setMobilePreview('edit');

    getFile(selectedCard.path)
      .then((file) => {
        if (cancelled) return;
        const { frontmatter: fm, body: b } = parseCard(file.content);
        setFrontmatter(fm);
        setBody(b);
        setCurrentSha(file.sha);
        setCurrentFilename(selectedCard.name);
        setHasBeenSaved(true);
        setIsNew(false);
        setIsCreatingNew(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Failed to load -- show empty editor
      })
      .finally(() => {
        if (!cancelled) setLoadingContent(false);
      });

    return () => { cancelled = true; };
  }, [selectedCard, setIsCreatingNew]);

  // New card flow
  useEffect(() => {
    if (!isCreatingNew) return;
    const template = generateCardTemplate(locale);
    const { frontmatter: fm, body: b } = parseCard(template);
    setFrontmatter(fm);
    setBody(b);
    setCurrentSha(undefined);
    setCurrentFilename('');
    setHasBeenSaved(false);
    setIsNew(true);
    setLoadingContent(false);
    setValidationErrors([]);
    setMobilePreview('edit');
  }, [isCreatingNew, locale]);

  // Derived filename
  const derivedFilename = useMemo(() => {
    if (hasBeenSaved) return currentFilename;
    const slug = slugify(frontmatter.title);
    return slug ? `${slug}.md` : 'untitled.md';
  }, [hasBeenSaved, currentFilename, frontmatter.title]);

  // Save handler
  const handleSave = useCallback(async () => {
    const errors: string[] = [];
    const titleErr = validateCardTitle(frontmatter.title);
    if (titleErr) errors.push(t(titleErr));
    if (frontmatter.difficulty === undefined) errors.push(t('card.validation.difficultyRequired'));

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    const content = serializeCard(frontmatter, body);
    const filename = hasBeenSaved ? currentFilename : `${slugify(frontmatter.title)}.md`;
    const path = `${selectedDeck!.path}/${filename}`;

    try {
      if (isNew && !hasBeenSaved) {
        // Create flow: use createCard-like logic but via saveCard (commitFile handles create)
        const result = await saveCard(path, content, currentSha);
        setCurrentSha(result.sha);
        setCurrentFilename(filename);
        setHasBeenSaved(true);
        setIsNew(false);
        setIsCreatingNew(false);
      } else {
        // Update flow
        const result = await saveCard(path, content, currentSha);
        setCurrentSha(result.sha);
      }
    } catch {
      // Toast already shown by CardContext
    }
  }, [frontmatter, body, hasBeenSaved, currentFilename, currentSha, isNew, selectedDeck, saveCard, setIsCreatingNew, t]);

  // Delete handler
  const handleConfirmDelete = useCallback(async () => {
    setShowDeleteDialog(false);
    if (!selectedCard || !currentSha) return;
    try {
      await deleteCard(selectedCard.path, currentSha);
    } catch {
      // Toast already shown by CardContext
    }
  }, [selectedCard, currentSha, deleteCard]);

  // KaTeX preview component
  const previewOptions = useMemo(
    () => ({
      components: {
        code: ({ children, className, ...props }: React.ComponentProps<'code'> & { className?: string }) => {
          if (className === 'language-math' && typeof children === 'string') {
            try {
              const html = renderToString(children, {
                throwOnError: false,
                displayMode: true,
              });
              return <code dangerouslySetInnerHTML={{ __html: html }} style={{ background: 'transparent', fontSize: '1.2em' }} />;
            } catch {
              return <code {...props} className={className}>{children}</code>;
            }
          }
          return <code {...props} className={className}>{children}</code>;
        },
      },
    }),
    [],
  );

  // Determine preview mode for MDEditor
  const previewMode = isDesktop ? 'live' as const : mobilePreview;

  // Show nothing if no card selected and not creating
  if (!selectedCard && !isCreatingNew) {
    return (
      <div className="flex flex-1 items-center justify-center text-lumio-text-secondary">
        <p className="text-sm">{t('card.emptyStateAction')}</p>
      </div>
    );
  }

  // Loading state
  if (loadingContent) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-lumio-text-secondary">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Metadata form */}
      <div className="shrink-0 p-3">
        <MetadataForm
          frontmatter={frontmatter}
          onChange={setFrontmatter}
          disabled={saving}
        />

        {/* Filename display */}
        <p className="mt-2 text-xs text-lumio-text-secondary">
          {hasBeenSaved ? (
            <span>{currentFilename}</span>
          ) : (
            <span className="italic">{derivedFilename}</span>
          )}
        </p>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="mt-2 space-y-1">
            {validationErrors.map((err) => (
              <p key={err} className="text-xs text-red-500">{err}</p>
            ))}
          </div>
        )}
      </div>

      {/* Mobile toggle tabs */}
      {!isDesktop && (
        <div className="flex shrink-0 border-b border-lumio-border px-3">
          <button
            type="button"
            onClick={() => setMobilePreview('edit')}
            className={`px-4 py-2 text-sm font-medium ${
              mobilePreview === 'edit'
                ? 'border-b-2 border-lumio-primary text-lumio-text'
                : 'text-lumio-text-secondary hover:text-lumio-text'
            }`}
          >
            {t('card.editor.editTab')}
          </button>
          <button
            type="button"
            onClick={() => setMobilePreview('preview')}
            className={`px-4 py-2 text-sm font-medium ${
              mobilePreview === 'preview'
                ? 'border-b-2 border-lumio-primary text-lumio-text'
                : 'text-lumio-text-secondary hover:text-lumio-text'
            }`}
          >
            {t('card.editor.previewTab')}
          </button>
        </div>
      )}

      {/* MDEditor */}
      <div className="min-h-0 flex-1 px-3" data-color-mode={isDark ? 'dark' : 'light'}>
        <MDEditor
          value={body}
          onChange={(val) => setBody(val || '')}
          height="100%"
          preview={previewMode}
          commands={toolbarCommands}
          extraCommands={[]}
          visibleDragbar={false}
          previewOptions={previewOptions}
        />
      </div>

      {/* Bottom bar: Save + Delete */}
      <div className="flex shrink-0 items-center justify-between border-t border-lumio-border px-3 py-2.5">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-lumio-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? t('common.loading') : t('card.saveButton')}
        </button>

        {/* Delete only for existing cards */}
        {hasBeenSaved && selectedCard && (
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            disabled={saving}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:pointer-events-none"
          >
            {t('card.deleteButton')}
          </button>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        title={t('card.deleteTitle')}
        message={t('card.deleteMessage').replace('{name}', selectedCard?.title ?? '')}
        confirmLabel={t('card.deleteConfirm')}
        cancelLabel={t('deck.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
        variant="danger"
      />
    </div>
  );
}
