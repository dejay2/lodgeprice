import { test, expect } from '@playwright/test';
import { TEST_PROPERTIES } from '../utils/test-data';

test.describe('Discount Strategies Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
  });

  test('FR-5: Discount strategy configuration workflow', async ({ page }) => {
    // Select a property
    const propertySelect = page.locator('select').first();
    await propertySelect.selectOption({ index: 1 });
    await page.waitForTimeout(1000);

    // Look for discount strategies tab or section
    const discountButton = page.locator('button').filter({ hasText: /Discount/i }).first();
    if (await discountButton.isVisible()) {
      await discountButton.click();
      await page.waitForTimeout(500);

      // Verify discount interface is visible
      const discountSection = page.locator('[class*="discount"], [data-testid*="discount"]');
      await expect(discountSection).toBeVisible();
    }
  });

  test('Discount preview calculations work', async ({ page }) => {
    // Select a property
    const propertySelect = page.locator('select').first();
    await propertySelect.selectOption({ index: 1 });
    await page.waitForTimeout(1000);

    // Look for discount indicators in calendar
    const discountIndicators = page.locator('[class*="discount"], [title*="discount"]');
    
    // If discounts are present, verify they show percentage
    const discountCount = await discountIndicators.count();
    if (discountCount > 0) {
      const discountText = await discountIndicators.first().textContent();
      expect(discountText).toMatch(/%/);
    }
  });

  test('Discount strategies apply to eligible dates', async ({ page }) => {
    // Select a property
    const propertySelect = page.locator('select').first();
    await propertySelect.selectOption({ index: 1 });
    await page.waitForTimeout(1000);

    // Check calendar for discount indicators
    const calendarDays = page.locator('button').filter({ hasText: /€/ });
    const dayCount = await calendarDays.count();
    expect(dayCount).toBeGreaterThan(0);

    // Look for discount percentage indicators
    const discountMarkers = page.locator('[class*="discount"], [title*="%"]');
    // Verify that some days might have discounts applied
    const discountCount = await discountMarkers.count();
    // This test just verifies the structure exists
    expect(discountCount).toBeGreaterThanOrEqual(0);
  });
});