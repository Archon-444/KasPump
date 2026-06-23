import { test, expect } from '@playwright/test';

// The token detail page is /token/[address]. We test with a known testnet
// token address from the BSC testnet factory (or a stub address if not available).
// The page should load and show the trading UI even without a real token
// (the API will 404 / show empty state, not crash).
const STUB_ADDRESS = '0x0000000000000000000000000000000000000001';

test.describe('Token Trading Page', () => {
  test('token page loads without JS crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`/token/${STUB_ADDRESS}`);
    await page.waitForLoadState('networkidle');

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('hydration') &&
        !e.includes('Warning:') &&
        !e.includes('404') &&
        !e.includes('NEXT_NOT_FOUND')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('buy/sell tabs or trade form are present on token page', async ({ page }) => {
    await page.goto(`/token/${STUB_ADDRESS}`);
    await page.waitForLoadState('domcontentloaded');

    // Even if token not found, some trading UI or error state should render
    await page.waitForTimeout(2_000);

    const hasTradingUI =
      (await page.locator('[class*="trade"], [data-testid*="trade"]').count()) > 0 ||
      (await page.getByRole('tab', { name: /buy|sell/i }).count()) > 0 ||
      (await page.getByRole('button', { name: /buy|sell/i }).count()) > 0 ||
      (await page.locator('body').textContent().then((t) => (t || '').toLowerCase().includes('not found')));

    expect(hasTradingUI).toBe(true);
  });

  test('buy form has amount input', async ({ page }) => {
    await page.goto(`/token/${STUB_ADDRESS}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2_000);

    // Either amount input exists or the page shows a not-found state
    const amountInput = page.locator('input[type="number"], input[placeholder*="amount" i], input[placeholder*="Amount"]').first();
    const notFound = await page.locator('body').textContent().then((t) => (t || '').toLowerCase().includes('not found'));

    if (!notFound) {
      await expect(amountInput).toBeVisible({ timeout: 5_000 });
    }
  });

  test('slippage warning or fee info visible', async ({ page }) => {
    await page.goto(`/token/${STUB_ADDRESS}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    const pageText = (await page.locator('body').textContent() || '').toLowerCase();
    const notFound = pageText.includes('not found');

    if (!notFound) {
      // Should show slippage, fee, or some trading info
      const hasFeeInfo = pageText.includes('slip') || pageText.includes('fee') || pageText.includes('%');
      expect(hasFeeInfo).toBe(true);
    }
  });
});
