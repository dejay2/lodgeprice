// Re-export all types from database.ts for backwards compatibility
export * from './database'

// Add Database type for compatibility
export interface Database {
  public: {
    Tables: {
      properties: {
        Row: import('./database').Property
        Insert: Omit<import('./database').Property, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<import('./database').Property, 'id' | 'created_at' | 'updated_at'>>
      }
      date_ranges: {
        Row: import('./database').DateRange
        Insert: Omit<import('./database').DateRange, 'created_at' | 'updated_at'>
        Update: Partial<Omit<import('./database').DateRange, 'rate_id' | 'created_at' | 'updated_at'>>
      }
      bookings: {
        Row: import('./database').Booking
        Insert: Omit<import('./database').Booking, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<import('./database').Booking, 'id' | 'created_at' | 'updated_at'>>
      }
      discount_strategies: {
        Row: import('./database').DiscountStrategy
        Insert: Omit<import('./database').DiscountStrategy, 'strategy_id'>
        Update: Partial<Omit<import('./database').DiscountStrategy, 'strategy_id'>>
      }
      discount_rules: {
        Row: import('./database').DiscountRule
        Insert: Omit<import('./database').DiscountRule, 'rule_id'>
        Update: Partial<Omit<import('./database').DiscountRule, 'rule_id'>>
      }
    }
    Views: {
      booking_summary: { Row: any }
      property_pricing: { Row: any }
      active_discount_strategies: { Row: any }
      discount_rule_details: { Row: any }
    }
    Functions: {
      calculate_final_price: {
        Args: { property_id: string; check_date: string; nights: number }
        Returns: import('./functions').PricingCalculationResult
      }
      get_last_minute_discount: {
        Args: { property_id: string; check_date: string; nights: number }
        Returns: import('./functions').DiscountResult
      }
      check_booking_conflict: {
        Args: { property_id: string; arrival: string; departure: string; booking_id?: string }
        Returns: import('./functions').BookingConflictResult
      }
      preview_pricing_calendar: {
        Args: { property_id: string; start_date: string; end_date: string; nights: number }
        Returns: import('./functions').CalendarPreviewResult[]
      }
    }
  }
}