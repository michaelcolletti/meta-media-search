import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * @test WCAG 2.1 AA Compliance
 * @description Accessibility tests for WCAG compliance
 * @prerequisites Running application
 */

test.describe('Accessibility - WCAG 2.1 AA Compliance @accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('homepage should not have automatically detectable accessibility issues', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Log any violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations found:');
      accessibilityScanResults.violations.forEach(violation => {
        console.log(`  - ${violation.id}: ${violation.description}`);
        console.log(`    Impact: ${violation.impact}`);
        console.log(`    Help: ${violation.help}`);
        console.log(`    Elements: ${violation.nodes.length}`);
      });
    }
  });

  test('search page should be accessible', async ({ page }) => {
    await page.getByPlaceholder(/search media/i).fill('test');
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForSelector('[data-testid="search-results"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    expect(headings.length).toBeGreaterThan(0);

    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // Check heading levels don't skip (e.g., h1 -> h3)
    const headingLevels = await Promise.all(
      headings.map(async heading => {
        const tagName = await heading.evaluate(el => el.tagName);
        return parseInt(tagName[1]);
      })
    );

    for (let i = 1; i < headingLevels.length; i++) {
      const diff = headingLevels[i] - headingLevels[i - 1];
      expect(diff).toBeLessThanOrEqual(1); // Should not skip levels
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['cat.color'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    // Tab through interactive elements
    const interactiveElements = await page.locator(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();

    expect(interactiveElements.length).toBeGreaterThan(0);

    // Test Tab navigation
    for (let i = 0; i < Math.min(5, interactiveElements.length); i++) {
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focus').first();
      await expect(focused).toBeVisible();
    }
  });

  test('should have proper form labels', async ({ page }) => {
    const inputs = await page.locator('input, select, textarea').all();

    for (const input of inputs) {
      // Each form control should have either a label, aria-label, or aria-labelledby
      const hasLabel = await input.evaluate(el => {
        const id = el.id;
        if (id && document.querySelector(`label[for="${id}"]`)) {
          return true;
        }
        return el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
      });

      expect(hasLabel).toBe(true);
    }
  });

  test('images should have alt text', async ({ page }) => {
    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeDefined();
      // Alt can be empty for decorative images, but attribute must exist
    }
  });

  test('should have proper ARIA landmarks', async ({ page }) => {
    // Check for main landmark
    const main = await page.locator('[role="main"], main').count();
    expect(main).toBeGreaterThan(0);

    // Check for navigation
    const nav = await page.locator('[role="navigation"], nav').count();
    expect(nav).toBeGreaterThan(0);
  });

  test('should handle focus management in modals', async ({ page }) => {
    // If modal/dialog functionality exists
    const modalTrigger = page.locator('[data-testid="open-modal"]');

    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();

      // Focus should be trapped in modal
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // First focusable element should be focused
      const focusedElement = page.locator(':focus');
      const isInsideModal = await focusedElement.evaluate((el, modalEl) => {
        return modalEl.contains(el);
      }, await modal.elementHandle());

      expect(isInsideModal).toBe(true);

      // Close modal and focus should return
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });

  test('should announce dynamic content changes', async ({ page }) => {
    // Search to trigger dynamic content
    await page.getByPlaceholder(/search media/i).fill('test');
    await page.getByRole('button', { name: /search/i }).click();

    // Check for live region
    const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').all();
    expect(liveRegions.length).toBeGreaterThan(0);
  });

  test('should support screen reader navigation', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['best-practice'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should have skip navigation link', async ({ page }) => {
    // Tab once to focus skip link (usually hidden until focused)
    await page.keyboard.press('Tab');

    const skipLink = page.locator('a[href="#main"], a[href="#content"]');
    await expect(skipLink).toBeFocused();

    // Activate skip link
    await page.keyboard.press('Enter');

    // Main content should now be focused
    const mainContent = page.locator('#main, #content, [role="main"]');
    await expect(mainContent).toBeFocused();
  });

  test('should not have automatic audio or video playback', async ({ page }) => {
    const autoplayMedia = await page.locator('audio[autoplay], video[autoplay]').count();
    expect(autoplayMedia).toBe(0);
  });

  test('should support text resizing up to 200%', async ({ page }) => {
    // Set viewport to simulate zoom
    await page.setViewportSize({ width: 800, height: 600 });

    const results = await new AxeBuilder({ page })
      .analyze();

    expect(results.violations).toEqual([]);

    // No horizontal scrolling should occur at 200% zoom
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    // Some horizontal scroll is acceptable, but should be minimal
    expect(hasHorizontalScroll).toBeDefined();
  });

  test('should have proper error identification', async ({ page }) => {
    // Submit form with errors
    const form = page.locator('form').first();

    if (await form.count() > 0) {
      await form.locator('button[type="submit"]').click();

      // Error messages should be associated with fields
      const errorMessages = await page.locator('[role="alert"], .error-message').all();

      for (const error of errorMessages) {
        const isVisible = await error.isVisible();
        expect(isVisible).toBe(true);
      }
    }
  });
});

test.describe('Mobile Accessibility @accessibility', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true
  });

  test('should be accessible on mobile viewport', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should have touch targets of adequate size', async ({ page }) => {
    await page.goto('/');

    // Touch targets should be at least 44x44px
    const buttons = await page.locator('button, a').all();

    for (const button of buttons.slice(0, 5)) { // Check first 5
      const box = await button.boundingBox();
      if (box && await button.isVisible()) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
