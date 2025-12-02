# Data Models & Schemas

## Core Domain Models

### 1. Media Content Model

The central entity representing movies, TV shows, and other media.

```typescript
interface MediaContent {
  // Identifiers
  id: string; // UUID
  tmdbId?: number; // The Movie Database ID
  imdbId?: string; // IMDb ID (tt0123456)

  // Basic Information
  title: string;
  originalTitle?: string; // For international content
  year: number;
  contentType: 'movie' | 'series' | 'documentary' | 'short';
  runtime?: number; // Minutes for movies, avg episode length for series

  // Descriptive Content
  synopsis: string;
  tagline?: string;
  language: string; // ISO 639-1 code
  country: string; // ISO 3166-1 code

  // Visual Assets
  posterUrl: string; // Vertical poster (2:3 ratio)
  backdropUrl: string; // Horizontal backdrop (16:9 ratio)
  trailerUrl?: string;

  // Ratings & Popularity
  rating: number; // 0-10 scale
  ratingCount: number; // Number of ratings
  popularity: number; // Trending score (0-100)
  criticScore?: number; // Metacritic/Rotten Tomatoes

  // Categorization
  genres: Genre[];
  themes: Theme[]; // High-level themes (e.g., "redemption", "family")
  moods: Mood[]; // Emotional tone (e.g., "dark", "uplifting")
  tags: string[]; // User-generated or AI-extracted tags

  // People
  cast: CastMember[];
  directors: Person[];
  writers: Person[];
  producers: Person[];

  // Availability
  platforms: PlatformAvailability[];
  releaseDate: Date;
  lastAvailabilityCheck: Date;

  // AI/ML Data
  embedding: number[]; // 1536-dim semantic vector
  contentFingerprint: string; // Hash for deduplication

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  dataQuality: number; // 0-1 completeness score
}

interface Genre {
  id: number;
  name: string;
  parentGenre?: string; // Hierarchy (e.g., "Action" → "Superhero")
}

interface Theme {
  id: string;
  name: string;
  confidence: number; // 0-1 AI extraction confidence
}

interface Mood {
  name: string;
  intensity: number; // 0-1 (e.g., how "dark" or "comedic")
}

interface CastMember {
  person: Person;
  character: string;
  order: number; // Billing order
}

interface Person {
  id: number;
  name: string;
  profileImageUrl?: string;
  tmdbId?: number;
}

interface PlatformAvailability {
  platform: Platform;
  available: boolean;
  url?: string; // Deep link to content
  addedDate?: Date;
  leavingDate?: Date; // Expiration warning
  subscriptionTier?: string; // "basic", "premium", etc.
  additionalCost?: number; // Rental/purchase price
}

interface Platform {
  id: string;
  name: string; // "Netflix", "Disney+", etc.
  iconUrl: string;
  color: string; // Brand color for UI
  baseUrl: string;
}
```

### 2. User Model

