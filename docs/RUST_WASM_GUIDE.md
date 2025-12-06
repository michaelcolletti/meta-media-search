# Rust/WASM Integration Guide

## Overview

The Rust/WASM module provides high-performance vector operations for the Meta Media Search application. It leverages WebAssembly for near-native performance in the browser.

## Architecture

### Module Structure

```
src/rust-wasm/
├── src/
│   ├── lib.rs              # Module initialization and exports
│   ├── vector_search.rs    # Core search algorithms
│   ├── embeddings.rs       # Embedding utilities
│   ├── wasm_bindings.rs    # JavaScript API bindings
│   └── utils.rs            # Helper functions
├── tests/
│   └── rust/
│       └── vector_search.rs # Integration tests
├── Cargo.toml              # Rust dependencies
├── build.sh                # Build script
└── README.md               # Module documentation
```

### Key Components

#### 1. Vector Search (`vector_search.rs`)

Implements high-performance similarity search with multiple distance metrics:

- **Cosine Similarity**: Normalized dot product, best for semantic similarity
- **Euclidean Distance**: L2 norm, good for geometric distance
- **Manhattan Distance**: L1 norm, faster than Euclidean
- **Dot Product**: Raw correlation, fastest but unnormalized

**Performance Characteristics:**
- O(n) search complexity for brute-force (suitable for <100k vectors)
- O(d) per comparison where d is dimension
- SIMD acceleration available with `simd` feature flag

#### 2. Embeddings (`embeddings.rs`)

Provides utilities for working with vector embeddings:

- **Pooling Strategies**: Mean, max, sum, weighted
- **Statistics**: Mean, std dev, min, max per dimension
- **Dimensionality Reduction**: PCA-like projection
- **Centroid Computation**: Average vector calculation

#### 3. WASM Bindings (`wasm_bindings.rs`)

JavaScript-friendly API with:

- **VectorSearchEngine**: High-level search interface
- **BatchProcessor**: Batch operations for efficiency
- **CompressedVectorStore**: Memory-efficient storage
- **Utility Functions**: Standalone operations

## Building

### Prerequisites

1. Install Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. Install wasm-pack:
```bash
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

### Build Commands

```bash
cd src/rust-wasm

# Development build (faster compile, larger binary)
./build.sh --dev

# Production build (optimized, smaller binary)
./build.sh

# Build for specific target
./build.sh --target nodejs    # For Node.js
./build.sh --target bundler   # For webpack/rollup
./build.sh --target web       # For direct browser use (default)
```

### Build Output

The build creates a `pkg/` directory with:

- `*.wasm` - WebAssembly binary
- `*.js` - JavaScript bindings
- `*.d.ts` - TypeScript type definitions
- `package.json` - NPM package metadata

## Usage Patterns

### Basic Search

```javascript
import init, { VectorSearchEngine } from './pkg/meta_media_search_wasm.js';

async function setupSearch() {
  // Initialize WASM module
  await init();

  // Create search engine (768-dim, cosine similarity)
  const engine = new VectorSearchEngine(768, "cosine");

  // Add vectors (from your embeddings)
  for (const embedding of embeddings) {
    engine.add(Array.from(embedding));
  }

  // Search
  const results = engine.search(queryVector, 10);

  console.log(`Found ${results.count()} results in ${results.query_time()}ms`);

  // Access results
  for (let i = 0; i < results.count(); i++) {
    const result = results.get(i);
    console.log(`ID: ${result.id}, Score: ${result.score}`);
  }
}
```

### Batch Operations

```javascript
import { BatchProcessor } from './pkg/meta_media_search_wasm.js';

async function processBatch() {
  await init();

  const processor = new BatchProcessor(768, 100);

  // Normalize 100 vectors at once
  const vectors = new Float32Array(100 * 768);
  // ... fill vectors ...

  const normalized = processor.process(vectors, "normalize");

  // Compute centroid
  const centroid = processor.process(vectors, "centroid");
}
```

### Memory-Efficient Storage

```javascript
import { CompressedVectorStore } from './pkg/meta_media_search_wasm.js';

async function useCompression() {
  await init();

  // 8-bit quantization (8x compression)
  const store = new CompressedVectorStore(768, 8);

  // Add vectors (automatically compressed)
  for (const vector of vectors) {
    await store.add(vector);
  }

  console.log(`Stored ${store.count()} vectors`);
  console.log(`Memory: ${store.memory_usage()} bytes`);
  console.log(`Compression ratio: ${(store.count() * 768 * 4) / store.memory_usage()}x`);

  // Retrieve (automatically decompressed)
  const retrieved = await store.get(0);
}
```

### Web Worker Integration

```javascript
// worker.js
import init, { VectorSearchEngine } from './pkg/meta_media_search_wasm.js';

let engine;

