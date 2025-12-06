# Data Flow & Vector Database Integration

## Overview

This document details the data flow architecture for integrating ruvector vector database with the existing PostgreSQL infrastructure, focusing on personalization engines, real-time synchronization, and hybrid data management.

## System Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          DATA INGESTION LAYER                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │ TMDB API    │  │ User Actions │  │ Content Feed  │  │ Admin Portal │ │
│  │ (External)  │  │ (Frontend)   │  │ (Streaming)   │  │ (CMS)        │ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  └──────┬───────┘ │
└─────────┼────────────────┼──────────────────┼──────────────────┼─────────┘
          │                │                  │                  │
          ▼                ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        EVENT PROCESSING LAYER                             │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  Event Bus (Redis Streams)                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │   │
│  │  │ media.insert │  │ user.action  │  │ pref.update  │           │   │
│  │  │ media.update │  │ user.search  │  │ rating.add   │           │   │
│  │  │ media.delete │  │ user.view    │  │ watchlist.*  │           │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└──────────┬──────────────────┬─────────────────────┬────────────────────┘
           │                  │                     │
           ▼                  ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Media Pipeline   │  │ User Pipeline    │  │ Analytics Pipeline│
│ (TypeScript)     │  │ (TypeScript)     │  │ (TypeScript)      │
└─────────┬────────┘  └─────────┬────────┘  └─────────┬─────────┘
          │                     │                      │
          ▼                     ▼                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        TRANSFORMATION LAYER                               │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  WASM Embedding Engine                                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │   │
│  │  │ Text→Vector  │  │ Metadata     │  │ Multimodal   │           │   │
│  │  │ (MiniLM/E5)  │  │ Extraction   │  │ Fusion       │           │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                  │                                        │
│                                  ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  Enrichment & Validation                                          │   │
│  │  - Schema validation (Zod)                                        │   │
│  │  - Deduplication                                                  │   │
│  │  - Normalization (vector L2 norm)                                │   │
│  │  - Quality scoring                                                │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└──────────┬──────────────────┬─────────────────────┬────────────────────┘
           │                  │                     │
           ▼                  ▼                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          DUAL-WRITE LAYER                                 │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  Transactional Coordinator                                        │   │
│  │  - Two-phase commit simulation                                    │   │
│  │  - Idempotency tokens                                             │   │
│  │  - Failure recovery                                               │   │
│  └──────────────┬────────────────────────────────────┬───────────────┘   │
└─────────────────┼────────────────────────────────────┼───────────────────┘
                  │                                    │
                  ▼                                    ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────────┐
│   PostgreSQL (Relational)       │  │  ruvector (Vector Database)         │
│  ┌───────────────────────────┐  │  │  ┌───────────────────────────────┐ │
│  │ Media Items               │  │  │  │ Vector Collection             │ │
│  │ - id (PK)                 │  │  │  │ - id (→ media.id)             │ │
│  │ - title, description      │  │  │  │ - vector (768-dim float32)    │ │
│  │ - release_date            │  │  │  │ - metadata (JSON)             │ │
│  │ - rating, genres          │  │  │  │ - payload (filterable fields) │ │
│  │ - created_at, updated_at  │  │  │  └───────────────────────────────┘ │
│  └───────────────────────────┘  │  │  ┌───────────────────────────────┐ │
│  ┌───────────────────────────┐  │  │  │ HNSW Index                    │ │
│  │ Platforms                 │  │  │  │ - M=16, ef_construct=200      │ │
│  │ - id, name, type          │  │  │  │ - distance=cosine             │ │
│  │ - availability            │  │  │  │ - on_disk_payload=true        │ │
│  └───────────────────────────┘  │  │  └───────────────────────────────┘ │
│  ┌───────────────────────────┐  │  │                                     │
│  │ Media_Platforms (join)    │  │  │  ┌───────────────────────────────┐ │
│  │ - media_id, platform_id   │  │  │  │ Snapshots (hourly)            │ │
│  │ - url, price              │  │  │  │ - timestamp                   │ │
│  └───────────────────────────┘  │  │  │ - vector_count                │ │
│                                  │  │  │ - index_version               │ │
└──────────────┬───────────────────┘  │  └───────────────────────────────┘ │
               │                      └──────────────┬──────────────────────┘
               │                                     │
               └──────────────┬──────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     agentdb (User Preferences)                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ User Profiles                                                     │  │
