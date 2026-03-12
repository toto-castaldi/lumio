import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

export default function AvatarDropdown() {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const email = user?.email ?? '';
  const initial = email.charAt(0).toUpperCase() || '?';

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-lumio-primary text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-lumio-primary focus:ring-offset-2"
        aria-label={t('header.account')}
        title={t('header.account')}
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-lumio-border bg-lumio-surface shadow-lg z-50">
          <div className="px-4 py-3">
            <p className="truncate text-sm text-lumio-text-secondary">{email}</p>
          </div>
          <div className="border-t border-lumio-border" />
          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-lumio-danger hover:bg-lumio-bg transition-colors rounded-b-lg"
          >
            {t('common.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
