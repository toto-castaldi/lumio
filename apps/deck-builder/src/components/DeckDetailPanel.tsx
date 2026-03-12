import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useDeck } from '../contexts/DeckContext';
import { useCard } from '../contexts/CardContext';
import { validateDeckName } from '../lib/validation';
import ConfirmDialog from './ConfirmDialog';
import CardListPanel from './CardListPanel';
import CardEditor from './CardEditor';

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

export default function DeckDetailPanel() {
  const { t, locale } = useI18n();
  const {
    selectedDeck,
    loading,
    cardCounts,
    deckCreatedAt,
    renameDeck,
    deleteDeck,
  } = useDeck();
  const { selectedCard, selectCard } = useCard();
  const isDesktop = useIsDesktop();

  // -- Rename state --
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // -- Delete state --
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // -- Card creation state --
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Reset rename state when selected deck changes
  useEffect(() => {
    setIsRenaming(false);
    setRenameName('');
    setRenameError(null);
    setShowDeleteDialog(false);
    setIsCreatingNew(false);
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

  // -- New card handler --
  const handleNewCard = () => {
    selectCard(null);
    setIsCreatingNew(true);
  };

  // -- Mobile back handler --
  const handleBackToList = () => {
    selectCard(null);
    setIsCreatingNew(false);
  };

  const isDisabled = loading;
  const showCardEditor = selectedCard !== null || isCreatingNew;

  return (
    <div className="flex h-full flex-col">
      {/* Header section */}
      <div className="shrink-0 border-b border-lumio-border bg-lumio-surface px-4 py-3">
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
              className="w-full rounded-md border border-lumio-primary bg-lumio-bg px-3 py-1.5 text-lg font-bold text-lumio-text focus:outline-none focus:ring-2 focus:ring-lumio-primary"
            />
            {renameError && (
              <p className="mt-1 text-xs text-red-500">{renameError}</p>
            )}
          </div>
        ) : (
          <h1 className="text-lg font-bold text-lumio-text">{selectedDeck.name}</h1>
        )}

        {/* Card count + creation date + actions in a compact row */}
        <div className="mt-1 flex items-center gap-4 text-xs text-lumio-text-secondary">
          <span>
            {count > 0
              ? t('deck.detailCards').replace('{count}', String(count))
              : t('deck.detailNoCards')}
          </span>
          <span>
            {formattedDate
              ? t('deck.detailCreatedAt').replace('{date}', formattedDate)
              : t('deck.detailCreatedAtUnknown')}
          </span>
          <span className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={handleStartRename}
              disabled={isDisabled || isRenaming}
              className="flex items-center gap-1 rounded border border-lumio-border px-2 py-0.5 text-xs font-medium text-lumio-text hover:bg-lumio-border/30 disabled:opacity-50 disabled:pointer-events-none"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              {t('deck.rename')}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDisabled}
              className="flex items-center gap-1 rounded border border-red-300 px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:pointer-events-none"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              {t('deck.delete')}
            </button>
          </span>
        </div>
      </div>

      {/* Mail-client layout: card list + editor */}
      <div className="flex min-h-0 flex-1">
        {/* Desktop: always show card list */}
        {/* Mobile: show card list OR editor, not both */}
        {isDesktop ? (
          <>
            <CardListPanel onNewCard={handleNewCard} />
            <CardEditor isCreatingNew={isCreatingNew} setIsCreatingNew={setIsCreatingNew} />
          </>
        ) : (
          <>
            {showCardEditor ? (
              <div className="flex flex-1 flex-col">
                {/* Back button */}
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex shrink-0 items-center gap-1 border-b border-lumio-border px-3 py-2 text-sm text-lumio-text-secondary hover:text-lumio-text"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  {selectedDeck.name}
                </button>
                <CardEditor isCreatingNew={isCreatingNew} setIsCreatingNew={setIsCreatingNew} />
              </div>
            ) : (
              <CardListPanel onNewCard={handleNewCard} />
            )}
          </>
        )}
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
