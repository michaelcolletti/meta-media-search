# Meta-Media-Search Architecture

## System Overview

Meta-Media-Search is a modern, AI-native media discovery platform built on a three-tier architecture:

1. **Frontend Layer**: Interactive React application with visual discovery map
2. **Backend Layer**: Node.js API with AI-powered query processing
3. **Data Layer**: PostgreSQL with vector embeddings, Redis caching, and external APIs

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ Search Bar   │  │Discovery Map │  │Content Details Panel│  │
│  └──────────────┘  └──────────────┘  └─────────────────────┘  │
│            │                │                    │              │
│            └────────────────┴────────────────────┘              │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │ REST API
┌──────────────────────────────┼──────────────────────────────────┐
│                         Backend (Node.js)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               Express API Server                          │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │   Search    │  │  Discovery   │  │Recommendations │  │  │
│  │  │   Route     │  │    Route     │  │     Route      │  │  │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Services Layer                           │  │
│  │  ┌─────────────────┐  ┌──────────────────────────────┐  │  │
│  │  │ AI Query        │  │  Content Aggregator          │  │  │
│  │  │ Processor       │  │  - TMDB Integration          │  │  │
│  │  │ - LangChain     │  │  - Graph Generation          │  │  │
│  │  │ - OpenAI        │  │  - Similarity Calculation    │  │  │
│  │  └─────────────────┘  └──────────────────────────────┘  │  │
│  │  ┌─────────────────┐  ┌──────────────────────────────┐  │  │
│  │  │ Discovery       │  │  Recommendation Engine       │  │  │
│  │  │ Engine          │  │  - Personalization           │  │  │
│  │  └─────────────────┘  └──────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                          Data Layer                              │
│  ┌──────────────┐  ┌────────────┐  ┌───────────────────────┐  │
│  │ PostgreSQL   │  │   Redis    │  │   External APIs       │  │
│  │ - Metadata   │  │ - Caching  │  │   - TMDB              │  │
│  │ - Vector DB  │  │ - Sessions │  │   - OpenAI            │  │
│  │ - Users      │  │            │  │   - Streaming APIs    │  │
│  └──────────────┘  └────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. AI Query Processor

**Purpose**: Transform natural language queries into structured search parameters

**Technology**: LangChain + OpenAI GPT-3.5/4

**Flow**:
```
User Query → LLM Analysis → Extract Entities → Semantic Embedding → Structured Query
```

**Extracted Entities**:
- Intent (find_similar, discover_new, filter_by_criteria)
- Genres
- Mood/Tone
- Reference titles
- Platforms
- Time periods

**Location**: `src/backend/services/aiQueryProcessor.ts`

### 2. Content Aggregator

**Purpose**: Fetch and aggregate content from multiple sources

**Data Sources**:
- TMDB (The Movie Database) - Primary metadata source
- Future: Netflix, Hulu, Disney+, Amazon Prime APIs via third-party services

**Capabilities**:
- Multi-source search
- Content similarity calculation
- Visual map graph generation

**Location**: `src/backend/services/contentAggregator.ts`

### 3. Visual Discovery Map

**Purpose**: Interactive graph visualization of content relationships

**Technology**: Cytoscape.js with fCoSE layout algorithm

**Features**:
- Force-directed graph layout
- Node sizing based on popularity/rating
- Edge weights represent similarity
- Interactive zoom, pan, and selection

**Graph Structure**:
```
Nodes: Individual movies/shows
  - Position: Force-directed layout
  - Size: Proportional to rating
  - Color: By type (movie/tv/documentary)

Edges: Similarity relationships
  - Weight: Similarity score (0-1)
  - Calculated from genre overlap, year proximity, rating
```

**Location**: `src/frontend/src/components/DiscoveryMap.tsx`

### 4. Recommendation Engine

**Purpose**: Personalized content suggestions

**Algorithm** (Current):
- Content-based filtering
- Collaborative filtering (future)
- Hybrid approach (future)

**Inputs**:
- User viewing history
- Preference settings
- Context (mood, time, companions)