│  │ - user_id (PK)                                                    │  │
│  │ - preferences (JSON): { genres, platforms, content_types }       │  │
│  │ - embedding_profile (768-dim): averaged from interactions        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Watch History                                                     │  │
│  │ - user_id, media_id, watched_at, completion_rate                 │  │
│  │ - interaction_type (view, like, rate, watchlist)                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Session Context                                                   │  │
│  │ - session_id, user_id, started_at, last_active                   │  │
│  │ - context (JSON): { mood, time_of_day, companions }              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        CACHING LAYER (Redis)                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐    │
│  │ Query Cache      │  │ Embedding Cache  │  │ Session Store      │    │
│  │ TTL: 5min        │  │ TTL: 1hr         │  │ TTL: 24hr          │    │
│  │ Key: query_hash  │  │ Key: text_hash   │  │ Key: session_id    │    │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION LAYER                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Search Service                                                    │  │
│  │ 1. Parse query → embedding (WASM)                                │  │
│  │ 2. Vector search (ruvector) → candidate IDs                      │  │
│  │ 3. Enrich from PostgreSQL (metadata, platforms)                  │  │
│  │ 4. Hybrid ranking (WASM)                                          │  │
│  │ 5. Personalize (agentdb user profile)                            │  │
│  │ 6. Return results                                                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Recommendation Service                                            │  │
│  │ 1. Fetch user profile (agentdb)                                   │  │
│  │ 2. Compute user embedding from history                            │  │
│  │ 3. Vector similarity search (ruvector)                            │  │
│  │ 4. Diversity optimization (WASM)                                  │  │
│  │ 5. Filter by availability (PostgreSQL)                            │  │
│  │ 6. Return personalized recommendations                            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Detailed Data Flow Scenarios

### Scenario 1: Media Content Ingestion

