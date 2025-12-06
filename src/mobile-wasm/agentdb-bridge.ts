/**
 * AgentDB Integration Bridge
 * Connects WASM modules with agentdb for distributed data management
 */

import type { SearchEngine, OfflineStorage, MediaItem } from './mobile-core';

// AgentDB types
export interface AgentDBConfig {
  namespace: string;
  syncInterval?: number;
  enableOfflineMode?: boolean;
  compressionEnabled?: boolean;
}

export interface AgentDBQuery {
  collection: string;
  filter?: Record<string, any>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

export interface AgentDBResult<T = any> {
  data: T[];
  total: number;
  cached: boolean;
  timestamp: number;
}

export interface SyncStatus {
  lastSync: number;
  pendingChanges: number;
  syncInProgress: boolean;
  errors: string[];
}

/**
 * Bridge between WASM modules and agentdb
 */
export class AgentDBBridge {
  private config: AgentDBConfig;
  private searchEngine?: SearchEngine;
  private offlineStorage?: OfflineStorage;
  private syncTimer?: number;
  private pendingSync: Set<string> = new Set();

  constructor(config: AgentDBConfig) {
    this.config = {
      syncInterval: 30000, // 30 seconds default
      enableOfflineMode: true,
      compressionEnabled: true,
      ...config,
    };
  }

  /**
   * Initialize bridge with WASM modules
   */
  async initialize(
    searchEngine: SearchEngine,
    offlineStorage: OfflineStorage
  ): Promise<void> {
    this.searchEngine = searchEngine;
    this.offlineStorage = offlineStorage;

    // Initialize offline storage
    if (this.config.enableOfflineMode) {
      await this.offlineStorage.init();
    }

    // Start sync timer
    if (this.config.syncInterval && this.config.syncInterval > 0) {
      this.startSyncTimer();
    }

    console.log('[AgentDBBridge] Initialized with config:', this.config);
  }

  /**
   * Query agentdb with offline fallback
   */
  async query<T = any>(query: AgentDBQuery): Promise<AgentDBResult<T>> {
    const cacheKey = this.generateCacheKey(query);
    const startTime = performance.now();

    try {
      // Try offline storage first
      if (this.config.enableOfflineMode && this.offlineStorage) {
        const cached = await this.getCachedQuery<T>(cacheKey);
        if (cached) {
          console.log('[AgentDBBridge] Cache hit:', cacheKey);
          return {
            ...cached,
            cached: true,
          };
        }
      }

      // Query agentdb (mock implementation - replace with actual agentdb client)
      const results = await this.queryAgentDB<T>(query);

      // Cache results
      if (this.config.enableOfflineMode && this.offlineStorage) {
        await this.cacheQuery(cacheKey, results);
      }

      const duration = performance.now() - startTime;
      console.log(`[AgentDBBridge] Query completed in ${duration.toFixed(2)}ms`);

      return {
        ...results,
        cached: false,
      };
    } catch (error) {
      console.error('[AgentDBBridge] Query failed:', error);

      // Fallback to cached data on error
      if (this.config.enableOfflineMode && this.offlineStorage) {
        const cached = await this.getCachedQuery<T>(cacheKey);
        if (cached) {
          console.warn('[AgentDBBridge] Using stale cache due to error');
          return {
            ...cached,
            cached: true,
          };
        }
      }

      throw error;
    }
  }

  /**
   * Store data to agentdb with offline queue
   */
  async store<T = any>(
    collection: string,
    data: T[],
    options?: { immediate?: boolean }
  ): Promise<void> {
    try {
      if (options?.immediate || !this.config.enableOfflineMode) {
        // Store immediately
        await this.storeToAgentDB(collection, data);
      } else {
        // Queue for batch sync
        const queueKey = `${collection}:${Date.now()}`;
        await this.queueForSync(queueKey, collection, data);
        this.pendingSync.add(queueKey);
      }
    } catch (error) {
      console.error('[AgentDBBridge] Store failed:', error);

      // Always queue on error for retry
      if (this.config.enableOfflineMode) {
        const queueKey = `${collection}:${Date.now()}`;
        await this.queueForSync(queueKey, collection, data);
        this.pendingSync.add(queueKey);
      }

      throw error;
    }
  }

  /**
   * Search with WASM acceleration and agentdb fallback
   */
  async search(
    query: string,
    options?: {
      collection?: string;
      useWASM?: boolean;
      limit?: number;
    }
  ): Promise<AgentDBResult<MediaItem>> {
    const useWASM = options?.useWASM !== false;

    if (useWASM && this.searchEngine) {
      // Try local WASM search first
      try {
        const localResults = await this.searchLocal(query, options);
        if (localResults.data.length > 0) {
          return localResults;
        }
      } catch (error) {
        console.warn('[AgentDBBridge] WASM search failed, falling back:', error);
      }
    }

    // Fallback to agentdb search
    return this.query<MediaItem>({
      collection: options?.collection || 'media',
      filter: { $text: { $search: query } },
      limit: options?.limit || 50,
    });
  }

