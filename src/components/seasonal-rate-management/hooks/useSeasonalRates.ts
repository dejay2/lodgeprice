/**
 * useSeasonalRates - Enhanced hook for managing seasonal rate adjustments
 * Handles CRUD operations for date_ranges table with improved validation and real-time updates
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { 
  SeasonalRate, 
  CreateSeasonalRateData, 
  UpdateSeasonalRateData,
  FilterOptions,
  SortConfig,
  BulkOperationResult 
} from '../types/SeasonalRate'

export const useSeasonalRates = () => {
  const [seasonalRates, setSeasonalRates] = useState<SeasonalRate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all seasonal rates with sorting and filtering
  const fetchSeasonalRates = useCallback(async (filters?: FilterOptions, sort?: SortConfig) => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('date_ranges')
        .select('*')

      // Apply filters if provided
      if (filters?.dateRange) {
        query = query
          .gte('start_date', filters.dateRange.start)
          .lte('end_date', filters.dateRange.end)
      }

      if (filters?.rateAdjustmentRange) {
        query = query
          .gte('discount_rate', filters.rateAdjustmentRange.min)
          .lte('discount_rate', filters.rateAdjustmentRange.max)
      }

      if (filters?.searchTerm) {
        query = query.ilike('rate_name', `%${filters.searchTerm}%`)
      }

      // Apply sorting
      const sortField = sort?.field || 'start_date'
      const sortDirection = sort?.direction === 'desc'
      query = query.order(sortField as any, { ascending: !sortDirection })

      const { data, error } = await query

      if (error) throw error
      
      // Map database fields to our interface
      const mappedRates: SeasonalRate[] = (data || []).map(rate => ({
        ...rate,
        isOverlapping: false, // Will be determined client-side
        conflictsWith: []
      }))
      
      setSeasonalRates(mappedRates)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch seasonal rates')
      setSeasonalRates([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Create new seasonal rate with validation
  const createSeasonalRate = async (data: CreateSeasonalRateData): Promise<SeasonalRate> => {
    try {
      // Check for overlaps locally (database function not available yet)
      const startDateStr = data.startDate.toISOString().split('T')[0]
      const endDateStr = data.endDate.toISOString().split('T')[0]
      
      // Check against existing rates
      const overlapping = seasonalRates.find(rate => 
        (rate.start_date <= endDateStr && rate.end_date >= startDateStr)
      )
      
      if (overlapping) {
        throw new Error(`Date range overlaps with existing period: ${overlapping.rate_name}`)
      }

      const { data: newRate, error } = await supabase
        .from('date_ranges')
        .insert({
          rate_name: data.name,
          start_date: data.startDate.toISOString().split('T')[0],
          end_date: data.endDate.toISOString().split('T')[0],
          discount_rate: data.rateAdjustment,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        // Handle exclusion constraint violation
        if (error.code === '23P01') {
          throw new Error('Date range overlaps with existing seasonal rate')
        }
        throw error
      }

      // Update local state
      const mappedRate: SeasonalRate = {
        ...newRate,
        isOverlapping: false,
        conflictsWith: []
      }
      setSeasonalRates(prev => [...prev, mappedRate])
      return mappedRate
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create seasonal rate'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Update existing seasonal rate
  const updateSeasonalRate = async (id: string, data: UpdateSeasonalRateData): Promise<SeasonalRate> => {
    try {
      // Check for overlaps locally excluding current record
      if (data.startDate && data.endDate) {
        const startDateStr = data.startDate.toISOString().split('T')[0]
        const endDateStr = data.endDate.toISOString().split('T')[0]
        
        const overlapping = seasonalRates.find(rate => 
          rate.rate_id !== id &&
          (rate.start_date <= endDateStr && rate.end_date >= startDateStr)
        )
        
        if (overlapping) {
          throw new Error(`Date range overlaps with existing period: ${overlapping.rate_name}`)
        }
      }

      const updateData: any = { updated_at: new Date().toISOString() }
      if (data.name !== undefined) updateData.rate_name = data.name
      if (data.startDate) updateData.start_date = data.startDate.toISOString().split('T')[0]
      if (data.endDate) updateData.end_date = data.endDate.toISOString().split('T')[0]
      if (data.rateAdjustment !== undefined) updateData.discount_rate = data.rateAdjustment

      const { data: updatedRate, error } = await supabase
        .from('date_ranges')
        .update(updateData)
        .eq('rate_id', id)
        .select()
        .single()

      if (error) {
        if (error.code === '23P01') {
          throw new Error('Date range overlaps with existing seasonal rate')
        }
        throw error
      }

      // Update local state
      const mappedRate: SeasonalRate = {
        ...updatedRate,
        isOverlapping: false,
        conflictsWith: []
      }
      setSeasonalRates(prev => prev.map(rate => rate.rate_id === id ? mappedRate : rate))
      return mappedRate
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update seasonal rate'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Delete seasonal rate
  const deleteSeasonalRate = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('date_ranges')
        .delete()
        .eq('rate_id', id)

      if (error) throw error

      // Update local state
      setSeasonalRates(prev => prev.filter(rate => rate.rate_id !== id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete seasonal rate'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Bulk delete seasonal rates
  const bulkDeleteSeasonalRates = async (ids: string[]): Promise<BulkOperationResult> => {
    const results: BulkOperationResult = { success: [], failed: [] }
    
    for (const id of ids) {
      try {
        await deleteSeasonalRate(id)
        results.success.push(id)
      } catch (err) {
        results.failed.push({
          id,
          error: err instanceof Error ? err.message : 'Failed to delete'
        })
      }
    }
    
    return results
  }

  // Set up real-time subscriptions
  useEffect(() => {
    // Initial fetch
    fetchSeasonalRates()

    // Set up subscription
    const subscription = supabase
      .channel('date_ranges_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'date_ranges'
      }, (payload) => {
        console.log('Real-time update:', payload)
        // Refresh data on any change
        fetchSeasonalRates()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, []) // Empty array is intentional - we only want to set up subscription once

  return {
    seasonalRates,
    isLoading,
    error,
    refetch: fetchSeasonalRates,
    createSeasonalRate,
    updateSeasonalRate,
    deleteSeasonalRate,
    bulkDeleteSeasonalRates
  }
}