```typescript
// Step-by-step flow for adding new media content

/**
 * STEP 1: TMDB API Fetch
 * Source: External TMDB API
 * Trigger: Scheduled job (daily) or manual import
 */
async function fetchFromTMDB(movieId: string) {
  const tmdbData = await tmdbClient.getMovie(movieId);

  // Publish to event bus
  await eventBus.publish('media.insert', {
    id: tmdbData.id,
    title: tmdbData.title,
    description: tmdbData.overview,
    release_date: tmdbData.release_date,
    genres: tmdbData.genres.map(g => g.name),
    rating: tmdbData.vote_average,
    poster_url: tmdbData.poster_path,
    // ... other metadata
  });
}

/**
 * STEP 2: Event Processing
 * Consumer: Media Pipeline
 */
eventBus.subscribe('media.insert', async (event) => {
  const mediaData = event.data;

  // Generate embedding using WASM module
  const embedder = new EmbeddingEngine(ModelType.E5Large);
  const textContent = `${mediaData.title} ${mediaData.description} ${mediaData.genres.join(' ')}`;
  const embedding = await embedder.encodeText(textContent);

  // Validate data
  const validatedData = MediaSchema.parse(mediaData);

  // Proceed to dual-write
  await dualWrite(validatedData, embedding);
});

/**
 * STEP 3: Dual-Write with Transaction Coordination
 */
async function dualWrite(mediaData: MediaItem, embedding: Float32Array) {
  const idempotencyToken = generateIdempotencyToken(mediaData.id);

  try {
    // Phase 1: Write to PostgreSQL (source of truth for relational data)
    const pgResult = await withRetry(async () => {
      return await db.transaction(async (tx) => {
        // Insert media item
        const media = await tx.insert(mediaItems).values({
          id: mediaData.id,
          title: mediaData.title,
          description: mediaData.description,
          release_date: mediaData.release_date,
          rating: mediaData.rating,
          genres: mediaData.genres,
          metadata: mediaData.metadata,
        }).returning();

        // Insert platform associations
        if (mediaData.platforms.length > 0) {
          await tx.insert(mediaPlatforms).values(
            mediaData.platforms.map(p => ({
              media_id: media.id,
              platform_id: p.id,
              url: p.url,
              price: p.price,
            }))
          );
        }

        return media;
      });
    });

    // Phase 2: Write to ruvector (source of truth for vectors)
    await withRetry(async () => {
      await ruvectorClient.upsert({
        collection: 'media_embeddings',
        points: [{
          id: mediaData.id,
          vector: Array.from(embedding),
          payload: {
            title: mediaData.title,
            genres: mediaData.genres,
            rating: mediaData.rating,
            release_year: new Date(mediaData.release_date).getFullYear(),
            // Filterable metadata
          },
        }],
      });
    });

    // Mark transaction as complete
    await redis.set(`tx:complete:${idempotencyToken}`, '1', 'EX', 3600);

    logger.info('Dual-write completed', { media_id: mediaData.id });

  } catch (error) {
    // Rollback logic
    logger.error('Dual-write failed', { media_id: mediaData.id, error });
    await rollbackDualWrite(mediaData.id, idempotencyToken);
    throw error;
  }
}

/**
 * STEP 4: Rollback on Failure
 */
async function rollbackDualWrite(mediaId: string, idempotencyToken: string) {
  // Check which phase succeeded
  const txComplete = await redis.get(`tx:complete:${idempotencyToken}`);

  if (!txComplete) {
    // Phase 1 might have succeeded, rollback PostgreSQL
    await db.delete(mediaItems).where(eq(mediaItems.id, mediaId));

    // Phase 2 might have succeeded, rollback ruvector
    await ruvectorClient.delete({
      collection: 'media_embeddings',
      points: [mediaId],
    });
  }

  // Mark rollback complete
  await redis.set(`tx:rollback:${idempotencyToken}`, '1', 'EX', 3600);
}
```

### Scenario 2: User Search Query

```typescript
/**
 * FLOW: User searches "funny sci-fi movies like The Martian"
 */

// STEP 1: Query Reception (Frontend → Backend)
POST /api/search
{
  "query": "funny sci-fi movies like The Martian",
  "userId": "user_123",
  "filters": {
    "platforms": ["Netflix", "Hulu"],
    "minRating": 7.0
  }
}

// STEP 2: Query Processing (Application Layer)
async function handleSearch(searchQuery: SearchQuery): Promise<SearchResult> {
  const startTime = Date.now();

  // 2a. Check cache
  const cacheKey = generateCacheKey(searchQuery);
  const cached = await redis.get(cacheKey);
  if (cached) {
    logger.info('Cache hit', { cache_key: cacheKey });
    return JSON.parse(cached);
  }

  // 2b. Generate query embedding (WASM)
  const embedder = new EmbeddingEngine(ModelType.E5Large);
  const queryEmbedding = await embedder.encodeText(searchQuery.query);

  // 2c. Vector similarity search (ruvector)
  const vectorResults = await ruvectorClient.search({
    collection: 'media_embeddings',
    vector: Array.from(queryEmbedding),
    limit: 100, // Retrieve more candidates for reranking
    filter: {
      // Apply filters directly on vector DB
      rating: { $gte: searchQuery.filters.minRating },
      genres: { $in: ['Sci-Fi', 'Comedy'] }, // Extracted by NLP
    },
  });

  // 2d. Enrich with relational data (PostgreSQL)
  const mediaIds = vectorResults.map(r => r.id);
  const enrichedItems = await db
    .select()
    .from(mediaItems)
    .leftJoin(mediaPlatforms, eq(mediaItems.id, mediaPlatforms.mediaId))
    .leftJoin(platforms, eq(mediaPlatforms.platformId, platforms.id))
    .where(inArray(mediaItems.id, mediaIds));

  // 2e. Fetch user preferences (agentdb)
  let userPrefs = null;
  if (searchQuery.userId) {
    userPrefs = await agentdbClient.getUserPreferences(searchQuery.userId);
  }

  // 2f. Hybrid ranking (WASM)
  const ranker = new HybridRanker({
    semantic_similarity: 0.5,
    popularity: 0.2,
    recency: 0.1,
    personalization: userPrefs ? 0.15 : 0,
    diversity: 0.05,
  });

  const rankedResults = await ranker.rank(
    queryEmbedding,
    enrichedItems.map(item => ({
      id: item.media.id,
      embedding: vectorResults.find(v => v.id === item.media.id).vector,
      metadata: {
        title: item.media.title,
        rating: item.media.rating,
        release_date: item.media.release_date,
        platforms: item.platforms,
      },
    })),
    userPrefs
  );

  // 2g. Construct response
  const result: SearchResult = {
    items: rankedResults.slice(0, searchQuery.limit || 20),
    total: rankedResults.length,
    query: searchQuery.query,
    processingTime: Date.now() - startTime,
  };

  // 2h. Cache result
  await redis.setex(cacheKey, 300, JSON.stringify(result)); // 5min TTL

  // 2i. Async: Update user search history (fire-and-forget)
  if (searchQuery.userId) {
    eventBus.publish('user.search', {
      userId: searchQuery.userId,
      query: searchQuery.query,
      results: result.items.map(i => i.id),
      timestamp: new Date(),
    });
  }

  return result;
}
```

