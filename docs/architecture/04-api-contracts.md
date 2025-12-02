# API Contracts & Interfaces

## GraphQL Schema

### Core Schema

```graphql
type Query {
  # Content Queries
  content(id: ID!): Content
  searchContent(
    query: String!
    filters: ContentFilters
    limit: Int = 50
    offset: Int = 0
  ): ContentSearchResult!

  # Visual Map Queries
  visualMap(queryId: ID!): VisualMap!
  generateMap(
    query: String!
    filters: ContentFilters
    layoutAlgorithm: LayoutAlgorithm = FORCE_DIRECTED
  ): VisualMap!

  # Recommendations
  recommendations(
    userId: ID!
    type: RecommendationType
    limit: Int = 20
  ): [Recommendation!]!
  similarContent(
    contentId: ID!
    limit: Int = 10
  ): [Content!]!

  # User Queries
  user(id: ID!): User
  currentUser: User
  userPreferences(userId: ID!): UserPreferences!

  # Analytics
  trendingContent(
    timeframe: Timeframe = WEEK
    platform: String
    limit: Int = 20
  ): [Content!]!
  platformCatalog(
    platform: String!
    filters: ContentFilters
  ): [Content!]!
}

type Mutation {
  # Query Management
  submitQuery(
    query: String!
    context: QueryContext
  ): QueryResult!

  # User Management
  createUser(input: CreateUserInput!): User!
  updateUserPreferences(
    userId: ID!
    preferences: UserPreferencesInput!
  ): UserPreferences!

  # Viewing History
  addToHistory(
    userId: ID!
    contentId: ID!
    duration: Int!
    completed: Boolean!
  ): ViewingHistoryEntry!

  # Ratings & Reviews
  rateContent(
    userId: ID!
    contentId: ID!
    rating: Float!
    review: String
  ): UserRating!

  # Watchlist Management
  addToWatchlist(userId: ID!, contentId: ID!): User!
  removeFromWatchlist(userId: ID!, contentId: ID!): User!

  # Map Sharing
  shareMap(
    mapId: ID!
    visibility: Visibility!
  ): ShareableMap!

  # Analytics
  trackEvent(event: AnalyticsEventInput!): Boolean!
}

type Subscription {
  # Real-time updates
  mapUpdates(queryId: ID!): VisualMapUpdate!
  contentAvailabilityChanged(contentId: ID!): AvailabilityUpdate!
  newRecommendations(userId: ID!): [Recommendation!]!
}

# Types

type Content {
  id: ID!
  tmdbId: Int
  imdbId: String
  title: String!
  originalTitle: String
  year: Int!
  contentType: ContentType!
  runtime: Int

  synopsis: String!
  tagline: String

  posterUrl: String!
  backdropUrl: String!
  trailerUrl: String

  rating: Float!
  ratingCount: Int!
  popularity: Float!

  genres: [Genre!]!
  themes: [Theme!]!
  moods: [Mood!]!
  tags: [String!]!

  cast: [CastMember!]!
  directors: [Person!]!
  writers: [Person!]!

  platforms: [PlatformAvailability!]!
  releaseDate: DateTime!

  # Computed fields
  similarContent(limit: Int = 10): [Content!]!
  recommendations(limit: Int = 10): [Recommendation!]!
}

enum ContentType {
  MOVIE
  SERIES
  DOCUMENTARY
  SHORT
}

type Genre {
  id: Int!
  name: String!
  parentGenre: String
}

type Theme {
  id: ID!
  name: String!
  confidence: Float!
}

type Mood {
  name: String!
  intensity: Float!
}

type CastMember {
  person: Person!
  character: String!
  order: Int!
}

type Person {
  id: Int!
  name: String!
  profileImageUrl: String
}

type PlatformAvailability {
  platform: Platform!
  available: Boolean!
  url: String
  addedDate: DateTime
  leavingDate: DateTime
  subscriptionTier: String
  additionalCost: Float
}

type Platform {
  id: ID!
  name: String!
  iconUrl: String!
  color: String!
  baseUrl: String!
}

type ContentSearchResult {
  query: String!
  totalResults: Int!
  results: [Content!]!
  facets: SearchFacets!
  latency: Int!
}

type SearchFacets {
  genres: [FacetCount!]!
  platforms: [FacetCount!]!
  years: [FacetCount!]!
  contentTypes: [FacetCount!]!
}

type FacetCount {
  value: String!
  count: Int!
}

input ContentFilters {
  genres: [String!]
  platforms: [String!]
  yearRange: YearRangeInput
  ratingRange: RatingRangeInput
  contentTypes: [ContentType!]
  languages: [String!]
  moods: [String!]
  runtime: RuntimeInput
}

input YearRangeInput {
  min: Int
  max: Int
}

input RatingRangeInput {
  min: Float
  max: Float
}

input RuntimeInput {
  min: Int
  max: Int
}

# Visual Map Types

type VisualMap {
  id: ID!
  userId: ID

  nodes: [MapNode!]!
  edges: [MapEdge!]!

  layoutAlgorithm: LayoutAlgorithm!
  bounds: MapBounds!

  centerNode: ID
  title: String
  description: String

  queryId: ID
  generatedAt: DateTime!
  viewCount: Int!
  shareCount: Int!

  isPublic: Boolean!
  shareUrl: String
}

type MapNode {
  id: ID!
  position: Position!
  size: Float!
  color: String!
  opacity: Float!
  shape: NodeShape!
  content: Content!
  relevanceScore: Float!
  clusterID: String
}

type Position {
  x: Float!
  y: Float!
  z: Float
}

enum NodeShape {
  CIRCLE
  SQUARE
  STAR
}

type MapEdge {
  id: ID!
  source: ID!
  target: ID!
  relationshipType: RelationshipType!
  strength: Float!
  thickness: Float!
  color: String!
  opacity: Float!
  label: String
}

enum RelationshipType {
  GENRE_SIMILARITY
  ACTOR_SHARED
  DIRECTOR_SHARED
  THEME_SIMILARITY
  SEQUEL_PREQUEL
  SAME_UNIVERSE
  SIMILAR_MOOD
  RECOMMENDATION
  TEMPORAL
  PLATFORM
}

enum LayoutAlgorithm {
  FORCE_DIRECTED
  HIERARCHICAL
  RADIAL
  CLUSTER
  CIRCULAR
  TIMELINE
}

type MapBounds {
  minX: Float!
  maxX: Float!
  minY: Float!
  maxY: Float!
  minZ: Float
  maxZ: Float
}

type VisualMapUpdate {
  mapId: ID!
  updateType: MapUpdateType!
  nodes: [MapNode!]
  edges: [MapEdge!]
}

enum MapUpdateType {
  INITIAL
  INCREMENTAL
  REFINEMENT
  COMPLETE
}

# User Types

type User {
  id: ID!
  email: String!
  displayName: String
  avatarUrl: String

  tier: SubscriptionTier!
  subscriptionStatus: SubscriptionStatus!

  preferences: UserPreferences!
  tasteProfile: TasteProfile!

  viewingHistory(limit: Int = 50): [ViewingHistoryEntry!]!
  watchlist: [Content!]!
  favorites: [Content!]!
  ratings: [UserRating!]!

  profileVisibility: Visibility!
  activityVisibility: Visibility!

  createdAt: DateTime!
  lastLoginAt: DateTime!
}

enum SubscriptionTier {
  FREE
  PRO
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  EXPIRED
}

enum Visibility {
  PUBLIC
  FRIENDS
  PRIVATE
}

type UserPreferences {
  favoriteGenres: [Genre!]!
  blockedGenres: [Genre!]!
  preferredPlatforms: [String!]!
  excludedPlatforms: [String!]!

  minRating: Float!
  maxRuntime: Int
  languages: [String!]!
  includeAdultContent: Boolean!

  discoveryMode: DiscoveryMode!
  diversityWeight: Float!
  popularityBias: Float!

  defaultLayout: LayoutAlgorithm!
  animationSpeed: AnimationSpeed!
  colorScheme: ColorScheme!
  nodeDensity: NodeDensity!

  notifyNewContent: Boolean!
  notifyWatchlistAvailable: Boolean!
  notifyContentLeaving: Boolean!
}

enum DiscoveryMode {
  CONSERVATIVE
  BALANCED
  ADVENTUROUS
}

enum AnimationSpeed {
  SLOW
  NORMAL
  FAST
}

enum ColorScheme {
  LIGHT
  DARK
  AUTO
}

enum NodeDensity {
  SPARSE
  NORMAL
  DENSE
}

input UserPreferencesInput {
  favoriteGenres: [Int!]
  blockedGenres: [Int!]
  preferredPlatforms: [String!]
  excludedPlatforms: [String!]
  minRating: Float
  maxRuntime: Int
  languages: [String!]
  includeAdultContent: Boolean
  discoveryMode: DiscoveryMode
  diversityWeight: Float
  popularityBias: Float
  defaultLayout: LayoutAlgorithm
  animationSpeed: AnimationSpeed
  colorScheme: ColorScheme
  nodeDensity: NodeDensity
  notifyNewContent: Boolean
  notifyWatchlistAvailable: Boolean
  notifyContentLeaving: Boolean
}

type TasteProfile {
  genreAffinities: [GenreAffinity!]!
  actorAffinities: [PersonAffinity!]!
  directorAffinities: [PersonAffinity!]!
  themeAffinities: [ThemeAffinity!]!

  avgWatchTime: Int!
  bingeProbability: Float!
  completionRate: Float!

  activeHours: [Int!]!
  activeDays: [Int!]!

  lastUpdated: DateTime!
  confidence: Float!
}

type GenreAffinity {
  genre: Genre!
  score: Float!
}

type PersonAffinity {
  person: Person!
  score: Float!
}

type ThemeAffinity {
  theme: Theme!
  score: Float!
}

type ViewingHistoryEntry {
  id: ID!
  content: Content!
  watchedAt: DateTime!
  duration: Int!
  completed: Boolean!
  device: String!
  context: String
}

type UserRating {
  content: Content!
  rating: Float!
  review: String
  createdAt: DateTime!
  helpful: Int!
}

# Recommendation Types

type Recommendation {
  id: ID!
  content: Content!
  score: Float!
  scoreBreakdown: ScoreBreakdown!
  reasons: [String!]!
  similarTo: [Content!]!
  recommendationType: RecommendationType!
  generatedAt: DateTime!
  expiresAt: DateTime!
}

type ScoreBreakdown {
  contentSimilarity: Float!
  collaborativeFiltering: Float!
  popularity: Float!
  novelty: Float!
  availability: Float!
  recency: Float!
}

enum RecommendationType {
  PERSONALIZED
  SIMILAR
  TRENDING
  NEW_ARRIVAL
  WATCHLIST
  SOCIAL
  SERENDIPITY
}

# Query Types

type QueryResult {
  query: Query!
  map: VisualMap!
  recommendedFilters: [FilterSuggestion!]!
}

type Query {
  id: ID!
  rawQuery: String!
  intent: QueryIntent!
  entities: [Entity!]!
  expandedTerms: [String!]!
  filters: ContentFilters
  resultCount: Int!
  latency: Int!
  cacheHit: Boolean!
  timestamp: DateTime!
}

enum QueryIntent {
  SEARCH
  EXPLORE
  RECOMMENDATION
  FILTER
  AVAILABILITY
}

type Entity {
  type: EntityType!
  value: String!
  confidence: Float!
  span: [Int!]!
}

enum EntityType {
  ACTOR
  DIRECTOR
  GENRE
  THEME
  PLATFORM
  YEAR
  RATING
  MOOD
  TITLE
}

input QueryContext {
  previousQuery: String
  previousResults: [ID!]
  location: String
  deviceType: DeviceType!
  timeOfDay: Int!
  dayOfWeek: Int!
}

enum DeviceType {
  MOBILE
  TABLET
  DESKTOP
}

type FilterSuggestion {
  filter: String!
  value: String!
  reason: String!
  estimatedResults: Int!
}

# Availability Updates

type AvailabilityUpdate {
  content: Content!
  platform: Platform!
  changeType: AvailabilityChangeType!
  timestamp: DateTime!
}

enum AvailabilityChangeType {
  ADDED
  REMOVED
  LEAVING_SOON
  PRICE_CHANGED
}

# Analytics

input AnalyticsEventInput {
  eventType: String!
  eventData: JSON!
  page: String!
  deviceType: DeviceType!
}

enum Timeframe {
  DAY
  WEEK
  MONTH
  YEAR
}

# Sharing

type ShareableMap {
  map: VisualMap!
  shareUrl: String!
  embedCode: String!
  expiresAt: DateTime
}

input CreateUserInput {
  email: String!
  password: String!
  displayName: String
}

scalar DateTime
scalar JSON
```

