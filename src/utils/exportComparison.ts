/**
 * Export Comparison Utility
 * 
 * Provides functionality to compare Lodgify export payloads with and without price overrides
 * to analyze the impact of overrides on final pricing
 */

import type { LodgifyPayload, GenerationStatistics } from '@/types/lodgify'

/**
 * Comparison result for a single property
 */
export interface PropertyComparison {
  propertyId: number
  totalDates: number
  datesWithDifferences: number
  averagePriceDifference: number
  maxPriceDifference: number
  minPriceDifference: number
  overrideDates: string[]
  priceDifferences: Array<{
    date: string
    originalPrice: number
    overridePrice: number
    difference: number
    percentChange: number
  }>
}

/**
 * Overall comparison result
 */
export interface ExportComparison {
  differencesFound: boolean
  totalProperties: number
  propertiesWithDifferences: number
  totalOverrideImpact: {
    affectedDates: number
    averagePriceChange: number
    totalRevenueDifference: number
    priceVariancePercentage: number
  }
  propertyComparisons: PropertyComparison[]
  statisticsComparison: {
    withOverrides: GenerationStatistics
    withoutOverrides: GenerationStatistics
  }
}

/**
 * Compare two export payloads to identify override impacts
 */
export function generateExportComparison(
  withOverrides: { payloads: LodgifyPayload[], statistics: GenerationStatistics },
  withoutOverrides: { payloads: LodgifyPayload[], statistics: GenerationStatistics }
): ExportComparison {
  const propertyComparisons: PropertyComparison[] = []
  let totalAffectedDates = 0
  let totalPriceDifference = 0
  let totalDatesAnalyzed = 0
  
  // Compare each property payload
  for (const overridePayload of withOverrides.payloads) {
    const basePayload = withoutOverrides.payloads.find(
      p => p.property_id === overridePayload.property_id
    )
    
    if (!basePayload) {
      continue // Skip if property not found in base export
    }
    
    const comparison = comparePropertyPayloads(overridePayload, basePayload)
    if (comparison.datesWithDifferences > 0) {
      propertyComparisons.push(comparison)
      totalAffectedDates += comparison.datesWithDifferences
      totalPriceDifference += comparison.priceDifferences.reduce(
        (sum, diff) => sum + Math.abs(diff.difference), 
        0
      )
    }
    totalDatesAnalyzed += comparison.totalDates
  }
  
  const averagePriceChange = totalAffectedDates > 0 
    ? totalPriceDifference / totalAffectedDates 
    : 0
    
  const priceVariancePercentage = totalDatesAnalyzed > 0
    ? (totalAffectedDates / totalDatesAnalyzed) * 100
    : 0
  
  return {
    differencesFound: propertyComparisons.length > 0,
    totalProperties: withOverrides.payloads.length,
    propertiesWithDifferences: propertyComparisons.length,
    totalOverrideImpact: {
      affectedDates: totalAffectedDates,
      averagePriceChange,
      totalRevenueDifference: totalPriceDifference,
      priceVariancePercentage
    },
    propertyComparisons,
    statisticsComparison: {
      withOverrides: withOverrides.statistics,
      withoutOverrides: withoutOverrides.statistics
    }
  }
}

/**
 * Compare two property payloads to find price differences
 */
function comparePropertyPayloads(
  overridePayload: LodgifyPayload,
  basePayload: LodgifyPayload
): PropertyComparison {
  const priceDifferences: PropertyComparison['priceDifferences'] = []
  const overrideDates: string[] = []
  
  // Build price maps for each payload
  const overridePriceMap = buildPriceMap(overridePayload)
  const basePriceMap = buildPriceMap(basePayload)
  
  // Find all unique dates
  const allDates = new Set([...overridePriceMap.keys(), ...basePriceMap.keys()])
  
  // Compare prices for each date
  for (const date of allDates) {
    const overridePrice = overridePriceMap.get(date)
    const basePrice = basePriceMap.get(date)
    
    if (overridePrice && basePrice && Math.abs(overridePrice - basePrice) > 0.01) {
      const difference = overridePrice - basePrice
      const percentChange = ((difference / basePrice) * 100)
      
      priceDifferences.push({
        date,
        originalPrice: basePrice,
        overridePrice,
        difference,
        percentChange
      })
      
      overrideDates.push(date)
    }
  }
  
  // Calculate summary statistics
  const priceDiffs = priceDifferences.map(d => Math.abs(d.difference))
  const averagePriceDifference = priceDiffs.length > 0
    ? priceDiffs.reduce((sum, d) => sum + d, 0) / priceDiffs.length
    : 0
  
  return {
    propertyId: overridePayload.property_id,
    totalDates: allDates.size,
    datesWithDifferences: priceDifferences.length,
    averagePriceDifference,
    maxPriceDifference: priceDiffs.length > 0 ? Math.max(...priceDiffs) : 0,
    minPriceDifference: priceDiffs.length > 0 ? Math.min(...priceDiffs) : 0,
    overrideDates,
    priceDifferences
  }
}

/**
 * Build a map of dates to prices from a Lodgify payload
 */
function buildPriceMap(payload: LodgifyPayload): Map<string, number> {
  const priceMap = new Map<string, number>()
  
  // Get default price
  const defaultRate = payload.rates.find(r => r.is_default)
  const defaultPrice = defaultRate?.price_per_day || 0
  
  // Process each rate
  for (const rate of payload.rates) {
    if (rate.is_default) continue
    
    if (rate.start_date && rate.end_date) {
      // Add all dates in the range
      const start = new Date(rate.start_date)
      const end = new Date(rate.end_date)
      const current = new Date(start)
      
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]
        // Use the most specific rate (last one wins if overlapping)
        priceMap.set(dateStr, rate.price_per_day)
        current.setDate(current.getDate() + 1)
      }
    }
  }
  
  return priceMap
}

/**
 * Format comparison results for display
 */
export function formatComparisonSummary(comparison: ExportComparison): string {
  if (!comparison.differencesFound) {
    return 'No differences found between exports with and without overrides.'
  }
  
  const impact = comparison.totalOverrideImpact
  const summary = [
    `Found differences in ${comparison.propertiesWithDifferences} of ${comparison.totalProperties} properties`,
    `${impact.affectedDates} dates affected by overrides`,
    `Average price change: €${impact.averagePriceChange.toFixed(2)}`,
    `Total revenue impact: €${impact.totalRevenueDifference.toFixed(2)}`,
    `${impact.priceVariancePercentage.toFixed(1)}% of dates have override prices`
  ]
  
  return summary.join('\n')
}

/**
 * Export comparison results as CSV
 */
export function exportComparisonAsCSV(comparison: ExportComparison): string {
  const headers = ['Property ID', 'Date', 'Original Price', 'Override Price', 'Difference', 'Percent Change']
  const rows: string[] = [headers.join(',')]
  
  for (const propComparison of comparison.propertyComparisons) {
    for (const diff of propComparison.priceDifferences) {
      rows.push([
        propComparison.propertyId,
        diff.date,
        diff.originalPrice.toFixed(2),
        diff.overridePrice.toFixed(2),
        diff.difference.toFixed(2),
        diff.percentChange.toFixed(1) + '%'
      ].join(','))
    }
  }
  
  return rows.join('\n')
}