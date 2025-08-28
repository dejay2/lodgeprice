/**
 * usePricingPreview - Hook for generating pricing impact previews
 * Calculates and displays the effect of seasonal rate adjustments on pricing
 */

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { PricingPreviewData, PricingImpactResult } from '../types/SeasonalRate'
import { format } from 'date-fns'

export const usePricingPreview = (propertyId?: string) => {
  const [pricingPreview, setPricingPreview] = useState<PricingPreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const generatePreview = useCallback(async (
    startDate: Date,
    endDate: Date,
    rateAdjustment: number,
    selectedPropertyId?: string
  ) => {
    setPreviewLoading(true)
    setPreviewError(null)

    try {
      // Use provided propertyId or default from hook initialization
      let targetPropertyId = selectedPropertyId || propertyId
      if (!targetPropertyId) {
        // If no property selected, use first available property
        const { data: properties } = await supabase
          .from('properties')
          .select('property_id')
          .limit(1)
          .single()
        
        if (!properties) {
          throw new Error('No properties available for preview')
        }
        targetPropertyId = properties.property_id
      }

      // Call the preview function - using calculate_final_price as a fallback
      // since preview_seasonal_rate_impact might not be created yet
      // Generate date range
      const dates = []
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Calculate prices for each date
      const results: PricingImpactResult[] = []
      for (const date of dates) {
        const dateStr = date.toISOString().split('T')[0]
        const { data: priceData } = await supabase.rpc('calculate_final_price', {
          p_property_id: targetPropertyId,
          p_check_date: dateStr,
          p_nights: 3
        })
        
        if (priceData && typeof priceData === 'object' && 'price' in priceData) {
          const basePrice = (priceData as any).price || 0
          const adjustedPrice = basePrice * (1 + rateAdjustment)
          
          results.push({
            date: dateStr,
            base_price: basePrice,
            adjusted_price: adjustedPrice,
            price_change: adjustedPrice - basePrice,
            percentage_change: rateAdjustment * 100
          })
        }
      }
      
      const error = null

      if (error) throw error

      // Process the results
      if (!results || results.length === 0) {
        setPricingPreview(null)
        return
      }

      // Calculate statistics
      const prices = results.map(r => r.adjusted_price)
      const changes = results.map(r => r.percentage_change)
      
      const averageChange = changes.reduce((sum, c) => sum + c, 0) / changes.length
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)

      // Select sample dates (first, middle, last, and some in between)
      const sampleIndices = [
        0, // First day
        Math.floor(results.length * 0.25), // 25% through
        Math.floor(results.length * 0.5), // Middle
        Math.floor(results.length * 0.75), // 75% through
        results.length - 1 // Last day
      ].filter((idx, i, arr) => arr.indexOf(idx) === i) // Remove duplicates

      const sampleDates = sampleIndices
        .map(idx => results[idx])
        .filter(Boolean)
        .map(result => ({
          date: format(new Date(result.date), 'MMM dd, yyyy'),
          basePrice: Math.round(result.base_price),
          adjustedPrice: Math.round(result.adjusted_price),
          change: Math.round(result.price_change),
          percentageChange: result.percentage_change
        }))

      setPricingPreview({
        averageChange,
        minPrice: Math.round(minPrice),
        maxPrice: Math.round(maxPrice),
        sampleDates
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate pricing preview'
      setPreviewError(errorMessage)
      setPricingPreview(null)
    } finally {
      setPreviewLoading(false)
    }
  }, [propertyId])

  const clearPreview = useCallback(() => {
    setPricingPreview(null)
    setPreviewError(null)
  }, [])

  return {
    pricingPreview,
    previewLoading,
    previewError,
    generatePreview,
    clearPreview
  }
}