/**
 * Mobile Performance Monitoring Utilities
 * Tracks WASM performance, memory usage, and network metrics
 */

export interface PerformanceMetrics {
  wasmLoadTime: number;
  wasmCompileTime: number;
  wasmMemoryUsage: number;
  cacheHitRate: number;
  searchLatency: number;
  networkLatency: number;
  batteryLevel?: number;
  connectionType?: string;
  deviceMemory?: number;
}

export interface PerformanceMark {
  name: string;
  timestamp: number;
  duration?: number;
}

export class MobilePerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measures: PerformanceMark[] = [];
  private metrics: Partial<PerformanceMetrics> = {};

  /**
   * Mark a performance checkpoint
   */
  mark(name: string): void {
    const timestamp = performance.now();
    this.marks.set(name, timestamp);

    // Create browser performance mark
    try {
      performance.mark(name);
    } catch (error) {
      console.warn('[PerformanceMonitor] Failed to create mark:', error);
    }
  }

  /**
   * Measure duration between two marks
   */
  measure(name: string, startMark: string, endMark?: string): number | null {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : performance.now();

    if (!start || !end) {
      console.warn('[PerformanceMonitor] Mark not found:', { startMark, endMark });
      return null;
    }

    const duration = end - start;

    this.measures.push({
      name,
      timestamp: start,
      duration,
    });

    // Create browser performance measure
    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }
    } catch (error) {
      console.warn('[PerformanceMonitor] Failed to create measure:', error);
    }

    return duration;
  }

  /**
   * Track WASM loading performance
   */
  trackWasmLoad(loadTime: number, compileTime?: number): void {
    this.metrics.wasmLoadTime = loadTime;
    if (compileTime) {
      this.metrics.wasmCompileTime = compileTime;
    }

    console.log('[PerformanceMonitor] WASM load:', {
      loadTime: `${loadTime.toFixed(2)}ms`,
      compileTime: compileTime ? `${compileTime.toFixed(2)}ms` : 'N/A',
    });
  }

  /**
   * Track memory usage
   */
  trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.wasmMemoryUsage = memory.usedJSHeapSize;

      console.log('[PerformanceMonitor] Memory:', {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
      });
    }
  }

  /**
   * Track cache performance
   */
  trackCachePerformance(hits: number, total: number): void {
    this.metrics.cacheHitRate = total > 0 ? hits / total : 0;

    console.log('[PerformanceMonitor] Cache:', {
      hits,
      total,
      hitRate: `${(this.metrics.cacheHitRate * 100).toFixed(1)}%`,
    });
  }

  /**
   * Track search latency
   */
  trackSearchLatency(latency: number): void {
    this.metrics.searchLatency = latency;

    console.log('[PerformanceMonitor] Search latency:', `${latency.toFixed(2)}ms`);
  }

  /**
   * Track network latency
   */
  trackNetworkLatency(latency: number): void {
    this.metrics.networkLatency = latency;

    console.log('[PerformanceMonitor] Network latency:', `${latency.toFixed(2)}ms`);
  }

  /**
   * Get device information
   */
  getDeviceInfo(): {
    memory?: number;
    connection?: string;
    battery?: number;
    platform: string;
    userAgent: string;
  } {
    const nav = navigator as any;

    return {
      memory: nav.deviceMemory,
      connection: nav.connection?.effectiveType,
      battery: this.metrics.batteryLevel,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    };
  }

  /**
   * Monitor battery status
   */
  async monitorBattery(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        const battery: any = await (navigator as any).getBattery();
        this.metrics.batteryLevel = battery.level;

        battery.addEventListener('levelchange', () => {
          this.metrics.batteryLevel = battery.level;
        });

        console.log('[PerformanceMonitor] Battery:', {
          level: `${(battery.level * 100).toFixed(0)}%`,
          charging: battery.charging,
        });
      } catch (error) {
        console.warn('[PerformanceMonitor] Battery API not available');
      }
    }
  }

  /**
   * Monitor connection type
   */
  monitorConnection(): void {
    const nav = navigator as any;
    if ('connection' in nav) {
      const connection = nav.connection;
      this.metrics.connectionType = connection.effectiveType;

      connection.addEventListener('change', () => {
        this.metrics.connectionType = connection.effectiveType;
        console.log('[PerformanceMonitor] Connection changed:', connection.effectiveType);
      });

      console.log('[PerformanceMonitor] Connection:', {
        type: connection.effectiveType,
        downlink: `${connection.downlink}Mbps`,
        rtt: `${connection.rtt}ms`,
      });
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetrics {
    return {
      wasmLoadTime: this.metrics.wasmLoadTime || 0,
      wasmCompileTime: this.metrics.wasmCompileTime || 0,
      wasmMemoryUsage: this.metrics.wasmMemoryUsage || 0,
      cacheHitRate: this.metrics.cacheHitRate || 0,
      searchLatency: this.metrics.searchLatency || 0,
      networkLatency: this.metrics.networkLatency || 0,
      batteryLevel: this.metrics.batteryLevel,
      connectionType: this.metrics.connectionType,
      deviceMemory: (navigator as any).deviceMemory,
    };
  }

  /**
   * Get all measures
   */
  getMeasures(): PerformanceMark[] {
    return [...this.measures];
  }

  /**
   * Clear all marks and measures
   */
  clear(): void {
    this.marks.clear();
    this.measures = [];
    this.metrics = {};

    try {
      performance.clearMarks();
      performance.clearMeasures();
    } catch (error) {
      console.warn('[PerformanceMonitor] Failed to clear browser marks:', error);
    }
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify({
      metrics: this.getMetrics(),
      measures: this.getMeasures(),
      deviceInfo: this.getDeviceInfo(),
      timestamp: Date.now(),
    }, null, 2);
  }

  /**
   * Check if performance is acceptable
   */
  checkPerformance(): {
    acceptable: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const metrics = this.getMetrics();

    // Check WASM load time (target: <2s on 3G)
    if (metrics.wasmLoadTime > 2000) {
      warnings.push(`WASM load time ${metrics.wasmLoadTime.toFixed(0)}ms exceeds 2s target`);
    }

    // Check memory usage (target: <16MB)
    if (metrics.wasmMemoryUsage > 16 * 1024 * 1024) {
      warnings.push(`Memory usage ${(metrics.wasmMemoryUsage / 1024 / 1024).toFixed(1)}MB exceeds 16MB target`);
    }

    // Check search latency (target: <100ms)
    if (metrics.searchLatency > 100) {
      warnings.push(`Search latency ${metrics.searchLatency.toFixed(0)}ms exceeds 100ms target`);
    }

    // Check battery level
    if (metrics.batteryLevel !== undefined && metrics.batteryLevel < 0.2) {
      warnings.push(`Low battery level ${(metrics.batteryLevel * 100).toFixed(0)}%`);
    }

    // Check connection type
    if (metrics.connectionType === 'slow-2g' || metrics.connectionType === '2g') {
      warnings.push(`Slow connection: ${metrics.connectionType}`);
    }

    return {
      acceptable: warnings.length === 0,
      warnings,
    };
  }
}

/**
 * Singleton instance
 */
let globalMonitor: MobilePerformanceMonitor | null = null;

/**
 * Get or create global monitor
 */
export function getPerformanceMonitor(): MobilePerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new MobilePerformanceMonitor();
  }
  return globalMonitor;
}

export default MobilePerformanceMonitor;