## REST API Endpoints

For operations that don't fit GraphQL's request-response model or require different caching strategies.

### Query Parsing

```
POST /api/v1/query/parse
Content-Type: application/json

Request:
{
  "query": "dark thriller movies on Netflix",
  "userId": "uuid-here",
  "context": {
    "previousQuery": "action movies",
    "deviceType": "mobile",
    "location": "US"
  }
}

Response: 200 OK
{
  "queryId": "uuid",
  "intent": "search",
  "entities": [
    {
      "type": "mood",
      "value": "dark",
      "confidence": 0.92,
      "span": [0, 4]
    },
    {
      "type": "genre",
      "value": "thriller",
      "confidence": 0.98,
      "span": [5, 13]
    },
    {
      "type": "platform",
      "value": "Netflix",
      "confidence": 0.99,
      "span": [24, 31]
    }
  ],
  "expandedTerms": [
    "psychological thriller",
    "suspense",
    "noir",
    "mystery"
  ],
  "filters": {
    "genres": ["Thriller"],
    "platforms": ["Netflix"],
    "moods": ["dark"]
  },
  "embedding": [0.1, 0.2, ...], // 1536-dim vector
  "latency": 234
}
```

### Visual Map Generation

```
POST /api/v1/map/generate
Content-Type: application/json

Request:
{
  "queryId": "uuid",
  "layoutAlgorithm": "force_directed",
  "maxNodes": 100,
  "includeEdges": true,
  "diversityWeight": 0.7
}

Response: 200 OK
{
  "mapId": "uuid",
  "nodes": [
    {
      "id": "content-123",
      "position": { "x": 120.5, "y": -45.2, "z": 0 },
      "size": 15,
      "color": "#FF5733",
      "opacity": 1.0,
      "shape": "circle",
      "contentId": "content-123",
      "relevanceScore": 0.94,
      "clusterID": "cluster-1"
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "content-123",
      "target": "content-456",
      "relationshipType": "genre_similarity",
      "strength": 0.82,
      "thickness": 2,
      "color": "#CCCCCC",
      "label": "Both thriller genre"
    }
  ],
  "bounds": {
    "minX": -200,
    "maxX": 200,
    "minY": -200,
    "maxY": 200
  },
  "metadata": {
    "totalResults": 250,
    "displayedNodes": 100,
    "computeTime": 456
  }
}
```

