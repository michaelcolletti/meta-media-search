# Component Architecture: Detailed Design

## Component Interaction Flow

```
User Input (Natural Language Query)
           ↓
┌──────────────────────────────────────┐
│     Frontend Application             │
│  ┌────────────────────────────────┐  │
│  │  Query Input Component         │  │
│  │  • Voice/Text input            │  │
│  │  • Auto-suggestions            │  │
│  │  • Query history               │  │
│  └────────────────┬───────────────┘  │
│                   ↓                   │
│  ┌────────────────────────────────┐  │
│  │  Visualization Canvas          │  │
│  │  • Three.js Scene              │  │
│  │  • Node/Edge Renderer          │  │
│  │  • Interaction Layer           │  │
│  └────────────────┬───────────────┘  │
│                   ↓                   │
│  ┌────────────────────────────────┐  │
│  │  State Management (Zustand)    │  │
│  │  • Query state                 │  │
│  │  • Map data                    │  │
│  │  • User preferences            │  │
│  └────────────────────────────────┘  │
└───────────────────┬──────────────────┘
                    ↓ GraphQL/WebSocket
┌──────────────────────────────────────┐
│      API Gateway Layer               │
│  ┌────────────────────────────────┐  │
│  │  Apollo Gateway                │  │
│  │  • Request routing             │  │
│  │  • Schema stitching            │  │
│  │  • Rate limiting               │  │
│  └────────────────┬───────────────┘  │
│                   ↓                   │
│  ┌────────────────────────────────┐  │
│  │  WebSocket Manager             │  │
│  │  • Real-time updates           │  │
│  │  • Progressive map building    │  │
│  └────────────────────────────────┘  │
└───────────────────┬──────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│           Backend Microservices                          │
│  ┌─────────────┬───────────────┬──────────────────────┐ │
│  │   Query     │ Recommendation│  Content Aggregation │ │
│  │  Service    │    Service    │      Service         │ │
│  └─────────────┴───────────────┴──────────────────────┘ │
└───────────────────┬──────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│              AI/ML Layer                                 │
│  ┌──────────────┬─────────────┬────────────────────────┐│
│  │  NLP Engine  │  Vector DB  │  Recommendation Model  ││
│  └──────────────┴─────────────┴────────────────────────┘│
└──────────────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────────────┐
│              Data Layer                                  │
│  ┌──────────────┬─────────────┬────────────────────────┐│
│  │  PostgreSQL  │   Pinecone  │        Redis           ││
│  │  (metadata)  │  (vectors)  │       (cache)          ││
│  └──────────────┴─────────────┴────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

## 1. Frontend Components

### 1.1 Query Input Component

**Responsibilities:**

- Capture user input (text, voice)
- Provide auto-suggestions as user types
- Display query history and favorites
- Detect query intent (search vs. explore)

**Technology:**

- React with TypeScript
- React Hook Form for input management
- Web Speech API for voice input
- Debounced search with lodash

**Key Interfaces:**

```typescript
interface QueryInputProps {
  onQuerySubmit: (query: string, intent: QueryIntent) => void;
  onQueryChange: (partial: string) => void;
  suggestions: string[];
  history: Query[];
}

enum QueryIntent {
  SEARCH = 'search', // "find action movies"
  EXPLORE = 'explore', // "show me something interesting"
  RECOMMENDATION = 'recommend', // "based on Breaking Bad"
  FILTER = 'filter', // "only on Netflix"
}
```

**State Management:**

- Local state for input value
- Global state (Zustand) for query history
- Debounced API calls for suggestions

### 1.2 Visualization Canvas

**Responsibilities:**

- Render interactive graph/map of content
- Handle user interactions (zoom, pan, select)
- Animate transitions between queries
- Display content details on hover/click

**Technology:**

- React Three Fiber (Three.js wrapper)
- @react-three/drei for utilities
- @react-three/fiber for WebGL rendering
- react-spring for animations

**Key Components:**

```typescript
// Main Canvas Component
interface VisualizationCanvasProps {
  nodes: ContentNode[];
  edges: ContentEdge[];
  layout: LayoutAlgorithm;
  onNodeClick: (node: ContentNode) => void;
  onNodeHover: (node: ContentNode | null) => void;
}

