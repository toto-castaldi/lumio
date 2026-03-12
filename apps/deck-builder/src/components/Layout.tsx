import { useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-lumio-bg">
      {/* Header */}
      <Header onMenuClick={() => setSidebarOpen((prev) => !prev)} />

      {/* Below header */}
      <div className="flex pt-14">
        {/* Desktop sidebar - always visible at lg+ */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-lumio-border bg-lumio-surface" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
          <Sidebar />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer panel */}
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-lumio-surface shadow-xl transition-transform duration-200 ease-in-out lg:hidden">
              <div className="pt-14 h-full">
                <Sidebar />
              </div>
            </div>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
