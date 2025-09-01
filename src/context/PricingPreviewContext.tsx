/**
 * PricingPreviewContext - Preview state management for pricing changes
 * Implements optimistic updates pattern for real-time preview functionality
 * Based on PRP-14 requirements for pricing preview with confirmation workflow
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { CalculateFinalPriceReturn } from '@/types/helpers'

/**
 * Types for preview state management
 */
export interface PricingChange {
  id: string
  type: 'basePrice' | 'seasonal' | 'discount'
  propertyId: string
  date?: Date
  dateRange?: { start: Date; end: Date }
  oldValue: any
  newValue: any
  description: string
  timestamp: Date
}

export interface PreviewPricingData {
  date: string
  pricing: CalculateFinalPriceReturn
  hasChange: boolean
}

interface PricingPreviewContextType {
  // Preview mode state
  isPreviewMode: boolean
  startPreview: () => void
  cancelPreview: () => void
  
  // Pricing data
  originalPricing: Map<string, CalculateFinalPriceReturn>
  previewPricing: Map<string, CalculateFinalPriceReturn>
  pendingChanges: PricingChange[]
  
  // Change management
  addPricingChange: (change: Omit<PricingChange, 'id' | 'timestamp'>) => void
  removePricingChange: (changeId: string) => void
  clearAllChanges: () => void
  
  // Confirmation workflow
  confirmChanges: () => Promise<void>
  isConfirming: boolean
  showConfirmationModal: boolean
  setShowConfirmationModal: (show: boolean) => void
  
  // Loading and error states
  isCalculating: boolean
  calculationError: string | null
  clearError: () => void
  
  // Helper functions
  getAffectedDates: () => Date[]
  calculatePreviewPricing: (propertyId: string, dates: Date[], stayLength: number) => Promise<void>
}

export const PricingPreviewContext = createContext<PricingPreviewContextType | null>(null)

export function usePricingPreview() {
  const context = useContext(PricingPreviewContext)
  if (!context) {
    throw new Error('usePricingPreview must be used within PricingPreviewProvider')
  }
  return context
}

interface PricingPreviewProviderProps {
  children: React.ReactNode
}