### Scenario 3: Personalized Recommendations

```typescript
/**
 * FLOW: Generate recommendations for a user
 */

async function generateRecommendations(userId: string): Promise<MediaItem[]> {
  // STEP 1: Fetch user profile and history (agentdb)
  const [userProfile, watchHistory] = await Promise.all([
    agentdbClient.getUserPreferences(userId),
    agentdbClient.getWatchHistory(userId, 50),
  ]);

  // STEP 2: Compute user embedding (average of watched content)
  const watchedEmbeddings = await Promise.all(
    watchHistory.map(async (item) => {
      // Fetch embedding from ruvector
      const point = await ruvectorClient.retrieve({
        collection: 'media_embeddings',
        ids: [item.mediaId],
      });
      return point[0].vector;
    })
  );

  // Average embeddings (WASM for performance)
  const vectorOps = new VectorOps(768);
  const userEmbedding = watchedEmbeddings.reduce(
    (acc, emb) => acc.map((val, i) => val + emb[i] / watchedEmbeddings.length),
    new Array(768).fill(0)
  );
  vectorOps.normalize(userEmbedding);

  // STEP 3: Vector similarity search for candidates
  const candidates = await ruvectorClient.search({
    collection: 'media_embeddings',
    vector: userEmbedding,
    limit: 200,
    filter: {
      // Exclude already watched
      id: { $nin: watchHistory.map(h => h.mediaId) },
      // Apply user preferences
      genres: { $in: userProfile.genres },
    },
  });

  // STEP 4: Diversity optimization (WASM)
  const ranker = new HybridRanker({ /* weights */ });
  const diverseResults = await ranker.diversityOptimize(
    candidates,
    0.3 // 30% diversity, 70% relevance
  );

  // STEP 5: Enrich from PostgreSQL
  const recommendations = await enrichMediaItems(diverseResults.slice(0, 20));

  // STEP 6: Store recommendations in agentdb for later retrieval
  await agentdbClient.storeRecommendations(userId, {
    items: recommendations.map(r => r.id),
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000), // 24hr TTL
  });

  return recommendations;
}
```

### Scenario 4: User Interaction Tracking

