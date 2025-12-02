/**
 * Mock data for development and testing
 */

import type { SearchResult, MediaContent, GraphNode, GraphEdge } from '@types/index';

const SAMPLE_CONTENT: MediaContent[] = [
  {
    id: '1',
    title: 'The Matrix',
    type: 'movie',
    year: 1999,
    rating: 8.7,
    genres: ['Action', 'Sci-Fi'],
    description:
      'A computer hacker learns about the true nature of reality and his role in the war against its controllers.',
    platforms: [
      { name: 'Netflix', url: 'https://netflix.com', type: 'streaming', quality: 'HD' },
      { name: 'HBO Max', url: 'https://hbomax.com', type: 'streaming', quality: '4K' },
    ],
    mood: ['Mind-bending', 'Action-packed'],
    popularity: 95,
  },
  {
    id: '2',
    title: 'Inception',
    type: 'movie',
    year: 2010,
    rating: 8.8,
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    description: 'A thief who steals corporate secrets through dream-sharing technology.',
    platforms: [
      { name: 'Amazon Prime', url: 'https://amazon.com', type: 'streaming', quality: '4K' },
    ],
    mood: ['Mind-bending', 'Suspenseful'],
    popularity: 98,
  },
  {
    id: '3',
    title: 'Blade Runner 2049',
    type: 'movie',
    year: 2017,
    rating: 8.0,
    genres: ['Sci-Fi', 'Thriller'],
    description:
      'A young blade runner discovers a long-buried secret that has the potential to plunge society into chaos.',
    platforms: [{ name: 'Netflix', url: 'https://netflix.com', type: 'streaming', quality: '4K' }],
    mood: ['Atmospheric', 'Thought-provoking'],
    popularity: 85,
  },
  {
    id: '4',
    title: 'Interstellar',
    type: 'movie',
    year: 2014,
    rating: 8.6,
    genres: ['Sci-Fi', 'Drama'],
    description:
      "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    platforms: [
      { name: 'Paramount+', url: 'https://paramount.com', type: 'streaming', quality: '4K' },
    ],
    mood: ['Epic', 'Emotional'],
    popularity: 92,
  },
  {
    id: '5',
    title: 'The Expanse',
    type: 'tv',
    year: 2015,
    rating: 8.5,
    genres: ['Sci-Fi', 'Drama'],
    description: 'In the 24th century, a disparate band of antiheroes unravel a vast conspiracy.',
    platforms: [
      { name: 'Amazon Prime', url: 'https://amazon.com', type: 'streaming', quality: '4K' },
    ],
    mood: ['Complex', 'Political'],
    popularity: 88,
  },
  {
    id: '6',
    title: 'Dune',
    type: 'movie',
    year: 2021,
    rating: 8.1,
    genres: ['Sci-Fi', 'Adventure'],
    description:
      "A noble family becomes embroiled in a war for control over the galaxy's most valuable asset.",
    platforms: [{ name: 'HBO Max', url: 'https://hbomax.com', type: 'streaming', quality: '4K' }],
    mood: ['Epic', 'Visually stunning'],
    popularity: 94,
  },
  {
    id: '7',
    title: 'Arrival',
    type: 'movie',
    year: 2016,
    rating: 7.9,
    genres: ['Sci-Fi', 'Drama'],
    description: 'A linguist works with the military to communicate with alien lifeforms.',
    platforms: [{ name: 'Netflix', url: 'https://netflix.com', type: 'streaming', quality: 'HD' }],
    mood: ['Thought-provoking', 'Emotional'],
    popularity: 82,
  },
  {
    id: '8',
    title: 'Ex Machina',
    type: 'movie',
    year: 2014,
    rating: 7.7,
    genres: ['Sci-Fi', 'Thriller'],
    description:
      'A young programmer is selected to participate in a ground-breaking experiment in synthetic intelligence.',
    platforms: [
      { name: 'Amazon Prime', url: 'https://amazon.com', type: 'streaming', quality: 'HD' },
    ],
    mood: ['Cerebral', 'Suspenseful'],
    popularity: 78,
  },
];

const createGraphNodes = (content: MediaContent[]): GraphNode[] => {
  return content.map((item, index) => {
    const colors: Record<string, string> = {
      movie: '#6366f1',
      tv: '#8b5cf6',
      documentary: '#ec4899',
      anime: '#10b981',
    };

    return {
      id: item.id,
      label: item.title,
      content: item,
      size: 20 + (item.popularity || 50) / 5,
      color: colors[item.type] || '#6366f1',
      cluster: item.genres[0],
    };
  });
};

const createGraphEdges = (nodes: GraphNode[]): GraphEdge[] => {
  const edges: GraphEdge[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      // Calculate similarity based on genres
      const sharedGenres = nodeA.content.genres.filter(g => nodeB.content.genres.includes(g));

      if (sharedGenres.length > 0) {
        edges.push({
          id: `${nodeA.id}-${nodeB.id}`,
          source: nodeA.id,
          target: nodeB.id,
          weight: sharedGenres.length,
          type: 'genre',
        });
      }

      // Add mood connections
      const sharedMoods = nodeA.content.mood?.filter(m => nodeB.content.mood?.includes(m)) || [];

      if (sharedMoods.length > 0) {
        edges.push({
          id: `${nodeA.id}-${nodeB.id}-mood`,
          source: nodeA.id,
          target: nodeB.id,
          weight: sharedMoods.length * 0.5,
          type: 'mood',
        });
      }
    }
  }

  return edges;
};

export const mockSearchResults: SearchResult = {
  nodes: createGraphNodes(SAMPLE_CONTENT),
  edges: createGraphEdges(createGraphNodes(SAMPLE_CONTENT)),
  metadata: {
    totalResults: SAMPLE_CONTENT.length,
    queryTime: 234,
    clusters: [
      { id: 'sci-fi', label: 'Sci-Fi', nodeCount: 7, centroid: { x: 0, y: 0 }, color: '#6366f1' },
      { id: 'action', label: 'Action', nodeCount: 3, centroid: { x: 0, y: 0 }, color: '#ec4899' },
    ],
  },
};
