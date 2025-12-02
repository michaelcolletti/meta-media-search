import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * @test Search Component
 * @description Unit tests for search input and results rendering
 * @prerequisites React Testing Library setup
 */

// Mock SearchComponent
const SearchComponent = ({ onSearch, results = [], loading = false }) => {
  const [query, setQuery] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} role="search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search media..."
          aria-label="Search media"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {loading && <div role="status">Loading results...</div>}

      {results.length > 0 && (
        <ul role="list" aria-label="Search results">
          {results.map((result) => (
            <li key={result.id}>
              <h3>{result.title}</h3>
              <p>{result.description}</p>
              <span>Relevance: {result.relevance}</span>
            </li>
          ))}
        </ul>
      )}

      {!loading && results.length === 0 && query && (
        <p>No results found</p>
      )}
    </div>
  );
};

describe('SearchComponent', () => {
  let mockOnSearch;
  let user;

  beforeEach(() => {
    mockOnSearch = vi.fn();
    user = userEvent.setup();
  });

  it('should render search input', () => {
    render(<SearchComponent onSearch={mockOnSearch} />);

    const searchInput = screen.getByLabelText(/search media/i);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'text');
  });

  it('should update input value on typing', async () => {
    render(<SearchComponent onSearch={mockOnSearch} />);

    const searchInput = screen.getByLabelText(/search media/i);
    await user.type(searchInput, 'test query');

    expect(searchInput).toHaveValue('test query');
  });

  it('should call onSearch when form is submitted', async () => {
    render(<SearchComponent onSearch={mockOnSearch} />);

    const searchInput = screen.getByLabelText(/search media/i);
    const searchButton = screen.getByRole('button', { name: /search/i });

    await user.type(searchInput, 'test query');
    await user.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith('test query');
    expect(mockOnSearch).toHaveBeenCalledTimes(1);
  });

  it('should display loading state', () => {
    render(<SearchComponent onSearch={mockOnSearch} loading={true} />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading results/i);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveTextContent(/searching/i);
  });

  it('should render search results', () => {
    const mockResults = [
      { id: '1', title: 'Result 1', description: 'Desc 1', relevance: 0.95 },
      { id: '2', title: 'Result 2', description: 'Desc 2', relevance: 0.87 }
    ];

    render(<SearchComponent onSearch={mockOnSearch} results={mockResults} />);

    expect(screen.getByRole('list', { name: /search results/i })).toBeInTheDocument();
    expect(screen.getByText('Result 1')).toBeInTheDocument();
    expect(screen.getByText('Result 2')).toBeInTheDocument();
    expect(screen.getByText(/relevance: 0.95/i)).toBeInTheDocument();
  });

  it('should display "no results" message when search returns empty', () => {
    render(<SearchComponent onSearch={mockOnSearch} results={[]} />);

    const searchInput = screen.getByLabelText(/search media/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });

  it('should handle keyboard navigation', async () => {
    render(<SearchComponent onSearch={mockOnSearch} />);

    const searchInput = screen.getByLabelText(/search media/i);
    await user.type(searchInput, 'test{Enter}');

    expect(mockOnSearch).toHaveBeenCalledWith('test');
  });

  it('should clear results when new search is initiated', async () => {
    const { rerender } = render(
      <SearchComponent
        onSearch={mockOnSearch}
        results={[{ id: '1', title: 'Old Result', description: '', relevance: 0.9 }]}
      />
    );

    expect(screen.getByText('Old Result')).toBeInTheDocument();

    rerender(<SearchComponent onSearch={mockOnSearch} loading={true} results={[]} />);

    expect(screen.queryByText('Old Result')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should handle empty query submission', async () => {
    render(<SearchComponent onSearch={mockOnSearch} />);

    const searchButton = screen.getByRole('button', { name: /search/i });
    await user.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith('');
  });

  it('should maintain accessibility attributes', () => {
    render(<SearchComponent onSearch={mockOnSearch} />);

    const form = screen.getByRole('search');
    const input = screen.getByLabelText(/search media/i);

    expect(form).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-label', 'Search media');
  });
});