  /**
   * Synchronize pending changes with agentdb
   */
  async sync(): Promise<SyncStatus> {
    if (!this.config.enableOfflineMode || !this.offlineStorage) {
      return this.getSyncStatus();
    }

    console.log('[AgentDBBridge] Starting sync...', this.pendingSync.size, 'items');

    const status: SyncStatus = {
      lastSync: Date.now(),
      pendingChanges: this.pendingSync.size,
      syncInProgress: true,
      errors: [],
    };

    // Process pending sync queue
    for (const queueKey of this.pendingSync) {
      try {
        const data = await this.offlineStorage.get_media(queueKey);
        if (data) {
          const parsed = JSON.parse(data as string);
          await this.storeToAgentDB(parsed.collection, parsed.data);
          this.pendingSync.delete(queueKey);
        }
      } catch (error) {
        const errorMsg = `Failed to sync ${queueKey}: ${error}`;
        console.error('[AgentDBBridge]', errorMsg);
        status.errors.push(errorMsg);
      }
    }

    status.syncInProgress = false;
    status.pendingChanges = this.pendingSync.size;

    console.log('[AgentDBBridge] Sync completed:', status);
    return status;
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return {
      lastSync: 0,
      pendingChanges: this.pendingSync.size,
      syncInProgress: false,
      errors: [],
    };
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    if (this.offlineStorage) {
      await this.offlineStorage.clear_all();
      this.pendingSync.clear();
      console.log('[AgentDBBridge] Offline data cleared');
    }
  }

  /**
   * Cleanup and stop sync
   */
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
    console.log('[AgentDBBridge] Destroyed');
  }

  // Private methods

  private generateCacheKey(query: AgentDBQuery): string {
    return `query:${query.collection}:${JSON.stringify(query.filter || {})}`;
  }

  private async getCachedQuery<T>(cacheKey: string): Promise<AgentDBResult<T> | null> {
    if (!this.offlineStorage) return null;

    try {
      const cached = await this.offlineStorage.get_media(cacheKey);
      if (cached) {
        return JSON.parse(cached as string);
      }
    } catch (error) {
      console.warn('[AgentDBBridge] Cache read failed:', error);
    }
    return null;
  }

  private async cacheQuery<T>(cacheKey: string, result: AgentDBResult<T>): Promise<void> {
    if (!this.offlineStorage) return;

    try {
      const ttl = 3600000; // 1 hour
      await this.offlineStorage.store_media(
        cacheKey,
        JSON.stringify(result),
        ttl
      );
    } catch (error) {
      console.warn('[AgentDBBridge] Cache write failed:', error);
    }
  }

  private async queryAgentDB<T>(query: AgentDBQuery): Promise<AgentDBResult<T>> {
    // Mock implementation - replace with actual agentdb client
    console.log('[AgentDBBridge] Querying agentdb:', query);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      data: [] as T[],
      total: 0,
      cached: false,
      timestamp: Date.now(),
    };
  }

  private async storeToAgentDB<T>(collection: string, data: T[]): Promise<void> {
    // Mock implementation - replace with actual agentdb client
    console.log('[AgentDBBridge] Storing to agentdb:', collection, data.length, 'items');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  private async queueForSync<T>(
    queueKey: string,
    collection: string,
    data: T[]
  ): Promise<void> {
    if (!this.offlineStorage) return;

    const queueData = {
      collection,
      data,
      timestamp: Date.now(),
    };

    await this.offlineStorage.store_media(
      queueKey,
      JSON.stringify(queueData),
      undefined // No TTL for queue items
    );
  }

  private async searchLocal(
    query: string,
    options?: { limit?: number }
  ): Promise<AgentDBResult<MediaItem>> {
    if (!this.searchEngine) {
      throw new Error('Search engine not initialized');
    }

    // Get cached media items (mock - replace with actual storage query)
    const items: MediaItem[] = [];

    const resultsJson = this.searchEngine.search(query, JSON.stringify(items));
    const results = JSON.parse(resultsJson);

    return {
      data: results.slice(0, options?.limit || 50),
      total: results.length,
      cached: true,
      timestamp: Date.now(),
    };
  }

  private startSyncTimer(): void {
    this.syncTimer = window.setInterval(() => {
      if (this.pendingSync.size > 0) {
        this.sync().catch(error => {
          console.error('[AgentDBBridge] Auto-sync failed:', error);
        });
      }
    }, this.config.syncInterval);
  }
}

/**
 * Create and initialize AgentDB bridge
 */
export async function createAgentDBBridge(
  config: AgentDBConfig,
  searchEngine: SearchEngine,
  offlineStorage: OfflineStorage
): Promise<AgentDBBridge> {
  const bridge = new AgentDBBridge(config);
  await bridge.initialize(searchEngine, offlineStorage);
  return bridge;
}

export default AgentDBBridge;
