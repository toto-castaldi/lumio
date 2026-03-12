import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import AvatarDropdown from './AvatarDropdown';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { preference, toggleTheme } = useTheme();
  const { locale, t, setLocale } = useI18n();

  // Theme icon + tooltip
  const themeIcon = (() => {
    switch (preference) {
      case 'system':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
          </svg>
        );
      case 'light':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        );
      case 'dark':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        );
    }
  })();

  const themeTooltip = (() => {
    switch (preference) {
      case 'system': return t('header.themeSystem');
      case 'light': return t('header.themeLight');
      case 'dark': return t('header.themeDark');
    }
  })();

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-lumio-border bg-lumio-surface px-4">
      {/* Left: hamburger (mobile) + logo */}
      <div className="flex items-center gap-3">
        {/* Hamburger - visible only below lg */}
        <button
          onClick={onMenuClick}
          className="rounded p-1 text-lumio-text hover:bg-lumio-bg lg:hidden"
          aria-label="Menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Lumio logo */}
        <img src="/logo-header.png" alt={t('common.appName')} className="h-8" />
      </div>

      {/* Right: language toggle + dark mode + avatar */}
      <div className="flex items-center gap-3">
        {/* Language segmented control */}
        <div className="flex overflow-hidden rounded-lg border border-lumio-border text-xs font-medium">
          <button
            onClick={() => setLocale('it')}
            className={`px-2.5 py-1 transition-colors ${
              locale === 'it'
                ? 'bg-lumio-primary text-white'
                : 'bg-lumio-surface text-lumio-text hover:bg-lumio-bg'
            }`}
          >
            IT
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`px-2.5 py-1 transition-colors ${
              locale === 'en'
                ? 'bg-lumio-primary text-white'
                : 'bg-lumio-surface text-lumio-text hover:bg-lumio-bg'
            }`}
          >
            EN
          </button>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="rounded p-1.5 text-lumio-text hover:bg-lumio-bg transition-colors"
          title={themeTooltip}
          aria-label={themeTooltip}
        >
          {themeIcon}
        </button>

        {/* Avatar dropdown */}
        <AvatarDropdown />
      </div>
    </header>
  );
}
