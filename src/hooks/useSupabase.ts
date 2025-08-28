// React integration hook for Supabase database operations
// Provides error handling, loading states, and retry logic for all database operations

import { useState, useCallback } from 'react'
import { supabase, withRetry, handleSupabaseError, logDatabaseOperation } from '../lib/supabase'
// TODO: Re-enable Database types once type generation is working
// import type { Database } from '../types/database.types'
import type { Property, DateRange, DiscountStrategy } from '../types/database'

// Generic hook for database operations with comprehensive error handling
export function useSupabaseQuery() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executeQuery = useCallback(async <T>(
    queryFn: () => Promise<T>,
    operationName?: string
  ): Promise<T> => {
    setLoading(true)
    setError(null)
    const startTime = Date.now()

    try {
      const result = await withRetry(queryFn)
      const duration = Date.now() - startTime
      
      if (operationName) {
        logDatabaseOperation(operationName, true, duration)
      }
      
      return result
    } catch (err) {
      const duration = Date.now() - startTime
      const errorMessage = handleSupabaseError(err)
      
      setError(errorMessage)
      
      if (operationName) {
        logDatabaseOperation(operationName, false, duration, errorMessage)
      }
      
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setError(null)
    setLoading(false)
  }, [])

  return { executeQuery, loading, error, reset }
}

// Specialized hook for property operations
export function useProperties() {
  const { executeQuery, loading, error, reset } = useSupabaseQuery()
  const [properties, setProperties] = useState<Property[]>([])

  const fetchProperties = useCallback(async () => {
    const result = await executeQuery(
      async () => {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .order('property_name')

        if (error) throw error
        return data as Property[]
      },
      'fetch_properties'
    )
    
    setProperties(result)
    return result
  }, [executeQuery])

  const updateBasePrice = useCallback(async (propertyId: string, newBasePrice: number) => {
    const result = await executeQuery(
      async () => {
        const { data, error } = await supabase
          .from('properties')
          .update({ base_price_per_day: newBasePrice, updated_at: new Date().toISOString() })
          .eq('id', propertyId)
          .select()

        if (error) throw error
        return data as Property[]
      },
      'update_base_price'
    )

    // Update local state
    if (result && result.length > 0) {
      setProperties(prev => 
        prev.map(prop => 
          prop.id === propertyId 
            ? { ...prop, base_price_per_day: newBasePrice, updated_at: new Date().toISOString() }
            : prop
        )
      )
    }

    return result
  }, [executeQuery])

  return {
    properties,
    fetchProperties,
    updateBasePrice,
    loading,
    error,
    reset
  }
}

// Specialized hook for pricing calculations
export function usePricingCalculations() {
  const { executeQuery, loading, error, reset } = useSupabaseQuery()

  const calculateFinalPrice = useCallback(async (
    propertyId: string,
    checkInDate: string,
    stayLength: number
  ) => {
    return await executeQuery(
      async () => {
        const result = await supabase.rpc('calculate_final_price', {
          property_id: propertyId,
          check_in_date: checkInDate,
          stay_length: stayLength
        } as any)

        if (result.error) throw result.error
        return result.data
      },
      'calculate_final_price'
    )
  }, [executeQuery])

  const getLastMinuteDiscount = useCallback(async (
    propertyId: string,
    checkInDate: string
  ) => {
    return await executeQuery(
      async () => {
        const result = await supabase.rpc('get_last_minute_discount', {
          property_id: propertyId,
          check_in_date: checkInDate
        } as any)

        if (result.error) throw result.error
        return result.data
      },
      'get_last_minute_discount'
    )
  }, [executeQuery])

  const checkBookingConflict = useCallback(async (
    propertyId: string,
    startDate: string,
    endDate: string,
    bookingId: string | null = null
  ) => {
    return await executeQuery(
      async () => {
        const result = await supabase.rpc('check_booking_conflict', {
          property_id: propertyId,
          start_date: startDate,
          end_date: endDate,
          booking_id: bookingId
        } as any)

        if (result.error) throw result.error
        return result.data
      },
      'check_booking_conflict'
    )
  }, [executeQuery])

  const previewPricingCalendar = useCallback(async (
    propertyId: string,
    startDate: string,
    endDate: string,
    stayLength: number
  ) => {
    return await executeQuery(
      async () => {
        const result = await supabase.rpc('preview_pricing_calendar', {
          property_id: propertyId,
          start_date: startDate,
          end_date: endDate,
          stay_length: stayLength
        } as any)

        if (result.error) throw result.error
        return result.data
      },
      'preview_pricing_calendar'
    )
  }, [executeQuery])

  return {
    calculateFinalPrice,
    getLastMinuteDiscount,
    checkBookingConflict,
    previewPricingCalendar,
    loading,
    error,
    reset
  }
}

