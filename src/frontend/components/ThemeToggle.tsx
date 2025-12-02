import { useAppStore } from '@store/index';
import './ThemeToggle.css';

export function ThemeToggle() {
  const preferences = useAppStore(state => state.preferences);
  const updatePreferences = useAppStore(state => state.updatePreferences);

  const toggleTheme = () => {
    const newTheme = preferences.theme === 'dark' ? 'light' : 'dark';
    updatePreferences({ theme: newTheme });
  };

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${preferences.theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {preferences.theme === 'dark' ? (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 3V1M10 19v-2M17 10h2M1 10h2M15.364 15.364l1.414 1.414M3.222 3.222l1.414 1.414M15.364 4.636l1.414-1.414M3.222 16.778l1.414-1.414"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M17.293 13.293A8 8 0 0 1 6.707 2.707a8.001 8.001 0 1 0 10.586 10.586z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
