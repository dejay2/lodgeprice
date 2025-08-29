import { Page, expect } from '@playwright/test';
import { test } from '@playwright/test';

function step(target: Function, context: ClassMethodDecoratorContext) {
  return function replacementMethod(...args: any) {
    const name = this.constructor.name + '.' + (context.name as string);
    return test.step(name, async () => {
      return await target.call(this, ...args);
    });
  };
}

export class PropertySelectionPage {
  constructor(readonly page: Page) {}

  @step
  async selectProperty(propertyId: string) {
    // Click property selector dropdown
    const selector = this.page.getByTestId('property-selector');
    await selector.click();
    
    // Select property from dropdown
    const propertyOption = this.page.getByTestId(`property-option-${propertyId}`);
    await propertyOption.click();
    
    // Wait for property data to load
    await expect(this.page.getByTestId('pricing-calendar')).toBeVisible({ timeout: 5000 });
    
    // Verify property is selected
    const selectedProperty = await this.page.getByTestId('selected-property').textContent();
    expect(selectedProperty).toContain(propertyId);
  }

  @step
  async verifyPropertyData(propertyId: string) {
    // Check property name is displayed
    const propertyName = await this.page.getByTestId('property-name').textContent();
    expect(propertyName).toBeTruthy();
    
    // Check base price is displayed
    const basePrice = await this.page.getByTestId('base-price-display').textContent();
    expect(basePrice).toMatch(/\d+/); // Should contain numbers
    
    // Check minimum price is displayed
    const minPrice = await this.page.getByTestId('min-price-display').textContent();
    expect(minPrice).toMatch(/\d+/);
  }

  @step
  async getAllProperties() {
    // Open dropdown
    await this.page.getByTestId('property-selector').click();
    
    // Get all property options
    const properties = await this.page.getByTestId('property-option').all();
    
    // Close dropdown
    await this.page.keyboard.press('Escape');
    
    return properties;
  }

  @step
  async getSelectedPropertyId(): Promise<string> {
    const selectedText = await this.page.getByTestId('selected-property').textContent();
    // Extract property ID from text
    const match = selectedText?.match(/\d{6}/);
    return match ? match[0] : '';
  }

  @step
  async waitForPropertyToLoad() {
    // Wait for calendar to be visible
    await expect(this.page.getByTestId('pricing-calendar')).toBeVisible();
    
    // Wait for at least one calendar day to be visible
    await expect(this.page.locator('[data-testid="calendar-day"]').first()).toBeVisible();
  }
}