export function PricingPreviewProvider({ children }: PricingPreviewProviderProps) {
  // Preview mode state
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  
  // Pricing data state
  const [originalPricing, setOriginalPricing] = useState<Map<string, CalculateFinalPriceReturn>>(new Map())
  const [previewPricing, setPreviewPricing] = useState<Map<string, CalculateFinalPriceReturn>>(new Map())
  const [pendingChanges, setPendingChanges] = useState<PricingChange[]>([])
  
  // Loading and error states
  const [isCalculating, setIsCalculating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [calculationError, setCalculationError] = useState<string | null>(null)
  
  // Reference for tracking calculation cancellation
  const calculationAbortControllerRef = useRef<AbortController | null>(null)
  
  /**
   * Start preview mode and capture current pricing state
   */
  const startPreview = useCallback(() => {
    setIsPreviewMode(true)
    // Capture current pricing as original state
    setOriginalPricing(new Map(previewPricing))
    setPendingChanges([])
    setCalculationError(null)
  }, [previewPricing])
  
  /**
   * Cancel preview mode and revert all changes
   */
  const cancelPreview = useCallback(() => {
    // Cancel any ongoing calculations
    if (calculationAbortControllerRef.current) {
      calculationAbortControllerRef.current.abort()
    }
    
    // Revert to original pricing
    setPreviewPricing(new Map(originalPricing))
    setPendingChanges([])
    setIsPreviewMode(false)
    setShowConfirmationModal(false)
    setCalculationError(null)
  }, [originalPricing])
  
  /**
   * Add a pricing change to preview
   */
  const addPricingChange = useCallback((change: Omit<PricingChange, 'id' | 'timestamp'>) => {
    const newChange: PricingChange = {
      ...change,
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }
    
    setPendingChanges(prev => [...prev, newChange])
    
    // Apply change to preview pricing immediately (optimistic update)
    if (change.type === 'basePrice' && change.date) {
      const dateKey = change.date.toISOString().split('T')[0]
      setPreviewPricing(prev => {
        const newMap = new Map(prev)
        const existingPricing = prev.get(dateKey)
        if (existingPricing) {
          // Update with new base price value (keeping structure compatible)
          newMap.set(dateKey, {
            ...existingPricing,
            base_price: change.newValue,
            base_price_per_night: change.newValue,
            final_price_per_night: change.newValue, // Simplified for preview
            min_price_enforced: false,
            at_minimum_price: false
          })
        }
        return newMap
      })
    }
  }, [])
  
  /**
   * Remove a specific pricing change
   */
  const removePricingChange = useCallback((changeId: string) => {
    setPendingChanges(prev => {
      const change = prev.find(c => c.id === changeId)
      if (!change) return prev
      
      // Revert the specific change in preview pricing
      if (change.type === 'basePrice' && change.date) {
        const dateKey = change.date.toISOString().split('T')[0]
        setPreviewPricing(pricing => {
          const newMap = new Map(pricing)
          const originalPrice = originalPricing.get(dateKey)
          if (originalPrice) {
            newMap.set(dateKey, originalPrice)
          }
          return newMap
        })
      }
      
      return prev.filter(c => c.id !== changeId)
    })
  }, [originalPricing])
  
  /**
   * Clear all pending changes
   */
  const clearAllChanges = useCallback(() => {
    setPreviewPricing(new Map(originalPricing))
    setPendingChanges([])
  }, [originalPricing])
  
  /**
   * Calculate preview pricing using database functions
   */
  const calculatePreviewPricing = useCallback(async (
    propertyId: string, 
    dates: Date[], 
    stayLength: number
  ) => {
    // Cancel any ongoing calculation
    if (calculationAbortControllerRef.current) {
      calculationAbortControllerRef.current.abort()
    }
    
    const abortController = new AbortController()
    calculationAbortControllerRef.current = abortController
    
    setIsCalculating(true)
    setCalculationError(null)
    
    try {
      const previewResults = new Map<string, CalculateFinalPriceReturn>()
      
      // Calculate pricing for each date using database function
      for (const date of dates) {
        if (abortController.signal.aborted) break
        
        const dateString = date.toISOString().split('T')[0]
        
        // Use calculate_final_price for accuracy (as per PRP)
        const { data, error } = await supabase.rpc('calculate_final_price', {
          p_property_id: propertyId,
          p_check_date: dateString,
          p_nights: stayLength
        })
        
        if (error) {
          console.error('Preview calculation error:', error)
          continue // Skip this date but continue with others
        }
        
        if (data && Array.isArray(data) && data.length > 0) {
          const transformedData = {
            ...data[0],
            // Add compatibility aliases
            base_price: data[0].base_price_per_night,
            min_price_enforced: data[0].at_minimum_price,
          }
          previewResults.set(dateString, transformedData)
        }
      }
      
      if (!abortController.signal.aborted) {
        setPreviewPricing(previewResults)
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        setCalculationError(error instanceof Error ? error.message : 'Failed to calculate preview pricing')
      }
    } finally {
      setIsCalculating(false)
      if (calculationAbortControllerRef.current === abortController) {
        calculationAbortControllerRef.current = null
      }
    }
  }, [])
  
  /**
   * Confirm and save all pending changes
   */
  const confirmChanges = useCallback(async () => {
    setIsConfirming(true)
    setCalculationError(null)
    
    try {
      // Group changes by type for efficient batch operations
      const basePriceChanges = pendingChanges.filter(c => c.type === 'basePrice')
      const seasonalChanges = pendingChanges.filter(c => c.type === 'seasonal')
      const discountChanges = pendingChanges.filter(c => c.type === 'discount')
      
      // Apply base price changes
      for (const change of basePriceChanges) {
        const { error } = await supabase
          .from('properties')
          .update({ base_price_per_day: change.newValue })
          .eq('lodgify_property_id', change.propertyId)
        
        if (error) {
          throw new Error(`Failed to update base price: ${error.message}`)
        }
      }
      
      // Apply seasonal rate changes
      for (const change of seasonalChanges) {
        // Implementation depends on seasonal rate structure
        console.log('Applying seasonal change:', change)
      }
      
      // Apply discount changes
      for (const change of discountChanges) {
        // Implementation depends on discount structure
        console.log('Applying discount change:', change)
      }
      
      // Success - update original pricing with confirmed changes
      setOriginalPricing(new Map(previewPricing))
      setPendingChanges([])
      setIsPreviewMode(false)
      setShowConfirmationModal(false)
      
    } catch (error) {
      setCalculationError(error instanceof Error ? error.message : 'Failed to save changes')
      throw error
    } finally {
      setIsConfirming(false)
    }
  }, [pendingChanges, previewPricing])
  
  /**
   * Get list of dates affected by pending changes
   */
  const getAffectedDates = useCallback(() => {
    const dates = new Set<string>()
    
    pendingChanges.forEach(change => {
      if (change.date) {
        dates.add(change.date.toISOString().split('T')[0])
      }
      if (change.dateRange) {
        const current = new Date(change.dateRange.start)
        const end = new Date(change.dateRange.end)
        while (current <= end) {
          dates.add(current.toISOString().split('T')[0])
          current.setDate(current.getDate() + 1)
        }
      }
    })
    
    return Array.from(dates).map(d => new Date(d))
  }, [pendingChanges])
  
  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setCalculationError(null)
  }, [])
  
  const value: PricingPreviewContextType = {
    isPreviewMode,
    startPreview,
    cancelPreview,
    originalPricing,
    previewPricing,
    pendingChanges,
    addPricingChange,
    removePricingChange,
    clearAllChanges,
    confirmChanges,
    isConfirming,
    showConfirmationModal,
    setShowConfirmationModal,
    isCalculating,
    calculationError,
    clearError,
    getAffectedDates,
    calculatePreviewPricing
  }
  
  return (
    <PricingPreviewContext.Provider value={value}>
      {children}
    </PricingPreviewContext.Provider>
  )
}