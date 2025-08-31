/**
 * Pricing Service
 * Handles all pricing-related database function calls with error handling,
 * caching, and performance optimizations
 */

import { supabase } from '@/lib/supabase'
import {
  PricingCalculationError,
  ValidationError,
  DatabaseError,
  PRICING_CONSTANTS,
} from '@/types/helpers'
import type {
  CalculateFinalPriceReturn,
  PreviewPricingCalendarReturn,
  DateRange,
  CacheOptions,
  BatchOperationResult,
} from '@/types/helpers'
import {
  CacheKeys,
} from '@/types/pricing'
import type {
  CalendarCell,
  PricingCalendarData,
  BulkPriceUpdate,
} from '@/types/pricing'

/**
 * Simple in-memory cache for pricing data
 * In production, consider using a more robust caching solution
 */
class PricingCache {
  private cache = new Map<string, { data: any; expires: number }>()
  
  set(key: string, data: any, expirationMinutes: number = PRICING_CONSTANTS.DEFAULT_CACHE_EXPIRATION_MINUTES) {
    const expires = Date.now() + expirationMinutes * 60 * 1000
    this.cache.set(key, { data, expires })
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }
  
  clear(pattern?: string) {
    if (!pattern) {
      this.cache.clear()
      return
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}

const cache = new PricingCache()

/**
 * Conditional pricing options for toggle support
 */
export interface ConditionalPricingOptions extends CacheOptions {
  includeSeasonalRates?: boolean
  includeDiscountStrategies?: boolean
}

/**
 * Main pricing service class
 */
export class PricingService {
  /**
   * Calculate detailed price for a specific date
   * Uses calculate_final_price database function
   * Extended to support conditional pricing based on toggles (FR-3, FR-4)
   */
  async calculateDetailedPrice(
    propertyId: string,
    date: Date,
    nights: number,
    options: CacheOptions = {}
  ): Promise<CalculateFinalPriceReturn> {
    // Validate inputs
    this.validatePricingParams(propertyId, date, nights)
    
    // Check cache unless force refresh
    const cacheKey = CacheKeys.pricing(propertyId, date.toISOString().split('T')[0], nights)
    if (!options.forceRefresh) {
      const cached = cache.get(cacheKey)
      if (cached) return cached
    }
    
    try {
      // Convert UUID to lodgify_property_id for database function
      const lodgifyPropertyId = await this.getLodgifyPropertyId(propertyId)
      
      // Call database function
      const { data, error } = await supabase.rpc('calculate_final_price', {
        p_property_id: lodgifyPropertyId,
        p_check_date: date.toISOString().split('T')[0],
        p_nights: nights,
      })
      
      if (error) {
        throw new PricingCalculationError(
          `Failed to calculate price: ${error.message}`,
          error
        )
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new PricingCalculationError('No pricing data returned')
      }
      
      const result = data[0] as CalculateFinalPriceReturn
      
      // Cache the result
      cache.set(cacheKey, result, options.expirationMinutes)
      
      return result
    } catch (error) {
      return this.handlePricingError(error, 'calculate-price')
    }
  }
  
  /**
   * Calculate conditional price with toggle support
   * Supports excluding seasonal rates and discount strategies (FR-3, FR-4, FR-5)
   */
  async calculateConditionalPrice(
    propertyId: string,
    date: Date,
    nights: number,
    options: ConditionalPricingOptions = {}
  ): Promise<CalculateFinalPriceReturn> {
    // Default to including all components
    const includeSeasonalRates = options.includeSeasonalRates ?? true
    const includeDiscountStrategies = options.includeDiscountStrategies ?? true
    
    // Validate inputs
    this.validatePricingParams(propertyId, date, nights)
    
    // Create cache key that includes toggle states
    const cacheKey = `${CacheKeys.pricing(propertyId, date.toISOString().split('T')[0], nights)}-s${includeSeasonalRates ? '1' : '0'}-d${includeDiscountStrategies ? '1' : '0'}`
    
    if (!options.forceRefresh) {
      const cached = cache.get(cacheKey)
      if (cached) return cached
    }
    
    try {
      // Get lodgify property ID
      const lodgifyPropertyId = await this.getLodgifyPropertyId(propertyId)
      
      // If both toggles are enabled, use standard calculation
      if (includeSeasonalRates && includeDiscountStrategies) {
        const result = await this.calculateDetailedPrice(propertyId, date, nights, options)
        cache.set(cacheKey, result, options.expirationMinutes)
        return result
      }
      
      // Otherwise, calculate with modifications
      const { data, error } = await supabase.rpc('calculate_final_price', {
        p_property_id: lodgifyPropertyId,
        p_check_date: date.toISOString().split('T')[0],
        p_nights: nights,
      })
      
      if (error) {
        throw new PricingCalculationError(
          `Failed to calculate conditional price: ${error.message}`,
          error
        )
      }
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new PricingCalculationError('No pricing data returned')
      }
      
      let result = data[0] as CalculateFinalPriceReturn
      
      // Modify result based on toggle settings
      if (!includeSeasonalRates) {
        // Remove seasonal adjustment (FR-3)
        result = {
          ...result,
          seasonal_adjustment: 0,
          final_price_per_night: result.base_price - (includeDiscountStrategies ? result.last_minute_discount : 0),
          total_price: (result.base_price - (includeDiscountStrategies ? result.last_minute_discount : 0)) * nights
        }
      }
      
      if (!includeDiscountStrategies) {
        // Remove discount (FR-4)
        result = {
          ...result,
          last_minute_discount: 0,
          final_price_per_night: result.base_price + (includeSeasonalRates ? result.seasonal_adjustment : 0),
          total_price: (result.base_price + (includeSeasonalRates ? result.seasonal_adjustment : 0)) * nights
        }
      }
      
      // FR-5: Both toggles disabled shows only base pricing
      if (!includeSeasonalRates && !includeDiscountStrategies) {
        result = {
          ...result,
          seasonal_adjustment: 0,
          last_minute_discount: 0,
          final_price_per_night: result.base_price,
          total_price: result.base_price * nights,
          min_price_enforced: false
        }
      }
      
      // Ensure minimum price is still enforced if needed
      if (result.min_price_enforced && result.final_price_per_night < result.base_price) {
        // This would need property min_price, but we maintain the flag
        result.min_price_enforced = true
      }
      
      // Cache the result
      cache.set(cacheKey, result, options.expirationMinutes)
      
      return result
    } catch (error) {
      return this.handlePricingError(error, 'calculate-conditional-price')
    }
  }
  
  /**
   * Load calendar data for a date range
   * Uses preview_pricing_calendar for bulk efficiency
   * Extended to support conditional pricing based on toggles
   */
  async loadCalendarData(
    propertyId: string,
    dateRange: DateRange,
    nights = PRICING_CONSTANTS.DEFAULT_STAY_LENGTH,
    options: ConditionalPricingOptions = {}
  ): Promise<PreviewPricingCalendarReturn[]> {
    // Validate inputs
    this.validateDateRange(dateRange)
    
    try {
      // Convert UUID to lodgify_property_id for database function
      const lodgifyPropertyId = await this.getLodgifyPropertyId(propertyId)
      
      // Use bulk function for efficiency
      const { data, error } = await supabase.rpc('preview_pricing_calendar', {
        p_property_id: lodgifyPropertyId,
        p_start_date: dateRange.start.toISOString().split('T')[0],
        p_end_date: dateRange.end.toISOString().split('T')[0],
        p_nights: nights,
      })
      
      if (error) {
        throw new DatabaseError(`Failed to load calendar data: ${error.message}`, 'CALENDAR_LOAD', error)
      }
      
      let results = data || []
      
      // Apply toggle modifications if needed
      const includeSeasonalRates = options.includeSeasonalRates ?? true
      const includeDiscountStrategies = options.includeDiscountStrategies ?? true
      
      if (!includeSeasonalRates || !includeDiscountStrategies) {
        results = results.map(day => {
          let modifiedDay = { ...day }
          
          if (!includeSeasonalRates) {
            // Remove seasonal adjustment
            modifiedDay.seasonal_adjustment_percent = 0
            modifiedDay.final_price_per_night = modifiedDay.base_price - 
              (includeDiscountStrategies ? (modifiedDay.base_price * modifiedDay.last_minute_discount_percent / 100) : 0)
          }
          
          if (!includeDiscountStrategies) {
            // Remove discount
            modifiedDay.last_minute_discount_percent = 0
            modifiedDay.final_price_per_night = modifiedDay.base_price + 
              (includeSeasonalRates ? (modifiedDay.base_price * modifiedDay.seasonal_adjustment_percent / 100) : 0)
          }
          
          if (!includeSeasonalRates && !includeDiscountStrategies) {
            // Base price only
            modifiedDay.seasonal_adjustment_percent = 0
            modifiedDay.last_minute_discount_percent = 0
            modifiedDay.final_price_per_night = modifiedDay.base_price
            modifiedDay.min_price_enforced = false
          }
          
          modifiedDay.total_price = modifiedDay.final_price_per_night * nights
          
          return modifiedDay
        })
      }
      
      return results
    } catch (error) {
      return this.handlePricingError(error, 'calendar-load')
    }
  }
  
  /**
   * Transform calendar data for UI grid display
   * Extended to support conditional pricing based on toggles
   */
  async loadPricingCalendar(
    propertyId: string,
    year: number,
    month: number,
    nights = PRICING_CONSTANTS.DEFAULT_STAY_LENGTH,
    options: ConditionalPricingOptions = {}
  ): Promise<PricingCalendarData> {
    // Check cache
    const cacheKey = CacheKeys.calendar(propertyId, year, month)
    const cached = cache.get(cacheKey)
    if (cached) return cached
    
    // Calculate date range for the month
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)
    
    const dateRange: DateRange = { start: startDate, end: endDate }
    
    // Load raw data with toggle options
    const rawData = await this.loadCalendarData(propertyId, dateRange, nights, options)
    
    // Transform to calendar grid
    const calendarData = this.transformToCalendarGrid(rawData, year, month)
    
    // Cache the result
    cache.set(cacheKey, calendarData)
    
    return calendarData
  }
  
