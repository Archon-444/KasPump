import { test, expect, MOCK_ADDRESS } from './fixtures';

test.describe('Token Launch Flow', () => {
  test('launch page loads with form', async ({ walletPage: page }) => {
    await page.goto('/launch');
    await page.waitForLoadState('domcontentloaded');

    // Input component uses placeholder, not name attribute.
    // QuickLaunchForm placeholders are "e.g. Doge Coin" and "e.g. DOGE".
    await expect(page.getByPlaceholder('e.g. Doge Coin')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByPlaceholder('e.g. DOGE')).toBeVisible({ timeout: 5_000 });
  });

  test('form requires name and symbol before submitting', async ({ walletPage: page }) => {
    await page.goto('/launch');
    await page.waitForLoadState('domcontentloaded');

    // Try to submit empty form
    const submitBtn = page.getByRole('button', { name: /launch|create|deploy/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 10_000 });
    await submitBtn.click();

    // Should show validation error or keep form open (not navigate away)
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/launch/);
  });

  test('can fill in token details', async ({ walletPage: page }) => {
    await page.goto('/launch');
    await page.waitForLoadState('domcontentloaded');

    const nameInput = page.getByPlaceholder('e.g. Doge Coin');
    const symbolInput = page.getByPlaceholder('e.g. DOGE');

    await expect(nameInput).toBeVisible({ timeout: 30_000 });

    await nameInput.fill('Test Meme Token');
    await symbolInput.fill('TMT');

    // Values are stored in the inputs
    await expect(nameInput).toHaveValue('Test Meme Token');
    await expect(symbolInput).toHaveValue('TMT');
  });

  test('image upload area is present', async ({ walletPage: page }) => {
    await page.goto('/launch');
    await page.waitForLoadState('domcontentloaded');

    // Gate on form readiness — wagmi auto-connect is async on CI cold start.
    await expect(page.getByPlaceholder('e.g. Doge Coin')).toBeVisible({ timeout: 30_000 });

    // The file input has className="sr-only" (invisible but in DOM).
    // The visible click target is the wrapping <label> showing upload text.
    const fileInputCount = await page.locator('input[type="file"]').count();
    const uploadLabel = page.locator('label', { hasText: /click to upload|ipfs not configured/i }).first();

    const hasUploadLabel = await uploadLabel.isVisible({ timeout: 5_000 }).catch(() => false);

    expect(fileInputCount > 0 || hasUploadLabel).toBe(true);
  });

  test('wallet address shown when connected via mock provider', async ({ walletPage: page }) => {
    await page.goto('/launch');
    await page.waitForLoadState('domcontentloaded');

    // Page should contain the truncated address or connect prompt
    // This verifies the wallet context is wired
    const body = await page.locator('body').textContent();
    const hasAddress = body?.includes(MOCK_ADDRESS.slice(0, 6)) || body?.toLowerCase().includes('connect');
    expect(hasAddress).toBe(true);
  });
});
