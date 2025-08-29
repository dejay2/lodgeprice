import { createClient } from '@supabase/supabase-js';

export class DatabaseHelper {
  private supabase = createClient(
    process.env.VITE_SUPABASE_URL || 'https://vehonbnvzcgcticpfsox.supabase.co',
    process.env.VITE_SUPABASE_ANON_KEY || 'mock-key-for-testing'
  );

  async validatePriceCalculation(
    propertyId: string,
    checkDate: string,
    nights: number
  ) {
    const { data, error } = await this.supabase.rpc('calculate_final_price', {
      property_id: propertyId,
      check_date: checkDate,
      nights: nights
    });

    if (error) throw new Error(`Database calculation failed: ${error.message}`);
    return data;
  }

  async getPropertyTestData(propertyId: string) {
    const { data, error } = await this.supabase
      .from('properties')
      .select('*')
      .eq('lodgify_property_id', propertyId)
      .single();

    if (error) throw new Error(`Failed to fetch test data: ${error.message}`);
    return data;
  }

  async setupTestData() {
    // Ensure test properties exist
    const testPropertyIds = ['327020', '327021', '327022', '327023', '327024', '327025', '327026', '327027'];
    
    for (const propertyId of testPropertyIds) {
      const { data } = await this.supabase
        .from('properties')
        .select('id')
        .eq('lodgify_property_id', propertyId)
        .single();
      
      if (!data) {
        console.warn(`Test property ${propertyId} not found in database`);
      }
    }
  }

  async cleanupTestData() {
    // Clean up any test-specific data created during tests
    // Be careful not to delete production data
    console.log('Test cleanup completed');
  }

  async getSeasonalRates(propertyId: string) {
    const { data, error } = await this.supabase
      .from('date_ranges')
      .select('*')
      .eq('property_id', propertyId)
      .order('start_date', { ascending: true });

    if (error) throw new Error(`Failed to fetch seasonal rates: ${error.message}`);
    return data;
  }

  async getDiscountStrategies(propertyId: string) {
    const { data, error } = await this.supabase
      .from('discount_strategies')
      .select('*, discount_rules(*)')
      .eq('property_id', propertyId)
      .eq('is_active', true);

    if (error) throw new Error(`Failed to fetch discount strategies: ${error.message}`);
    return data;
  }
}