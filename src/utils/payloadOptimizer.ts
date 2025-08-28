import type { DatePriceData, OptimizedRange } from '@/types/lodgify'
import { isConsecutiveDay } from './dateRangeGenerator'

/**
 * Optimize consecutive days with identical pricing into date ranges
 * Implements interval merging algorithm for 60%+ reduction in entries
 */
export function optimizeConsecutiveDays(prices: DatePriceData[]): OptimizedRange[] {
  if (prices.length === 0) return []

  // Sort by date to enable consecutive day detection
  const sortedPrices = prices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const ranges: OptimizedRange[] = []
  
  let currentRange: OptimizedRange | null = null
  
  for (const priceData of sortedPrices) {
    if (currentRange && 
        Math.round(currentRange.price * 100) / 100 === Math.round(priceData.price * 100) / 100 &&
        currentRange.minStay === priceData.minStay &&
        currentRange.maxStay === priceData.maxStay &&
        currentRange.stayLength === priceData.stayLength &&
        isConsecutiveDay(currentRange.endDate, priceData.date)) {
      // Extend current range
      currentRange.endDate = priceData.date
    } else {
      // Start new range
      if (currentRange) ranges.push(currentRange)
      currentRange = {
        startDate: priceData.date,
        endDate: priceData.date,
        price: Math.round(priceData.price * 100) / 100, // Round to 2 decimal places
        minStay: priceData.minStay,
        maxStay: priceData.maxStay,
        stayLength: priceData.stayLength
      }
    }
  }
  
  if (currentRange) ranges.push(currentRange)
  return ranges
}

/**
 * Calculate optimization effectiveness
 */
export function calculateOptimizationStats(
  originalEntries: number, 
  optimizedEntries: number
): { reduction: number, effectiveReduction: number } {
  const reduction = originalEntries - optimizedEntries
  const effectiveReduction = originalEntries > 0 ? (reduction / originalEntries) * 100 : 0
  
  return {
    reduction,
    effectiveReduction: Math.round(effectiveReduction * 100) / 100 // Round to 2 decimal places
  }
}

/**
 * Group pricing data by property and stay length for optimization
 */
export function groupPricingDataForOptimization(
  pricingData: DatePriceData[]
): Map<string, DatePriceData[]> {
  const groups = new Map<string, DatePriceData[]>()
  
  for (const data of pricingData) {
    const key = `${data.stayLength}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(data)
  }
  
  return groups
}

/**
 * Validate optimization results to ensure accuracy
 */
export function validateOptimizationResults(
  original: DatePriceData[],
  optimized: OptimizedRange[]
): { valid: boolean, errors: string[] } {
  const errors: string[] = []
  
  // Check that all original dates are covered by optimized ranges
  const originalDates = new Set(original.map(d => d.date))
  const optimizedDates = new Set<string>()
  
  for (const range of optimized) {
    const startDate = new Date(range.startDate)
    const endDate = new Date(range.endDate)
    
    let currentDate = startDate
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      optimizedDates.add(dateStr)
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
    }
  }
  
  // Check for missing dates
  for (const originalDate of originalDates) {
    if (!optimizedDates.has(originalDate)) {
      errors.push(`Missing date in optimization: ${originalDate}`)
    }
  }
  
  // Check for extra dates
  for (const optimizedDate of optimizedDates) {
    if (!originalDates.has(optimizedDate)) {
      errors.push(`Extra date in optimization: ${optimizedDate}`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Check if optimization meets minimum effectiveness threshold
 */
export function meetsOptimizationThreshold(
  originalCount: number,
  optimizedCount: number,
  minimumReduction: number = 0.6 // 60% as per PRP requirement
): boolean {
  if (originalCount === 0) return true
  
  const reduction = (originalCount - optimizedCount) / originalCount
  return reduction >= minimumReduction
}

/**
 * Fallback to individual date entries if optimization fails
 */
export function convertToIndividualEntries(pricingData: DatePriceData[]): OptimizedRange[] {
  return pricingData.map(data => ({
    startDate: data.date,
    endDate: data.date,
    price: Math.round(data.price * 100) / 100, // Round to 2 decimal places
    minStay: data.minStay,
    maxStay: data.maxStay,
    stayLength: data.stayLength
  }))
}