import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  MediaContent,
  SearchQuery,
  SearchResult,
  UserPreferences,
  VisualizationConfig,
  TutorialState,
} from '@types/index';

interface AppState {
  // Search state
  query: SearchQuery;
  searchResults: SearchResult | null;
  isSearching: boolean;
  selectedContent: MediaContent | null;

  // User state
  preferences: UserPreferences;
  bookmarks: string[];
  watchHistory: string[];

  // Visualization state
  vizConfig: VisualizationConfig;
  hoveredNode: string | null;

  // Tutorial state
  tutorial: TutorialState;

  // Actions
  setQuery: (query: Partial<SearchQuery>) => void;
  setSearchResults: (results: SearchResult | null) => void;
  setIsSearching: (isSearching: boolean) => void;
  setSelectedContent: (content: MediaContent | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  addBookmark: (contentId: string) => void;
  removeBookmark: (contentId: string) => void;
  addToWatchHistory: (contentId: string) => void;
  updateVizConfig: (config: Partial<VisualizationConfig>) => void;
  setHoveredNode: (nodeId: string | null) => void;
  updateTutorial: (tutorial: Partial<TutorialState>) => void;
  nextTutorialStep: () => void;
  prevTutorialStep: () => void;
  completeTutorial: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      query: {
        text: '',
        filters: {},
        preferences: {
          theme: 'dark',
        },
      },
      searchResults: null,
      isSearching: false,
      selectedContent: null,

      preferences: {
        theme: 'dark',
        favoriteGenres: [],
        preferredPlatforms: [],
        watchedContent: [],
        bookmarkedContent: [],
      },
      bookmarks: [],
      watchHistory: [],

      vizConfig: {
        layout: 'force',
        clustering: true,
        animationSpeed: 1,
        nodeSize: 'popularity',
        colorScheme: 'genre',
        show3D: false,
      },
      hoveredNode: null,

      tutorial: {
        isActive: false,
        currentStep: 0,
        completed: false,
        steps: [],
      },

      // Actions
      setQuery: query =>
        set(state => ({
          query: { ...state.query, ...query },
        })),

      setSearchResults: results => set({ searchResults: results }),

      setIsSearching: isSearching => set({ isSearching }),

      setSelectedContent: content => set({ selectedContent: content }),

      updatePreferences: preferences =>
        set(state => ({
          preferences: { ...state.preferences, ...preferences },
        })),

      addBookmark: contentId =>
        set(state => ({
          bookmarks: [...state.bookmarks, contentId],
        })),

      removeBookmark: contentId =>
        set(state => ({
          bookmarks: state.bookmarks.filter(id => id !== contentId),
        })),

      addToWatchHistory: contentId =>
        set(state => ({
          watchHistory: [contentId, ...state.watchHistory.filter(id => id !== contentId)].slice(
            0,
            100
          ),
        })),

      updateVizConfig: config =>
        set(state => ({
          vizConfig: { ...state.vizConfig, ...config },
        })),

      setHoveredNode: nodeId => set({ hoveredNode: nodeId }),

      updateTutorial: tutorial =>
        set(state => ({
          tutorial: { ...state.tutorial, ...tutorial },
        })),

      nextTutorialStep: () =>
        set(state => ({
          tutorial: {
            ...state.tutorial,
            currentStep: Math.min(state.tutorial.currentStep + 1, state.tutorial.steps.length - 1),
          },
        })),

      prevTutorialStep: () =>
        set(state => ({
          tutorial: {
            ...state.tutorial,
            currentStep: Math.max(state.tutorial.currentStep - 1, 0),
          },
        })),

      completeTutorial: () =>
        set(state => ({
          tutorial: {
            ...state.tutorial,
            isActive: false,
            completed: true,
          },
        })),
    }),
    {
      name: 'meta-media-search-storage',
      partialize: state => ({
        preferences: state.preferences,
        bookmarks: state.bookmarks,
        watchHistory: state.watchHistory,
        vizConfig: state.vizConfig,
        tutorial: { completed: state.tutorial.completed },
      }),
    }
  )
);
