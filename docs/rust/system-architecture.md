# System Architecture: Rust/WASM Integration

## Executive Summary

This document outlines the comprehensive system architecture for integrating Rust/WebAssembly (WASM) components with ruvector and agentdb in the Meta-Media-Search platform. The architecture emphasizes performance, scalability, browser/mobile optimization, and seamless integration with the existing TypeScript codebase.

## Architecture Decision Records (ADRs)

### ADR-001: Hybrid Architecture Approach
**Decision**: Adopt a hybrid architecture combining PostgreSQL for relational data with ruvector for vector embeddings and agentdb for user preferences.

**Context**:
- Current PostgreSQL-only approach limits semantic search performance
- Browser-based vector operations need client-side optimization
- Mobile platforms require efficient memory usage

**Consequences**:
- **Positive**: 30-50% faster semantic search, client-side caching, offline capabilities
- **Negative**: Increased system complexity, dual data synchronization
- **Mitigation**: Use event-driven architecture for data consistency

### ADR-002: Rust/WASM for Performance-Critical Operations
**Decision**: Use Rust compiled to WASM for vector operations, embedding generation, and recommendation algorithms.

**Rationale**:
- 5-10x performance improvement over JavaScript for numerical operations
- Zero-copy memory sharing between JavaScript and WASM
- Type safety and memory safety guarantees
- Cross-platform compatibility (browser + Node.js + mobile)

**Trade-offs**:
- Development complexity increases
- Build pipeline becomes more complex
- Team needs Rust expertise

### ADR-003: Layered Architecture Pattern
**Decision**: Implement a 5-layer architecture separating concerns by abstraction level.

