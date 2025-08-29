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

export class SeasonalRatesPage {
  constructor(readonly page: Page) {}

  @step
  async navigateToSeasonalRates() {
    await this.page.goto('/seasonal-rates');
    await this.page.waitForLoadState('networkidle');
  }

  @step
  async selectProperty(propertyId: string) {
    const selector = this.page.getByTestId('property-selector');
    if (await selector.isVisible()) {
      await selector.click();
      await this.page.getByTestId(`property-option-${propertyId}`).click();
    } else {
      // Alternative selector method
      const propertySelect = this.page.locator('select').first();
      if (await propertySelect.isVisible()) {
        await propertySelect.selectOption({ label: new RegExp(propertyId) });
      }
    }
    await this.page.waitForTimeout(1000);
  }

  @step
  async addSeasonalRate(startDate: string, endDate: string, multiplier: number, description: string) {
    // Look for add button
    const addButton = this.page.locator('button').filter({ hasText: /Add|Create|New/i }).first();
    await addButton.click();

    // Fill in date range form
    const startInput = this.page.locator('input[type="date"]').first();
    const endInput = this.page.locator('input[type="date"]').last();
    
    await startInput.fill(startDate);
    await endInput.fill(endDate);

    // Fill multiplier
    const multiplierInput = this.page.locator('input[type="number"]').first();
    await multiplierInput.fill(multiplier.toString());

    // Fill description if field exists
    const descInput = this.page.locator('input[type="text"], textarea').filter({ hasText: /description|name/i }).first();
    if (await descInput.isVisible()) {
      await descInput.fill(description);
    }

    // Save
    const saveButton = this.page.locator('button').filter({ hasText: /Save|Create|Add/i }).first();
    await saveButton.click();

    // Wait for save to complete
    await this.page.waitForTimeout(1000);
  }

  @step
  async editSeasonalRate(index: number, newMultiplier: number) {
    // Find edit button for specific rate
    const editButtons = this.page.locator('button').filter({ hasText: /Edit/i });
    if (await editButtons.count() > index) {
      await editButtons.nth(index).click();

      // Update multiplier
      const multiplierInput = this.page.locator('input[type="number"]').first();
      await multiplierInput.clear();
      await multiplierInput.fill(newMultiplier.toString());

      // Save changes
      const saveButton = this.page.locator('button').filter({ hasText: /Save|Update/i }).first();
      await saveButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  @step
  async deleteSeasonalRate(index: number) {
    // Find delete button for specific rate
    const deleteButtons = this.page.locator('button').filter({ hasText: /Delete|Remove/i });
    if (await deleteButtons.count() > index) {
      await deleteButtons.nth(index).click();

      // Confirm deletion if needed
      const confirmButton = this.page.locator('button').filter({ hasText: /Confirm|Yes|Delete/i }).first();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }

      await this.page.waitForTimeout(1000);
    }
  }

  @step
  async getSeasonalRates(): Promise<number> {
    // Count visible seasonal rate entries
    const rateEntries = this.page.locator('[class*="rate"], [data-testid*="rate"]');
    return await rateEntries.count();
  }

  @step
  async verifyOverlapPrevention(startDate: string, endDate: string) {
    // Try to add overlapping rate
    await this.addSeasonalRate(startDate, endDate, 1.5, 'Test Overlap');

    // Check for error message
    const errorMessage = this.page.locator('[class*="error"], [role="alert"]');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });

    // Verify error contains overlap information
    const errorText = await errorMessage.textContent();
    expect(errorText).toMatch(/overlap|conflict/i);
  }

  @step
  async verifySeasonalRateInCalendar(propertyId: string) {
    // Navigate to calendar
    await this.page.goto('/calendar');
    await this.page.waitForLoadState('networkidle');

    // Select property
    await this.selectProperty(propertyId);

    // Look for seasonal indicator in calendar
    const seasonalIndicators = this.page.locator('[class*="seasonal"], [title*="seasonal"]');
    const indicatorCount = await seasonalIndicators.count();
    expect(indicatorCount).toBeGreaterThan(0);
  }
}