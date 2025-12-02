/**
 * Core type definitions for Meta-Media-Search
 */

export interface MediaContent {
  id: string;
  title: string;
  type: 'movie' | 'tv' | 'documentary' | 'anime';
  year?: number;
  rating?: number;
  genres: string[];
  description?: string;
  poster?: string;
  backdrop?: string;
  platforms: Platform[];
  mood?: string[];
  tags?: string[];
  relatedContent?: string[];
  popularity?: number;
}

export interface Platform {
  name: string;
  url: string;
  type: 'streaming' | 'rental' | 'purchase';
  quality?: 'SD' | 'HD' | '4K';
}

export interface GraphNode {
  id: string;
  label: string;
  content: MediaContent;
  x?: number;
  y?: number;
  z?: number;
  size: number;
  color: string;
  cluster?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  type: 'similar' | 'genre' | 'actor' | 'director' | 'mood';
}

export interface SearchQuery {
  text: string;
  filters: SearchFilters;
  preferences: UserPreferences;
}

export interface SearchFilters {
  genres?: string[];
  types?: MediaContent['type'][];
  platforms?: string[];
  yearRange?: [number, number];
  ratingRange?: [number, number];
  moods?: string[];
}

export interface UserPreferences {
  favoriteGenres?: string[];
  preferredPlatforms?: string[];
  watchedContent?: string[];
  bookmarkedContent?: string[];
  theme: 'light' | 'dark' | 'auto';
}

export interface VisualizationConfig {
  layout: 'force' | 'hierarchical' | 'circular' | 'grid';
  clustering: boolean;
  animationSpeed: number;
  nodeSize: 'fixed' | 'popularity' | 'rating';
  colorScheme: 'genre' | 'type' | 'platform' | 'mood';
  show3D: boolean;
}

export interface SearchResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    totalResults: number;
    queryTime: number;
    clusters: ClusterInfo[];
  };
}

export interface ClusterInfo {
  id: string;
  label: string;
  nodeCount: number;
  centroid: { x: number; y: number; z?: number };
  color: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  action?: string;
}

export interface TutorialState {
  isActive: boolean;
  currentStep: number;
  completed: boolean;
  steps: OnboardingStep[];
}
