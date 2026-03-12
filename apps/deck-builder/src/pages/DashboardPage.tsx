import { useI18n } from '../contexts/I18nContext';
import { useDeck } from '../contexts/DeckContext';
import DeckDetailPanel from '../components/DeckDetailPanel';

export default function DashboardPage() {
  const { t } = useI18n();
  const { selectedDeck } = useDeck();

  if (selectedDeck) {
    return <DeckDetailPanel />;
  }

  // Empty state -- no deck selected
  return (
    <div className="mx-auto max-w-2xl py-8 text-center">
      <h1 className="text-2xl font-bold text-lumio-text">
        {t('dashboard.welcome')}
      </h1>

      <div className="mt-8 rounded-lg border border-lumio-border bg-lumio-surface p-8">
        <svg
          className="mx-auto mb-4 h-12 w-12 text-lumio-text-secondary opacity-40"
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
        <p className="text-lumio-text-secondary">
          {t('dashboard.placeholder')}
        </p>
      </div>
    </div>
  );
}
