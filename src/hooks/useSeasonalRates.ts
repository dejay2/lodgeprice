/**
 * useSeasonalRates - Hook for managing seasonal rate adjustments
 * Handles CRUD operations for date_ranges table
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { SeasonalRate } from '@/types/database-aliases'
import { usePricingContext } from '@/context/PricingContext'

/**
 * Seasonal rate input for creating new rates
 */
export interface NewSeasonalRate {
  rate_name: string
  start_date: string
  end_date: string
  discount_rate: number
}

/**
 * Seasonal rate update parameters
 */
export interface SeasonalRateUpdate {
  rate_name?: string
  start_date?: string
  end_date?: string
  discount_rate?: number
}

/**
 * Hook return type for seasonal rate management
 */
export interface UseSeasonalRates {
  rates: SeasonalRate[]
  addRate: (rate: NewSeasonalRate) => Promise<void>
  updateRate: (id: string, updates: SeasonalRateUpdate) => Promise<void>
  deleteRate: (id: string) => Promise<void>
  refreshRates: () => Promise<void>
  validateOverlap: (startDate: string, endDate: string, excludeId?: string) => Promise<boolean>
  loading: boolean
  error: string | null
  clearError: () => void
}

/**
 * Custom hook for seasonal rate management
 */
export function useSeasonalRates(): UseSeasonalRates {
  const [rates, setRates] = useState<SeasonalRate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { refreshCalendarData } = usePricingContext()
  
  /**
   * Fetch all seasonal rates from database
   */
  const refreshRates = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: dbError } = await supabase
        .from('date_ranges')
        .select('*')
        .order('start_date', { ascending: true })
      
      if (dbError) {
        throw new Error(dbError.message)
      }
      
      setRates(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load seasonal rates'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  /**
   * Validate if a date range overlaps with existing rates
   */
  const validateOverlap = useCallback(async (
    startDate: string,
    endDate: string,
    excludeId?: string
  ): Promise<boolean> => {
    try {
      // Build query to check for overlapping date ranges
      let query = supabase
        .from('date_ranges')
        .select('id')
        .or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`)
      
      // Exclude current rate when updating
      if (excludeId) {
        query = query.neq('rate_id', excludeId)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Overlap validation error:', error)
        return false
      }
      
      // Return true if no overlaps found (valid)
      return !data || data.length === 0
    } catch (err) {
      console.error('Failed to validate overlap:', err)
      return false
    }
  }, [])
  
  /**
   * Add a new seasonal rate
   */
  const addRate = useCallback(async (rate: NewSeasonalRate) => {
    setLoading(true)
    setError(null)
    
    try {
      // Validate date range
      if (rate.start_date > rate.end_date) {
        throw new Error('Start date must be before end date')
      }
      
      // Validate discount rate
      if (rate.discount_rate < -1 || rate.discount_rate > 1) {
        throw new Error('Discount rate must be between -100% and 100%')
      }
      
      // Check for overlaps
      const isValid = await validateOverlap(rate.start_date, rate.end_date)
      if (!isValid) {
        throw new Error('Date range overlaps with existing seasonal rate')
      }
      
      // Insert new rate
      const { data, error: dbError } = await supabase
        .from('date_ranges')
        .insert([rate])
        .select()
        .single()
      
      if (dbError) {
        // Handle exclusion constraint violation
        if (dbError.code === '23P01') {
          throw new Error('Date range overlaps with existing seasonal rate')
        }
        throw new Error(dbError.message)
      }
      
      // Update local state
      setRates(prev => [...prev, data].sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      ))
      
      // Refresh calendar to show updated pricing
      await refreshCalendarData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add seasonal rate'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [validateOverlap, refreshCalendarData])
  
  /**
   * Update an existing seasonal rate
   */
  const updateRate = useCallback(async (id: string, updates: SeasonalRateUpdate) => {
    setLoading(true)
    setError(null)
    
    try {
      // Validate dates if provided
      if (updates.start_date && updates.end_date && updates.start_date > updates.end_date) {
        throw new Error('Start date must be before end date')
      }
      
      // Validate discount rate if provided
      if (updates.discount_rate !== undefined) {
        if (updates.discount_rate < -1 || updates.discount_rate > 1) {
          throw new Error('Discount rate must be between -100% and 100%')
        }
      }
      
      // Check for overlaps if dates are being updated
      if (updates.start_date || updates.end_date) {
        const currentRate = rates.find(r => r.rate_id === id)
        if (currentRate) {
          const startDate = updates.start_date || currentRate.start_date
          const endDate = updates.end_date || currentRate.end_date
          
          const isValid = await validateOverlap(startDate, endDate, id)
          if (!isValid) {
            throw new Error('Updated date range overlaps with existing seasonal rate')
          }
        }
      }
      
      // Update rate in database
      const { data, error: dbError } = await supabase
        .from('date_ranges')
        .update(updates)
        .eq('rate_id', id)
        .select()
        .single()
      
      if (dbError) {
        if (dbError.code === '23P01') {
          throw new Error('Updated date range overlaps with existing seasonal rate')
        }
        throw new Error(dbError.message)
      }
      
      // Update local state
      setRates(prev => prev.map(rate => 
        rate.rate_id === id ? data : rate
      ).sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      ))
      
      // Refresh calendar to show updated pricing
      await refreshCalendarData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update seasonal rate'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [rates, validateOverlap, refreshCalendarData])
  
  /**
   * Delete a seasonal rate
   */
  const deleteRate = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const { error: dbError } = await supabase
        .from('date_ranges')
        .delete()
        .eq('rate_id', id)
      
      if (dbError) {
        throw new Error(dbError.message)
      }
      
      // Update local state
      setRates(prev => prev.filter(rate => rate.rate_id !== id))
      
      // Refresh calendar to show updated pricing
      await refreshCalendarData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete seasonal rate'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [refreshCalendarData])
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  /**
   * Load rates on mount
   */
  useEffect(() => {
    refreshRates()
  }, [refreshRates])
  
  return {
    rates,
    addRate,
    updateRate,
    deleteRate,
    refreshRates,
    validateOverlap,
    loading,
    error,
    clearError
  }
}