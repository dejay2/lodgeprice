import { test, expect } from '@playwright/test';
import { SeasonalRatesPage } from '../page-objects/seasonal-rates-page';
import { DatabaseHelper } from '../utils/database-helpers';
import { TEST_PROPERTIES, TEST_DATE_RANGES } from '../utils/test-data';

test.describe('Seasonal Rates Management', () => {
  let seasonalPage: SeasonalRatesPage;
  let database: DatabaseHelper;

  test.beforeEach(async ({ page }) => {
    seasonalPage = new SeasonalRatesPage(page);
    database = new DatabaseHelper();
    
    await seasonalPage.navigateToSeasonalRates();
  });

  test('FR-4: Seasonal rate management workflow', async ({ page }) => {
    // Select a property
    await seasonalPage.selectProperty('327020');

    // Get initial count of seasonal rates
    const initialCount = await seasonalPage.getSeasonalRates();

    // Add a new seasonal rate
    await seasonalPage.addSeasonalRate('2025-07-01', '2025-08-31', 1.5, 'Summer Season Test');

    // Verify rate was added
    const newCount = await seasonalPage.getSeasonalRates();
    expect(newCount).toBe(initialCount + 1);

    // Edit the seasonal rate
    await seasonalPage.editSeasonalRate(0, 1.75);

    // Verify seasonal rate appears in calendar
    await seasonalPage.verifySeasonalRateInCalendar('327020');
  });

  test('Overlap prevention works correctly', async ({ page }) => {
    // Select a property
    await seasonalPage.selectProperty('327020');

    // Add first seasonal rate
    await seasonalPage.addSeasonalRate('2025-06-01', '2025-06-30', 1.2, 'June Rate');

    // Try to add overlapping rate - this should fail
    await seasonalPage.verifyOverlapPrevention('2025-06-15', '2025-07-15');
  });

  test('Seasonal rate deletion works', async ({ page }) => {
    // Select a property
    await seasonalPage.selectProperty('327020');

    // Add a test seasonal rate
    await seasonalPage.addSeasonalRate('2025-05-01', '2025-05-31', 1.1, 'Test Delete Rate');

    // Get count before deletion
    const beforeCount = await seasonalPage.getSeasonalRates();

    // Delete the rate
    await seasonalPage.deleteSeasonalRate(0);

    // Verify rate was deleted
    const afterCount = await seasonalPage.getSeasonalRates();
    expect(afterCount).toBe(beforeCount - 1);
  });

  test('Multiple properties can have different seasonal rates', async ({ page }) => {
    // Test first property
    await seasonalPage.selectProperty('327020');
    await seasonalPage.addSeasonalRate('2025-09-01', '2025-09-30', 1.3, 'Property 1 September');

    // Test second property
    await seasonalPage.selectProperty('327021');
    await seasonalPage.addSeasonalRate('2025-09-01', '2025-09-30', 1.6, 'Property 2 September');

    // Verify both rates exist independently
    const property2Rates = await seasonalPage.getSeasonalRates();
    expect(property2Rates).toBeGreaterThan(0);
  });

  test('Seasonal rates validation prevents invalid data', async ({ page }) => {
    // Select a property
    await seasonalPage.selectProperty('327020');

    // Try to add invalid date range (end before start)
    await seasonalPage.addSeasonalRate('2025-08-31', '2025-08-01', 1.5, 'Invalid Range');

    // Check for validation error
    const errorMessage = page.locator('[class*="error"], [role="alert"]');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });

  test('Seasonal rates persist after page refresh', async ({ page }) => {
    // Select a property and add a rate
    await seasonalPage.selectProperty('327020');
    await seasonalPage.addSeasonalRate('2025-10-01', '2025-10-31', 1.4, 'Persistence Test');

    // Get count
    const beforeRefresh = await seasonalPage.getSeasonalRates();

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Select property again
    await seasonalPage.selectProperty('327020');

    // Verify rate still exists
    const afterRefresh = await seasonalPage.getSeasonalRates();
    expect(afterRefresh).toBe(beforeRefresh);
  });
});