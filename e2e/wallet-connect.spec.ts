import { test, expect } from '@playwright/test';

test.describe('Wallet Connect', () => {
  test('home page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // No uncaught JS errors
    expect(errors.filter(e => !e.includes('hydration') && !e.includes('Warning:'))).toHaveLength(0);

    // Page has meaningful content
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('connect wallet button is visible on home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Some form of connect button should be present in the header
    const connectBtn = page.getByRole('button', { name: /connect/i }).first();
    await expect(connectBtn).toBeVisible({ timeout: 10_000 });
  });

  test('clicking connect opens wallet selection modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const connectBtn = page.getByRole('button', { name: /connect/i }).first();
    await connectBtn.click();

    // WalletSelectModal renders via createPortal with no role="dialog".
    // Both the h2 and the MetaMask option are visible once open; .first()
    // prevents strict-mode violation when or() resolves to multiple elements.
    await expect(
      page.getByRole('heading', { name: /connect wallet/i }).or(
        page.getByText('MetaMask')
      ).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('navigation links are functional', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check that primary nav links resolve without 404
    for (const [href, label] of [
      ['/launch', 'Launch'],
      ['/leaderboard', 'Leaderboard'],
    ]) {
      await page.goto(href);
      const status = await page.evaluate(() => document.readyState);
      expect(status).toBe('complete');
      // No 404 text
      await expect(page.locator('body')).not.toContainText('404');
    }
  });
});
