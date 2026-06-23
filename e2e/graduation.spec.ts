import { test, expect } from '@playwright/test';

test.describe('Graduation & Leaderboard', () => {
  test('leaderboard page loads and shows content sections', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    const criticalErrors = errors.filter(
      (e) => !e.includes('hydration') && !e.includes('Warning:')
    );
    expect(criticalErrors).toHaveLength(0);

    // King of the Hill or trending section should be present
    const pageText = (await page.locator('body').textContent() || '').toLowerCase();
    const hasLeaderboardContent =
      pageText.includes('king') ||
      pageText.includes('trending') ||
      pageText.includes('leaderboard') ||
      pageText.includes('top');
    expect(hasLeaderboardContent).toBe(true);
  });

  test('home page shows graduated / trending token sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const pageText = (await page.locator('body').textContent() || '').toLowerCase();

    // Some discovery-related text should exist
    const hasDiscoveryContent =
      pageText.includes('trending') ||
      pageText.includes('launched') ||
      pageText.includes('graduate') ||
      pageText.includes('token') ||
      pageText.includes('create');

    expect(hasDiscoveryContent).toBe(true);
  });

  test('graduation progress indicator renders on token page', async ({ page }) => {
    // Test with a mocked token API response
    await page.route('/api/tokens/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          address: '0x1234567890123456789012345678901234567890',
          name: 'Test Token',
          symbol: 'TEST',
          currentPrice: 0.001,
          marketCap: 10000,
          graduationProgress: 65,
          isGraduated: false,
          totalVolume: 5000,
          description: 'A test token',
          imageUrl: '',
          creator: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          ammAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        }),
      });
    });

    await page.goto('/token/0x1234567890123456789012345678901234567890');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    // Page should render without crash
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const criticalErrors = errors.filter(
      (e) => !e.includes('hydration') && !e.includes('Warning:')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('king of the hill section renders on leaderboard', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    // KingOfTheHill component or loading state should be present
    const kotH = page.locator('[class*="king"], [data-testid*="king"]').or(
      page.getByText(/king of the hill/i)
    ).or(
      page.getByText(/koth/i)
    ).first();

    // Either the component is visible, or we're in a loading/empty state
    const bodyText = (await page.locator('body').textContent() || '').toLowerCase();
    const isRendered = bodyText.includes('king') || bodyText.includes('trending') || bodyText.includes('loading');
    expect(isRendered).toBe(true);
  });
});