// Node Representation
interface ContentNode {
  id: string;
  position: { x: number; y: number; z: number };
  content: MediaContent;
  size: number; // Based on relevance
  color: string; // Based on genre/platform
  connections: string[]; // Connected node IDs
}

// Edge Representation
interface ContentEdge {
  source: string;
  target: string;
  strength: number; // 0-1 relationship weight
  type: EdgeType; // similar_genre, same_actor, etc.
}

enum EdgeType {
  GENRE_SIMILARITY = 'genre',
  ACTOR_SHARED = 'actor',
  DIRECTOR_SHARED = 'director',
  THEMATIC = 'theme',
  SEQUEL = 'sequel',
  RECOMMENDATION = 'recommended',
}
```

**Rendering Strategy:**

- Use instanced meshes for nodes (1000+ objects)
- LOD (Level of Detail) for distant nodes
- Frustum culling for off-screen objects
- Octree spatial indexing for click detection

**Performance Optimizations:**

```typescript
// Instanced mesh for efficient rendering
const NodeInstances = ({ nodes }: { nodes: ContentNode[] }) => {
  const meshRef = useRef<InstancedMesh>();

  useEffect(() => {
    nodes.forEach((node, i) => {
      const matrix = new Matrix4();
      matrix.setPosition(node.position.x, node.position.y, node.position.z);
      matrix.scale(new Vector3(node.size, node.size, node.size));
      meshRef.current?.setMatrixAt(i, matrix);
    });
    meshRef.current?.instanceMatrix.needsUpdate = true;
  }, [nodes]);

  return (
    <instancedMesh ref={meshRef} args={[null, null, nodes.length]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
};
```

### 1.3 State Management

**Technology:** Zustand (lightweight Redux alternative)

**Store Structure:**

```typescript
interface AppState {
  // Query State
  currentQuery: string;
  queryHistory: Query[];
  activeFilters: FilterSet;

  // Map State
  nodes: ContentNode[];
  edges: ContentEdge[];
  selectedNode: ContentNode | null;
  hoveredNode: ContentNode | null;

  // User State
  user: User | null;
  viewingHistory: MediaContent[];
  preferences: UserPreferences;

  // UI State
  isLoading: boolean;
  viewMode: 'explore' | 'focus' | 'detail';
  layoutAlgorithm: LayoutAlgorithm;

  // Actions
  setQuery: (query: string) => void;
  fetchMapData: (query: string) => Promise<void>;
  selectNode: (node: ContentNode) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}

// Create store
const useAppStore = create<AppState>((set, get) => ({
  currentQuery: '',
  queryHistory: [],
  nodes: [],
  edges: [],
  selectedNode: null,

  fetchMapData: async (query: string) => {
    set({ isLoading: true });
    const data = await api.getMapData(query);
    set({
      nodes: data.nodes,
      edges: data.edges,
      isLoading: false,
    });
  },

  // ... other actions
}));
```

### 1.4 Layout Algorithms

**Purpose:** Transform flat data into spatially meaningful positions

**Algorithms:**

1. **Force-Directed Layout** (Default)
   - Nodes repel each other (charge force)
   - Edges pull connected nodes together (spring force)
   - Center gravity prevents dispersion
   - Use: General exploration, organic clustering

2. **Hierarchical Layout**
   - Top-down tree structure
   - Root = user query, branches = related content
   - Use: Category browsing, taxonomy exploration

3. **Radial Layout**
   - Central node = selected content
   - Concentric circles = relationship distance
   - Use: "More like this" recommendations

4. **Cluster Layout**
   - K-means clustering by genre/theme
   - Separate islands for distinct clusters
   - Use: Genre-specific browsing

**Implementation (Force-Directed):**

```typescript
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force';

function computeForceDirectedLayout(nodes: ContentNode[], edges: ContentEdge[]): ContentNode[] {
  const simulation = forceSimulation(nodes)
    .force(
      'link',
      forceLink(edges)
        .id((d: any) => d.id)
        .distance(d => 100 / (d.strength || 0.5)) // Closer for strong relationships
    )
    .force('charge', forceManyBody().strength(-200)) // Repulsion
    .force('center', forceCenter(0, 0)) // Keep centered
    .stop();

  // Run simulation steps
  for (let i = 0; i < 300; ++i) simulation.tick();

  return nodes.map(node => ({
    ...node,
    position: { x: node.x, y: node.y, z: 0 },
  }));
}
```

## 2. Backend Microservices

### 2.1 Query Service

**Responsibilities:**

- Parse natural language queries
- Extract entities (actors, genres, themes)
- Classify query intent
- Generate semantic embeddings
- Return structured query representation

**Technology:**

- Node.js + Express
- LangChain for LLM orchestration
- OpenAI GPT-4 for NLP
- sentence-transformers for embeddings

**API Endpoints:**

```typescript
// POST /api/query/parse
interface ParseQueryRequest {
  query: string;
  userId?: string;
  context?: {
    previousQuery?: string;
    location?: string;
  };
}

interface ParseQueryResponse {
  intent: QueryIntent;
  entities: Entity[];
  embedding: number[]; // 1536-dim vector
  expandedTerms: string[];
  filters: FilterSet;
}

interface Entity {
  type: 'actor' | 'director' | 'genre' | 'theme' | 'platform';
  value: string;
  confidence: number;
}

// Example Implementation
async function parseQuery(req: ParseQueryRequest): Promise<ParseQueryResponse> {
  // 1. Use GPT-4 to understand intent and extract entities
  const llmResult = await llm.call(`
    Extract intent and entities from this media query:
    "${req.query}"

    Respond in JSON format.
  `);

  // 2. Generate embedding for semantic search
  const embedding = await embeddings.embedQuery(req.query);

  // 3. Expand query with related terms
  const expandedTerms = await expandQueryTerms(req.query);

  return {
    intent: llmResult.intent,
    entities: llmResult.entities,
    embedding,
    expandedTerms,
    filters: extractFilters(req.query),
  };
}
```

**Caching Strategy:**

- Cache parsed queries in Redis (TTL: 1 hour)
- Cache embeddings in Redis (TTL: 24 hours)
- Invalidate on content updates

### 2.2 Recommendation Service

**Responsibilities:**

- Generate personalized content suggestions
- Compute content similarity scores
- Rank results by relevance
- Provide explanation for recommendations

**Technology:**

- Python FastAPI (for ML libraries)
- PyTorch for neural models
- Scikit-learn for traditional ML
- Ray Serve for model serving

**API Endpoints:**

```typescript
// POST /api/recommendations/generate
interface RecommendationRequest {
  userId: string;
  queryEmbedding?: number[];
  contextContent?: string[]; // Content IDs for "more like this"
  filters?: FilterSet;
  limit?: number;
}

interface RecommendationResponse {
  recommendations: ScoredContent[];
  explanations: Map<string, string>; // contentId -> explanation
  diversity: number; // 0-1 score
}

interface ScoredContent {
  content: MediaContent;
  score: number;
  reasons: string[]; // "Similar genre", "Popular", etc.
}
```

**Recommendation Algorithm:**

```python
# Hybrid Recommendation Model
class HybridRecommender:
    def __init__(self):
        self.content_model = ContentBasedModel()
        self.collaborative_model = CollaborativeModel()
        self.popularity_model = PopularityModel()

    def recommend(
        self,
        user_id: str,
        query_embedding: np.ndarray,
        filters: FilterSet,
        limit: int = 50
    ) -> List[ScoredContent]:
        # 1. Content-based: Semantic similarity
        content_scores = self.content_model.score(
            query_embedding,
            filters
        )

        # 2. Collaborative: User similarity patterns
        collab_scores = self.collaborative_model.score(
            user_id,
            filters
        )

        # 3. Popularity: Trending content
        popularity_scores = self.popularity_model.score(filters)

        # 4. Hybrid fusion with learned weights
        final_scores = (
            0.5 * content_scores +
            0.3 * collab_scores +
            0.2 * popularity_scores
        )

        # 5. Apply diversity penalty (MMR)
        diverse_results = self.maximize_marginal_relevance(
            final_scores,
            lambda_param=0.7  # Balance relevance/diversity
        )

        return diverse_results[:limit]
```

**Explanation Generation:**

```python
def generate_explanation(
    content: MediaContent,
    user_history: List[MediaContent],
    score_breakdown: Dict[str, float]
) -> str:
    reasons = []

    # Find strongest signal
    if score_breakdown['content_based'] > 0.7:
        similar_items = find_similar_watched(content, user_history)
        if similar_items:
            reasons.append(f"Because you watched {similar_items[0].title}")

    if score_breakdown['collaborative'] > 0.5:
        reasons.append("Popular with viewers like you")

    if content.rating > 8.0:
        reasons.append(f"Highly rated ({content.rating}/10)")

    if content.genre in user.favorite_genres:
        reasons.append(f"Matches your interest in {content.genre}")

    return " • ".join(reasons)
```

### 2.3 Content Aggregation Service

**Responsibilities:**

- Fetch metadata from multiple platforms
- Normalize data into unified schema
- Track content availability across platforms
- Monitor additions/removals
- Enrich with external metadata (TMDB, IMDb)

**Technology:**

- Node.js + Express
- Bull Queue for job processing
- Axios for HTTP requests
- PostgreSQL for storage

**Data Pipeline:**

```typescript
// Platform Connectors
interface PlatformConnector {
  fetchCatalog(): Promise<RawContent[]>;
  fetchMetadata(contentId: string): Promise<DetailedMetadata>;
  checkAvailability(contentId: string): Promise<boolean>;
}

class NetflixConnector implements PlatformConnector {
  async fetchCatalog(): Promise<RawContent[]> {
    // Use unofficial Netflix API or JustWatch
    const response = await axios.get('https://api.justwatch.com/titles/en_US/popular', {
      params: { providers: 'nfx' },
    });
    return response.data.items;
  }
}

// Metadata Enrichment
async function enrichMetadata(rawContent: RawContent): Promise<MediaContent> {
  // 1. Fetch additional data from TMDB
  const tmdbData = await tmdb.getMovieDetails(rawContent.tmdbId);

  // 2. Fetch ratings from IMDb
  const imdbRating = await imdb.getRating(rawContent.imdbId);

  // 3. Generate embeddings for semantic search
  const embedding = await generateContentEmbedding(
    `${tmdbData.title} ${tmdbData.overview} ${tmdbData.genres.join(' ')}`
  );

  // 4. Normalize into unified schema
  return {
    id: rawContent.id,
    title: tmdbData.title,
    year: tmdbData.release_date.split('-')[0],
    genres: tmdbData.genres.map(g => g.name),
    cast: tmdbData.credits.cast.slice(0, 5).map(c => c.name),
    director: tmdbData.credits.crew.find(c => c.job === 'Director')?.name,
    rating: imdbRating,
    platforms: [{ name: 'Netflix', available: true, url: rawContent.url }],
    embedding,
    synopsis: tmdbData.overview,
    posterUrl: `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`,
    backdropUrl: `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}`,
  };
}

// Scheduled Jobs (Bull Queue)
async function scheduleContentUpdates() {
  // Daily full catalog refresh
  catalogQueue.add(
    'full-refresh',
    {},
    {
      repeat: { cron: '0 2 * * *' }, // 2 AM daily
    }
  );

  // Hourly incremental updates
  catalogQueue.add(
    'incremental-update',
    {},
    {
      repeat: { cron: '0 * * * *' }, // Every hour
    }
  );

  // Real-time trending updates
  catalogQueue.add(
    'trending-update',
    {},
    {
      repeat: { cron: '*/15 * * * *' }, // Every 15 minutes
    }
  );
}
```

**Availability Tracking:**

```typescript
interface AvailabilityChange {
  contentId: string;
  platform: string;
  changeType: 'added' | 'removed';
  timestamp: Date;
}

// Monitor and notify users
async function detectAvailabilityChanges() {
  const previousSnapshot = await db.getLatestSnapshot();
  const currentCatalog = await fetchAllPlatformsCatalog();

  const changes: AvailabilityChange[] = [];

  // Detect additions
  for (const content of currentCatalog) {
    if (!previousSnapshot.has(content.id)) {
      changes.push({
        contentId: content.id,
        platform: content.platform,
        changeType: 'added',
        timestamp: new Date(),
      });

      // Notify users with this in watchlist
      await notifyWatchlistUsers(content.id, 'now_available');
    }
  }

  // Detect removals
  for (const [id, oldContent] of previousSnapshot) {
    if (!currentCatalog.find(c => c.id === id)) {
      changes.push({
        contentId: id,
        platform: oldContent.platform,
        changeType: 'removed',
        timestamp: new Date(),
      });
    }
  }

  return changes;
}
```

## 3. AI/ML Layer

### 3.1 NLP Engine

**Responsibilities:**

- Query understanding and classification
- Entity extraction
- Intent detection
- Query expansion

**Models:**

- GPT-4 for complex reasoning
- Fine-tuned BERT for entity extraction
- Custom classifier for intent detection

**Implementation:**

```python
from langchain.llms import OpenAI
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

class NLPEngine:
    def __init__(self):
        self.llm = OpenAI(model="gpt-4", temperature=0)
        self.entity_model = load_model("media_entity_extractor")
        self.intent_classifier = load_model("query_intent_classifier")

    async def parse_query(self, query: str, context: Dict) -> ParsedQuery:
        # 1. Classify intent
        intent = self.intent_classifier.predict(query)

        # 2. Extract entities with GPT-4
        entity_prompt = PromptTemplate(
            input_variables=["query"],
            template="""
            Extract media-related entities from this query:
            Query: {query}

            Identify:
            - Actors/Actresses
            - Directors
            - Genres
            - Themes/Topics
            - Platforms
            - Time periods

            Return JSON: {{"entities": [{{"type": "...", "value": "...", "confidence": 0.0-1.0}}]}}
            """
        )

        chain = LLMChain(llm=self.llm, prompt=entity_prompt)
        entities = await chain.arun(query=query)

        # 3. Expand query with synonyms and related terms
        expanded_terms = await self.expand_query(query)

        return ParsedQuery(
            original=query,
            intent=intent,
            entities=entities,
            expanded_terms=expanded_terms
        )

    async def expand_query(self, query: str) -> List[str]:
        # Use GPT-4 to suggest related terms
        expansion_prompt = f"""
        For the media query "{query}", suggest 5 related search terms
        that would find similar content. Focus on:
        - Genre variations
        - Thematic similarities
        - Mood/tone equivalents

        Return as comma-separated list.
        """

        result = await self.llm.agenerate([expansion_prompt])
        return result.generations[0][0].text.split(',')
```

### 3.2 Vector Database (Pinecone)

**Purpose:** Fast semantic similarity search

**Schema:**

```typescript
interface ContentVector {
  id: string; // Content ID
  values: number[]; // 1536-dim embedding
  metadata: {
    title: string;
    genres: string[];
    year: number;
    platform: string;
    rating: number;
  };
}

// Index creation
const index = pinecone.Index('media-content');

// Upsert vectors
await index.upsert({
  vectors: contents.map(c => ({
    id: c.id,
    values: c.embedding,
    metadata: {
      title: c.title,
      genres: c.genres,
      year: c.year,
      platform: c.platforms[0].name,
      rating: c.rating,
    },
  })),
});

// Semantic search
const results = await index.query({
  vector: queryEmbedding,
  topK: 100,
  filter: {
    genres: { $in: ['Action', 'Thriller'] },
    year: { $gte: 2020 },
    rating: { $gte: 7.0 },
  },
  includeMetadata: true,
});
```

**Optimization:**

- Namespace by platform for faster filtering
- Sparse-dense hybrid search for keyword+semantic
- Regular reindexing (weekly) for fresh content

## 4. Data Layer

### 4.1 PostgreSQL Schema

```sql
-- Core content table
CREATE TABLE media_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER UNIQUE,
  imdb_id VARCHAR(20) UNIQUE,
  title VARCHAR(500) NOT NULL,
  year INTEGER,
  content_type VARCHAR(20) CHECK (content_type IN ('movie', 'series')),
  synopsis TEXT,
  rating DECIMAL(3,1),
  poster_url TEXT,
  backdrop_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Genres (many-to-many)
CREATE TABLE genres (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE content_genres (
  content_id UUID REFERENCES media_content(id) ON DELETE CASCADE,
  genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, genre_id)
);

-- Cast & Crew
CREATE TABLE people (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  tmdb_id INTEGER UNIQUE
);

CREATE TABLE content_cast (
  content_id UUID REFERENCES media_content(id) ON DELETE CASCADE,
  person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
  role VARCHAR(20) CHECK (role IN ('actor', 'director', 'writer')),
  character_name VARCHAR(200),
  order_index INTEGER,
  PRIMARY KEY (content_id, person_id, role)
);

-- Platform availability
CREATE TABLE platforms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  icon_url TEXT
);

CREATE TABLE content_availability (
  content_id UUID REFERENCES media_content(id) ON DELETE CASCADE,
  platform_id INTEGER REFERENCES platforms(id) ON DELETE CASCADE,
  available BOOLEAN DEFAULT TRUE,
  url TEXT,
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (content_id, platform_id)
);

-- User data
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Viewing history
CREATE TABLE viewing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID REFERENCES media_content(id) ON DELETE CASCADE,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  watch_duration INTEGER, -- seconds
  completed BOOLEAN DEFAULT FALSE
);

