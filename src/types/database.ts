// Core database types for Lodgeprice application
// These types match the existing Supabase database schema

export interface Property {
  id: string
  lodgify_property_id: string  // The lodgify property ID (e.g. "327020") 
  property_id: string  // Alias for lodgify_property_id for backward compatibility
  lodgify_room_type_id: number | null
  property_name: string
  base_price_per_day: number
  min_price_per_day: number
  active_discount_strategy_id: string | null
  created_at: string | null
  updated_at: string | null
}

export interface DateRange {
  rate_id: string
  rate_name: string
  start_date: string
  end_date: string
  discount_rate: number  // Adjustment rate (-1 to 10, negative = discount)
  created_at: string | null
  updated_at: string | null
}

export interface Booking {
  id: string
  booking_id: string
  property_id: string  // TEXT reference to properties.property_id
  property_internal_id: string  // UUID reference to properties.id
  arrival_date: string
  departure_date: string
  guest_name: string
  total_price?: number
  booking_status: string
  created_at?: string
  updated_at?: string
}

export interface DiscountStrategy {
  strategy_id: string
  strategy_name: string
  property_internal_id?: string  // UUID, null = all properties
  activation_window: number
  min_discount: number
  max_discount: number
  curve_type: string
  is_active: boolean
  valid_from?: string
  valid_until?: string
}

export interface DiscountRule {
  rule_id: string
  strategy_id: string
  days_before_checkin: number
  discount_percentage: number
  min_nights?: number
  applicable_days?: string[]  // JSONB array
}

// Re-export function interfaces for consistency
export {
  type PricingCalculationParams,
  type PricingCalculationResult,
  type DiscountParams,
  type DiscountResult,
  type BookingConflictParams,
  type BookingConflictResult,
  type CalendarPreviewParams,
  type CalendarPreviewResult,
  type PricingPreview,
  type PriceEditRequest,
  type SeasonalRateRequest,
  type DiscountStrategyRequest,
  type BulkPriceUpdateRequest,
  type FunctionErrorResponse,
  type FunctionResponse
} from './functions'