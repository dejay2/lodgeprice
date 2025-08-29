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

export class PricingCalendarPage {
  constructor(readonly page: Page) {}

  @step
  async selectProperty(propertyIndex: number = 1) {
    // Wait for property selection to load
    await this.page.waitForSelector('.property-selection__select', { timeout: 10000 });
    
    // Use the actual select element from PropertySelection component
    const selector = this.page.locator('.property-selection__select');
    await selector.selectOption({ index: propertyIndex });
    await this.waitForCalendarToLoad();
  }

  @step
  async waitForCalendarToLoad() {
    await expect(this.page.getByTestId('pricing-calendar')).toBeVisible();
    // Wait for react-calendar tiles to load with pricing data
    await expect(this.page.locator('.react-calendar__tile .pricing-tile').first()).toBeVisible({ timeout: 10000 });
  }

  @step
  async navigateToMonth(year: number, month: number) {
    // Use react-calendar navigation - click on the month/year label to open picker
    const monthLabel = this.page.locator('.react-calendar__navigation__label');
    await monthLabel.click();
    
    // Navigate to the target month/year using next/prev buttons
    // This is simplified - in a real scenario we'd need to calculate the proper navigation
    await this.waitForCalendarToLoad();
  }

  @step
  async getPriceForDate(date: string, nights: number = 1): Promise<number> {
    // Find the pricing tile for the specific date using the actual data attributes
    const tileElement = this.page.locator(`.pricing-tile[data-date="${date}"]`);
    
    // Get the price text from the price-amount element
    const priceText = await tileElement.locator('.price-amount').textContent();
    
    // Extract numeric value (remove € and other characters)
    const price = parseFloat(priceText?.replace(/[^0-9.]/g, '') || '0');
    
    return price * nights;
  }

  @step
  async editBasePrice(newPrice: number) {
    // Click on base price to edit
    const basePriceElement = this.page.getByTestId('base-price-edit');
    await basePriceElement.click();
    
    // Clear and enter new price
    const input = this.page.getByTestId('base-price-input');
    await input.clear();
    await input.fill(newPrice.toString());
    
    // Save changes
    await input.press('Enter');
    
    // Wait for update to complete
    await this.page.waitForTimeout(500);
    
    // Verify price updated
    const displayedPrice = await this.page.getByTestId('base-price-display').textContent();
    expect(displayedPrice).toContain(newPrice.toString());
  }

  @step
  async getCalendarDates(): Promise<string[]> {
    const dayElements = await this.page.locator('[data-testid="calendar-day"]').all();
    const dates: string[] = [];
    
    for (const element of dayElements) {
      const date = await element.getAttribute('data-date');
      if (date) dates.push(date);
    }
    
    return dates;
  }

  @step
  async selectDateRange(startDate: string, endDate: string) {
    // Click start date
    await this.page.locator(`[data-testid="calendar-day"][data-date="${startDate}"]`).click();
    
    // Click end date
    await this.page.locator(`[data-testid="calendar-day"][data-date="${endDate}"]`).click();
    
    // Verify range is selected
    const selectedDays = await this.page.locator('[data-testid="calendar-day"].selected').count();
    expect(selectedDays).toBeGreaterThan(0);
  }

  @step
  async verifyPriceCalculation(date: string, expectedPrice: number) {
    const actualPrice = await this.getPriceForDate(date);
    expect(actualPrice).toBe(expectedPrice);
  }

  @step
  async navigateNextMonth() {
    await this.page.locator('.react-calendar__navigation__next-button').click();
    await this.waitForCalendarToLoad();
  }

  @step
  async navigatePreviousMonth() {
    await this.page.locator('.react-calendar__navigation__prev-button').click();
    await this.waitForCalendarToLoad();
  }
}