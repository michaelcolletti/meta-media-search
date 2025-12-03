import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchBar from './components/SearchBar';
import DiscoveryMap from './components/DiscoveryMap';
import { useMediaSearch } from './hooks/useMediaSearch';
import './App.css';

const queryClient = new QueryClient();

function AppContent() {
  const [query, setQuery] = useState('');
  const { data, isLoading, error } = useMediaSearch(query);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Meta-Media-Search</h1>
        <p className="tagline">AI-Native Visual Discovery for Media</p>
      </header>

      <main className="app-main">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        {error && (
          <div className="error-message">
            Error: {error instanceof Error ? error.message : 'Search failed'}
          </div>
        )}

        {data && (
          <div className="results-container">
            <div className="results-stats">
              <p>Found {data.results.total} results</p>
            </div>

            <DiscoveryMap
              nodes={data.visualMap.nodes}
              edges={data.visualMap.edges}
            />
          </div>
        )}

        {!query && !isLoading && (
          <div className="welcome-message">
            <h2>Discover Your Next Favorite</h2>
            <p>Try searching for: "funny sci-fi movies like The Martian"</p>
            <p>Or: "relaxing shows for a quiet evening"</p>
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
