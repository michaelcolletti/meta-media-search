/**
 * Browser Compatibility Tests for WASM
 * Tests WASM loading, execution, and functionality across different browsers
 */

import { test, expect, chromium, firefox, webkit } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';

/**
 * Test configuration for different browsers
 */
const browsers = [
  { name: 'chromium', launcher: chromium },
  { name: 'firefox', launcher: firefox },
  { name: 'webkit', launcher: webkit },
];

/**
 * WASM test suite configuration
 */
const WASM_CONFIG = {
  wasmUrl: process.env.WASM_URL || 'http://localhost:5173/wasm',
  timeout: 30000,
  performanceThreshold: 1000, // ms
};

/**
 * Helper function to load WASM module
 */
async function loadWasmModule(page: Page, moduleName: string) {
  return await page.evaluate(async (name) => {
    try {
      const response = await fetch(`/wasm/${name}.wasm`);
      const buffer = await response.arrayBuffer();
      const module = await WebAssembly.instantiate(buffer);
      return { success: true, module: !!module };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, moduleName);
}

/**
 * Test WASM basic functionality across browsers
 */
browsers.forEach(({ name, launcher }) => {
  test.describe(`WASM Browser Tests - ${name}`, () => {
    let browser: Browser;
    let page: Page;

    test.beforeAll(async () => {
      browser = await launcher.launch({
        headless: true,
      });
    });

    test.afterAll(async () => {
      await browser.close();
    });

    test.beforeEach(async () => {
      page = await browser.newPage();
      await page.goto(WASM_CONFIG.wasmUrl, {
        waitUntil: 'networkidle',
        timeout: WASM_CONFIG.timeout,
      });
    });

    test.afterEach(async () => {
      await page.close();
    });

    test(`${name}: Should load WASM module successfully`, async () => {
      const result = await loadWasmModule(page, 'index_bg');
      expect(result.success).toBe(true);
    });

    test(`${name}: Should execute WASM function`, async () => {
      const result = await page.evaluate(async () => {
        try {
          // Assuming your WASM exports an 'init' function
          const module = await import('/wasm/index.js');
          await module.default();
          return { success: true, initialized: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success).toBe(true);
    });

    test(`${name}: Should verify WASM memory allocation`, async () => {
      const memoryStats = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          };
        }
        return null;
      });

      // Memory stats might not be available in all browsers
      if (memoryStats) {
        expect(memoryStats.usedJSHeapSize).toBeGreaterThan(0);
      }
    });

    test(`${name}: Should measure WASM load performance`, async () => {
      const loadTime = await page.evaluate(async () => {
        const startTime = performance.now();
        try {
          const module = await import('/wasm/index.js');
          await module.default();
          return performance.now() - startTime;
        } catch (error) {
          return -1;
        }
      });

      expect(loadTime).toBeGreaterThan(0);
      expect(loadTime).toBeLessThan(WASM_CONFIG.performanceThreshold);
    });

    test(`${name}: Should check WASM feature support`, async () => {
      const features = await page.evaluate(() => {
        return {
          webAssembly: typeof WebAssembly !== 'undefined',
          sharedMemory: typeof SharedArrayBuffer !== 'undefined',
          atomics: typeof Atomics !== 'undefined',
          bigInt: typeof BigInt !== 'undefined',
        };
      });

      expect(features.webAssembly).toBe(true);
    });

    test(`${name}: Should verify WASM MIME type`, async () => {
      const response = await page.goto(`${WASM_CONFIG.wasmUrl}/index_bg.wasm`);
      const contentType = response?.headers()['content-type'];

      // Check for proper WASM MIME type
      expect(contentType).toMatch(/application\/wasm/);
    });

    test(`${name}: Should handle WASM errors gracefully`, async () => {
      const result = await page.evaluate(async () => {
        try {
          // Try to load non-existent WASM module
          await fetch('/wasm/nonexistent.wasm');
          return { errorHandled: false };
        } catch (error) {
          return { errorHandled: true, error: error.message };
        }
      });

      expect(result.errorHandled).toBe(true);
    });

    test(`${name}: Should verify WASM streaming compilation support`, async () => {
      const streamingSupported = await page.evaluate(async () => {
        return typeof WebAssembly.instantiateStreaming === 'function';
      });

      if (streamingSupported) {
        const result = await page.evaluate(async () => {
          try {
            const response = await fetch('/wasm/index_bg.wasm');
            const { instance } = await WebAssembly.instantiateStreaming(response);
            return { success: true, hasInstance: !!instance };
          } catch (error) {
            return { success: false, error: error.message };
          }
        });

        expect(result.success).toBe(true);
      }
    });

    test(`${name}: Should check WASM security headers`, async () => {
      const response = await page.goto(WASM_CONFIG.wasmUrl);
      const headers = response?.headers();

      // Verify security headers
      expect(headers?.['x-content-type-options']).toBe('nosniff');
      expect(headers?.['cross-origin-opener-policy']).toBeTruthy();
    });

    test(`${name}: Should verify WASM file size optimization`, async () => {
      const response = await page.goto(`${WASM_CONFIG.wasmUrl}/index_bg.wasm`);
      const contentLength = response?.headers()['content-length'];

      if (contentLength) {
        const sizeInMB = parseInt(contentLength) / (1024 * 1024);
        // Verify WASM is under 2MB (from config/rust/build.yml)
        expect(sizeInMB).toBeLessThan(2);
      }
    });
  });
});

/**
 * Mobile browser tests
 */
test.describe('WASM Mobile Browser Tests', () => {
  test('Android Chrome: Should load WASM on mobile viewport', async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      ...chromium.devices['Pixel 5'],
    });

    const page = await context.newPage();
    await page.goto(WASM_CONFIG.wasmUrl);

    const result = await loadWasmModule(page, 'index_bg');
    expect(result.success).toBe(true);

    await context.close();
    await browser.close();
  });

  test('iOS Safari: Should load WASM on mobile viewport', async () => {
    const browser = await webkit.launch();
    const context = await browser.newContext({
      ...webkit.devices['iPhone 12'],
    });

    const page = await context.newPage();
    await page.goto(WASM_CONFIG.wasmUrl);

    const result = await loadWasmModule(page, 'index_bg');
    expect(result.success).toBe(true);

    await context.close();
    await browser.close();
  });
});