// Specialized hook for date ranges management
export function useDateRanges() {
  const { executeQuery, loading, error, reset } = useSupabaseQuery()
  const [dateRanges, setDateRanges] = useState<DateRange[]>([])

  const fetchDateRanges = useCallback(async () => {
    const result = await executeQuery(
      async () => {
        const { data, error } = await supabase
          .from('date_ranges')
          .select('*')
          .order('start_date')

        if (error) throw error
        return data as DateRange[]
      },
      'fetch_date_ranges'
    )
    
    setDateRanges(result)
    return result
  }, [executeQuery])

  const createDateRange = useCallback(async (
    rateName: string,
    startDate: string,
    endDate: string,
    discountRate: number
  ) => {
    const result = await executeQuery(
      async () => {
        const { data, error } = await supabase
          .from('date_ranges')
          .insert({
            rate_name: rateName,
            start_date: startDate,
            end_date: endDate,
            discount_rate: discountRate
          })
          .select()

        if (error) throw error
        return data as DateRange[]
      },
      'create_date_range'
    )

    // Update local state
    if (result && result.length > 0) {
      setDateRanges(prev => [...prev, ...result].sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      ))
    }

    return result
  }, [executeQuery])

  const updateDateRange = useCallback(async (
    rateId: string,
    updates: Partial<DateRange>
  ) => {
    const result = await executeQuery(
      async () => {
        const { data, error } = await supabase
          .from('date_ranges')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('rate_id', rateId)
          .select()

        if (error) throw error
        return data as DateRange[]
      },
      'update_date_range'
    )

    // Update local state
    if (result && result.length > 0) {
      setDateRanges(prev => 
        prev.map(range => 
          range.rate_id === rateId 
            ? { ...range, ...updates, updated_at: new Date().toISOString() }
            : range
        )
      )
    }

    return result
  }, [executeQuery])

  const deleteDateRange = useCallback(async (rateId: string) => {
    const result = await executeQuery(
      async () => {
        const { error } = await supabase
          .from('date_ranges')
          .delete()
          .eq('rate_id', rateId)

        if (error) throw error
        return { success: true }
      },
      'delete_date_range'
    )

    // Update local state
    setDateRanges(prev => prev.filter(range => range.rate_id !== rateId))
    return result
  }, [executeQuery])

  return {
    dateRanges,
    fetchDateRanges,
    createDateRange,
    updateDateRange,
    deleteDateRange,
    loading,
    error,
    reset
  }
}

// Specialized hook for discount strategies management
export function useDiscountStrategies() {
  const { executeQuery, loading, error, reset } = useSupabaseQuery()
  const [strategies, setStrategies] = useState<DiscountStrategy[]>([])

  const fetchDiscountStrategies = useCallback(async () => {
    const result = await executeQuery(
      async () => {
        const { data, error } = await supabase
          .from('discount_strategies')
          .select('*')
          .order('strategy_name')

        if (error) throw error
        return data as DiscountStrategy[]
      },
      'fetch_discount_strategies'
    )
    
    setStrategies(result)
    return result
  }, [executeQuery])

  const createDiscountStrategy = useCallback(async (
    strategyData: Omit<DiscountStrategy, 'strategy_id' | 'created_at' | 'updated_at'>
  ) => {
    const result = await executeQuery(
      async () => {
        const { data, error } = await supabase
          .from('discount_strategies')
          .insert(strategyData)
          .select()

        if (error) throw error
        return data as DiscountStrategy[]
      },
      'create_discount_strategy'
    )

    // Update local state
    if (result && result.length > 0) {
      setStrategies(prev => [...prev, ...result])
    }

    return result
  }, [executeQuery])

  const updateDiscountStrategy = useCallback(async (
    strategyId: string,
    updates: Partial<DiscountStrategy>
  ) => {
    const result = await executeQuery(
      async () => {
        const { data, error } = await supabase
          .from('discount_strategies')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('strategy_id', strategyId)
          .select()

        if (error) throw error
        return data as DiscountStrategy[]
      },
      'update_discount_strategy'
    )

    // Update local state
    if (result && result.length > 0) {
      setStrategies(prev => 
        prev.map(strategy => 
          strategy.strategy_id === strategyId 
            ? { ...strategy, ...updates, updated_at: new Date().toISOString() }
            : strategy
        )
      )
    }

    return result
  }, [executeQuery])

  return {
    strategies,
    fetchDiscountStrategies,
    createDiscountStrategy,
    updateDiscountStrategy,
    loading,
    error,
    reset
  }
}