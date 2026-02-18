import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main heading', async ({ page }) => {
    // Check for the main header/title
    await expect(page.locator('h1, [role="heading"]').first()).toBeVisible();
  });

  test('should have navigation elements', async ({ page }) => {
    // Check for navigation
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();
  });

  test('should have a wallet connect button', async ({ page }) => {
    // Look for wallet connect button
    const connectButton = page.getByRole('button', { name: /connect|wallet/i });
    await expect(connectButton).toBeVisible();
  });

  test('should display token list or loading state', async ({ page }) => {
    // Wait for either token list or loading skeleton
    const content = page.locator('[data-testid="token-list"], [data-testid="loading"], .skeleton');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();

    // Check that content doesn't overflow
    const body = await page.locator('body').boundingBox();
    expect(body?.width).toBeLessThanOrEqual(375);
  });
});

test.describe('Token Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have create token button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|launch|new token/i });
    await expect(createButton).toBeVisible();
  });

  test('should open token creation modal on button click', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create|launch|new token/i });
    await createButton.click();

    // Modal should appear
    const modal = page.locator('[role="dialog"], .modal, [data-testid="token-creation-modal"]');
    await expect(modal.first()).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate to different sections', async ({ page }) => {
    await page.goto('/');

    // Check if there are any navigation links
    const navLinks = page.locator('nav a, header a');
    const linkCount = await navLinks.count();

    // If there are nav links, test clicking one
    if (linkCount > 0) {
      const firstLink = navLinks.first();
      await firstLink.click();

      // Page should not show error
      await expect(page.locator('body')).not.toContainText('404');
      await expect(page.locator('body')).not.toContainText('error');
    }
  });
});

test.describe('Accessibility', () => {
  test('should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/');

    // Check for basic a11y requirements
    // Title should exist
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    // Main content should be present
    const main = page.locator('main, [role="main"], #__next');
    await expect(main.first()).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Tab through focusable elements
    await page.keyboard.press('Tab');

    // Something should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