```typescript
interface User {
  id: string; // UUID
  email: string;
  passwordHash: string;

  // Profile
  displayName?: string;
  avatarUrl?: string;
  bio?: string;

  // Subscription
  tier: 'free' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'cancelled' | 'expired';
  subscriptionEndsAt?: Date;

  // Preferences
  preferences: UserPreferences;

  // Computed Profile
  tastProfile: TasteProfile; // AI-generated

  // Activity
  viewingHistory: ViewingHistoryEntry[];
  watchlist: string[]; // Content IDs
  favorites: string[]; // Content IDs
  ratings: UserRating[];

  // Social
  following: string[]; // User IDs
  followers: string[]; // User IDs
  sharedMaps: string[]; // Map IDs

  // Privacy
  profileVisibility: 'public' | 'friends' | 'private';
  activityVisibility: 'public' | 'friends' | 'private';

  // Metadata
  createdAt: Date;
  lastLoginAt: Date;
  loginCount: number;
}

interface UserPreferences {
  // Content Preferences
  favoriteGenres: Genre[];
  blockedGenres: Genre[];
  preferredPlatforms: string[]; // Platform IDs
  excludedPlatforms: string[]; // Don't show content from these

  // Filtering
  minRating: number; // Only show content rated X or higher
  maxRuntime?: number; // For time-constrained browsing
  languages: string[]; // Preferred content languages
  includeAdultContent: boolean;

  // Discovery Settings
  discoveryMode: 'conservative' | 'balanced' | 'adventurous';
  diversityWeight: number; // 0-1, higher = more diverse recommendations
  popularityBias: number; // 0-1, higher = favor popular content

  // UI Preferences
  defaultLayout: 'force' | 'hierarchical' | 'radial' | 'cluster';
  animationSpeed: 'slow' | 'normal' | 'fast';
  colorScheme: 'light' | 'dark' | 'auto';
  nodeDensity: 'sparse' | 'normal' | 'dense';

  // Notifications
  notifyNewContent: boolean;
  notifyWatchlistAvailable: boolean;
  notifyContentLeaving: boolean;
  notificationEmail: string;
}

interface TasteProfile {
  // AI-generated clusters
  genreAffinities: Map<string, number>; // genre → affinity score 0-1
  actorAffinities: Map<string, number>;
  directorAffinities: Map<string, number>;
  themeAffinities: Map<string, number>;

  // Viewing patterns
  avgWatchTime: number; // Minutes per session
  bingeProbability: number; // 0-1 likelihood of watching multiple episodes
  completionRate: number; // 0-1 % of started content completed

  // Temporal patterns
  activeHours: number[]; // Hours of day (0-23) when most active
  activeDays: number[]; // Days of week (0-6) when most active

  // Embedding
  userEmbedding: number[]; // 1536-dim vector representing taste

  // Metadata
  lastUpdated: Date;
  confidence: number; // 0-1, based on data volume
}

interface ViewingHistoryEntry {
  id: string;
  contentId: string;
  watchedAt: Date;
  duration: number; // Seconds watched
  completed: boolean;
  device: string; // "web", "mobile", "tv"
  context?: string; // How discovered (search, recommendation, etc.)
}

interface UserRating {
  contentId: string;
  rating: number; // 1-10
  review?: string;
  createdAt: Date;
  helpful: number; // Upvotes from other users
}
```

### 3. Query Model

```typescript
interface Query {
  id: string;
  userId?: string; // Null for anonymous

  // Input
  rawQuery: string; // Original user input
  queryType: 'text' | 'voice';

  // Parsed Understanding
  intent: QueryIntent;
  entities: Entity[];
  embedding: number[]; // Semantic vector
  expandedTerms: string[]; // Related search terms

  // Filters
  filters: FilterSet;

  // Context
  context: QueryContext;

  // Results
  resultCount: number;
  topResultId?: string; // Most relevant content

  // Performance
  latency: number; // Milliseconds
  cacheHit: boolean;

  // Metadata
  timestamp: Date;
  sessionId: string;
}

enum QueryIntent {
  SEARCH = 'search',           // Find specific content
  EXPLORE = 'explore',         // Browse broadly
  RECOMMENDATION = 'recommend', // "Show me something like X"
  FILTER = 'filter',           // Refine previous results
  AVAILABILITY = 'availability' // "What's on Netflix?"
}

interface Entity {
  type: EntityType;
  value: string;
  confidence: number; // 0-1
  span: [number, number]; // Character positions in query
}

enum EntityType {
  ACTOR = 'actor',
  DIRECTOR = 'director',
  GENRE = 'genre',
  THEME = 'theme',
  PLATFORM = 'platform',
  YEAR = 'year',
  RATING = 'rating',
  MOOD = 'mood',
  TITLE = 'title'
}

interface FilterSet {
  genres?: string[];
  platforms?: string[];
  yearRange?: [number, number];
  ratingRange?: [number, number];
  contentTypes?: ('movie' | 'series')[];
  languages?: string[];
  moods?: string[];
  runtime?: {
    min?: number;
    max?: number;
  };
}

interface QueryContext {
  previousQuery?: string;
  previousResults?: string[]; // Content IDs
  location?: string; // For regional availability
  deviceType: 'mobile' | 'tablet' | 'desktop';
  timeOfDay: number; // Hour 0-23
  dayOfWeek: number; // 0-6
}
```

### 4. Visual Map Model

