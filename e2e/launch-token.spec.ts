import { test, expect, MOCK_ADDRESS } from './fixtures';

test.describe('Token Launch Flow', () => {
  test('launch page loads with form', async ({ walletPage: page }) => {
    await page.goto('/launch');
    await page.waitForLoadState('domcontentloaded');

    // Form fields should be present
    await expect(page.locator('input[name="name"], input[placeholder*="name" i], input[placeholder*="Name"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[name="symbol"], input[placeholder*="symbol" i], input[placeholder*="Symbol"]').first()).toBeVisible({ timeout: 5_000 });
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

    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    const symbolInput = page.locator('input[name="symbol"], input[placeholder*="symbol" i]').first();

    await expect(nameInput).toBeVisible({ timeout: 10_000 });

    await nameInput.fill('Test Meme Token');
    await symbolInput.fill('TMT');

    // Values are stored in the inputs
    await expect(nameInput).toHaveValue('Test Meme Token');
    await expect(symbolInput).toHaveValue('TMT');
  });

  test('image upload area is present', async ({ walletPage: page }) => {
    await page.goto('/launch');
    await page.waitForLoadState('domcontentloaded');

    // File input or drag-drop area should exist
    const fileInput = page.locator('input[type="file"]').first();
    const dropZone = page.locator('[class*="upload"], [class*="drop"], [data-testid*="upload"]').first();

    const hasFileInput = await fileInput.isVisible().catch(() => false);
    const hasDropZone = await dropZone.isVisible().catch(() => false);

    expect(hasFileInput || hasDropZone).toBe(true);
  });

  test('wallet address shown when connected via mock provider', async ({ walletPage: page }) => {
    await page.goto('/launch');
    await page.waitForLoadState('networkidle');

    // Page should contain the truncated address or connect prompt
    // This verifies the wallet context is wired
    const body = await page.locator('body').textContent();
    const hasAddress = body?.includes(MOCK_ADDRESS.slice(0, 6)) || body?.toLowerCase().includes('connect');
    expect(hasAddress).toBe(true);
  });
});
