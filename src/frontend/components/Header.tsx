import { Link, useNavigate } from 'react-router-dom';
import { SearchBar } from './SearchBar';
import { ThemeToggle } from './ThemeToggle';
import { IconButton } from './IconButton';
import { useAppStore } from '@store/index';
import './Header.css';

export function Header() {
  const navigate = useNavigate();
  const tutorial = useAppStore((state) => state.tutorial);
  const updateTutorial = useAppStore((state) => state.updateTutorial);

  const handleTutorialClick = () => {
    updateTutorial({ isActive: true, currentStep: 0 });
    navigate('/search');
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
            <circle cx="16" cy="16" r="6" fill="currentColor" />
            <circle cx="24" cy="12" r="3" fill="currentColor" opacity="0.7" />
            <circle cx="8" cy="20" r="3" fill="currentColor" opacity="0.7" />
          </svg>
          <span className="logo-text">Meta-Media Search</span>
        </Link>

        <div className="header-search">
          <SearchBar />
        </div>

        <div className="header-actions">
          {!tutorial.completed && (
            <button
              className="tutorial-button"
              onClick={handleTutorialClick}
              aria-label="Start tutorial"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M10 14V10M10 6H10.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Tutorial
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