### Content Recommendations

```
GET /api/v1/recommendations/{userId}
  ?type=personalized
  &limit=20
  &includeExplanations=true

Response: 200 OK
{
  "userId": "uuid",
  "recommendations": [
    {
      "contentId": "content-789",
      "score": 0.91,
      "scoreBreakdown": {
        "contentSimilarity": 0.85,
        "collaborativeFiltering": 0.72,
        "popularity": 0.90,
        "novelty": 0.45,
        "availability": 1.0,
        "recency": 0.80
      },
      "reasons": [
        "Because you watched Breaking Bad",
        "Popular with viewers like you",
        "Highly rated (9.2/10)"
      ],
      "similarTo": ["content-100", "content-200"],
      "recommendationType": "personalized"
    }
  ],
  "generatedAt": "2025-01-15T10:30:00Z",
  "expiresAt": "2025-01-15T22:30:00Z"
}
```

### Platform Catalog Sync

```
GET /api/v1/platforms/{platformId}/catalog
  ?updated_since=2025-01-14T00:00:00Z
  &page=1
  &limit=100

Response: 200 OK
{
  "platform": {
    "id": "netflix",
    "name": "Netflix",
    "lastSyncAt": "2025-01-15T09:00:00Z"
  },
  "content": [
    {
      "contentId": "content-123",
      "available": true,
      "addedDate": "2025-01-10T00:00:00Z",
      "leavingDate": null,
      "url": "https://netflix.com/watch/123"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 3542,
    "hasMore": true
  }
}
```