**Layers**:
1. **Presentation Layer** (React/TypeScript) - UI Components
2. **Application Layer** (TypeScript) - Business Logic
3. **WASM Bridge Layer** (Rust→WASM) - Performance-critical operations
4. **Data Access Layer** (Rust + TypeScript) - Database abstraction
5. **Storage Layer** - PostgreSQL, ruvector, agentdb

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ React UI     │  │ Mobile App   │  │ Browser Ext  │                  │
│  │ Components   │  │ (React Native│  │              │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
└─────────┼──────────────────┼──────────────────┼──────────────────────────┘
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼──────────────────────────┐
│         │    APPLICATION LAYER (TypeScript)   │                          │
│  ┌──────▼─────────────────────────────────────▼───────────────┐         │
│  │  API Gateway & Routing                                      │         │
│  │  - Express.js REST API                                      │         │
│  │  - GraphQL (optional)                                       │         │
│  │  - WebSocket for real-time updates                          │         │
│  └───────┬──────────────────────────────────────────────────┬──┘         │
│          │                                                  │            │
│  ┌───────▼────────────┐  ┌────────────────┐  ┌────────────▼─────────┐  │
│  │ Search Controller  │  │ User Controller│  │ Recommendation       │  │
│  │ - Query processing │  │ - Auth/Session │  │ Controller           │  │
│  │ - Result ranking   │  │ - Preferences  │  │ - Personalization    │  │
│  └───────┬────────────┘  └────────┬───────┘  └──────────┬───────────┘  │
└──────────┼─────────────────────────┼──────────────────────┼──────────────┘
           │                         │                      │
┌──────────┼─────────────────────────┼──────────────────────┼──────────────┐
│          │      WASM BRIDGE LAYER (Rust→WASM)            │              │
│  ┌───────▼─────────────┐  ┌────────▼──────────┐  ┌──────▼──────────┐   │
│  │ VectorOps Module    │  │ Embedding Module  │  │ Ranking Module  │   │
│  │ ┌─────────────────┐ │  │ ┌───────────────┐ │  │ ┌─────────────┐ │   │
│  │ │ Similarity      │ │  │ │ Text→Vector   │ │  │ │ Score Calc  │ │   │
│  │ │ Calculation     │ │  │ │ BERT/Sentence │ │  │ │ Hybrid Rank │ │   │
│  │ │ (cosine, dot)   │ │  │ │ Transformers  │ │  │ │ Re-ranking  │ │   │
│  │ └─────────────────┘ │  │ └───────────────┘ │  │ └─────────────┘ │   │
│  │ ┌─────────────────┐ │  │ ┌───────────────┐ │  │ ┌─────────────┐ │   │
│  │ │ Clustering      │ │  │ │ Image→Vector  │ │  │ │ Diversity   │ │   │
│  │ │ (K-means, DBSCAN│ │  │ │ CLIP embeddings│ │  │ │ Optimizer   │ │   │
│  │ └─────────────────┘ │  │ └───────────────┘ │  │ └─────────────┘ │   │
│  │ ┌─────────────────┐ │  │                   │  │                 │   │
│  │ │ Index Ops       │ │  │                   │  │                 │   │
│  │ │ (HNSW, IVF)     │ │  │                   │  │                 │   │
│  │ └─────────────────┘ │  │                   │  │                 │   │
│  └─────────┬───────────┘  └────────┬──────────┘  └──────┬──────────┘   │
└────────────┼──────────────────────────┼──────────────────┼──────────────┘
             │                          │                  │
┌────────────┼──────────────────────────┼──────────────────┼──────────────┐
│            │   DATA ACCESS LAYER                         │              │
│  ┌─────────▼──────────┐  ┌──────────▼────────┐  ┌───────▼────────────┐ │
│  │ Vector Repository  │  │ Media Repository  │  │ User Repository    │ │
│  │ (Rust + TS)        │  │ (TypeScript)      │  │ (TypeScript)       │ │
│  │ - ruvector client  │  │ - PostgreSQL      │  │ - agentdb client   │ │
│  │ - Caching layer    │  │ - Redis cache     │  │ - Preference store │ │
│  └─────────┬──────────┘  └──────────┬────────┘  └────────┬───────────┘ │
└────────────┼──────────────────────────┼──────────────────────┼───────────┘
             │                          │                      │
┌────────────┼──────────────────────────┼──────────────────────┼───────────┐
│            │         STORAGE LAYER    │                      │           │
│  ┌─────────▼──────────┐  ┌──────────▼────────┐  ┌──────────▼─────────┐ │
│  │ ruvector           │  │ PostgreSQL        │  │ agentdb            │ │
│  │ ┌────────────────┐ │  │ ┌────────────────┐│  │ ┌────────────────┐ │ │
│  │ │ Vector Index   │ │  │ │ Media Table    ││  │ │ Preferences    │ │ │
│  │ │ - 384/768/1536 │ │  │ │ Platforms Table││  │ │ Watch History  │ │ │
│  │ │ dimensions     │ │  │ │ Users Table    ││  │ │ Favorites      │ │ │
│  │ └────────────────┘ │  │ └────────────────┘│  │ └────────────────┘ │ │
│  │ ┌────────────────┐ │  │ ┌────────────────┐│  │ ┌────────────────┐ │ │
│  │ │ Metadata Store │ │  │ │ Relationships  ││  │ │ Sessions       │ │ │
│  │ │ (id→metadata)  │ │  │ │ Indexes        ││  │ │ Context        │ │ │
│  │ └────────────────┘ │  │ └────────────────┘│  │ └────────────────┘ │ │
│  └────────────────────┘  └───────────────────┘  └────────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Redis Cache Layer                                               │   │
│  │ - Query results (TTL: 5min)                                     │   │
│  │ - Embeddings cache (TTL: 1hr)                                   │   │
│  │ - User sessions                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. WASM Bridge Layer Components

#### VectorOps Module
```rust
// High-performance vector operations
pub struct VectorOps {
    dimension: usize,
    index_type: IndexType,
}

impl VectorOps {
    pub fn cosine_similarity(&self, a: &[f32], b: &[f32]) -> f32;
    pub fn batch_similarity(&self, query: &[f32], vectors: &[Vec<f32>]) -> Vec<(usize, f32)>;
    pub fn cluster(&self, vectors: &[Vec<f32>], k: usize) -> ClusterResult;
    pub fn build_index(&self, vectors: &[Vec<f32>]) -> Index;
}
```

#### Embedding Module
```rust
pub struct EmbeddingEngine {
    model: ModelType,
    tokenizer: Tokenizer,
}

impl EmbeddingEngine {
    pub fn text_to_embedding(&self, text: &str) -> Vec<f32>;
    pub fn batch_encode(&self, texts: &[String]) -> Vec<Vec<f32>>;
    pub fn image_to_embedding(&self, image_data: &[u8]) -> Vec<f32>;
}
```

#### Ranking Module
```rust
pub struct HybridRanker {
    weights: RankingWeights,
}

impl HybridRanker {
    pub fn rank(&self, candidates: &[Candidate], query_context: &Context) -> Vec<ScoredItem>;
    pub fn rerank(&self, initial_results: &[Item], user_prefs: &UserPrefs) -> Vec<Item>;
    pub fn diversity_optimize(&self, items: &[Item], diversity_factor: f32) -> Vec<Item>;
}
```

### 2. Data Access Layer

#### Vector Repository (Hybrid Rust/TypeScript)
```typescript
export class VectorRepository {
  private ruvectorClient: RuvectorClient; // Rust client via FFI/WASM
  private cache: RedisCache;

  async search(query: Float32Array, k: number): Promise<SearchResult[]>;
  async insert(id: string, vector: Float32Array, metadata: any): Promise<void>;
  async update(id: string, vector: Float32Array): Promise<void>;
  async delete(id: string): Promise<void>;
}
```

#### Media Repository (TypeScript)
```typescript
export class MediaRepository {
  private db: PostgresClient;
  private cache: RedisCache;

  async findById(id: string): Promise<MediaItem | null>;
  async search(filters: SearchFilters): Promise<MediaItem[]>;
  async bulkInsert(items: MediaItem[]): Promise<void>;
}
```

#### User Repository (TypeScript)
```typescript
export class UserRepository {
  private agentdb: AgentDBClient;

  async getPreferences(userId: string): Promise<UserPreferences>;
  async updatePreferences(userId: string, prefs: UserPreferences): Promise<void>;
  async getWatchHistory(userId: string, limit: number): Promise<WatchHistory[]>;
}
```

## Technology Stack

### Core Technologies
| Component | Technology | Justification |
|-----------|-----------|---------------|
| Backend API | Node.js + Express + TypeScript | Existing ecosystem, team expertise |
| WASM Runtime | Rust → wasm-bindgen → WASM | Performance, safety, cross-platform |
| Vector Database | ruvector | Purpose-built for embeddings, Rust-native |
| Relational DB | PostgreSQL 14+ | ACID compliance, pgvector extension |
| Agent Storage | agentdb | User preferences, context management |
| Cache | Redis 7+ | High-performance KV store |
| Message Queue | Redis Streams | Event-driven architecture |

### Rust Crates
```toml
[dependencies]
wasm-bindgen = "0.2"
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"
ndarray = "0.15"
rayon = "1.7"
tokenizers = "0.19"
candle-core = "0.7"  # For ML models
ruvector-client = "0.3"
```

### TypeScript Libraries
```json
{
  "dependencies": {
    "ruvector-js": "^0.3.0",
    "agentdb-client": "^1.2.0",
    "@wasm-tool/wasm-pack-plugin": "^1.7.0"
  }
}
```

## Performance Characteristics

### Benchmarks (Expected)

| Operation | JavaScript | Rust/WASM | Improvement |
|-----------|-----------|-----------|-------------|
| Vector similarity (1000 vectors) | 45ms | 8ms | 5.6x |
| Embedding generation (batch 32) | 180ms | 35ms | 5.1x |
| K-means clustering (10k points) | 2300ms | 310ms | 7.4x |
| HNSW index search | 12ms | 2ms | 6x |
| Hybrid ranking (500 items) | 28ms | 6ms | 4.7x |

### Memory Footprint
- JavaScript-only: ~150MB baseline
- With WASM modules: ~180MB baseline (+20%)
- Peak during large operations: ~400MB vs 850MB (53% reduction)

## Security Considerations

### WASM Security Model
1. **Sandboxing**: WASM runs in isolated sandbox
2. **Memory safety**: Rust's borrow checker prevents common vulnerabilities
3. **No direct DOM access**: All DOM operations via JavaScript bridge
4. **Content Security Policy**: Strict CSP headers for WASM loading

### Data Protection
1. **Encryption at rest**: Vector embeddings encrypted in ruvector
2. **Encryption in transit**: TLS 1.3 for all API calls
3. **User privacy**: agentdb isolates user preferences per tenant
4. **GDPR compliance**: Right to deletion, data portability

## Scalability Strategy

### Horizontal Scaling
```
┌─────────────────────────────────────────────────────────┐
│  Load Balancer (NGINX/HAProxy)                          │
└────────────┬───────────────────────────────────────────┘
             │
      ┌──────┴──────┬──────────┬──────────┐
      │             │          │          │
┌─────▼─────┐ ┌────▼────┐ ┌───▼────┐ ┌───▼────┐
│ API Node 1│ │API Node2│ │ Node 3 │ │ Node N │
└─────┬─────┘ └────┬────┘ └───┬────┘ └───┬────┘
      │            │          │          │
      └────────────┴──────────┴──────────┘
                   │
      ┌────────────┴────────────────────┐
      │                                  │
┌─────▼─────────┐          ┌────────────▼────┐
│ ruvector      │          │ PostgreSQL      │
│ (sharded by   │          │ (read replicas) │
│  dimension)   │          │                 │
└───────────────┘          └─────────────────┘
```

### Caching Strategy
1. **L1 Cache**: WASM linear memory (client-side, 10MB)
2. **L2 Cache**: Redis (server-side, 1-hour TTL)
3. **L3 Cache**: CDN for static embeddings (24-hour TTL)

## Deployment Architecture

### Development Environment
```yaml
services:
  api:
    image: node:20-alpine
    volumes:
      - ./src:/app/src
    environment:
      - NODE_ENV=development

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_DB=meta_media_search

  ruvector:
    image: ruvector/server:latest
    ports:
      - "6333:6333"

  redis:
    image: redis:7-alpine
```

### Production Environment (Kubernetes)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: meta-media-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: meta-media-api
  template:
    spec:
      containers:
      - name: api
        image: meta-media-api:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        env:
        - name: RUVECTOR_URL
          value: "http://ruvector-service:6333"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
```

## Migration Strategy

See detailed migration plan in [/docs/vector-db/data-flow.md](../vector-db/data-flow.md)

### Phase 1: Parallel Run (Weeks 1-2)
- Deploy ruvector alongside PostgreSQL
- Dual-write to both systems
- Validate data consistency

### Phase 2: Gradual Cutover (Weeks 3-4)
- Route 10% of reads to ruvector
- Monitor performance metrics
- Increase to 50%, then 100%

### Phase 3: Optimization (Weeks 5-6)
- Remove PostgreSQL pgvector extension
- Optimize schema for relational-only data
- Implement backup/disaster recovery

## Monitoring & Observability

### Key Metrics
1. **WASM Performance**
   - Instantiation time: <100ms
   - Memory usage: <200MB
   - Function call latency: <1ms

2. **Vector Operations**
   - Search latency (p95): <10ms
   - Index build time: <5min for 1M vectors
   - Similarity accuracy: >95%

3. **System Health**
   - API response time (p99): <200ms
   - Database connection pool: <80% utilization
   - Cache hit rate: >70%

### Logging Strategy
```typescript
// Structured logging with context
logger.info('Vector search completed', {
  query_id: queryId,
  duration_ms: durationMs,
  results_count: results.length,
  cache_hit: cacheHit,
  wasm_module: 'vector_ops',
});
```

## Disaster Recovery

### Backup Strategy
1. **PostgreSQL**: Daily full backup + WAL archiving
2. **ruvector**: Snapshot every 6 hours
3. **agentdb**: Continuous replication
4. **Redis**: RDB snapshots every hour

### Recovery Time Objectives
- **RTO**: 15 minutes for critical services
- **RPO**: 5 minutes for user data
- **Data loss tolerance**: <0.01%

## Future Enhancements

### Phase 2 (Q2 2025)
- [ ] Multi-modal embeddings (text + image + audio)
- [ ] Real-time index updates with RAFT consensus
- [ ] GPU acceleration for embedding generation
- [ ] Federated search across multiple vector databases

### Phase 3 (Q3 2025)
- [ ] Edge deployment (Cloudflare Workers + WASM)
- [ ] Mobile SDK (React Native + WASM)
- [ ] Offline-first architecture
- [ ] Blockchain-based content verification

## References

1. [WASM Module Design](/docs/wasm/module-design.md)
2. [Data Flow Diagrams](/docs/vector-db/data-flow.md)
3. [API Contracts](/docs/api/wasm-js-interface.md)
4. [ruvector Documentation](https://github.com/ruvnet/ruvector)
5. [agentdb Documentation](https://github.com/ruvnet/agentdb)

## Appendices

### Appendix A: Glossary
- **WASM**: WebAssembly, portable binary instruction format
- **ruvector**: Rust-based vector database optimized for embeddings
- **agentdb**: Agent-specific database for user preferences and context
- **HNSW**: Hierarchical Navigable Small World graph for approximate nearest neighbor search
- **IVF**: Inverted File Index for vector search

### Appendix B: Team Expertise Requirements
- **Required**: Rust (intermediate), TypeScript (advanced), PostgreSQL (intermediate)
- **Nice to have**: WASM internals, vector database optimization, distributed systems
- **Training needed**: ruvector administration, agentdb integration patterns

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-05
**Authors**: System Architecture Team
**Review Cycle**: Quarterly
