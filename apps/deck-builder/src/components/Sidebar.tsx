import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useDeck } from '../contexts/DeckContext';
import { validateDeckName } from '../lib/validation';
import ConfirmDialog from './ConfirmDialog';

export default function Sidebar() {
  const { t } = useI18n();
  const {
    decks,
    selectedDeck,
    loading,
    initialLoading,
    cardCounts,
    selectDeck,
    createDeck,
    renameDeck,
    deleteDeck,
  } = useDeck();

  // -- Create state --
  const [isCreating, setIsCreating] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  // -- Rename state --
  const [renamingDeck, setRenamingDeck] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // -- Delete state --
  const [deletingDeck, setDeletingDeck] = useState<string | null>(null);

  // Auto-focus create input
  useEffect(() => {
    if (isCreating) {
      createInputRef.current?.focus();
    }
  }, [isCreating]);

  // Auto-focus and select rename input
  useEffect(() => {
    if (renamingDeck !== null) {
      const el = renameInputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    }
  }, [renamingDeck]);

  // -- Create handlers --
  const handleStartCreate = () => {
    setIsCreating(true);
    setCreateName('');
    setCreateError(null);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setCreateName('');
    setCreateError(null);
  };

  const handleSubmitCreate = async () => {
    const trimmed = createName.trim();
    const validationError = validateDeckName(trimmed);
    if (validationError) {
      setCreateError(t(validationError));
      return;
    }
    try {
      await createDeck(trimmed);
      setIsCreating(false);
      setCreateName('');
      setCreateError(null);
    } catch {
      // Toast already shown by DeckContext
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitCreate();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelCreate();
    }
  };

  // -- Rename handlers --
  const handleStartRename = (deckName: string) => {
    setRenamingDeck(deckName);
    setRenameName(deckName);
    setRenameError(null);
  };

  const handleCancelRename = () => {
    setRenamingDeck(null);
    setRenameName('');
    setRenameError(null);
  };

  const handleSubmitRename = async () => {
    if (!renamingDeck) return;
    const trimmed = renameName.trim();
    if (trimmed === renamingDeck) {
      handleCancelRename();
      return;
    }
    const validationError = validateDeckName(trimmed);
    if (validationError) {
      setRenameError(t(validationError));
      return;
    }
    try {
      await renameDeck(renamingDeck, trimmed);
      setRenamingDeck(null);
      setRenameName('');
      setRenameError(null);
    } catch {
      // Toast already shown by DeckContext
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
    if (!deletingDeck) return;
    const name = deletingDeck;
    setDeletingDeck(null);
    try {
      await deleteDeck(name);
    } catch {
      // Toast already shown by DeckContext
    }
  };

  const isDisabled = loading;

  return (
    <nav className="flex h-full flex-col p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-lumio-text-secondary">
          {t('common.appName')}
        </h2>
        <button
          type="button"
          onClick={handleStartCreate}
          disabled={isDisabled || isCreating}
          className="flex items-center gap-1 rounded-md bg-lumio-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
        >
          {/* Plus icon */}
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('deck.createButton')}
        </button>
      </div>

      {/* Deck list */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Inline create input */}
        {isCreating && (
          <div className="mb-2">
            <input
              ref={createInputRef}
              type="text"
              value={createName}
              onChange={(e) => { setCreateName(e.target.value); setCreateError(null); }}
              onKeyDown={handleCreateKeyDown}
              onBlur={handleCancelCreate}
              placeholder={t('deck.namePlaceholder')}
              disabled={isDisabled}
              className="w-full rounded-md border border-lumio-border bg-lumio-bg px-2.5 py-1.5 text-sm text-lumio-text placeholder:text-lumio-text-secondary/50 focus:border-lumio-accent focus:outline-none focus:ring-1 focus:ring-lumio-accent"
            />
            {createError && (
              <p className="mt-1 text-xs text-red-500">{createError}</p>
            )}
          </div>
        )}

        {/* Loading state */}
        {initialLoading && (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-sm text-lumio-text-secondary">{t('common.loading')}</div>
          </div>
        )}

        {/* Empty state */}
        {!initialLoading && decks.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
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
            <p className="text-sm font-medium text-lumio-text-secondary">
              {t('deck.emptyState')}
            </p>
            <p className="mt-1 text-xs text-lumio-text-secondary/70">
              {t('deck.emptyStateAction')}
            </p>
          </div>
        )}

        {/* Deck rows */}
        {!initialLoading && decks.map((deck) => {
          const isSelected = selectedDeck?.name === deck.name;
          const isRenaming = renamingDeck === deck.name;
          const count = cardCounts[deck.name] ?? 0;

          return (
            <div key={deck.path}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!isRenaming && !isDisabled) selectDeck(deck);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isRenaming && !isDisabled) selectDeck(deck);
                }}
                className={`group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-lumio-border/50 text-lumio-text'
                    : 'text-lumio-text hover:bg-lumio-border/30'
                } ${isDisabled && !isRenaming ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {isRenaming ? (
                  <div className="flex-1 min-w-0">
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameName}
                      onChange={(e) => { setRenameName(e.target.value); setRenameError(null); }}
                      onKeyDown={handleRenameKeyDown}
                      onBlur={handleCancelRename}
                      disabled={isDisabled}
                      className="w-full rounded border border-lumio-accent bg-lumio-bg px-1.5 py-0.5 text-sm text-lumio-text focus:outline-none focus:ring-1 focus:ring-lumio-accent"
                    />
                  </div>
                ) : (
                  <>
                    <span className="flex-1 truncate">{deck.name}</span>
                    {/* Card count badge -- hidden on group hover to make room for action icons */}
                    <span className="shrink-0 rounded-full bg-lumio-border px-1.5 text-xs text-lumio-text-secondary group-hover:hidden">
                      {count}
                    </span>
                    {/* Action icons -- shown on hover */}
                    <span className="hidden shrink-0 items-center gap-1 group-hover:flex">
                      {/* Pencil / rename */}
                      <button
                        type="button"
                        title={t('deck.rename')}
                        onClick={(e) => { e.stopPropagation(); handleStartRename(deck.name); }}
                        onMouseDown={(e) => e.preventDefault()}
                        className="rounded p-0.5 text-lumio-text-secondary hover:text-lumio-text"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      {/* Trash / delete */}
                      <button
                        type="button"
                        title={t('deck.delete')}
                        onClick={(e) => { e.stopPropagation(); setDeletingDeck(deck.name); }}
                        onMouseDown={(e) => e.preventDefault()}
                        className="rounded p-0.5 text-lumio-text-secondary hover:text-red-500"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </span>
                  </>
                )}
              </div>

              {/* Rename error */}
              {isRenaming && renameError && (
                <p className="ml-2.5 mt-0.5 text-xs text-red-500">{renameError}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deletingDeck !== null}
        title={t('deck.deleteTitle')}
        message={t('deck.deleteMessage').replace('{name}', deletingDeck ?? '')}
        confirmLabel={t('deck.deleteConfirm')}
        cancelLabel={t('deck.cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingDeck(null)}
        variant="danger"
      />
    </nav>
  );
}