```typescript
interface VisualMap {
  id: string;
  userId?: string; // Creator (null for generated maps)

  // Graph Structure
  nodes: MapNode[];
  edges: MapEdge[];

  // Layout
  layoutAlgorithm: LayoutAlgorithm;
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ?: number;
    maxZ?: number;
  };

  // Metadata
  centerNode?: string; // Node ID at center
  title?: string; // User-defined or auto-generated
  description?: string;

  // Provenance
  queryId?: string; // Original query that generated this map
  generatedAt: Date;
  viewCount: number;
  shareCount: number;

  // Sharing
  isPublic: boolean;
  shareUrl?: string;
  embedCode?: string;
}

interface MapNode {
  id: string; // Content ID

  // Position (computed by layout algorithm)
  position: {
    x: number;
    y: number;
    z?: number; // For 3D layouts
  };

  // Visual Properties
  size: number; // Radius in pixels (based on relevance/popularity)
  color: string; // Hex color (based on genre/platform)
  opacity: number; // 0-1
  shape: 'circle' | 'square' | 'star'; // For different content types

  // Content Reference
  content: MediaContent;

  // Relevance
  relevanceScore: number; // 0-1 to user query
  clusterID?: string; // Semantic cluster membership

  // Interaction State
  isSelected: boolean;
  isHovered: boolean;
  isExpanded: boolean; // Showing detail panel
}

interface MapEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID

  // Relationship
  relationshipType: RelationshipType;
  strength: number; // 0-1 connection weight

  // Visual Properties
  thickness: number; // Line width (based on strength)
  color: string;
  opacity: number;
  style: 'solid' | 'dashed' | 'dotted';

  // Labels
  label?: string; // "Same director", "Similar theme", etc.
}

enum RelationshipType {
  GENRE_SIMILARITY = 'genre',
  ACTOR_SHARED = 'actor',
  DIRECTOR_SHARED = 'director',
  THEME_SIMILARITY = 'theme',
  SEQUEL_PREQUEL = 'sequel',
  SAME_UNIVERSE = 'universe',
  SIMILAR_MOOD = 'mood',
  RECOMMENDATION = 'recommended',
  TEMPORAL = 'same_year',
  PLATFORM = 'same_platform'
}

enum LayoutAlgorithm {
  FORCE_DIRECTED = 'force',
  HIERARCHICAL = 'hierarchical',
  RADIAL = 'radial',
  CLUSTER = 'cluster',
  CIRCULAR = 'circular',
  TIMELINE = 'timeline'
}
```

### 5. Recommendation Model

```typescript
interface Recommendation {
  id: string;
  userId: string;

  // Content
  contentId: string;
  content: MediaContent;

  // Scoring
  score: number; // 0-1 composite score
  scoreBreakdown: ScoreBreakdown;

  // Explanation
  reasons: string[]; // Human-readable reasons
  similarTo?: string[]; // Content IDs this is similar to

  // Context
  recommendationType: RecommendationType;
  generatedAt: Date;
  expiresAt: Date; // Recommendation freshness

  // Interaction
  presented: boolean; // Shown to user
  clicked: boolean;
  watched: boolean;
  watchDuration?: number; // If watched, how long
  userRating?: number; // If user rated after watching
}

interface ScoreBreakdown {
  contentSimilarity: number; // 0-1 semantic match
  collaborativeFiltering: number; // 0-1 user similarity
  popularity: number; // 0-1 trending score
  novelty: number; // 0-1 how different from user's history
  availability: number; // 0-1 easy to access
  recency: number; // 0-1 how recently added

  // Weighted combination
  weights: {
    content: number;
    collaborative: number;
    popularity: number;
    novelty: number;
    availability: number;
    recency: number;
  };
}

enum RecommendationType {
  PERSONALIZED = 'personalized', // Based on user history
  SIMILAR = 'similar', // "More like this"
  TRENDING = 'trending', // What's popular now
  NEW_ARRIVAL = 'new', // Recently added content
  WATCHLIST = 'watchlist', // From user's watchlist
  SOCIAL = 'social', // What friends are watching
  SERENDIPITY = 'serendipity' // Intentionally different
}
```

### 6. Analytics Events Model

