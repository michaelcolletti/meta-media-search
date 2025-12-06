import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '../../src/frontend/src/components/SearchBar';

describe('SearchBar Component', () => {
  it('renders search input and button', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} />);

    expect(screen.getByPlaceholderText(/what do you want to watch/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('calls onSearch with input value when form is submitted', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText(/what do you want to watch/i);
    const button = screen.getByRole('button', { name: /search/i });

    fireEvent.change(input, { target: { value: 'sci-fi movies' } });
    fireEvent.click(button);

    expect(mockOnSearch).toHaveBeenCalledWith('sci-fi movies');
  });

  it('disables button when loading', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} isLoading={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('disables button when input is empty', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} />);

    const button = screen.getByRole('button', { name: /search/i });
    expect(button).toBeDisabled();
  });

  it('does not call onSearch when input is only whitespace', () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} />);

    const input = screen.getByPlaceholderText(/what do you want to watch/i);
    const button = screen.getByRole('button', { name: /search/i });

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(button);

    expect(mockOnSearch).not.toHaveBeenCalled();
  });
});
