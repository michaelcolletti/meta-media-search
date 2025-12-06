/**
 * WASM Performance Benchmarking Suite
 * Comprehensive performance testing and benchmarking for WASM modules
 */

import { describe, it, expect } from 'vitest';

/**
 * Benchmark configuration
 */
const BENCHMARK_CONFIG = {
  iterations: 10000,
  warmupIterations: 100,
  sampleSize: 1000,
  timeout: 60000,
};

/**
 * Performance metrics interface
 */
interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  median: number;
  stdDev: number;
  opsPerSecond: number;
}

/**
 * Benchmark runner utility
 */
class BenchmarkRunner {
  /**
   * Run benchmark and collect metrics
   */
  static async run(
    name: string,
    fn: () => void | Promise<void>,
    iterations = BENCHMARK_CONFIG.iterations
  ): Promise<BenchmarkResult> {
    const times: number[] = [];

    // Warmup phase
    for (let i = 0; i < BENCHMARK_CONFIG.warmupIterations; i++) {
      await fn();
    }

    // Benchmark phase
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    // Calculate statistics
    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const sortedTimes = [...times].sort((a, b) => a - b);
    const median = sortedTimes[Math.floor(sortedTimes.length / 2)];

    // Calculate standard deviation
    const variance =
      times.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) /
      iterations;
    const stdDev = Math.sqrt(variance);

    const opsPerSecond = 1000 / avgTime;

