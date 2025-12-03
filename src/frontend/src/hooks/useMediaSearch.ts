import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface SearchResponse {
  query: {
    original: string;
    processed: any;
  };
  results: {
    total: number;
    items: any[];
  };
  visualMap: {
    nodes: any[];
    edges: any[];
  };
  timestamp: string;
}

export function useMediaSearch(query: string) {
  return useQuery<SearchResponse>({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query) throw new Error('No query provided');

      const response = await axios.post('/api/search', { query });
      return response.data;
    },
    enabled: !!query,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
