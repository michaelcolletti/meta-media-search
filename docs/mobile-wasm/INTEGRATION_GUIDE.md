# Mobile WASM Integration Guide

## Overview

This guide explains how to integrate the mobile-optimized WASM modules into the Meta Media Search application. The WASM modules provide high-performance search, offline storage, and data management capabilities optimized for mobile browsers.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                React Application                     │
├─────────────────────────────────────────────────────┤
│  useWasmModule Hook  │  AgentDB Bridge              │
├─────────────────────────────────────────────────────┤
│       WASM Loader (Lazy Loading)                    │
├─────────────────────────────────────────────────────┤
│  WASM Modules                                        │
│  ├── SearchEngine (Rust)                            │
│  ├── OfflineStorage (Rust + IndexedDB)              │
│  ├── PerformanceMonitor (Rust)                      │
│  └── DataCompressor (Rust)                          │
├─────────────────────────────────────────────────────┤
│  Service Worker (Progressive Enhancement)           │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Build WASM Modules

```bash
# Build optimized WASM modules
./scripts/build-wasm-mobile.sh

# Output will be in src/mobile-wasm/pkg/
```

### 2. Basic Usage in React

```tsx
import { useWasmModule } from '../hooks/useWasmModule';

function SearchComponent() {
  const { module, loading, error } = useWasmModule({
    autoLoad: true,
    onLoad: (mod) => console.log('WASM loaded!'),
  });

  if (loading) return <div>Loading WASM...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!module) return null;

  // Use WASM module
  const engine = new module.SearchEngine(100);
  // ...
}
```

### 3. Using Search Engine

```tsx
import { useWasmSearch } from '../hooks/useWasmModule';

function SearchFeature() {
  const { feature: searchEngine, loading } = useWasmSearch({
    cacheSize: 100,
    autoLoad: true,
  });

  const handleSearch = (query: string, items: any[]) => {
    if (!searchEngine) return [];

    const resultsJson = searchEngine.search(
      query,
      JSON.stringify(items)
    );

    return JSON.parse(resultsJson);
  };

  // ...
}
```

### 4. Using Offline Storage

```tsx
import { useOfflineStorage } from '../hooks/useWasmModule';

function OfflineFeature() {
  const { feature: storage, loading } = useOfflineStorage({
    autoLoad: true,
  });

  const saveOffline = async (key: string, data: any) => {
    if (!storage) return;

    await storage.init();
    await storage.store_media(
      key,
      JSON.stringify(data),
      3600000 // 1 hour TTL
    );
  };

  const loadOffline = async (key: string) => {
    if (!storage) return null;

    try {
      const data = await storage.get_media(key);
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  };

  // ...
}
```

### 5. Using AgentDB Bridge

```tsx
import { createAgentDBBridge } from '../../mobile-wasm/agentdb-bridge';
import { useWasmModule } from '../hooks/useWasmModule';

function AgentDBFeature() {
  const { module } = useWasmModule({ autoLoad: true });
  const [bridge, setBridge] = useState<AgentDBBridge | null>(null);

  useEffect(() => {
    if (module) {
      const initBridge = async () => {
        const searchEngine = new module.SearchEngine(100);
        const storage = new module.OfflineStorage();

        const agentBridge = await createAgentDBBridge(
          {
            namespace: 'meta-media',
            syncInterval: 30000,
            enableOfflineMode: true,
          },
          searchEngine,
          storage
        );

        setBridge(agentBridge);
      };

      initBridge();
    }
  }, [module]);

  const queryData = async () => {
    if (!bridge) return;

    const result = await bridge.query({
      collection: 'media',
      filter: { type: 'movie' },
      limit: 50,
    });

    console.log('Results:', result.data);
    console.log('Cached:', result.cached);
  };

  // ...
}
```

## Performance Optimization

### 1. Lazy Loading

```tsx
// Load WASM only when needed
function LazyFeature() {
  const { load, module, loading } = useWasmModule({
    autoLoad: false, // Don't load immediately
    lazy: true,
  });

  const handleClick = async () => {
    await load(); // Load on demand
    // Use module...
  };

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Loading...' : 'Use Feature'}
    </button>
  );
}
```

### 2. Preloading

```tsx
import { preloadWasm } from '../utils/wasm-loader';

// Preload WASM in the background
useEffect(() => {
  preloadWasm(); // Non-blocking preload
}, []);
```

### 3. Performance Monitoring

```tsx
import { getPerformanceMonitor } from '../utils/performance-monitor';

function PerformanceTracker() {
  const monitor = getPerformanceMonitor();

  useEffect(() => {
    monitor.mark('component-mount');

    // Track WASM load
    loadWasm().then(result => {
      monitor.trackWasmLoad(result.loadTime);
    });

    // Monitor battery and connection
    monitor.monitorBattery();
    monitor.monitorConnection();

    return () => {
      monitor.mark('component-unmount');
      const duration = monitor.measure(
        'component-lifetime',
        'component-mount',
        'component-unmount'
      );
      console.log('Component lifetime:', duration);
    };
  }, []);

  // Check performance
  const checkPerf = () => {
    const { acceptable, warnings } = monitor.checkPerformance();
    if (!acceptable) {
      console.warn('Performance issues:', warnings);
    }
  };

  // ...
}
```

## Service Worker Integration

### 1. Register Service Worker

