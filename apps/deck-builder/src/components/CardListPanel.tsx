import { useI18n } from '../contexts/I18nContext';
import { useCard } from '../contexts/CardContext';
import { useDeck } from '../contexts/DeckContext';
import type { CardState } from '../contexts/CardContext';

interface CardListPanelProps {
  onNewCard: () => void;
}

const DIFFICULTY_LABELS: Record<number, { key: string; color: string }> = {
  1: { key: 'card.difficulty.easy', color: 'text-green-600 dark:text-green-400' },
  3: { key: 'card.difficulty.medium', color: 'text-yellow-600 dark:text-yellow-400' },
  5: { key: 'card.difficulty.hard', color: 'text-red-600 dark:text-red-400' },
};

const MAX_VISIBLE_TAGS = 2;

export default function CardListPanel({ onNewCard }: CardListPanelProps) {
  const { t } = useI18n();
  const { cards, selectedCard, selectCard, loading } = useCard();
  const { selectedDeck } = useDeck();

  return (
    <div className="flex h-full w-60 flex-col border-r border-lumio-border bg-lumio-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-lumio-border px-3 py-2.5">
        <span className="truncate text-sm font-semibold text-lumio-text">
          {selectedDeck?.name ?? ''}
        </span>
        <button
          type="button"
          onClick={onNewCard}
          className="flex shrink-0 items-center gap-1 rounded-md bg-lumio-primary px-2 py-1 text-xs font-medium text-white hover:opacity-90"
        >
          {/* Plus icon */}
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('card.newButton')}
        </button>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-lumio-text-secondary">{t('common.loading')}</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <svg
              className="mb-2 h-8 w-8 text-lumio-text-secondary opacity-40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <p className="text-xs font-medium text-lumio-text-secondary">
              {t('card.emptyState')}
            </p>
            <p className="mt-0.5 text-xs text-lumio-text-secondary/70">
              {t('card.emptyStateAction')}
            </p>
          </div>
        )}

        {/* Card rows */}
        {!loading && cards.map((card: CardState) => {
          const isSelected = selectedCard?.path === card.path;
          const diffInfo = card.difficulty ? DIFFICULTY_LABELS[card.difficulty] : null;
          const visibleTags = card.tags.slice(0, MAX_VISIBLE_TAGS);
          const extraTagCount = card.tags.length - MAX_VISIBLE_TAGS;

          return (
            <div
              key={card.path}
              role="button"
              tabIndex={0}
              onClick={() => selectCard(card)}
              onKeyDown={(e) => { if (e.key === 'Enter') selectCard(card); }}
              className={`cursor-pointer border-b border-lumio-border px-3 py-2.5 transition-colors ${
                isSelected
                  ? 'bg-lumio-border/50'
                  : 'hover:bg-lumio-border/30'
              }`}
            >
              {/* Title */}
              <p className="truncate text-sm font-medium text-lumio-text">
                {card.title}
              </p>

              {/* Tags + difficulty row */}
              <div className="mt-1 flex items-center gap-1.5">
                {visibleTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-lumio-border px-1.5 py-0 text-[10px] text-lumio-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
                {extraTagCount > 0 && (
                  <span className="text-[10px] text-lumio-text-secondary">
                    +{extraTagCount}
                  </span>
                )}
                {diffInfo && (
                  <span className={`ml-auto text-[10px] font-medium ${diffInfo.color}`}>
                    {t(diffInfo.key)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
