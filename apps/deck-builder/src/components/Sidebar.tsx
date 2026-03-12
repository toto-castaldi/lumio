import { useI18n } from '../contexts/I18nContext';

export default function Sidebar() {
  const { t } = useI18n();

  return (
    <nav className="flex h-full flex-col p-4">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-lumio-text-secondary">
        {t('common.appName')}
      </h2>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {/* Folder/deck icon */}
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
          {t('sidebar.placeholder')}
        </p>
      </div>
    </nav>
  );
}