```tsx
// In main.tsx or App.tsx
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(registration => {
        console.log('SW registered:', registration);
      })
      .catch(error => {
        console.error('SW registration failed:', error);
      });
  });
}
```

### 2. Communicate with Service Worker

```tsx
// Send message to service worker
const cacheWasm = () => {
  navigator.serviceWorker.controller?.postMessage({
    type: 'CACHE_WASM',
  });
};

// Get cache size
const getCacheSize = async () => {
  const channel = new MessageChannel();

  return new Promise((resolve) => {
    channel.port1.onmessage = (event) => {
      resolve(event.data.size);
    };

    navigator.serviceWorker.controller?.postMessage(
      { type: 'GET_CACHE_SIZE' },
      [channel.port2]
    );
  });
};
```

## Build Configuration

### Mobile-Specific Settings

```toml
# config/wasm/mobile-config.toml

[build.optimization]
opt_level = "z"           # Optimize for size
lto = true                # Link Time Optimization
target_size = 460800      # 450KB target

[mobile.network]
min_connection = "3g"     # Minimum 3G
timeout_ms = 10000        # 10s timeout

[mobile.capabilities]
min_memory_mb = 512       # Minimum 512MB RAM
check_battery = true      # Check battery
```

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    wasm(), // WASM plugin for Vite
  ],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          wasm: ['@meta-media/mobile-wasm'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@meta-media/mobile-wasm'],
  },
});
```

## Testing

### Run Tests

```bash
# Run WASM integration tests
npm run test:wasm

# Run with coverage
npm run test:wasm -- --coverage
```

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { loadWasm } from '../utils/wasm-loader';

describe('WASM Search', () => {
  it('should search and rank results', async () => {
    const { module } = await loadWasm();
    const engine = new module.SearchEngine(10);

    const items = [
      { id: '1', title: 'Test Movie', score: 0.9 },
      { id: '2', title: 'Another Film', score: 0.8 },
    ];

    const results = engine.search('test', JSON.stringify(items));
    expect(JSON.parse(results).length).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### WASM Not Loading

1. Check browser support:
```tsx
import { supportsWasm, shouldUseWasm } from '../utils/wasm-loader';

if (!supportsWasm()) {
  console.error('WASM not supported');
}

if (!shouldUseWasm()) {
  console.warn('Device not suitable for WASM');
}
```

2. Check bundle size:
```bash
ls -lh src/mobile-wasm/pkg/*.wasm
# Should be < 500KB
```

3. Check service worker:
```tsx
navigator.serviceWorker.ready.then(registration => {
  console.log('SW active:', registration.active);
});
```

### Performance Issues

1. Monitor metrics:
```tsx
const monitor = getPerformanceMonitor();
const metrics = monitor.getMetrics();
console.log('WASM load time:', metrics.wasmLoadTime);
console.log('Memory usage:', metrics.wasmMemoryUsage);
```

2. Check device capabilities:
```tsx
const deviceInfo = monitor.getDeviceInfo();
console.log('Device memory:', deviceInfo.memory);
console.log('Connection:', deviceInfo.connection);
```

3. Optimize loading:
```tsx
// Use lazy loading for non-critical features
const { load } = useWasmModule({ autoLoad: false });

// Load on user interaction
<button onClick={load}>Enable Feature</button>
```

## Best Practices

1. **Lazy Load**: Load WASM modules only when needed
2. **Cache Aggressively**: Use service worker and IndexedDB caching
3. **Monitor Performance**: Track load times, memory usage, and network conditions
4. **Graceful Degradation**: Provide JavaScript fallbacks for unsupported browsers
5. **Progressive Enhancement**: Add features incrementally based on capabilities
6. **Test on Real Devices**: Test on actual mobile devices with 3G connections
7. **Optimize Bundle Size**: Keep WASM bundles under 500KB (compressed)
8. **Use AgentDB**: Leverage agentdb for distributed data management

## API Reference

### Search Engine

```typescript
class SearchEngine {
  constructor(cacheSize: number);
  compute_similarity(query: string, text: string): number;
  search(query: string, items: string): string;
  clear_cache(): void;
  cache_stats(): { size: number; maxSize: number };
}
```

### Offline Storage

```typescript
class OfflineStorage {
  init(): Promise<void>;
  store_media(key: string, value: string, ttl?: number): Promise<void>;
  get_media(key: string): Promise<string>;
  store_search(query: string, results: string): Promise<void>;
  get_search(query: string): Promise<string>;
  store_preference(key: string, value: string): Promise<void>;
  get_preference(key: string): Promise<string>;
  clear_all(): Promise<void>;
  get_stats(): Promise<{ mediaCount: number; searchCount: number }>;
}
```

### AgentDB Bridge

```typescript
class AgentDBBridge {
  constructor(config: AgentDBConfig);
  initialize(searchEngine: SearchEngine, storage: OfflineStorage): Promise<void>;
  query<T>(query: AgentDBQuery): Promise<AgentDBResult<T>>;
  store<T>(collection: string, data: T[]): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<AgentDBResult>;
  sync(): Promise<SyncStatus>;
  clearOfflineData(): Promise<void>;
  destroy(): void;
}
```

## Resources

- [Rust WASM Book](https://rustwasm.github.io/docs/book/)
- [wasm-bindgen Guide](https://rustwasm.github.io/wasm-bindgen/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Performance](https://web.dev/performance/)