```typescript
/**
 * FLOW: User watches a movie
 */

// STEP 1: Frontend sends interaction event
POST /api/user/interaction
{
  "userId": "user_123",
  "mediaId": "movie_456",
  "type": "view",
  "completionRate": 0.95,
  "rating": 8.5
}

// STEP 2: Event published to bus
eventBus.publish('user.action', {
  userId: 'user_123',
  mediaId: 'movie_456',
  actionType: 'view',
  completionRate: 0.95,
  rating: 8.5,
  timestamp: new Date(),
});

// STEP 3: User pipeline processes event
eventBus.subscribe('user.action', async (event) => {
  const { userId, mediaId, actionType, completionRate, rating } = event.data;

  // 3a. Store in agentdb
  await agentdbClient.recordInteraction({
    userId,
    mediaId,
    interactionType: actionType,
    completionRate,
    rating,
    timestamp: event.data.timestamp,
  });

  // 3b. Update user embedding profile
  if (completionRate > 0.7) { // Only if substantially watched
    const mediaEmbedding = await ruvectorClient.retrieve({
      collection: 'media_embeddings',
      ids: [mediaId],
    });

    const userProfile = await agentdbClient.getUserProfile(userId);
    const currentEmbedding = userProfile.embeddingProfile || new Array(768).fill(0);

    // Exponential moving average (recent interactions weigh more)
    const alpha = 0.1;
    const updatedEmbedding = currentEmbedding.map(
      (val, i) => (1 - alpha) * val + alpha * mediaEmbedding[0].vector[i]
    );

    await agentdbClient.updateEmbeddingProfile(userId, updatedEmbedding);
  }

  // 3c. Invalidate recommendation cache
  await redis.del(`recommendations:${userId}`);
});
```

## Data Consistency Strategies

### 1. Event Sourcing Pattern

```typescript
interface Event {
  id: string;
  type: string;
  aggregateId: string;
  data: any;
  timestamp: Date;
  version: number;
}

class EventStore {
  async append(event: Event): Promise<void> {
    // Append to event log (PostgreSQL)
    await db.insert(eventLog).values(event);

    // Publish to stream (Redis)
    await redis.xadd(
      `events:${event.type}`,
      '*',
      'data', JSON.stringify(event)
    );
  }

  async replay(aggregateId: string): Promise<Event[]> {
    return await db
      .select()
      .from(eventLog)
      .where(eq(eventLog.aggregateId, aggregateId))
      .orderBy(eventLog.version);
  }
}

// Use for rebuilding vector index from events
async function rebuildVectorIndex() {
  const events = await eventStore.replay('media');

  for (const event of events) {
    if (event.type === 'media.insert' || event.type === 'media.update') {
      const embedding = await generateEmbedding(event.data);
      await ruvectorClient.upsert({
        collection: 'media_embeddings',
        points: [{
          id: event.data.id,
          vector: embedding,
          payload: extractPayload(event.data),
        }],
      });
    } else if (event.type === 'media.delete') {
      await ruvectorClient.delete({
        collection: 'media_embeddings',
        points: [event.data.id],
      });
    }
  }
}
```

### 2. Change Data Capture (CDC) for PostgreSQL

```typescript
import { Connector } from 'pg-logical-replication';

// Listen to PostgreSQL changes and sync to ruvector
const connector = new Connector({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

connector.on('data', async (lsn, log) => {
  if (log.tag === 'insert' && log.relation.name === 'media_items') {
    const newRow = log.new;

    // Generate embedding
    const embedding = await generateEmbedding(newRow);

    // Sync to ruvector
    await ruvectorClient.upsert({
      collection: 'media_embeddings',
      points: [{
        id: newRow.id,
        vector: embedding,
        payload: {
          title: newRow.title,
          genres: newRow.genres,
          rating: newRow.rating,
        },
      }],
    });
  } else if (log.tag === 'delete' && log.relation.name === 'media_items') {
    await ruvectorClient.delete({
      collection: 'media_embeddings',
      points: [log.old.id],
    });
  }
});

connector.connect();
```

### 3. Eventual Consistency with Reconciliation