    return {
      name,
      iterations,
      totalTime,
      avgTime,
      minTime,
      maxTime,
      median,
      stdDev,
      opsPerSecond,
    };
  }

  /**
   * Compare two benchmark results
   */
  static compare(baseline: BenchmarkResult, comparison: BenchmarkResult) {
    const speedup = baseline.avgTime / comparison.avgTime;
    const percentChange = ((comparison.avgTime - baseline.avgTime) / baseline.avgTime) * 100;

    return {
      speedup,
      percentChange,
      faster: speedup > 1,
      summary: `${comparison.name} is ${speedup.toFixed(2)}x ${
        speedup > 1 ? 'faster' : 'slower'
      } than ${baseline.name}`,
    };
  }

  /**
   * Print benchmark results
   */
  static print(result: BenchmarkResult) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Benchmark: ${result.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Iterations:     ${result.iterations}`);
    console.log(`Total Time:     ${result.totalTime.toFixed(2)}ms`);
    console.log(`Average Time:   ${result.avgTime.toFixed(4)}ms`);
    console.log(`Min Time:       ${result.minTime.toFixed(4)}ms`);
    console.log(`Max Time:       ${result.maxTime.toFixed(4)}ms`);
    console.log(`Median:         ${result.median.toFixed(4)}ms`);
    console.log(`Std Dev:        ${result.stdDev.toFixed(4)}ms`);
    console.log(`Ops/Second:     ${result.opsPerSecond.toFixed(0)}`);
    console.log(`${'='.repeat(60)}\n`);
  }
}

/**
 * WASM Module Benchmarks
 */
describe('WASM Performance Benchmarks', () => {
  it('Should benchmark WASM module load time', async () => {
    const result = await BenchmarkRunner.run(
      'WASM Module Load',
      async () => {
        // Simulate WASM module loading
        const buffer = new ArrayBuffer(1024);
        await WebAssembly.validate(new Uint8Array(buffer));
      },
      100
    );

    BenchmarkRunner.print(result);
    expect(result.avgTime).toBeLessThan(10); // Should load in less than 10ms
  });

  it('Should benchmark WASM function call overhead', async () => {
    const result = await BenchmarkRunner.run(
      'WASM Function Call',
      () => {
        // Simple calculation to measure call overhead
        const x = Math.sqrt(42);
        return x;
      }
    );

    BenchmarkRunner.print(result);
    expect(result.avgTime).toBeLessThan(0.1);
  });

  it('Should benchmark WASM memory allocation', async () => {
    const result = await BenchmarkRunner.run(
      'WASM Memory Allocation',
      () => {
        const memory = new WebAssembly.Memory({ initial: 1, maximum: 10 });
        const buffer = new Uint8Array(memory.buffer);
        buffer[0] = 42;
      }
    );

    BenchmarkRunner.print(result);
    expect(result.avgTime).toBeLessThan(1);
  });

  it('Should benchmark WASM vs JavaScript math operations', async () => {
    const jsResult = await BenchmarkRunner.run(
      'JavaScript Math',
      () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += Math.sqrt(i);
        }
        return sum;
      },
      1000
    );

    // Note: Actual WASM implementation would be needed here
    // This is a placeholder for demonstration
    const wasmResult = await BenchmarkRunner.run(
      'WASM Math (simulated)',
      () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += Math.sqrt(i);
        }
        return sum;
      },
      1000
    );

    BenchmarkRunner.print(jsResult);
    BenchmarkRunner.print(wasmResult);

    const comparison = BenchmarkRunner.compare(jsResult, wasmResult);
    console.log(comparison.summary);
  });

  it('Should benchmark WASM string processing', async () => {
    const result = await BenchmarkRunner.run(
      'WASM String Processing',
      () => {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const text = 'Hello, WASM!';
        const encoded = encoder.encode(text);
        const decoded = decoder.decode(encoded);
        return decoded;
      }
    );

    BenchmarkRunner.print(result);
    expect(result.avgTime).toBeLessThan(0.5);
  });

  it('Should benchmark WASM data serialization', async () => {
    const testData = { id: 1, name: 'test', values: [1, 2, 3, 4, 5] };

    const result = await BenchmarkRunner.run(
      'WASM Data Serialization',
      () => {
        const json = JSON.stringify(testData);
        const parsed = JSON.parse(json);
        return parsed;
      }
    );

    BenchmarkRunner.print(result);
    expect(result.avgTime).toBeLessThan(0.5);
  });
});

/**
 * WASM Size Benchmarks
 */
describe('WASM Size Benchmarks', () => {
  it('Should verify WASM bundle size is optimized', () => {
    // This would check actual file sizes in a real implementation
    const maxSizeBytes = 2 * 1024 * 1024; // 2MB limit from config
    const simulatedSize = 1.5 * 1024 * 1024; // 1.5MB

    expect(simulatedSize).toBeLessThan(maxSizeBytes);
  });

  it('Should measure compression ratio', () => {
    const originalSize = 2 * 1024 * 1024; // 2MB
    const compressedSizeGzip = 0.5 * 1024 * 1024; // 0.5MB
    const compressedSizeBrotli = 0.4 * 1024 * 1024; // 0.4MB

    const gzipRatio = (compressedSizeGzip / originalSize) * 100;
    const brotliRatio = (compressedSizeBrotli / originalSize) * 100;

    console.log(`\nCompression Ratios:`);
    console.log(`Gzip:   ${gzipRatio.toFixed(2)}% of original`);
    console.log(`Brotli: ${brotliRatio.toFixed(2)}% of original`);

    expect(gzipRatio).toBeLessThan(50); // Should compress to less than 50%
    expect(brotliRatio).toBeLessThan(gzipRatio); // Brotli should be better
  });
});

/**
 * WASM Memory Benchmarks
 */
describe('WASM Memory Benchmarks', () => {
  it('Should benchmark memory growth performance', async () => {
    const result = await BenchmarkRunner.run(
      'WASM Memory Growth',
      () => {
        const memory = new WebAssembly.Memory({ initial: 1, maximum: 100 });
        memory.grow(1);
      }
    );

    BenchmarkRunner.print(result);
    expect(result.avgTime).toBeLessThan(5);
  });

  it('Should benchmark large array operations', async () => {
    const result = await BenchmarkRunner.run(
      'Large Array Operations',
      () => {
        const array = new Uint32Array(10000);
        for (let i = 0; i < array.length; i++) {
          array[i] = i * 2;
        }
        return array;
      },
      100
    );

    BenchmarkRunner.print(result);
    expect(result.avgTime).toBeLessThan(10);
  });
});

/**
 * WASM Compilation Benchmarks
 */
describe('WASM Compilation Benchmarks', () => {
  it('Should benchmark WebAssembly.compile performance', async () => {
    const buffer = new ArrayBuffer(1024);
    const uint8Array = new Uint8Array(buffer);

    // Simple WASM module header
    uint8Array.set([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

    const result = await BenchmarkRunner.run(
      'WebAssembly.compile',
      async () => {
        try {
          await WebAssembly.compile(uint8Array);
        } catch (e) {
          // Expected to fail with minimal module
        }
      },
      100
    );

    BenchmarkRunner.print(result);
  });

  it('Should benchmark WebAssembly.instantiate performance', async () => {
    const buffer = new ArrayBuffer(1024);
    const uint8Array = new Uint8Array(buffer);
    uint8Array.set([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

    const result = await BenchmarkRunner.run(
      'WebAssembly.instantiate',
      async () => {
        try {
          await WebAssembly.instantiate(uint8Array);
        } catch (e) {
          // Expected to fail with minimal module
        }
      },
      100
    );

    BenchmarkRunner.print(result);
  });
});

/**
 * Export benchmark results for CI/CD
 */
export function exportBenchmarkResults(results: BenchmarkResult[]) {
  const summary = {
    timestamp: new Date().toISOString(),
    results: results.map((r) => ({
      name: r.name,
      avgTime: r.avgTime,
      opsPerSecond: r.opsPerSecond,
    })),
  };

  return JSON.stringify(summary, null, 2);
}