**Location**: `src/backend/services/recommendationEngine.ts`

## Data Models

### Media Content

```typescript
interface MediaContent {
  id: string;              // Unique identifier
  title: string;           // Display title
  type: 'movie' | 'tv' | 'documentary';
  genres: string[];        // Genre tags
  platforms: string[];     // Available on these platforms
  rating: number;          // User rating (0-10)
  year: number;           // Release year
  description: string;     // Synopsis
  imageUrl?: string;       // Poster/thumbnail
  similarity?: number;     // Similarity score (for search results)
}
```

### Visual Map Structure

```typescript
interface MapNode {
  id: string;              // Content ID
  label: string;           // Display label
  type: string;            // Content type
  x: number;              // X coordinate
  y: number;              // Y coordinate
  size: number;           // Node size
  metadata: MediaContent;  // Full content data
}

interface MapEdge {
  source: string;          // Source node ID
  target: string;          // Target node ID
  weight: number;         // Similarity (0-1)
  type: string;           // Relationship type
}
```

## Technology Decisions

### Why Node.js + TypeScript?

- **Async I/O**: Perfect for API aggregation and AI calls
- **Type Safety**: TypeScript catches errors at compile time
- **Ecosystem**: Rich libraries for AI (LangChain), APIs, and visualization

### Why LangChain + OpenAI?

- **Natural Language Understanding**: Best-in-class NLU for query processing
- **Semantic Search**: Vector embeddings for similarity matching
- **Flexibility**: Easy to swap models or add custom chains

### Why Cytoscape.js?

- **Performance**: Handles large graphs (1000+ nodes) smoothly
- **Layout Algorithms**: fCoSE provides optimal force-directed layouts
- **Customization**: Full control over styling and interactions

### Why PostgreSQL + Vector Extension?

- **Mature**: Proven reliability and performance
- **Vector Search**: pgvector extension for semantic search
- **Relationships**: Good for content graphs and user data

## Scalability Considerations

### Current Architecture (MVP)

- Single server
- Direct database connections
- In-memory caching with Redis

### Future Scaling

1. **Horizontal Scaling**:
   - Load balancer (NGINX/AWS ALB)
   - Multiple API servers
   - Shared Redis cluster

2. **Caching Strategy**:
   - CDN for frontend assets
   - Redis for API responses
   - Cache invalidation on content updates

3. **Database Optimization**:
   - Read replicas for queries
   - Sharding by content type or platform
   - Vector index optimization

4. **AI Query Optimization**:
   - Batch processing for similar queries
   - Embedding caching
   - Model fine-tuning for domain-specific queries

## Security

### Current Implementation

- CORS configured for allowed origins
- Rate limiting (100 requests per 15 minutes)
- Input validation on all endpoints
- Error messages don't expose internals

### Planned Security Features

- JWT authentication
- API key management
- Request signing
- SQL injection protection (parameterized queries)
- XSS prevention
- HTTPS enforcement

## Monitoring & Observability

### Planned Implementation

- **Logging**: Structured logging with Pino
- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry
- **Error Tracking**: Sentry
- **Performance**: Lighthouse CI for frontend

## Development Methodology

Following rUv's **SPARC** approach:

1. **Specification**: Requirements analysis and user stories
2. **Pseudocode**: Algorithm design without implementation details
3. **Architecture**: System design (this document)
4. **Refinement**: Iterative TDD implementation
5. **Completion**: Integration and deployment

## Future Enhancements

1. **Multi-Modal Search**: Image-based and voice search
2. **Social Features**: Share discoveries, collaborative watchlists
3. **Advanced Personalization**: ML-based recommendation engine
4. **Real-Time Updates**: WebSocket for live content updates
5. **Mobile Apps**: React Native iOS/Android apps
6. **Browser Extension**: Quick search from any page
7. **Offline Mode**: PWA with service workers

## References

- [Kartoo History](https://en.wikipedia.org/wiki/KartOO)
- [LangChain Documentation](https://langchain.com)
- [Cytoscape.js](https://js.cytoscape.org/)
- [TMDB API](https://developers.themoviedb.org/)
