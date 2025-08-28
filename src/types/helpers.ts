/**
 * Helper types for database operations
 * Provides type-safe interfaces for Supabase database functions and operations
 */

import type { Database } from './database.generated'

// Extract the function types for easier usage
export type DbFunctions = Database['public']['Functions']

/**
 * Pricing calculation function parameters and return types
 */
export interface CalculateFinalPriceParams {
  p_property_id: string  // lodgify_property_id
  p_check_date: string   // ISO date string
  p_nights: number
}

export interface CalculateFinalPriceReturn {
  base_price: number
  seasonal_adjustment: number
  last_minute_discount: number
  final_price_per_night: number
  total_price: number
  min_price_enforced: boolean
}

/**
 * Preview pricing calendar parameters and return types
 */
export interface PreviewPricingCalendarParams {
  p_property_id: string
  p_start_date: string
  p_end_date: string
  p_nights: number
}

export interface PreviewPricingCalendarReturn {
  base_price: number
  check_date: string
  days_from_today: number
  final_price_per_night: number
  last_minute_discount_percent: number
  min_price_enforced: boolean
  savings_amount: number
  savings_percent: number
  seasonal_adjustment_percent: number
  total_price: number
}

/**
 * Booking conflict check parameters and return types
 */
export interface CheckBookingConflictParams {
  p_property_id: string  // lodgify_property_id
  p_arrival_date: string
  p_departure_date: string
  p_exclude_booking_id?: string | null
}

/**
 * Discount calculation parameters
 */
export interface GetLastMinuteDiscountParams {
  p_property_id: string  // lodgify_property_id
  p_days_before_checkin: number
  p_nights?: number
  p_check_date?: string
}

/**
 * Lodgify integration types
 */
export interface LodgifyPricingData {
  property_id: string
  room_type_id: number
  start_date: string
  end_date: string
  price_per_day: number
  is_default: boolean
  min_stay: number
  max_stay: number
  price_per_additional_guest: number
  additional_guests_starts_from: number
}

export interface GenerateLodgifyPricingDataParams {
  p_property_id: string
  p_min_stay?: number
  p_max_stay?: number
  p_price_per_additional_guest?: number
  p_additional_guests_starts_from?: number
}

/**
 * Discount strategy management types
 */
export interface DiscountStrategy {
  strategy_id: string
  strategy_name: string
  property_internal_id: string | null
  activation_window: number
  min_discount: number
  max_discount: number
  curve_type: 'aggressive' | 'moderate' | 'gentle'
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
}

export interface GlobalStrategy {
  strategy_id: string
  strategy_name: string
  activation_window: number
  min_discount: number
  max_discount: number
  curve_type: string
  is_active: boolean
  rule_count: number
}

/**
 * Error types for database operations
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class PricingCalculationError extends DatabaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'PRICING_ERROR', details)
    this.name = 'PricingCalculationError'
  }
}

export class BookingConflictError extends DatabaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'BOOKING_CONFLICT', details)
    this.name = 'BookingConflictError'
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

/**
 * Utility type for date range operations
 */
export interface DateRange {
  start: Date
  end: Date
}

/**
 * Property type with calculated fields
 */
export interface PropertyWithPricing {
  id: string
  lodgify_property_id: string
  lodgify_room_type_id: number | null
  property_name: string
  base_price_per_day: number
  min_price_per_day: number
  has_active_discount?: boolean
  active_discount_count?: number
}

/**
 * Cache control types
 */
export interface CacheOptions {
  expirationMinutes?: number
  forceRefresh?: boolean
}

/**
 * Batch operation types
 */
export interface BatchOperationResult<T> {
  successful: T[]
  failed: Array<{
    item: T
    error: Error
  }>
  totalProcessed: number
  successCount: number
  failureCount: number
}

/**
 * Type guards for runtime validation
 */
export function isPricingCalculationResult(value: unknown): value is CalculateFinalPriceReturn {
  return (
    typeof value === 'object' &&
    value !== null &&
    'base_price' in value &&
    'final_price_per_night' in value &&
    'total_price' in value
  )
}

export function isDateRange(value: unknown): value is DateRange {
  return (
    typeof value === 'object' &&
    value !== null &&
    'start' in value &&
    'end' in value &&
    value.start instanceof Date &&
    value.end instanceof Date
  )
}

/**
 * Common query parameter types
 */
export interface PaginationParams {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export interface FilterParams {
  propertyId?: string
  dateFrom?: string
  dateTo?: string
  status?: string
}

/**
 * Response wrapper types
 */
export interface ApiResponse<T> {
  data: T | null
  error: Error | null
  loading: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  totalCount: number
  hasMore: boolean
  nextOffset: number
}

/**
 * Sync operation types
 */
export interface SyncOperation {
  operation_id: string
  property_internal_id: string
  operation_type: string
  operation_status: 'pending' | 'processing' | 'completed' | 'failed'
  date_range_start: string
  date_range_end: string
  total_days: number
  attempt_number: number
  max_attempts: number
  api_response_status: number | null
  api_error_message: string | null
  duration_ms: number | null
}

/**
 * Constants for business logic
 */
export const PRICING_CONSTANTS = {
  MAX_NIGHTS: 365,
  MIN_NIGHTS: 1,
  MAX_DISCOUNT_PERCENTAGE: 100,
  MIN_DISCOUNT_PERCENTAGE: 0,
  DEFAULT_CACHE_EXPIRATION_MINUTES: 360, // 6 hours
  MAX_BATCH_SIZE: 100,
  DEFAULT_STAY_LENGTH: 3 as number,
  LODGIFY_SYNC_YEARS: 2,
} as const

/**
 * Curve type calculations
 */
export const DISCOUNT_CURVES = {
  aggressive: (daysOut: number, window: number, min: number, max: number) => {
    const ratio = Math.pow(daysOut / window, 2)
    return max - (max - min) * ratio
  },
  moderate: (daysOut: number, window: number, min: number, max: number) => {
    const ratio = daysOut / window
    return max - (max - min) * ratio
  },
  gentle: (daysOut: number, window: number, min: number, max: number) => {
    const ratio = Math.sqrt(daysOut / window)
    return max - (max - min) * ratio
  },
} as const