  /**
   * Update base price for a property
   */
  async updateBasePrice(
    propertyId: string,
    newPrice: number
  ): Promise<void> {
    if (newPrice < 0) {
      throw new ValidationError('Price cannot be negative')
    }
    
    try {
      const { error } = await supabase
        .from('properties')
        .update({ base_price_per_day: newPrice })
        .eq('id', propertyId)
      
      if (error) {
        throw new DatabaseError(`Failed to update base price: ${error.message}`, 'UPDATE_PRICE', error)
      }
      
      // Clear related cache entries
      cache.clear(propertyId)
    } catch (error) {
      return this.handlePricingError(error, 'update-price')
    }
  }
  
  /**
   * Bulk update prices for multiple dates
   */
  async bulkUpdatePrices(
    updates: BulkPriceUpdate[]
  ): Promise<BatchOperationResult<BulkPriceUpdate>> {
    const result: BatchOperationResult<BulkPriceUpdate> = {
      successful: [],
      failed: [],
      totalProcessed: updates.length,
      successCount: 0,
      failureCount: 0,
    }
    
    // Process in batches to avoid overwhelming the database
    const batchSize = PRICING_CONSTANTS.MAX_BATCH_SIZE
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      
      await Promise.allSettled(
        batch.map(async (update) => {
          try {
            await this.updateBasePrice(update.propertyId, update.newPrice)
            result.successful.push(update)
            result.successCount++
          } catch (error) {
            result.failed.push({
              item: update,
              error: error as Error,
            })
            result.failureCount++
          }
        })
      )
    }
    
