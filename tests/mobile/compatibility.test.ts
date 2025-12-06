/**
 * Mobile Browser Compatibility Tests
 *
 * Tests WASM and vector operations across mobile browsers
 * and different viewport sizes
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, webkit, devices, Browser, BrowserContext, Page } from 'playwright';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

describe('Mobile Browser Compatibility', () => {
  let browser: Browser;

  afterAll(async () => {
    await browser?.close();
  });

  describe('iOS Safari', () => {
    let context: BrowserContext;
    let page: Page;

    beforeAll(async () => {
      browser = await webkit.launch({ headless: true });
      context = await browser.newContext({
        ...devices['iPhone 13 Pro'],
        locale: 'en-US',
      });
      page = await context.newPage();
    }, 30000);

    afterAll(async () => {
      await context?.close();
    });

    it('should load WASM module on iOS Safari', async () => {
      await page.goto(FRONTEND_URL);

      const wasmSupported = await page.evaluate(() => {
        return typeof WebAssembly !== 'undefined';
      });

      expect(wasmSupported).toBe(true);
    });

    it('should perform vector operations on iOS', async () => {
      await page.goto(FRONTEND_URL);

      const result = await page.evaluate(async () => {
        try {
          const wasm = (window as any).__WASM_MODULE__;
          if (!wasm) return { error: 'WASM not loaded' };

          const a = new Float32Array([1, 2, 3]);
          const b = new Float32Array([1, 2, 3]);
          const similarity = wasm.cosine_similarity(a, b);

          return { similarity, error: null };
        } catch (e) {
          return { error: (e as Error).message };
        }
      });

      expect(result.error).toBeNull();
      expect(result.similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle touch interactions', async () => {
      await page.goto(`${FRONTEND_URL}/search`);

      await page.tap('[data-testid="search-input"]');
      await page.fill('[data-testid="search-input"]', 'action movies');

      const value = await page.inputValue('[data-testid="search-input"]');
      expect(value).toBe('action movies');
    });

    it('should display correctly in portrait mode', async () => {
      await page.goto(FRONTEND_URL);
      await page.setViewportSize({ width: 390, height: 844 }); // iPhone 13 Pro

      const isResponsive = await page.evaluate(() => {
        const container = document.querySelector('[data-testid="main-container"]');
        const width = container?.clientWidth || 0;
        return width <= 390;
      });

      expect(isResponsive).toBe(true);
    });

    it('should display correctly in landscape mode', async () => {
      await page.setViewportSize({ width: 844, height: 390 });
      await page.goto(FRONTEND_URL);

      const isResponsive = await page.evaluate(() => {
        const container = document.querySelector('[data-testid="main-container"]');
        return container !== null;
      });

      expect(isResponsive).toBe(true);
    });

    it('should handle memory constraints', async () => {
      await page.goto(FRONTEND_URL);

      const memoryTest = await page.evaluate(() => {
        const wasm = (window as any).__WASM_MODULE__;
        if (!wasm) return { success: false };

        try {
          // Perform many operations
          for (let i = 0; i < 1000; i++) {
            const a = new Float32Array(100).fill(Math.random());
            const b = new Float32Array(100).fill(Math.random());
            wasm.cosine_similarity(a, b);
          }
          return { success: true };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      });

      expect(memoryTest.success).toBe(true);
    });
  });

  describe('Android Chrome', () => {
    let context: BrowserContext;
    let page: Page;

    beforeAll(async () => {
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({
        ...devices['Pixel 5'],
        locale: 'en-US',
      });
      page = await context.newPage();
    }, 30000);

    afterAll(async () => {
      await context?.close();
    });

    it('should load WASM module on Android Chrome', async () => {
      await page.goto(FRONTEND_URL);

      const wasmSupported = await page.evaluate(() => {
        return typeof WebAssembly !== 'undefined';
      });

      expect(wasmSupported).toBe(true);
    });

    it('should perform vector operations on Android', async () => {
      await page.goto(FRONTEND_URL);

      const result = await page.evaluate(async () => {
        try {
          const wasm = (window as any).__WASM_MODULE__;
          if (!wasm) return { error: 'WASM not loaded' };

          const query = new Float32Array([1, 0, 0]);
          const vectors = new Float32Array([
            1, 0, 0,
            0, 1, 0,
          ]);

          const results = wasm.knn_search(query, vectors, 3, 1);

          return { results, error: null };
        } catch (e) {
          return { error: (e as Error).message };
        }
      });

      expect(result.error).toBeNull();
      expect(result.results).toBeDefined();
    });

    it('should handle viewport changes', async () => {
      await page.setViewportSize({ width: 393, height: 851 }); // Pixel 5
      await page.goto(FRONTEND_URL);

      const initialWidth = await page.evaluate(() => window.innerWidth);

      await page.setViewportSize({ width: 851, height: 393 });
      await page.waitForTimeout(500);

      const rotatedWidth = await page.evaluate(() => window.innerWidth);

      expect(rotatedWidth).toBe(851);
      expect(rotatedWidth).not.toBe(initialWidth);
    });

    it('should maintain performance on mobile', async () => {
      await page.goto(FRONTEND_URL);

      const duration = await page.evaluate(() => {
        const wasm = (window as any).__WASM_MODULE__;
        if (!wasm) return 9999;

        const a = new Float32Array(1536).fill(Math.random());
        const b = new Float32Array(1536).fill(Math.random());

        const start = performance.now();
        wasm.cosine_similarity(a, b);
        return performance.now() - start;
      });

      // Should complete in under 2ms on mobile
      expect(duration).toBeLessThan(2);
    });
  });

  describe('Responsive Breakpoints', () => {
    const viewports = [
      { name: 'Small Mobile', width: 320, height: 568 },
      { name: 'Medium Mobile', width: 375, height: 667 },
      { name: 'Large Mobile', width: 414, height: 896 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Small Desktop', width: 1024, height: 768 },
    ];

    viewports.forEach(({ name, width, height }) => {
      it(`should work correctly at ${name} (${width}x${height})`, async () => {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
          viewport: { width, height },
        });
        const page = await context.newPage();

        await page.goto(FRONTEND_URL);

        const wasmWorks = await page.evaluate(() => {
          const wasm = (window as any).__WASM_MODULE__;
          if (!wasm) return false;

          try {
            const a = new Float32Array([1, 2, 3]);
            const b = new Float32Array([1, 2, 3]);
            wasm.cosine_similarity(a, b);
            return true;
          } catch {
            return false;
          }
        });

        expect(wasmWorks).toBe(true);

        await context.close();
      }, 30000);
    });
  });

  describe('Network Conditions', () => {
    it('should handle slow 3G connection', async () => {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        ...devices['iPhone 13 Pro'],
      });
      const page = await context.newPage();

      // Simulate slow 3G
      await context.route('**/*', (route) => {
        setTimeout(() => route.continue(), 300);
      });

      const start = Date.now();
      await page.goto(FRONTEND_URL, { timeout: 30000 });
      const loadTime = Date.now() - start;

      const wasmLoaded = await page.evaluate(() => {
        return typeof (window as any).__WASM_MODULE__ !== 'undefined';
      });

      expect(wasmLoaded).toBe(true);
      expect(loadTime).toBeGreaterThan(300);

      await context.close();
    }, 60000);

    it('should cache WASM module', async () => {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      // First load
      await page.goto(FRONTEND_URL);
      const firstLoadSize = await page.evaluate(() => {
        return (performance.getEntriesByType('resource') as any[])
          .filter(r => r.name.includes('.wasm'))
          .reduce((sum, r) => sum + r.transferSize, 0);
      });

      // Second load (should use cache)
      await page.reload();
      const secondLoadSize = await page.evaluate(() => {
        return (performance.getEntriesByType('resource') as any[])
          .filter(r => r.name.includes('.wasm'))
          .reduce((sum, r) => sum + r.transferSize, 0);
      });

      // Second load should transfer less (cached)
      expect(secondLoadSize).toBeLessThanOrEqual(firstLoadSize);

      await context.close();
    }, 30000);
  });

  describe('Offline Support', () => {
    it('should handle offline mode gracefully', async () => {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(FRONTEND_URL);

      // Go offline
      await context.setOffline(true);

      const offlineTest = await page.evaluate(() => {
        const wasm = (window as any).__WASM_MODULE__;
        if (!wasm) return { works: false };

        try {
          const a = new Float32Array([1, 2, 3]);
          const b = new Float32Array([1, 2, 3]);
          const result = wasm.cosine_similarity(a, b);
          return { works: true, result };
        } catch (e) {
          return { works: false, error: (e as Error).message };
        }
      });

      // WASM operations should still work offline
      expect(offlineTest.works).toBe(true);

      await context.close();
    }, 30000);
  });
});
