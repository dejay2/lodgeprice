import { supabase } from '@/lib/supabase'
import type { Property, DateRange, PricingCalculationResult } from '@/types/database'

// Property API functions
export const propertyApi = {
  // Get all properties
  async getAll(): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('property_name')

    if (error) throw new Error(`Failed to fetch properties: ${error.message}`)
    return data || []
  },

  // Get single property by UUID
  async getById(id: string): Promise<Property | null> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to fetch property: ${error.message}`)
    }
    return data
  },

  // Get single property by property_id (lodgify ID)
  async getByPropertyId(propertyId: string): Promise<Property | null> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('property_id', propertyId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to fetch property: ${error.message}`)
    }
    return data
  },

  // Update property base price
  async updateBasePrice(id: string, newPrice: number): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .update({ base_price_per_day: newPrice } as any)
      .eq('id', id)

    if (error) throw new Error(`Failed to update property price: ${error.message}`)
  }
}

// Pricing calculation functions
export const pricingApi = {
  // Calculate final price using database function
  // Note: Uses property_id (TEXT) not UUID
  async calculatePrice(
    propertyId: string,  // This is the TEXT property_id, e.g. "327020"
    checkDate: string, 
    nights: number
  ): Promise<PricingCalculationResult> {
    const result = await supabase
      .rpc('calculate_final_price', {
        property_id: propertyId,
        check_in_date: checkDate,
        stay_length: nights
      } as any)

    if (result.error) throw new Error(`Failed to calculate price: ${result.error.message}`)
    return result.data
  },

  // Get pricing preview for a date range
  async getPricingPreview(
    propertyId: string,  // This is the TEXT property_id, e.g. "327020"
    startDate: string,
    endDate: string,
    nights: number = 3
  ) {
    const result = await supabase
      .rpc('preview_pricing_calendar', {
        property_id: propertyId,
        start_date: startDate,
        end_date: endDate,
        stay_length: nights
      } as any)

    if (result.error) throw new Error(`Failed to get pricing preview: ${result.error.message}`)
    return result.data
  }
}

// Date ranges API (seasonal rates)
export const dateRangesApi = {
  // Get all date ranges
  async getAll(): Promise<DateRange[]> {
    const { data, error } = await supabase
      .from('date_ranges')
      .select('*')
      .order('start_date')

    if (error) throw new Error(`Failed to fetch date ranges: ${error.message}`)
    return data || []
  },

  // Create new date range
  async create(dateRange: Omit<DateRange, 'rate_id' | 'created_at' | 'updated_at'>): Promise<DateRange> {
    const { data, error } = await supabase
      .from('date_ranges')
      .insert([dateRange as any])
      .select()
      .single()

    if (error) throw new Error(`Failed to create date range: ${error.message}`)
    return data as DateRange
  },

  // Update date range
  async update(rateId: string, updates: Partial<DateRange>): Promise<void> {
    const { error } = await supabase
      .from('date_ranges')
      .update(updates as any)
      .eq('rate_id', rateId)

    if (error) throw new Error(`Failed to update date range: ${error.message}`)
  },

  // Delete date range
  async delete(rateId: string): Promise<void> {
    const { error } = await supabase
      .from('date_ranges')
      .delete()
      .eq('rate_id', rateId)

    if (error) throw new Error(`Failed to delete date range: ${error.message}`)
  }
}

// Booking conflict check
export const bookingApi = {
  // Check for booking conflicts
  async checkConflict(
    propertyId: string,  // This is the TEXT property_id, e.g. "327020"
    arrivalDate: string,
    departureDate: string,
    bookingId?: string
  ): Promise<boolean> {
    const result = await supabase
      .rpc('check_booking_conflict', {
        property_id: propertyId,
        start_date: arrivalDate,
        end_date: departureDate,
        booking_id: bookingId || null
      } as any)

    if (result.error) throw new Error(`Failed to check booking conflict: ${result.error.message}`)
    return result.data
  }
}