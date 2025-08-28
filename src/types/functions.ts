// Database function interfaces and parameter types
// These interfaces match the exact function signatures from the Supabase database

// Pricing calculation function parameters and results
export interface PricingCalculationParams {
  property_id: string
  check_in_date: string  // ISO 8601 format
  stay_length: number
}

export interface PricingCalculationResult {
  property_id: string
  property_name: string
  check_date: string
  nights: number
  base_price_per_night: number
  seasonal_adjustment: number
  seasonal_rate: number
  adjusted_price_per_night: number
  last_minute_discount: number
  discounted_price_per_night: number
  final_price_per_night: number
  total_price: number
  min_price_per_night: number
  savings_amount: number
  savings_percentage: number
  has_seasonal_rate: boolean
  has_last_minute_discount: boolean
  at_minimum_price: boolean
}

// Last-minute discount function parameters and results
export interface DiscountParams {
  property_id: string
  check_in_date: string
}

export interface DiscountResult {
  discount_percentage: number
  strategy_name: string | null
  days_until_checkin: number
}

// Booking conflict check parameters and results
export interface BookingConflictParams {
  property_id: string
  start_date: string
  end_date: string
  booking_id: string | null
}

export interface BookingConflictResult {
  has_conflict: boolean
  conflicting_booking_id: string | null
  conflicting_dates: string | null
}

// Calendar preview function parameters and results
export interface CalendarPreviewParams {
  property_id: string
  start_date: string
  end_date: string
  stay_length: number
}

export interface CalendarPreviewResult {
  date: string
  base_price: number
  seasonal_rate: number | null
  final_price: number
  discount_applied: number | null
  is_available: boolean
}

// Enhanced pricing preview for UI components
export interface PricingPreview {
  date: string
  base_price: number
  seasonal_rate?: number
  final_price: number
  discount_applied?: number
  is_available?: boolean
  has_booking_conflict?: boolean
}

// Application-specific request types for UI operations
export interface PriceEditRequest {
  propertyId: string
  newBasePrice: number
  validationConstraints?: {
    minPrice?: number
    maxPrice?: number
  }
}

export interface SeasonalRateRequest {
  rateName: string
  startDate: string
  endDate: string
  discountRate: number
  validationRules?: {
    preventOverlaps?: boolean
    maxDiscountRate?: number
    minDiscountRate?: number
  }
}

export interface DiscountStrategyRequest {
  strategyName: string
  propertyInternalId?: string | null  // null = applies to all properties
  activationWindow: number  // days before check-in
  minDiscount: number
  maxDiscount: number
  curveType: 'linear' | 'exponential' | 'step'
  isActive?: boolean
  validFrom?: string
  validUntil?: string
}

// Bulk operations for efficiency
export interface BulkPriceUpdateRequest {
  propertyIds: string[]
  priceChanges: {
    basePrice?: number
    minPrice?: number
    seasonalRates?: SeasonalRateRequest[]
  }
  validationRules?: {
    requireConfirmation?: boolean
    validateConstraints?: boolean
  }
}

// Error response types for function calls
export interface FunctionErrorResponse {
  error: string
  code?: string
  details?: any
  suggestion?: string
}

// Success response wrapper for all function calls
export interface FunctionResponse<T> {
  success: boolean
  data?: T
  error?: FunctionErrorResponse
  metadata?: {
    executionTime: number
    timestamp: string
    functionName: string
  }
}