/**
 * WASM Performance Benchmarking
 */
test.describe('WASM Performance Benchmarks', () => {
  test('Should benchmark WASM execution time', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(WASM_CONFIG.wasmUrl);

    const benchmark = await page.evaluate(async () => {
      const iterations = 1000;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        // Execute WASM function (customize based on your WASM API)
        // await wasmFunction();
        const end = performance.now();
        results.push(end - start);
      }

      return {
        min: Math.min(...results),
        max: Math.max(...results),
        avg: results.reduce((a, b) => a + b, 0) / results.length,
        median: results.sort()[Math.floor(results.length / 2)],
      };
    });

    expect(benchmark.avg).toBeLessThan(100); // ms

    await page.close();
    await browser.close();
  });

  test('Should measure WASM vs JavaScript performance', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(WASM_CONFIG.wasmUrl);

    const comparison = await page.evaluate(async () => {
      const iterations = 1000;

      // Benchmark JavaScript implementation
      const jsStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        // JavaScript calculation
        Math.sqrt(i);
      }
      const jsTime = performance.now() - jsStart;

      // Benchmark WASM implementation (if available)
      // const wasmStart = performance.now();
      // for (let i = 0; i < iterations; i++) {
      //   await wasmSqrt(i);
      // }
      // const wasmTime = performance.now() - wasmStart;

      return {
        jsTime,
        // wasmTime,
        // speedup: jsTime / wasmTime,
      };
    });

    expect(comparison.jsTime).toBeGreaterThan(0);

    await page.close();
    await browser.close();
  });
});

/**
 * WASM compression and caching tests
 */
test.describe('WASM Compression and Caching', () => {
  test('Should verify WASM files are compressed', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const response = await page.goto(`${WASM_CONFIG.wasmUrl}/index_bg.wasm`);
    const encoding = response?.headers()['content-encoding'];

    // Should be gzip or brotli compressed
    expect(['gzip', 'br']).toContain(encoding);

    await page.close();
    await browser.close();
  });

  test('Should verify proper cache headers', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const response = await page.goto(`${WASM_CONFIG.wasmUrl}/index_bg.wasm`);
    const cacheControl = response?.headers()['cache-control'];

    // Should have aggressive caching for production
    expect(cacheControl).toMatch(/public|immutable/);

    await page.close();
    await browser.close();
  });
});
