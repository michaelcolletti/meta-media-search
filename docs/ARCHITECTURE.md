# Architecture Overview

Meta-Media-Search hybrid architecture combining traditional backend with cutting-edge Rust/WASM optimization.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Browser    │  │   Mobile     │  │   Desktop    │      │
│  │   (WASM)     │  │   (WASM)     │  │   Extension  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  WASM Runtime Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  RuVector    │  │   AgentDB    │  │  Embeddings  │      │
│  │  (61µs)      │  │  (Memory)    │  │  (Offline)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               TypeScript Integration Layer                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  API Client  │  │  WASM Bridge │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Personalization Engine                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Collaborative │  │Content-Based │  │   Causal     │      │
│  │  Filtering   │  │  Filtering   │  │  Inference   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Express API │  │  RuVector    │  │   AgentDB    │      │
│  │  (Node.js)   │  │  Server      │  │   Server     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │  Vector DB   │      │
│  │  (Metadata)  │  │   (Cache)    │  │ (Embeddings) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. RuVector Vector Database

**Purpose**: Sub-millisecond vector similarity search

**Features**:
- HNSW indexing (61µs latency)
- Graph Neural Networks (GNN)
- Adaptive compression (2-32x)
- Cypher query language
- Multi-master replication

**Location**: `src/rust-wasm/`, `src/vector-db/ruvector-client.ts`

### 2. AgentDB Memory System

**Purpose**: AI agent memory and learning

**Features**:
- ReasoningBank (strategy-level memory)
- Causal inference
- Reflexion learning
- 29 MCP tools
- Self-evolution

**Location**: `src/vector-db/agentdb-client.ts`

### 3. Personalization Engine

**Purpose**: Hybrid recommendation system

**Algorithms**:
- Collaborative filtering
- Content-based filtering
- Causal scoring
- Multi-armed bandits
- Strategy-guided recommendations

**Location**: `src/personalization/engine.ts`

### 4. Rust/WASM Core

**Purpose**: High-performance browser operations

**Modules**:
- Vector search (`vector_search.rs`)
- Embeddings (`embeddings.rs`)
- WASM bindings (`wasm_bindings.rs`)
- Mobile optimization (`mobile-core.rs`)

**Location**: `src/rust-wasm/src/`

## Data Flow

### Search Request Flow

```
1. User enters query
   ↓
2. React component captures input
   ↓
3. WASM module processes (optional, if offline)
   ↓
4. API request to backend
   ↓
5. Embedding generation (OpenAI)
   ↓
6. Vector search (RuVector)
   ↓
7. Personalization scoring
   ↓
8. Results ranked and filtered
   ↓
9. Response to frontend
   ↓
10. Visual map rendering
```

### Personalization Flow

```
1. User interaction (watch, like, skip)
   ↓
2. Store in AgentDB memory
   ↓
3. Update user profile embedding
   ↓
4. Trigger ReasoningBank evolution
   ↓
5. Causal inference (if enough data)
   ↓
6. Update recommendation weights
   ↓
7. Real-time recommendation refresh
```

## Performance Optimizations

### Vector Search

- **HNSW Index**: O(log n) search complexity
- **SIMD Operations**: 2-10x speedup
- **Adaptive Compression**: Memory reduction
- **Batch Processing**: Parallel operations

### Caching Strategy

```
L1: Browser (WASM) - Instant
L2: Redis - <1ms
L3: RuVector - <100µs
L4: PostgreSQL - <10ms
```

### WASM Optimization

- **Code Splitting**: Lazy load modules
- **Tree Shaking**: Remove unused code
- **Compression**: gzip/brotli
- **Bundle Size**: <500KB target

## Security Architecture

### Authentication

- JWT tokens (httpOnly cookies)
- Refresh token rotation
- CSRF protection
- Rate limiting

### Data Protection

- Encryption at rest (PostgreSQL)
- TLS in transit
- Vector embedding isolation
- User data anonymization

## Scalability

### Horizontal Scaling

- **Backend**: Multiple Node.js instances
- **RuVector**: Multi-master replication
- **PostgreSQL**: Read replicas
- **Redis**: Cluster mode

### Performance Targets

- **Latency**: p50 <100ms, p99 <500ms
- **Throughput**: 10,000+ QPS
- **Availability**: 99.9% uptime
- **Scalability**: 1M+ users

## Deployment Architecture

### Development

```
Local Machine
├── Node.js (localhost:3000)
├── React Dev Server (localhost:5173)
├── PostgreSQL (localhost:5432)
└── Redis (localhost:6379)
```

### Production

```
Cloud Infrastructure
├── Load Balancer (HAProxy/nginx)
├── Backend Cluster (3+ instances)
├── RuVector Cluster (3+ nodes)
├── PostgreSQL Primary + Replicas
├── Redis Cluster
└── CDN (WASM artifacts)
```

## Technology Stack

### Frontend
- React 18
- TypeScript 5
- Vite 5
- Cytoscape.js
- Rust/WASM

### Backend
- Node.js 20
- Express 4
- TypeScript 5
- RuVector
- AgentDB

### Database
- PostgreSQL 14
- Redis 7
- Vector extensions

### DevOps
- Docker
- GitHub Actions
- Kubernetes (optional)

## Monitoring & Observability

### Metrics

- Request latency (p50, p95, p99)
- Error rates
- Cache hit ratios
- Vector search performance
- Memory usage
- CPU utilization

### Logging

- Structured JSON logs (pino)
- Request/response logging
- Error tracking (Sentry)
- Performance tracing

### Alerts

- High error rate (>1%)
- High latency (>500ms p99)
- Low cache hit rate (<80%)
- Memory/CPU thresholds

## API Design

### RESTful Endpoints

```
GET    /api/v1/search          - Search content
POST   /api/v1/search          - Advanced search
GET    /api/v1/recommendations - Get recommendations
POST   /api/v1/interactions    - Track user action
GET    /api/v1/profile         - Get user profile
PUT    /api/v1/profile         - Update preferences
```

### WASM API

```typescript
// Vector search
await vectorDB.search(query, k);

// User profiling
await agentDB.storeInteraction(interaction);

// Personalization
await engine.getRecommendations(userId, candidates);
```

## Future Enhancements

- **Real-time updates**: WebSocket integration
- **GraphQL API**: Flexible queries
- **Micro-frontends**: Modular UI
- **Edge computing**: Cloudflare Workers
- **Multi-region**: Global deployment

## References

- [RuVector Documentation](vector-db/ruvector-research.md)
- [AgentDB Guide](vector-db/agentdb-integration.md)
- [Rust/WASM Guide](RUST_WASM_GUIDE.md)
- [API Documentation](api/API_DOCUMENTATION.md)