```typescript
interface AnalyticsEvent {
  id: string;
  userId?: string; // Null for anonymous
  sessionId: string;

  // Event Details
  eventType: EventType;
  eventData: Record<string, any>; // Flexible payload

  // Context
  page: string; // URL or route
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;

  // Timing
  timestamp: Date;
  timeSincePageLoad: number; // Milliseconds
  timeSinceLastEvent: number; // Milliseconds
}

enum EventType {
  // Page Events
  PAGE_VIEW = 'page_view',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',

  // Query Events
  QUERY_SUBMITTED = 'query_submitted',
  QUERY_AUTOCOMPLETE = 'query_autocomplete',
  QUERY_MODIFIED = 'query_modified',
  FILTER_APPLIED = 'filter_applied',

  // Map Interaction Events
  MAP_RENDERED = 'map_rendered',
  NODE_CLICKED = 'node_clicked',
  NODE_HOVERED = 'node_hovered',
  EDGE_CLICKED = 'edge_clicked',
  MAP_ZOOMED = 'map_zoomed',
  MAP_PANNED = 'map_panned',
  LAYOUT_CHANGED = 'layout_changed',
  CLUSTER_EXPANDED = 'cluster_expanded',

  // Content Events
  CONTENT_VIEWED = 'content_viewed',
  CONTENT_WATCHED = 'content_watched',
  CONTENT_RATED = 'content_rated',
  CONTENT_ADDED_WATCHLIST = 'watchlist_add',
  CONTENT_REMOVED_WATCHLIST = 'watchlist_remove',
  CONTENT_SHARED = 'content_shared',

  // Recommendation Events
  RECOMMENDATION_SHOWN = 'recommendation_shown',
  RECOMMENDATION_CLICKED = 'recommendation_clicked',
  RECOMMENDATION_DISMISSED = 'recommendation_dismissed',

  // Error Events
  ERROR_OCCURRED = 'error',
  SLOW_QUERY = 'slow_query'
}

// Example event payloads
interface QuerySubmittedEvent {
  eventType: EventType.QUERY_SUBMITTED;
  eventData: {
    query: string;
    intent: QueryIntent;
    resultCount: number;
    latency: number;
    cacheHit: boolean;
  };
}

interface NodeClickedEvent {
  eventType: EventType.NODE_CLICKED;
  eventData: {
    nodeId: string;
    contentTitle: string;
    relevanceScore: number;
    position: { x: number; y: number };
    clickDepth: number; // How many nodes clicked this session
  };
}

interface MapRenderedEvent {
  eventType: EventType.MAP_RENDERED;
  eventData: {
    nodeCount: number;
    edgeCount: number;
    layoutAlgorithm: LayoutAlgorithm;
    renderTime: number; // Milliseconds
    gpuAccelerated: boolean;
  };
}
```

## Embedding Strategy

### Content Embedding
Generate semantic vectors that capture meaning beyond keywords.

```typescript
async function generateContentEmbedding(content: MediaContent): Promise<number[]> {
  // Combine multiple text fields for rich representation
  const text = [
    content.title,
    content.synopsis,
    content.genres.map(g => g.name).join(' '),
    content.themes.map(t => t.name).join(' '),
    content.moods.map(m => m.name).join(' '),
    content.cast.slice(0, 3).map(c => c.person.name).join(' '),
    content.directors.map(d => d.name).join(' ')
  ].join('. ');

  // Generate embedding with OpenAI
  const embedding = await openai.createEmbedding({
    model: 'text-embedding-3-large',
    input: text,
    dimensions: 1536
  });

  return embedding.data[0].embedding;
}
```

### User Embedding
Create a vector representation of user taste.

```typescript
async function generateUserEmbedding(user: User): Promise<number[]> {
  // Aggregate embeddings of watched content
  const watchedContent = await db.getWatchedContent(user.id);

  // Weighted average based on rating and completion
  const weightedEmbeddings = watchedContent.map(item => {
    const weight = (item.rating / 10) * (item.completed ? 1.0 : 0.5);
    return item.content.embedding.map(v => v * weight);
  });

  // Average all weighted embeddings
  const userEmbedding = weightedEmbeddings
    .reduce((acc, emb) => acc.map((v, i) => v + emb[i]))
    .map(v => v / watchedContent.length);

  return userEmbedding;
}
```

### Query Embedding
Transform natural language queries into semantic vectors.

```typescript
async function generateQueryEmbedding(query: string): Promise<number[]> {
  // Expand query with GPT-4 for richer context
  const expanded = await llm.call(`
    Expand this media search query with related terms and themes:
    "${query}"

    Return only the expanded text, no explanation.
  `);

  const embedding = await openai.createEmbedding({
    model: 'text-embedding-3-large',
    input: expanded,
    dimensions: 1536
  });

  return embedding.data[0].embedding;
}
```

## Graph Database Considerations

While PostgreSQL serves as the primary database, certain queries benefit from graph-specific optimizations.

### Neo4j Schema (Optional Enhancement)