    return result
  }
  
  /**
   * Get last-minute discount for a property
   */
  async getLastMinuteDiscount(
    propertyId: string,
    daysBeforeCheckin: number,
    nights = 1,
    checkDate = new Date()
  ): Promise<number> {
    // Check cache
    const cacheKey = CacheKeys.discount(propertyId, daysBeforeCheckin)
    const cached = cache.get(cacheKey)
    if (cached !== null) return cached
    
    try {
      // Convert UUID to lodgify_property_id for database function
      const lodgifyPropertyId = await this.getLodgifyPropertyId(propertyId)
      
      const { data, error } = await supabase.rpc('get_last_minute_discount', {
        p_property_id: lodgifyPropertyId,
        p_days_before_checkin: daysBeforeCheckin,
        p_check_date: checkDate.toISOString().split('T')[0],
        p_nights: nights,
      })
      
      if (error) {
        throw new DatabaseError(`Failed to get discount: ${error.message}`, 'GET_DISCOUNT', error)
      }
      
      const discount = data as number || 0
      
      // Cache for shorter duration since discounts change frequently
      cache.set(cacheKey, discount, 60) // 1 hour cache
      
      return discount
    } catch (error) {
      return this.handlePricingError(error, 'get-discount')
    }
  }
  
  /**
   * Clear pricing cache for a property
   */
  clearCache(propertyId?: string): void {
    if (propertyId) {
      cache.clear(propertyId)
    } else {
      cache.clear()
    }
  }
  
  /**
   * Private helper methods
   */
  
  private validatePricingParams(propertyId: string, date: Date, nights: number): void {
    if (!propertyId || propertyId.trim() === '') {
      throw new ValidationError('Property ID is required')
    }
    
    if (nights < PRICING_CONSTANTS.MIN_NIGHTS || nights > PRICING_CONSTANTS.MAX_NIGHTS) {
      throw new ValidationError(
        `Nights must be between ${PRICING_CONSTANTS.MIN_NIGHTS} and ${PRICING_CONSTANTS.MAX_NIGHTS}`
      )
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) {
      throw new ValidationError('Cannot calculate prices for past dates')
    }
  }

  /**
   * Convert property identifier to lodgify_property_id for database function calls
   * Handles both UUID (converts to lodgify_property_id) and lodgify_property_id (returns as-is)
   * Database functions expect lodgify_property_id (e.g. "327020")
   */
  private async getLodgifyPropertyId(propertyId: string): Promise<string> {
    // Check if it's already a lodgify_property_id (numeric string, no hyphens)
    if (/^\d+$/.test(propertyId)) {
      return propertyId
    }

    // Check if it's a UUID (contains hyphens and is 36 chars), convert to lodgify_property_id
    if (propertyId.length === 36 && propertyId.includes('-')) {
      const { data, error } = await supabase
        .from('properties')
        .select('lodgify_property_id')
        .eq('id', propertyId)
        .single()

      if (error) {
        throw new DatabaseError(`Failed to get lodgify property ID: ${error.message}`, 'PROPERTY_LOOKUP', error)
      }

      if (!data?.lodgify_property_id) {
        throw new ValidationError(`Property not found: ${propertyId}`)
      }

      return data.lodgify_property_id
    }

    // If it's neither a clear UUID nor numeric, treat it as lodgify_property_id
    return propertyId
  }
  
  private validateDateRange(dateRange: DateRange): void {
    if (dateRange.end < dateRange.start) {
      throw new ValidationError('End date must be after start date')
    }
    
    const daysDifference = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    if (daysDifference > 365) {
      throw new ValidationError('Date range cannot exceed 365 days')
    }
  }
  
  private transformToCalendarGrid(
    data: PreviewPricingCalendarReturn[],
    year: number,
    month: number
  ): PricingCalendarData {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const totalDays = lastDay.getDate()
    
    // Create a map for quick lookup
    const priceMap = new Map<string, PreviewPricingCalendarReturn>()
    data.forEach(item => {
      priceMap.set(item.check_date, item)
    })
    
    // Build calendar grid (weeks x days)
    const cells: CalendarCell[][] = []
    let currentWeek: CalendarCell[] = []
    
    // Add empty cells for days before month starts
    const firstDayOfWeek = firstDay.getDay()
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(this.createEmptyCell())
    }
    
    // Add cells for each day of the month
    let totalPrice = 0
    let discountedDays = 0
    
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const priceData = priceMap.get(dateStr)
      
      const cell = this.createCalendarCell(date, priceData)
      currentWeek.push(cell)
      
      if (priceData) {
        totalPrice += priceData.final_price_per_night
        if (priceData.last_minute_discount_percent > 0) {
          discountedDays++
        }
      }
      
      // Start new week if needed
      if (currentWeek.length === 7) {
        cells.push(currentWeek)
        currentWeek = []
      }
    }
    
    // Add empty cells for days after month ends
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(this.createEmptyCell())
    }
    if (currentWeek.length > 0) {
      cells.push(currentWeek)
    }
    
    return {
      month,
      year,
      cells,
      summary: {
        totalDays,
        averagePrice: totalDays > 0 ? totalPrice / totalDays : 0,
        discountedDays,
        bookedDays: 0, // TODO: Integrate with bookings data
      },
    }
  }
  
  private createCalendarCell(
    date: Date,
    priceData?: PreviewPricingCalendarReturn
  ): CalendarCell {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return {
      date,
      price: priceData?.final_price_per_night || 0,
      basePrice: priceData?.base_price || 0,
      hasDiscount: (priceData?.last_minute_discount_percent || 0) > 0,
      discountAmount: priceData ? priceData.base_price - priceData.final_price_per_night : 0,
      discountPercentage: priceData?.last_minute_discount_percent || 0,
      hasSeasonalAdjustment: (priceData?.seasonal_adjustment_percent || 0) !== 0,
      seasonalAdjustmentAmount: priceData ?
        priceData.base_price * (priceData.seasonal_adjustment_percent / 100) : 0,
      isAtMinimum: priceData?.min_price_enforced || false,
      isAvailable: true, // TODO: Check against bookings
      isToday: date.getTime() === today.getTime(),
      isPastDate: date < today,
      dayOfWeek: date.getDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    }
  }
  
  private createEmptyCell(): CalendarCell {
    return {
      date: new Date(0),
      price: 0,
      basePrice: 0,
      hasDiscount: false,
      discountAmount: 0,
      discountPercentage: 0,
      hasSeasonalAdjustment: false,
      seasonalAdjustmentAmount: 0,
      isAtMinimum: false,
      isAvailable: false,
      isToday: false,
      isPastDate: true,
      dayOfWeek: -1,
      isWeekend: false,
    }
  }
  
  private handlePricingError(error: unknown, operation: string): never {
    if (error instanceof ValidationError || error instanceof DatabaseError) {
      throw error
    }
    
    if (error instanceof Error) {
      // Check for specific database error codes
      const message = error.message.toLowerCase()
      
      if (message.includes('network') || message.includes('connection')) {
        throw new DatabaseError(
          `Network error during ${operation}. Please check your connection.`,
          'NETWORK_ERROR',
          error
        )
      }
      
      if (message.includes('timeout')) {
        throw new DatabaseError(
          `Operation timed out during ${operation}. Please try again.`,
          'TIMEOUT',
          error
        )
      }
      
      throw new PricingCalculationError(
        `Pricing operation failed: ${error.message}`,
        error
      )
    }
    
    throw new PricingCalculationError(
      `Unknown error during ${operation}`,
      error
    )
  }
}

// Export singleton instance
export const pricingService = new PricingService()