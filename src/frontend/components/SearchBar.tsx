import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@store/index';
import './SearchBar.css';

const QUICK_SEARCHES = [
  'Action movies on Netflix',
  'Sci-fi shows similar to The Expanse',
  'Feel-good comedies',
  'Mind-bending thrillers',
  'Award-winning documentaries',
];

export function SearchBar() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const setQuery = useAppStore((state) => state.setQuery);

  useEffect(() => {
    if (value.length > 2) {
      // Simulate auto-suggestions
      const filtered = QUICK_SEARCHES.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      setQuery({ text: value });
      navigate('/search');
      setIsFocused(false);
    }
  };

  const handleQuickSearch = (query: string) => {
    setValue(query);
    setQuery({ text: query });
    navigate('/search');
    setIsFocused(false);
  };

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrapper">
          <svg
            className="search-icon"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Search for movies, shows, or describe what you're in the mood for..."
            className="search-input"
            aria-label="Search"
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue('')}
              className="search-clear"
              aria-label="Clear search"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M12 4L4 12M4 4l8 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </form>

      {isFocused && (
        <div className="search-suggestions">
          {suggestions.length > 0 ? (
            <>
              <div className="suggestions-header">Suggestions</div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleQuickSearch(suggestion)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM15 15l-3.35-3.35"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  {suggestion}
                </button>
              ))}
            </>
          ) : (
            <>
              <div className="suggestions-header">Quick searches</div>
              {QUICK_SEARCHES.map((query, index) => (
                <button
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleQuickSearch(query)}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8h10M8 3l5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {query}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