-- User preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  favorite_genres INTEGER[] DEFAULT '{}',
  blocked_genres INTEGER[] DEFAULT '{}',
  preferred_platforms INTEGER[] DEFAULT '{}',
  min_rating DECIMAL(3,1) DEFAULT 0.0,
  preferences_vector VECTOR(1536) -- pgvector for user embedding
);

-- Query cache
CREATE TABLE query_cache (
  query_hash VARCHAR(64) PRIMARY KEY,
  query_text TEXT NOT NULL,
  parsed_result JSONB NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_content_rating ON media_content(rating DESC);
CREATE INDEX idx_content_year ON media_content(year DESC);
CREATE INDEX idx_viewing_history_user ON viewing_history(user_id, watched_at DESC);
CREATE INDEX idx_content_title_trgm ON media_content USING gin(title gin_trgm_ops);

-- Vector similarity index (pgvector)
CREATE INDEX idx_user_preferences_vector ON user_preferences
  USING ivfflat (preferences_vector vector_cosine_ops)
  WITH (lists = 100);
```

### 4.2 Redis Caching Strategy

**Cache Layers:**

1. **Query Results** (TTL: 1 hour)

```typescript
const cacheKey = `query:${hashQuery(query)}:${JSON.stringify(filters)}`;
const cached = await redis.get(cacheKey);

if (cached) return JSON.parse(cached);

const results = await fetchResults(query, filters);
await redis.setex(cacheKey, 3600, JSON.stringify(results));
```

2. **Content Metadata** (TTL: 24 hours)

```typescript
const contentKey = `content:${contentId}`;
const content = await redis.get(contentKey);

if (!content) {
  const freshContent = await db.getContent(contentId);
  await redis.setex(contentKey, 86400, JSON.stringify(freshContent));
  return freshContent;
}
```

3. **User Preferences** (TTL: 1 hour, invalidate on update)

```typescript
const userPrefKey = `user:${userId}:preferences`;
const prefs = await redis.get(userPrefKey);

if (!prefs) {
  const dbPrefs = await db.getUserPreferences(userId);
  await redis.setex(userPrefKey, 3600, JSON.stringify(dbPrefs));
  return dbPrefs;
}
```

4. **Embeddings** (TTL: 7 days)

```typescript
const embeddingKey = `embedding:${text}`;
const cached = await redis.get(embeddingKey);

if (!cached) {
  const embedding = await openai.createEmbedding(text);
  await redis.setex(embeddingKey, 604800, JSON.stringify(embedding));
  return embedding;
}
```

**Pub/Sub for Real-Time Updates:**

```typescript
// Publisher (when content updates)
await redis.publish(
  'content:updates',
  JSON.stringify({
    type: 'new_content',
    contentId: '123',
    platform: 'Netflix',
  })
);

// Subscriber (frontend WebSocket)
redis.subscribe('content:updates');
redis.on('message', (channel, message) => {
  const update = JSON.parse(message);
  wsServer.broadcast(update); // Notify all connected clients
});
```

## Integration Patterns

### API Gateway → Microservices

- Use GraphQL federation for schema composition
- Implement circuit breakers for fault tolerance
- Rate limiting per user/IP
- Request tracing with OpenTelemetry

### Microservices → AI Layer

- Async message queue (RabbitMQ) for ML inference
- Batching requests for GPU efficiency
- Fallback to cached results on timeout
- A/B testing framework for model versions

### Real-Time Data Flow

- WebSocket connections for live map updates
- Server-Sent Events for availability notifications
- Progressive enhancement (render basic map, refine with AI)
- Optimistic UI updates with rollback on error

This component architecture provides clear separation of concerns, scalability through microservices, and performance through strategic caching and GPU acceleration.
