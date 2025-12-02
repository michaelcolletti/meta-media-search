import { test, expect } from '@playwright/test';

/**
 * @test User Journey - Search to Discovery
 * @description End-to-end tests for complete user flows
 * @prerequisites Running application on localhost:5173
 */

test.describe('Complete User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete search → discovery → selection flow', async ({ page }) => {
    // Step 1: Land on homepage
    await expect(page).toHaveTitle(/Meta Media Search/i);

    // Step 2: Enter search query
    const searchInput = page.getByPlaceholder(/search media/i);
    await searchInput.fill('nature documentary');
    await searchInput.press('Enter');

    // Step 3: Wait for results to load
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });

    // Step 4: Verify results are displayed
    const results = page.locator('[data-testid="result-item"]');
    await expect(results).toHaveCount.greaterThan(0);

    // Step 5: Click on first result
    await results.first().click();

    // Step 6: Verify detail page loads
    await expect(page.locator('[data-testid="media-detail"]')).toBeVisible();

    // Step 7: Verify recommendations appear
    const recommendations = page.locator('[data-testid="recommendations"]');
    await expect(recommendations).toBeVisible();
  });

  test('should filter search results', async ({ page }) => {
    // Perform search
    await page.getByPlaceholder(/search media/i).fill('music');
    await page.getByRole('button', { name: /search/i }).click();

    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]');

    // Apply category filter
    await page.getByRole('combobox', { name: /category/i }).selectOption('music');

    // Apply date filter
    await page.getByLabel(/date from/i).fill('2024-01-01');
    await page.getByLabel(/date to/i).fill('2024-12-31');

    // Apply filters
    await page.getByRole('button', { name: /apply filters/i }).click();

    // Verify filtered results
    await page.waitForSelector('[data-testid="search-results"]');
    const results = page.locator('[data-testid="result-item"]');
    await expect(results.first()).toContainText(/music/i);
  });

  test('should save user preferences', async ({ page }) => {
    // Navigate to preferences
    await page.getByRole('button', { name: /menu/i }).click();
    await page.getByRole('link', { name: /preferences/i }).click();

    // Update preferences
    await page.getByLabel(/categories/i).selectOption(['video', 'music']);
    await page.getByLabel(/language/i).selectOption('en');
    await page.getByLabel(/explicit content/i).uncheck();

    // Save preferences
    await page.getByRole('button', { name: /save/i }).click();

    // Verify success message
    await expect(page.getByText(/preferences saved/i)).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByLabel(/explicit content/i)).not.toBeChecked();
  });

  test('should show personalized recommendations', async ({ page }) => {
    // Simulate user interaction history
    await page.goto('/');

    // View multiple items to build history
    const items = ['nature documentary', 'space exploration', 'ocean life'];

    for (const query of items) {
      await page.getByPlaceholder(/search media/i).fill(query);
      await page.getByRole('button', { name: /search/i }).click();
      await page.waitForSelector('[data-testid="search-results"]');

      const firstResult = page.locator('[data-testid="result-item"]').first();
      await firstResult.click();
      await page.waitForTimeout(500);
      await page.goBack();
    }

    // Navigate to recommendations page
    await page.getByRole('link', { name: /recommended/i }).click();

    // Verify personalized recommendations appear
    const recommendations = page.locator('[data-testid="recommendation-item"]');
    await expect(recommendations).toHaveCount.greaterThan(0);

    // Verify recommendations are relevant to viewing history
    await expect(recommendations.first()).toContainText(/nature|space|ocean/i);
  });
});

test.describe('Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);

    await page.goto('/');

    // Attempt search
    await page.getByPlaceholder(/search media/i).fill('test');
    await page.getByRole('button', { name: /search/i }).click();

    // Verify error message
    await expect(page.getByText(/network error|offline/i)).toBeVisible({ timeout: 5000 });

    // Restore connection
    await page.context().setOffline(false);

    // Retry search
    await page.getByRole('button', { name: /retry/i }).click();

    // Verify results load
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  });

  test('should handle empty search results', async ({ page }) => {
    await page.goto('/');

    // Search for something that won't exist
    await page.getByPlaceholder(/search media/i).fill('xyznonexistentquery123');
    await page.getByRole('button', { name: /search/i }).click();

    // Verify empty state message
    await expect(page.getByText(/no results found/i)).toBeVisible();

    // Verify suggestions appear
    await expect(page.getByText(/try different keywords/i)).toBeVisible();
  });

  test('should handle slow API responses', async ({ page }) => {
    await page.goto('/');

    // Initiate search
    await page.getByPlaceholder(/search media/i).fill('test');
    await page.getByRole('button', { name: /search/i }).click();

    // Verify loading state appears
    await expect(page.getByText(/loading|searching/i)).toBeVisible();

    // Verify timeout handling (if response takes too long)
    await page.waitForSelector('[data-testid="search-results"], [data-testid="error-message"]', {
      timeout: 30000
    });
  });
});

test.describe('Accessibility @accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Tab to search input
    await page.keyboard.press('Tab');
    const searchInput = page.getByPlaceholder(/search media/i);
    await expect(searchInput).toBeFocused();

    // Type query
    await page.keyboard.type('nature');

    // Tab to search button and activate
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]');

    // Navigate through results with keyboard
    await page.keyboard.press('Tab');
    const firstResult = page.locator('[data-testid="result-item"]').first();
    await expect(firstResult).toBeFocused();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');

    // Check main landmarks
    await expect(page.getByRole('search')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();

    // Check form labels
    const searchInput = page.getByPlaceholder(/search media/i);
    await expect(searchInput).toHaveAttribute('aria-label');
  });

  test('should support screen readers', async ({ page }) => {
    await page.goto('/');

    // Verify live regions for dynamic content
    await page.getByPlaceholder(/search media/i).fill('test');
    await page.getByRole('button', { name: /search/i }).click();

    // Check for status announcements
    const status = page.locator('[role="status"], [aria-live="polite"]');
    await expect(status).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load homepage within 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('should render search results within 3 seconds', async ({ page }) => {
    await page.goto('/');

    const startTime = Date.now();
    await page.getByPlaceholder(/search media/i).fill('test');
    await page.getByRole('button', { name: /search/i }).click();
    await page.waitForSelector('[data-testid="search-results"]');
    const responseTime = Date.now() - startTime;

    expect(responseTime).toBeLessThan(3000);
  });
});
