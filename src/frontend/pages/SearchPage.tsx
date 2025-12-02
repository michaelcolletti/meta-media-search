import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GraphVisualization } from '@viz/GraphVisualization';
import { VisualizationControls } from '@viz/VisualizationControls';
import { ContentCard } from '@components/ContentCard';
import { ContentDetailPanel } from '@components/ContentDetailPanel';
import { useAppStore } from '@store/index';
import type { MediaContent, GraphNode } from '@types/index';
import { mockSearchResults } from '@utils/mockData';
import './SearchPage.css';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');

  const query = useAppStore((state) => state.query);
  const searchResults = useAppStore((state) => state.searchResults);
  const vizConfig = useAppStore((state) => state.vizConfig);
  const selectedContent = useAppStore((state) => state.selectedContent);
  const setSelectedContent = useAppStore((state) => state.setSelectedContent);
  const setSearchResults = useAppStore((state) => state.setSearchResults);
  const setQuery = useAppStore((state) => state.setQuery);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery({ text: q });
    }
  }, [searchParams, setQuery]);

  useEffect(() => {
    if (query.text) {
      // Simulate API call
      setTimeout(() => {
        setSearchResults(mockSearchResults);
      }, 500);
    }
  }, [query, setSearchResults]);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedContent(node.content);
  };

  const handleNodeHover = (node: GraphNode | null) => {
    // Could show tooltip or highlight related nodes
  };

  const handleContentClick = (content: MediaContent) => {
    setSelectedContent(content);
  };

  if (!searchResults) {
    return (
      <div className="search-page search-page--loading">
        <div className="search-loading">
          <div className="search-loading-spinner" />
          <p>Discovering content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="search-page">
      <div className="search-header">
        <div className="search-info">
          <h1 className="search-title">
            {searchResults.metadata.totalResults} results
          </h1>
          <p className="search-subtitle">
            Found in {searchResults.metadata.queryTime}ms
          </p>
        </div>

        <div className="search-view-toggle">
          <button
            className={`search-view-button ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
            aria-label="Map view"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="2" />
              <circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth="2" />
              <circle cx="5" cy="15" r="2" stroke="currentColor" strokeWidth="2" />
              <circle cx="15" cy="15" r="2" stroke="currentColor" strokeWidth="2" />
            </svg>
            Map
          </button>
          <button
            className={`search-view-button ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="6" height="6" stroke="currentColor" strokeWidth="2" />
              <rect x="11" y="3" width="6" height="6" stroke="currentColor" strokeWidth="2" />
              <rect x="3" y="11" width="6" height="6" stroke="currentColor" strokeWidth="2" />
              <rect x="11" y="11" width="6" height="6" stroke="currentColor" strokeWidth="2" />
            </svg>
            Grid
          </button>
        </div>
      </div>

      <div className="search-controls">
        <VisualizationControls />
      </div>

      <div className="search-content">
        {viewMode === 'map' ? (
          <div className="search-map">
            <GraphVisualization
              nodes={searchResults.nodes}
              edges={searchResults.edges}
              config={vizConfig}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
            />
          </div>
        ) : (
          <div className="search-grid">
            {searchResults.nodes.map((node) => (
              <ContentCard
                key={node.id}
                content={node.content}
                onClick={() => handleContentClick(node.content)}
              />
            ))}
          </div>
        )}
      </div>

      <ContentDetailPanel
        content={selectedContent}
        onClose={() => setSelectedContent(null)}
      />
    </div>
  );
}