```cypher
// Content nodes
CREATE (c:Content {
  id: 'uuid',
  title: 'string',
  year: 123,
  rating: 8.5,
  embedding: [0.1, 0.2, ...] // Store as property
})

// People nodes
CREATE (p:Person {
  id: 123,
  name: 'string'
})

// Relationships
CREATE (c1:Content)-[:SIMILAR_TO {score: 0.85, type: 'genre'}]->(c2:Content)
CREATE (c:Content)-[:ACTED_IN_BY]->(p:Person)
CREATE (c:Content)-[:DIRECTED_BY]->(p:Person)
CREATE (c:Content)-[:BELONGS_TO_GENRE]->(g:Genre)

// User interactions
CREATE (u:User)-[:WATCHED {timestamp: datetime(), rating: 9}]->(c:Content)
CREATE (u:User)-[:SIMILAR_TASTE {score: 0.72}]->(u2:User)

// Graph queries for recommendations
MATCH (u:User)-[:WATCHED]->(c1:Content)-[:SIMILAR_TO]->(c2:Content)
WHERE NOT (u)-[:WATCHED]->(c2)
RETURN c2, COUNT(*) as recommendations
ORDER BY recommendations DESC
LIMIT 10
```

### When to Use Graph DB
- **Complex relationship traversals** (6+ degrees of separation)
- **Real-time collaborative filtering** (user similarity networks)
- **Path finding** (content connection explanations)
- **Social features** (friend-of-friend recommendations)

**Trade-offs:**
- ✅ Faster relationship queries
- ✅ More expressive query language (Cypher)
- ❌ Additional infrastructure complexity
- ❌ Data synchronization between PostgreSQL and Neo4j

**Recommendation:** Start with PostgreSQL + pgvector. Add Neo4j if relationship queries become bottleneck (>500ms).

## Data Quality & Validation

### Validation Rules

```typescript
const ContentSchema = z.object({
  title: z.string().min(1).max(500),
  year: z.number().int().min(1888).max(new Date().getFullYear() + 2),
  rating: z.number().min(0).max(10).optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).min(1),
  synopsis: z.string().min(10).max(5000),
  platforms: z.array(z.object({
    platform: z.object({ id: z.string(), name: z.string() }),
    available: z.boolean()
  })).min(1),
  embedding: z.array(z.number()).length(1536)
});

// Data quality score
function calculateDataQuality(content: Partial<MediaContent>): number {
  const scores = {
    hasTitle: content.title ? 1 : 0,
    hasYear: content.year ? 1 : 0,
    hasRating: content.rating ? 1 : 0,
    hasGenres: (content.genres?.length || 0) > 0 ? 1 : 0,
    hasSynopsis: (content.synopsis?.length || 0) > 50 ? 1 : 0,
    hasPoster: content.posterUrl ? 1 : 0,
    hasCast: (content.cast?.length || 0) > 2 ? 1 : 0,
    hasDirector: (content.directors?.length || 0) > 0 ? 1 : 0,
    hasPlatforms: (content.platforms?.length || 0) > 0 ? 1 : 0,
    hasEmbedding: (content.embedding?.length || 0) === 1536 ? 1 : 0
  };

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return total / Object.keys(scores).length;
}
```

### Data Freshness Strategy

```typescript
enum DataFreshness {
  STALE = 'stale',       // >7 days old
  AGING = 'aging',       // 1-7 days old
  FRESH = 'fresh',       // <1 day old
  REAL_TIME = 'realtime' // <1 hour old
}

interface RefreshStrategy {
  contentType: 'metadata' | 'availability' | 'ratings';
  priority: 'low' | 'medium' | 'high';
  interval: number; // Hours
  conditions?: RefreshCondition[];
}

interface RefreshCondition {
  type: 'popularity' | 'recent_views' | 'user_watchlist';
  threshold: number;
  action: 'prioritize' | 'skip';
}

// Prioritize fresh data for popular content
const refreshStrategies: RefreshStrategy[] = [
  {
    contentType: 'availability',
    priority: 'high',
    interval: 1, // Hourly
    conditions: [
      { type: 'popularity', threshold: 80, action: 'prioritize' }
    ]
  },
  {
    contentType: 'metadata',
    priority: 'low',
    interval: 168, // Weekly
    conditions: [
      { type: 'recent_views', threshold: 0, action: 'skip' }
    ]
  }
];
```

This comprehensive data model supports rich semantic search, personalized recommendations, and beautiful visual maps while maintaining data quality and freshness.
