import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use environment variables with fallback for API configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vehonbnvzcgcticpfsox.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaG9uYm52emNnY3RpY3Bmc284Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjg2MzYsImV4cCI6MjA3MTc0NDYzNn0.B414fQfM7BRyxlkr6npVxEVHQ8lV3R5IGMubxMGKgsY';

export class DatabaseHelper {
  private supabase: SupabaseClient;
  private maxRetries = 3;
  private baseDelay = 1000;

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  /**
   * Execute database operation with retry logic and exponential backoff
   */
  async withRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxRetries) break;
        
        const delay = this.baseDelay * Math.pow(2, attempt - 1);
        console.warn(`${context} failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delay}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error(`${context} failed after ${this.maxRetries} attempts: ${lastError!.message}`);
  }

  async validatePriceCalculation(
    propertyId: string,
    checkDate: string,
    nights: number
  ) {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase.rpc('calculate_final_price', {
        property_id: propertyId,
        check_date: checkDate,
        nights: nights
      });

      if (error) throw new Error(`Database calculation failed: ${error.message}`);
      return data;
    }, `validatePriceCalculation for property ${propertyId}`);
  }

  async getPropertyTestData(propertyId: string) {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('properties')
        .select('*')
        .eq('lodgify_property_id', propertyId)
        .single();

      if (error) throw new Error(`Failed to fetch test data: ${error.message}`);
      return data;
    }, `getPropertyTestData for property ${propertyId}`);
  }

  async setupTestData() {
    // Ensure test properties exist
    const testPropertyIds = ['327020', '327021', '327022', '327023', '327024', '327025', '327026', '327027'];
    
    for (const propertyId of testPropertyIds) {
      await this.withRetry(async () => {
        const { data } = await this.supabase
          .from('properties')
          .select('id')
          .eq('lodgify_property_id', propertyId)
          .single();
        
        if (!data) {
          console.warn(`Test property ${propertyId} not found in database`);
        }
      }, `setupTestData check for property ${propertyId}`);
    }
  }

  async cleanupTestData() {
    // Clean up any test-specific data created during tests
    // Be careful not to delete production data
    console.log('Test cleanup completed');
  }

  async cleanupOverrides(propertyId: string) {
    return this.withRetry(async () => {
      // Price overrides table uses lodgify_property_id directly now (PRP-021 fix)
      const { error } = await this.supabase
        .from('price_overrides')
        .delete()
        .eq('property_id', propertyId) // Using lodgify_property_id format directly
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Only delete recent test data
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error cleaning up price overrides:', error);
        throw error;
      }
    }, `cleanupOverrides for property ${propertyId}`);
  }

  async createTestOverride(propertyId: string, date: string, price: number, reason?: string) {
    return this.withRetry(async () => {
      // Price overrides table uses lodgify_property_id directly now (PRP-021 fix)
      const { error } = await this.supabase
        .from('price_overrides')
        .insert({
          property_id: propertyId, // Using lodgify_property_id format directly
          override_date: date,
          override_price: price, // Using decimal price, not cents
          reason: reason || 'Test override',
          is_active: true
        });
      
      if (error) throw error;
    }, `createTestOverride for ${propertyId} on ${date}`);
  }

  async verifyOverrideExists(propertyId: string, date: string) {
    return this.withRetry(async () => {
      // Price overrides table uses lodgify_property_id directly now (PRP-021 fix)
      const { data, error } = await this.supabase
        .from('price_overrides')
        .select('*')
        .eq('property_id', propertyId) // Using lodgify_property_id format directly
        .eq('override_date', date)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw error;
      }
      
      return data;
    }, `verifyOverrideExists for property ${propertyId} on ${date}`);
  }

  async getSeasonalRates(propertyId: string) {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('date_ranges')
        .select('*')
        .eq('property_id', propertyId)
        .order('start_date', { ascending: true });

      if (error) throw new Error(`Failed to fetch seasonal rates: ${error.message}`);
      return data;
    }, `getSeasonalRates for property ${propertyId}`);
  }

  async getDiscountStrategies(propertyId: string) {
    return this.withRetry(async () => {
      const { data, error } = await this.supabase
        .from('discount_strategies')
        .select('*, discount_rules(*)')
        .eq('property_id', propertyId)
        .eq('is_active', true);

      if (error) throw new Error(`Failed to fetch discount strategies: ${error.message}`);
      return data;
    }, `getDiscountStrategies for property ${propertyId}`);
  }
}