```typescript
// Periodic reconciliation job to detect inconsistencies
async function reconcileDataStores() {
  logger.info('Starting reconciliation job');

  // Fetch all media IDs from PostgreSQL
  const pgIds = await db
    .select({ id: mediaItems.id })
    .from(mediaItems)
    .then(rows => new Set(rows.map(r => r.id)));

  // Fetch all point IDs from ruvector
  const rvIds = await ruvectorClient.scroll({
    collection: 'media_embeddings',
    limit: 10000,
    with_payload: false,
    with_vector: false,
  }).then(result => new Set(result.points.map(p => p.id)));

  // Find discrepancies
  const missingInRuvector = [...pgIds].filter(id => !rvIds.has(id));
  const missingInPostgres = [...rvIds].filter(id => !pgIds.has(id));

  logger.info('Reconciliation results', {
    total_pg: pgIds.size,
    total_rv: rvIds.size,
    missing_in_ruvector: missingInRuvector.length,
    missing_in_postgres: missingInPostgres.length,
  });

  // Fix missing in ruvector
  for (const id of missingInRuvector) {
    const media = await db
      .select()
      .from(mediaItems)
      .where(eq(mediaItems.id, id))
      .then(rows => rows[0]);

    const embedding = await generateEmbedding(media);
    await ruvectorClient.upsert({
      collection: 'media_embeddings',
      points: [{
        id: media.id,
        vector: embedding,
        payload: extractPayload(media),
      }],
    });
  }

  // Remove orphaned vectors
  if (missingInPostgres.length > 0) {
    await ruvectorClient.delete({
      collection: 'media_embeddings',
      points: missingInPostgres,
    });
  }

  logger.info('Reconciliation complete');
}

// Run every 6 hours
setInterval(reconcileDataStores, 6 * 60 * 60 * 1000);
```

## Migration Plan from PostgreSQL to Hybrid Architecture

### Phase 1: Infrastructure Setup (Week 1)

#### Tasks:
1. **Deploy ruvector**
   ```bash
   docker run -d \
     --name ruvector \
     -p 6333:6333 \
     -v $(pwd)/ruvector_storage:/ruvector/storage \
     ruvector/ruvector:latest
   ```

2. **Create collections**
   ```typescript
   await ruvectorClient.createCollection({
     name: 'media_embeddings',
     vectors: {
       size: 768, // E5-Large dimension
       distance: 'Cosine',
     },
     optimizers_config: {
       indexing_threshold: 10000,
     },
     hnsw_config: {
       m: 16,
       ef_construct: 200,
     },
     on_disk_payload: true, // Save memory
   });
   ```

3. **Deploy agentdb**
   ```bash
   npm install agentdb-client
   ```

4. **Setup event bus (Redis Streams)**
   ```typescript
   // Create consumer groups
   await redis.xgroup('CREATE', 'events:media', 'media-pipeline', '0', 'MKSTREAM');
   await redis.xgroup('CREATE', 'events:user', 'user-pipeline', '0', 'MKSTREAM');
   ```

### Phase 2: Parallel Run (Weeks 2-3)

#### Dual-Write Implementation:

```typescript
// Enable dual-write mode
const config = {
  dualWriteEnabled: true,
  primaryDataStore: 'postgresql', // Reads from PostgreSQL
  syncToRuvector: true,           // Writes to both
};

// Gradually backfill existing data
async function backfillVectors(batchSize = 100) {
  let offset = 0;
  let processed = 0;

  while (true) {
    const batch = await db
      .select()
      .from(mediaItems)
      .limit(batchSize)
      .offset(offset);

    if (batch.length === 0) break;

    // Generate embeddings in parallel
    const embeddings = await Promise.all(
      batch.map(async (item) => {
        const text = `${item.title} ${item.description} ${item.genres.join(' ')}`;
        return await embedder.encodeText(text);
      })
    );

    // Batch upsert to ruvector
    await ruvectorClient.upsert({
      collection: 'media_embeddings',
      points: batch.map((item, i) => ({
        id: item.id,
        vector: Array.from(embeddings[i]),
        payload: {
          title: item.title,
          genres: item.genres,
          rating: item.rating,
          release_year: new Date(item.release_date).getFullYear(),
        },
      })),
    });

    processed += batch.length;
    offset += batchSize;

    logger.info('Backfill progress', { processed, batch_size: batchSize });

    // Rate limiting to avoid overloading
    await sleep(100);
  }

  logger.info('Backfill complete', { total_processed: processed });
}
```