### Availability Tracking

```
POST /api/v1/availability/track
Content-Type: application/json

Request:
{
  "userId": "uuid",
  "contentIds": ["content-123", "content-456"],
  "notificationPreferences": {
    "email": true,
    "push": false,
    "webhook": "https://user-webhook.com/notify"
  }
}

Response: 201 Created
{
  "trackingId": "uuid",
  "tracking": [
    {
      "contentId": "content-123",
      "currentAvailability": [
        { "platform": "Netflix", "available": true },
        { "platform": "Prime", "available": false }
      ],
      "watchlist": true
    }
  ],
  "notificationsEnabled": true
}
```

### Analytics Batch Upload

```
POST /api/v1/analytics/events/batch
Content-Type: application/json

Request:
{
  "sessionId": "session-uuid",
  "events": [
    {
      "eventType": "query_submitted",
      "timestamp": "2025-01-15T10:30:00Z",
      "eventData": {
        "query": "sci-fi movies",
        "resultCount": 150,
        "latency": 234
      }
    },
    {
      "eventType": "node_clicked",
      "timestamp": "2025-01-15T10:30:15Z",
      "eventData": {
        "nodeId": "content-123",
        "contentTitle": "Inception",
        "relevanceScore": 0.94
      }
    }
  ]
}

Response: 202 Accepted
{
  "accepted": 2,
  "rejected": 0,
  "batchId": "batch-uuid"
}
```