self.onmessage = async (e) => {
  const { type, data } = e.data;

  switch (type) {
    case 'init':
      await init();
      engine = new VectorSearchEngine(data.dimension, data.metric);
      self.postMessage({ type: 'ready' });
      break;

    case 'add':
      data.vectors.forEach(v => engine.add(v));
      self.postMessage({ type: 'added', count: data.vectors.length });
      break;

    case 'search':
      const results = engine.search(data.query, data.k);
      self.postMessage({
        type: 'results',
        results: Array.from({ length: results.count() }, (_, i) => results.get(i)),
        time: results.query_time()
      });
      break;
  }
};
```

## Performance Optimization

### 1. Pre-normalize Vectors

For cosine similarity, pre-normalize vectors:

```javascript
import { normalize_vector_js } from './pkg/meta_media_search_wasm.js';

const normalized = embeddings.map(v => normalize_vector_js(v));
```

### 2. Use Batch Operations

Process multiple vectors at once:

```javascript
// ❌ Slow: Individual operations
vectors.forEach(v => engine.add(v));

// ✓ Fast: Batch operation
const flat = new Float32Array(vectors.length * dimension);
vectors.forEach((v, i) => flat.set(v, i * dimension));
engine.add_batch(flat, vectors.length);
```

### 3. Enable WASM SIMD

Build with SIMD support for 2-4x speedup:

```bash
RUSTFLAGS="-C target-feature=+simd128" wasm-pack build --release
```

### 4. Memory Management

Reuse buffers to avoid allocations:

```javascript
const queryBuffer = new Float32Array(768);

function search(vector) {
  queryBuffer.set(vector);
  return engine.search(queryBuffer, 10);
}
```

## Testing

### Unit Tests

```bash
cd src/rust-wasm
cargo test
```

### WASM Tests

```bash
# Chrome headless
wasm-pack test --chrome --headless

# Firefox headless
wasm-pack test --firefox --headless

# Node.js
wasm-pack test --node
```

### Benchmarks

```bash
cargo bench
```

## Debugging

### Enable Panic Hooks

```javascript
import { set_panic_hook } from './pkg/meta_media_search_wasm.js';

// Call once at startup for better error messages
set_panic_hook();
```

### Performance Profiling

```javascript
import { get_performance_metrics } from './pkg/meta_media_search_wasm.js';

// Before operation
const before = JSON.parse(await get_performance_metrics());

// ... perform operations ...

// After operation
const after = JSON.parse(await get_performance_metrics());

console.log('Memory delta:', after.memory_used - before.memory_used);
console.log('Time elapsed:', after.now - before.now);
```

### Console Logging

```javascript
import { log } from './pkg/meta_media_search_wasm.js';

// Logs to browser console from Rust
log("Debug message from WASM");
```

## Integration with Backend

### Coordination via Memory

The Rust/WASM module coordinates with backend services:

```javascript
// Store search results in shared memory
const results = engine.search(query, 10);
await fetch('/api/memory/store', {
  method: 'POST',
  body: JSON.stringify({
    key: 'swarm/wasm/search-results',
    value: results.to_json()
  })
});
```

### Post-Edit Notifications

```bash
# Notify after WASM updates
npx claude-flow@alpha hooks post-edit \
  --file "src/rust-wasm/pkg" \
  --memory-key "swarm/wasm/build"
```

## Common Issues

### Issue: WASM Binary Too Large

**Solution**: Enable optimization and strip debug symbols

```toml
# Cargo.toml
[profile.release]
opt-level = "z"  # Optimize for size
lto = true
codegen-units = 1
strip = true
```

### Issue: Slow Search Performance

**Solution**: Check metric and vector count

```javascript
const stats = JSON.parse(engine.stats());
console.log('Index size:', stats.size);
console.log('Dimension:', stats.dimension);

// If size > 100k, consider approximate search (HNSW, LSH)
```

### Issue: Memory Errors

**Solution**: Use compressed storage or pagination

```javascript
// Instead of loading all vectors
const store = new CompressedVectorStore(768, 8);

// Or paginate searches
function searchPaginated(query, pageSize = 1000) {
  const allResults = [];
  for (let offset = 0; offset < totalVectors; offset += pageSize) {
    const batch = getBatch(offset, pageSize);
    const results = searchBatch(batch, query);
    allResults.push(...results);
  }
  return allResults.sort((a, b) => b.score - a.score).slice(0, 10);
}
```

## Future Enhancements

1. **Approximate Search**: HNSW, Product Quantization for large datasets
2. **GPU Acceleration**: WebGPU integration for parallel search
3. **Incremental Updates**: Dynamic index updates without rebuild
4. **Multi-threaded Search**: Parallel search across shards
5. **Advanced Metrics**: Learned metrics, adaptive distance functions

## References

- [wasm-pack Documentation](https://rustwasm.github.io/docs/wasm-pack/)
- [wasm-bindgen Guide](https://rustwasm.github.io/docs/wasm-bindgen/)
- [Rust WASM Book](https://rustwasm.github.io/docs/book/)
- [WebAssembly Performance](https://hacks.mozilla.org/category/webassembly/)
