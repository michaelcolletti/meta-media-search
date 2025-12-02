import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { useAppStore } from '@store/index';
import { useEffect } from 'react';

export function Layout() {
  const preferences = useAppStore((state) => state.preferences);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', preferences.theme);
  }, [preferences.theme]);

  return (
    <div className="layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