### User Profile Export (GDPR)

```
GET /api/v1/users/{userId}/export

Response: 200 OK
Content-Type: application/json

{
  "userId": "uuid",
  "exportedAt": "2025-01-15T10:30:00Z",
  "data": {
    "profile": { /* user data */ },
    "viewingHistory": [ /* history */ ],
    "ratings": [ /* ratings */ ],
    "preferences": { /* preferences */ },
    "analytics": { /* aggregated analytics */ }
  },
  "downloadUrl": "https://exports.meta-media-search.com/uuid.zip",
  "expiresAt": "2025-01-22T10:30:00Z"
}
```

## WebSocket Protocol

Real-time map updates and notifications.

### Connection

```
ws://api.meta-media-search.com/v1/ws

Headers:
- Authorization: Bearer {jwt-token}
- X-Client-Version: 1.0.0
```

### Message Format

```json
{
  "type": "message_type",
  "id": "message-uuid",
  "timestamp": "2025-01-15T10:30:00Z",
  "payload": { /* type-specific data */ }
}
```

### Client → Server Messages

**Subscribe to Map Updates:**
```json
{
  "type": "subscribe_map",
  "payload": {
    "queryId": "uuid",
    "updateFrequency": "realtime" // or "throttled"
  }
}
```

**Request Map Refinement:**
```json
{
  "type": "refine_map",
  "payload": {
    "mapId": "uuid",
    "focusNode": "content-123",
    "depth": 2 // Expand 2 levels deep
  }
}
```

**Unsubscribe:**
```json
{
  "type": "unsubscribe",
  "payload": {
    "subscriptionId": "uuid"
  }
}
```

### Server → Client Messages

**Map Update:**
```json
{
  "type": "map_update",
  "payload": {
    "mapId": "uuid",
    "updateType": "incremental",
    "nodes": [ /* new/updated nodes */ ],
    "edges": [ /* new/updated edges */ ],
    "removedNodes": ["content-123"],
    "metadata": {
      "computeTime": 145
    }
  }
}
```

**Availability Changed:**
```json
{
  "type": "availability_update",
  "payload": {
    "contentId": "content-123",
    "platform": "Netflix",
    "changeType": "added",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

**New Recommendations:**
```json
{
  "type": "new_recommendations",
  "payload": {
    "userId": "uuid",
    "recommendations": [ /* recommendation objects */ ],
    "reason": "new_content_match"
  }
}
```

**Error:**
```json
{
  "type": "error",
  "payload": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please slow down.",
    "retryAfter": 30
  }
}
```

## Authentication

### JWT Token Format

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "tier": "pro",
  "iat": 1642252800,
  "exp": 1642339200,
  "scopes": ["read:content", "write:history", "read:recommendations"]
}
```

### OAuth 2.0 Endpoints

```
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

## Rate Limiting

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1642252860
Retry-After: 60

{
  "error": "rate_limit_exceeded",
  "message": "You have exceeded the rate limit. Please try again in 60 seconds.",
  "limit": 100,
  "window": "1 minute"
}
```

**Rate Limits by Tier:**
- Free: 100 req/min
- Pro: 500 req/min
- Enterprise: Custom

## Error Codes

```typescript
enum ErrorCode {
  // Client Errors (4xx)
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Server Errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Business Logic Errors
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  CONTENT_NOT_AVAILABLE = 'CONTENT_NOT_AVAILABLE',
  EMBEDDING_GENERATION_FAILED = 'EMBEDDING_GENERATION_FAILED'
}
```

This API design provides comprehensive coverage for all client needs while maintaining performance, security, and developer experience.
