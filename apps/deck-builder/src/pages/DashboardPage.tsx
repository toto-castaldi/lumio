import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();

  const displayName = user?.email ?? '';

  return (
    <div className="mx-auto max-w-2xl py-8 text-center">
      <h1 className="text-2xl font-bold text-lumio-text">
        {t('dashboard.welcome')}
      </h1>

      {displayName && (
        <p className="mt-2 text-lumio-text-secondary">
          {displayName}
        </p>
      )}

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
            d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25-9.75 5.25-9.75-5.25 4.179-2.25"
          />
        </svg>
        <p className="text-lumio-text-secondary">
          {t('dashboard.placeholder')}
        </p>
      </div>
    </div>
  );
}
