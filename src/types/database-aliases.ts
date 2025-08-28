/**
 * Database type aliases for easier usage
 * Maps generated types to simpler names
 */

import type { Database } from './database.generated'

// Table type aliases
export type Property = Database['public']['Tables']['properties']['Row']
export type PropertyInsert = Database['public']['Tables']['properties']['Insert']
export type PropertyUpdate = Database['public']['Tables']['properties']['Update']

export type SeasonalRate = Database['public']['Tables']['date_ranges']['Row']
export type SeasonalRateInsert = Database['public']['Tables']['date_ranges']['Insert']
export type SeasonalRateUpdate = Database['public']['Tables']['date_ranges']['Update']

export type DiscountStrategy = Database['public']['Tables']['discount_strategies']['Row']
export type DiscountStrategyInsert = Database['public']['Tables']['discount_strategies']['Insert']
export type DiscountStrategyUpdate = Database['public']['Tables']['discount_strategies']['Update']

export type DiscountRule = Database['public']['Tables']['discount_rules']['Row']
export type DiscountRuleInsert = Database['public']['Tables']['discount_rules']['Insert']
export type DiscountRuleUpdate = Database['public']['Tables']['discount_rules']['Update']

export type Booking = Database['public']['Tables']['bookings']['Row']
export type BookingInsert = Database['public']['Tables']['bookings']['Insert']
export type BookingUpdate = Database['public']['Tables']['bookings']['Update']

// View type aliases
export type ActiveDiscountStrategy = Database['public']['Views']['active_discount_strategies']['Row']

// Function type aliases
export type CalculateFinalPriceReturn = Database['public']['Functions']['calculate_final_price']['Returns']
export type PreviewPricingCalendarReturn = Database['public']['Functions']['preview_pricing_calendar']['Returns']

// Re-export the existing types from database.ts for backward compatibility
export type {
  DateRange as DateRangeLegacy
} from './database'