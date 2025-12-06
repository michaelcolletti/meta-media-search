/**
 * WASM Lazy Loader with Code Splitting
 * Optimized for mobile browsers with progressive loading
 */

export interface WasmModule {
  SearchEngine: any;
  OfflineStorage: any;
  PerformanceMonitor: any;
  DataCompressor: any;
  MediaItem: any;
  SearchCache: any;
  init: () => void;
}

export interface LoadOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  preload?: boolean;
  onProgress?: (progress: number) => void;
}

export interface LoadResult {
  module: WasmModule;
  loadTime: number;
  cached: boolean;
  size?: number;
}

const DEFAULT_OPTIONS: Required<LoadOptions> = {
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  preload: false,
  onProgress: () => {},
};

/**
 * WASM Loader with lazy loading and caching
 */
export class WasmLoader {
  private modulePromise: Promise<WasmModule> | null = null;
  private loadedModule: WasmModule | null = null;
  private loading = false;
  private options: Required<LoadOptions>;

  constructor(options: LoadOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Load WASM module with retry logic
   */
  async load(): Promise<LoadResult> {
    // Return cached module if available
    if (this.loadedModule) {
      return {
        module: this.loadedModule,
        loadTime: 0,
        cached: true,
      };
    }

    // Return in-progress load
    if (this.modulePromise) {
      const module = await this.modulePromise;
      return {
        module,
        loadTime: 0,
        cached: false,
      };
    }

    const startTime = performance.now();

    // Start new load
    this.modulePromise = this.loadWithRetry();

    try {
      const module = await this.modulePromise;
      this.loadedModule = module;

      const loadTime = performance.now() - startTime;

      console.log(`[WasmLoader] Module loaded in ${loadTime.toFixed(2)}ms`);

      return {
        module,
        loadTime,
        cached: false,
      };
    } catch (error) {
      this.modulePromise = null;
      throw error;
    }
  }

  /**
   * Preload module without blocking
   */
  preload(): void {
    if (!this.loadedModule && !this.loading) {
      this.load().catch(error => {
        console.warn('[WasmLoader] Preload failed:', error);
      });
    }
  }

  /**
   * Check if module is loaded
   */
  isLoaded(): boolean {
    return this.loadedModule !== null;
  }

  /**
   * Get loaded module (throws if not loaded)
   */
  getModule(): WasmModule {
    if (!this.loadedModule) {
      throw new Error('WASM module not loaded. Call load() first.');
    }
    return this.loadedModule;
  }

  /**
   * Unload module and free memory
   */
  unload(): void {
    this.loadedModule = null;
    this.modulePromise = null;
    this.loading = false;
    console.log('[WasmLoader] Module unloaded');
  }

  // Private methods

  private async loadWithRetry(): Promise<WasmModule> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.retryAttempts; attempt++) {
      try {
        console.log(`[WasmLoader] Load attempt ${attempt}/${this.options.retryAttempts}`);
        return await this.loadModule();
      } catch (error) {
        lastError = error as Error;
        console.warn(`[WasmLoader] Load attempt ${attempt} failed:`, error);

        if (attempt < this.options.retryAttempts) {
          await this.delay(this.options.retryDelay * attempt);
        }
      }
    }

    throw new Error(
      `Failed to load WASM module after ${this.options.retryAttempts} attempts: ${lastError?.message}`
    );
  }

  private async loadModule(): Promise<WasmModule> {
    this.loading = true;

    try {
      // Dynamic import with code splitting
      const module = await Promise.race([
        this.importModule(),
        this.timeout(this.options.timeout),
      ]);

      // Initialize WASM
      module.init();

      this.loading = false;
      return module;
    } catch (error) {
      this.loading = false;
      throw error;
    }
  }

  private async importModule(): Promise<WasmModule> {
    // Dynamic import - bundler will code-split this
    const module = await import('../../mobile-wasm/pkg');
    return module as unknown as WasmModule;
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`WASM load timeout after ${ms}ms`));
      }, ms);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Singleton loader instance
 */
let globalLoader: WasmLoader | null = null;

/**
 * Get or create global loader
 */
export function getWasmLoader(options?: LoadOptions): WasmLoader {
  if (!globalLoader) {
    globalLoader = new WasmLoader(options);
  }
  return globalLoader;
}

/**
 * Load WASM module (convenience function)
 */
export async function loadWasm(options?: LoadOptions): Promise<LoadResult> {
  const loader = getWasmLoader(options);
  return loader.load();
}

/**
 * Preload WASM module (convenience function)
 */
export function preloadWasm(options?: LoadOptions): void {
  const loader = getWasmLoader(options);
  loader.preload();
}

/**
 * Check if module supports WASM
 */
export function supportsWasm(): boolean {
  try {
    if (typeof WebAssembly === 'object'
        && typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      );
      return module instanceof WebAssembly.Module;
    }
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Get estimated WASM bundle size
 */
export function estimateBundleSize(): number {
  // Estimate based on production builds
  return 450 * 1024; // ~450KB
}

/**
 * Check if should use WASM based on device capabilities
 */
export function shouldUseWasm(): boolean {
  if (!supportsWasm()) {
    return false;
  }

  // Check device memory (if available)
  const nav = navigator as any;
  if (nav.deviceMemory && nav.deviceMemory < 2) {
    console.warn('[WasmLoader] Low memory device, WASM may be slow');
    return false;
  }

  // Check connection type (if available)
  const conn = nav.connection;
  if (conn && (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g')) {
    console.warn('[WasmLoader] Slow connection, WASM loading may timeout');
    return false;
  }

  return true;
}

export default WasmLoader;