### Phase 3: Gradual Traffic Shift (Week 4)

#### Feature Flag Based Migration:

```typescript
enum DataSource {
  PostgreSQL = 'postgresql',
  Ruvector = 'ruvector',
  Hybrid = 'hybrid',
}

class SearchService {
  async search(query: SearchQuery): Promise<SearchResult> {
    const dataSource = await featureFlags.get('search_data_source', query.userId);

    switch (dataSource) {
      case DataSource.PostgreSQL:
        return this.searchPostgreSQL(query);

      case DataSource.Ruvector:
        return this.searchRuvector(query);

      case DataSource.Hybrid:
        // Compare results from both sources (shadow mode)
        const [pgResults, rvResults] = await Promise.all([
          this.searchPostgreSQL(query),
          this.searchRuvector(query),
        ]);

        // Log discrepancies for analysis
        this.compareResults(pgResults, rvResults);

        return rvResults; // Return ruvector results
    }
  }
}

// Gradual rollout schedule
const rolloutPlan = [
  { week: 4, percentage: 10, dataSource: DataSource.Hybrid },
  { week: 5, percentage: 25, dataSource: DataSource.Hybrid },
  { week: 6, percentage: 50, dataSource: DataSource.Hybrid },
  { week: 7, percentage: 75, dataSource: DataSource.Ruvector },
  { week: 8, percentage: 100, dataSource: DataSource.Ruvector },
];
```

### Phase 4: Optimization & Cleanup (Weeks 5-6)

1. **Remove pgvector extension** (no longer needed)
2. **Optimize PostgreSQL schema** (remove embedding columns)
3. **Tune ruvector index parameters** based on query patterns
4. **Implement backup/restore procedures**

## Performance Metrics & Monitoring

```typescript
// Prometheus metrics
const searchLatency = new Histogram({
  name: 'search_latency_seconds',
  help: 'Search query latency',
  labelNames: ['data_source', 'cache_hit'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const vectorOperationDuration = new Histogram({
  name: 'vector_operation_duration_seconds',
  help: 'Vector operation duration',
  labelNames: ['operation', 'dimension'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
});

const dataConsistencyGauge = new Gauge({
  name: 'data_consistency_discrepancies',
  help: 'Number of inconsistencies between PostgreSQL and ruvector',
});

// Logging with structured context
logger.info('Search completed', {
  query: searchQuery.query,
  results_count: results.length,
  processing_time_ms: processingTime,
  data_source: 'ruvector',
  cache_hit: cacheHit,
  user_id: searchQuery.userId,
});
```

## Disaster Recovery

### Backup Strategy

```typescript
// Daily ruvector snapshots
async function createVectorSnapshot() {
  const snapshotName = `snapshot_${Date.now()}`;

  await ruvectorClient.createSnapshot({
    collection: 'media_embeddings',
    snapshot_name: snapshotName,
  });

  // Upload to S3
  await uploadToS3(`snapshots/${snapshotName}`, localSnapshotPath);

  logger.info('Snapshot created', { snapshot_name: snapshotName });
}

// Schedule daily at 2 AM
cron.schedule('0 2 * * *', createVectorSnapshot);
```

### Recovery Procedure

```bash
# 1. Restore PostgreSQL from backup
pg_restore -d meta_media_search latest_backup.dump

# 2. Restore ruvector from snapshot
curl -X POST 'http://localhost:6333/collections/media_embeddings/snapshots/upload' \
  -F 'snapshot=@snapshot_1234567890.tar'

# 3. Run reconciliation
npm run reconcile-data-stores

# 4. Verify consistency
npm run verify-data-consistency
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-05
**Authors**: Data Architecture Team
