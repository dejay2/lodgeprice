/**
 * usePricingCalculation - Hook for database pricing calculations
 * Wraps calculate_final_price and preview_pricing_calendar functions
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { 
  CalculateFinalPriceReturn
} from '@/types/helpers'
import { usePricingContext } from '@/context/PricingContext'

/**
 * Price calculation request parameters
 */
export interface PriceCalculationParams {
  propertyId: string
  date: Date
  nights: number
}

/**
 * Bulk price calculation parameters
 */
export interface BulkPriceCalculationParams {
  propertyId: string
  dateRange: { start: Date; end: Date }
  nights: number
}

/**
 * Database error with PostgreSQL error code
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

/**
 * Hook return type with all pricing calculation methods
 */
export interface UsePricingCalculation {
  calculatePrice: (params: PriceCalculationParams) => Promise<CalculateFinalPriceReturn>
  calculateBulk: (params: BulkPriceCalculationParams) => Promise<Map<string, CalculateFinalPriceReturn>>
  loading: boolean
  error: string | null
  clearError: () => void
}

/**
 * Custom hook for pricing calculations using database functions
 */
export function usePricingCalculation(): UsePricingCalculation {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { updateCalendarCell } = usePricingContext()
  
  /**
   * Calculate price for a single date using calculate_final_price function
   */
  const calculatePrice = useCallback(async ({
    propertyId,
    date,
    nights
  }: PriceCalculationParams): Promise<CalculateFinalPriceReturn> => {
    setLoading(true)
    setError(null)
    
    try {
      const dateString = date.toISOString().split('T')[0]
      
      // Call database function calculate_final_price
      const { data, error: dbError } = await supabase.rpc('calculate_final_price', {
        p_property_id: propertyId,
        p_check_date: dateString,
        p_nights: nights
      })
      
      if (dbError) {
        throw new DatabaseError(dbError.message, dbError.code)
      }
      
      if (!data) {
        throw new DatabaseError('No pricing data returned')
      }
      
      // Update cache with calculated price
      updateCalendarCell(dateString, {
        ...data,
        date: dateString,
        nights
      })
      
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      
      // Handle specific database errors
      if (err instanceof DatabaseError) {
        if (err.code === 'PGRST301') {
          // Timeout - could retry with exponential backoff
          console.error('Database timeout:', err)
        } else if (err.code === '23P01') {
          // Exclusion constraint violation
          console.error('Date range conflict:', err)
        }
      }
      
      throw err
    } finally {
      setLoading(false)
    }
  }, [updateCalendarCell])
  
  /**
   * Calculate prices for a date range using preview_pricing_calendar function
   * Optimized for bulk operations
   */
  const calculateBulk = useCallback(async ({
    propertyId,
    dateRange,
    nights
  }: BulkPriceCalculationParams): Promise<Map<string, CalculateFinalPriceReturn>> => {
    setLoading(true)
    setError(null)
    
    try {
      const startDate = dateRange.start.toISOString().split('T')[0]
      const endDate = dateRange.end.toISOString().split('T')[0]
      
      // Call database function preview_pricing_calendar for bulk loading
      const { data, error: dbError } = await supabase.rpc('preview_pricing_calendar', {
        p_property_id: propertyId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_nights: nights
      })
      
      if (dbError) {
        throw new DatabaseError(dbError.message, dbError.code)
      }
      
      if (!data || !Array.isArray(data)) {
        throw new DatabaseError('Invalid pricing data returned')
      }
      
      // Convert array to Map for efficient lookups
      const priceMap = new Map<string, CalculateFinalPriceReturn>()
      
      for (const row of data) {
        const dateKey = row.check_date
        
        // Transform to CalculateFinalPriceReturn structure
        const priceData: CalculateFinalPriceReturn = {
          base_price: row.base_price,
          seasonal_adjustment: (row.seasonal_adjustment_percent || 0) * row.base_price / 100,
          last_minute_discount: row.savings_amount || 0,
          final_price_per_night: row.final_price_per_night,
          total_price: row.total_price,
          min_price_enforced: row.min_price_enforced || false
        }
        
        priceMap.set(dateKey, priceData)
        
        // Update cache for each date
        updateCalendarCell(dateKey, {
          ...priceData,
          date: dateKey,
          nights
        })
      }
      
      return priceMap
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [updateCalendarCell])
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  return {
    calculatePrice,
    calculateBulk,
    loading,
    error,
    clearError
  }
}

/**
 * Hook for optimistic price updates with rollback
 */
export function useOptimisticPriceUpdate() {
  const { calendarData, updateCalendarCell } = usePricingContext()
  const { calculatePrice } = usePricingCalculation()
  
  const updatePrice = useCallback(async (
    date: Date,
    newPrice: number,
    propertyId: string,
    nights: number = 3
  ) => {
    const dateKey = date.toISOString().split('T')[0]
    const originalData = calendarData.get(dateKey)
    
    // Optimistic update - immediately update UI
    if (originalData) {
      updateCalendarCell(dateKey, {
        ...originalData,
        final_price_per_night: newPrice,
        total_price: newPrice * nights
      })
    }
    
    try {
      // Recalculate with database function to get accurate values
      const result = await calculatePrice({
        propertyId,
        date,
        nights
      })
      
      // Update with actual calculated values
      updateCalendarCell(dateKey, {
        ...result,
        date: dateKey,
        nights
      })
      
      return result
    } catch (error) {
      // Rollback optimistic update on failure
      if (originalData) {
        updateCalendarCell(dateKey, originalData)
      }
      throw error
    }
  }, [calendarData, updateCalendarCell, calculatePrice])
  
  return { updatePrice }
}