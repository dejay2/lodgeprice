import { test, expect } from '@playwright/test';
import { PropertySelectionPage } from '../page-objects/property-selection-page';
import { PricingCalendarPage } from '../page-objects/pricing-calendar-page';
import { TEST_PROPERTIES } from '../utils/test-data';
import { DatabaseHelper } from '../utils/database-helpers';

test.describe('Property Management Workflows', () => {
  let propertyPage: PropertySelectionPage;
  let calendarPage: PricingCalendarPage;
  let database: DatabaseHelper;

  test.beforeEach(async ({ page }) => {
    propertyPage = new PropertySelectionPage(page);
    calendarPage = new PricingCalendarPage(page);
    database = new DatabaseHelper();
    
    // Navigate to application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('FR-1: Complete property selection workflow', async ({ page }) => {
    // Verify all 8 properties are available
    const properties = await propertyPage.getAllProperties();
    expect(properties).toHaveLength(8);
    
    // Test selection of each property
    for (const property of TEST_PROPERTIES) {
      await propertyPage.selectProperty(property.property_id);
      await propertyPage.verifyPropertyData(property.property_id);
      
      // Verify pricing calendar loads
      await expect(page.getByTestId('pricing-calendar')).toBeVisible();
      
      // Verify at least one calendar day is visible
      const calendarDays = await page.locator('[data-testid="calendar-day"]').count();
      expect(calendarDays).toBeGreaterThan(0);
    }
  });

  test('Property switching maintains state', async ({ page }) => {
    // Select first property
    await propertyPage.selectProperty('327020');
    await propertyPage.waitForPropertyToLoad();
    
    // Navigate to a specific month
    await calendarPage.navigateToMonth(2025, 7);
    
    // Switch to another property
    await propertyPage.selectProperty('327021');
    await propertyPage.waitForPropertyToLoad();
    
    // Verify new property is loaded
    const selectedId = await propertyPage.getSelectedPropertyId();
    expect(selectedId).toBe('327021');
    
    // Switch back to first property
    await propertyPage.selectProperty('327020');
    await propertyPage.waitForPropertyToLoad();
    
    // Verify first property is loaded
    const finalId = await propertyPage.getSelectedPropertyId();
    expect(finalId).toBe('327020');
  });

  test('Property data displays correctly', async ({ page }) => {
    for (const property of TEST_PROPERTIES.slice(0, 3)) { // Test first 3 properties
      await propertyPage.selectProperty(property.property_id);
      
      // Verify property name
      const propertyName = await page.getByTestId('property-name').textContent();
      expect(propertyName).toContain(property.name);
      
      // Verify base price
      const basePrice = await page.getByTestId('base-price-display').textContent();
      expect(basePrice).toContain(property.base_price.toString());
      
      // Verify minimum price
      const minPrice = await page.getByTestId('min-price-display').textContent();
      expect(minPrice).toContain(property.min_price.toString());
    }
  });

  test('Calendar loads after property selection', async ({ page }) => {
    // Measure load time
    const startTime = Date.now();
    
    await propertyPage.selectProperty('327020');
    await propertyPage.waitForPropertyToLoad();
    
    const loadTime = Date.now() - startTime;
    
    // Verify calendar loaded within 2 seconds
    expect(loadTime).toBeLessThan(2000);
    
    // Verify calendar has dates
    const dates = await calendarPage.getCalendarDates();
    expect(dates.length).toBeGreaterThan(0);
  });

  test('Property selection persists through navigation', async ({ page }) => {
    // Select a property
    await propertyPage.selectProperty('327022');
    
    // Navigate through calendar months
    await calendarPage.navigateNextMonth();
    await calendarPage.navigateNextMonth();
    
    // Verify property is still selected
    const selectedId = await propertyPage.getSelectedPropertyId();
    expect(selectedId).toBe('327022');
    
    // Navigate back
    await calendarPage.navigatePreviousMonth();
    
    // Verify property is still selected
    const finalId = await propertyPage.getSelectedPropertyId();
    expect(finalId).toBe('327022');
  });
});