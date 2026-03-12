import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useDeck } from '../contexts/DeckContext';
import { validateDeckName } from '../lib/validation';
import ConfirmDialog from './ConfirmDialog';

export default function DeckDetailPanel() {
  const { t, locale } = useI18n();
  const {
    selectedDeck,
    loading,
    cardCounts,
    deckCreatedAt,
    renameDeck,
    deleteDeck,
    selectDeck,
  } = useDeck();

  // -- Rename state --
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // -- Delete state --
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Reset rename state when selected deck changes
  useEffect(() => {
    setIsRenaming(false);
    setRenameName('');
    setRenameError(null);
    setShowDeleteDialog(false);
  }, [selectedDeck?.name]);

  // Auto-focus and select rename input
  useEffect(() => {
    if (isRenaming) {
      const el = renameInputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }, [isRenaming]);

  if (!selectedDeck) return null;

  const count = cardCounts[selectedDeck.name] ?? 0;
  const createdIso = deckCreatedAt[selectedDeck.name];
  const formattedDate = createdIso
    ? new Date(createdIso).toLocaleDateString(
        locale === 'it' ? 'it-IT' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' },
      )
    : null;

  // -- Rename handlers --
  const handleStartRename = () => {
    setIsRenaming(true);
    setRenameName(selectedDeck.name);
    setRenameError(null);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setRenameName('');
    setRenameError(null);
  };

  const handleSubmitRename = async () => {
    const trimmed = renameName.trim();
    if (trimmed === selectedDeck.name) {
      handleCancelRename();
      return;
    }
    const validationError = validateDeckName(trimmed);
    if (validationError) {
      setRenameError(t(validationError));
      return;
    }
    try {
      await renameDeck(selectedDeck.name, trimmed);
      setIsRenaming(false);
      setRenameName('');
      setRenameError(null);
    } catch {
      // Toast already shown
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelRename();
    }
  };

  // -- Delete handlers --
  const handleConfirmDelete = async () => {
    const name = selectedDeck.name;
    setShowDeleteDialog(false);
    try {
      await deleteDeck(name);
    } catch {
      // Toast already shown
    }
  };

  const isDisabled = loading;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header section */}
      <div className="rounded-lg border border-lumio-border bg-lumio-surface p-6">
        {/* Deck name */}
        {isRenaming ? (
          <div>
            <input
              ref={renameInputRef}
              type="text"
              value={renameName}
              onChange={(e) => { setRenameName(e.target.value); setRenameError(null); }}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleCancelRename}
              disabled={isDisabled}
              className="w-full rounded-md border border-lumio-accent bg-lumio-bg px-3 py-2 text-2xl font-bold text-lumio-text focus:outline-none focus:ring-2 focus:ring-lumio-accent"
            />
            {renameError && (
              <p className="mt-1 text-xs text-red-500">{renameError}</p>
            )}
          </div>
        ) : (
          <h1 className="text-2xl font-bold text-lumio-text">{selectedDeck.name}</h1>
        )}

        {/* Card count */}
        <p className="mt-2 text-sm text-lumio-text-secondary">
          {count > 0
            ? t('deck.detailCards').replace('{count}', String(count))
            : t('deck.detailNoCards')}
        </p>

        {/* Creation info */}
        <p className="mt-1 text-sm text-lumio-text-secondary">
          {formattedDate
            ? t('deck.detailCreatedAt').replace('{date}', formattedDate)
            : t('deck.detailCreatedAtUnknown')}
        </p>

        {/* Action buttons */}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleStartRename}
            disabled={isDisabled || isRenaming}
            className="flex items-center gap-1.5 rounded-lg border border-lumio-border px-3 py-1.5 text-sm font-medium text-lumio-text hover:bg-lumio-border/30 disabled:opacity-50 disabled:pointer-events-none"
          >
            {/* Pencil icon */}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            {t('deck.rename')}
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDisabled}
            className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:pointer-events-none"
          >
            {/* Trash icon */}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            {t('deck.delete')}
          </button>
        </div>
      </div>

      {/* Card list placeholder */}
      <div className="mt-6 rounded-lg border border-lumio-border bg-lumio-surface p-8">
        <div className="flex flex-col items-center justify-center text-center">
          {/* Folder icon */}
          <svg
            className="mb-3 h-10 w-10 text-lumio-text-secondary opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.06-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
            />
          </svg>
          <p className="text-sm text-lumio-text-secondary">
            {t('deck.detailCardPlaceholder')}
          </p>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        title={t('deck.deleteTitle')}
        message={t('deck.deleteMessage').replace('{name}', selectedDeck.name)}
        confirmLabel={t('deck.deleteConfirm')}
        cancelLabel={t('deck.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
        variant="danger"
      />
    </div>
  );
}
