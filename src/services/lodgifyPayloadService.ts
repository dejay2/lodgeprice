import type { 
  LodgifyPayload, 
  LodgifyRate, 
  DatePriceData, 
  OptimizedRange,
  PayloadGenerationOptions,
  GenerationStatistics,
  GenerationProgress,
  PayloadGenerationError,
  StayLengthCategory
} from '@/types/lodgify'
import type { Property } from '@/types/database'
import { pricingApi, propertyApi } from '@/services/api'
import { 
  generate24MonthRange, 
  generateCustomDateRange, 
  formatDateForAPI,
  getDefaultStayLengthCategories 
} from '@/utils/dateRangeGenerator'
import { 
  optimizeConsecutiveDays,
  validateOptimizationResults,
  meetsOptimizationThreshold,
  convertToIndividualEntries
} from '@/utils/payloadOptimizer'

/**
 * Core service for generating Lodgify API payloads
 */
export class LodgifyPayloadService {
  private abortController: AbortController | null = null
  private progressCallback?: (progress: GenerationProgress) => void

  /**
   * Generate complete payload for all specified properties
   */
  async generatePayload(
    options: PayloadGenerationOptions,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<{ payloads: LodgifyPayload[], statistics: GenerationStatistics }> {
    const startTime = Date.now()
    const startMemory = this.getMemoryUsage()
    
    this.abortController = new AbortController()
    this.progressCallback = onProgress
    
    try {
      // Load properties
      this.reportProgress({
        phase: 'loading',
        currentProperty: 0,
        totalProperties: options.properties.length,
        percentage: 0,
        timeElapsedMs: Date.now() - startTime
      })
      
      const properties = await this.loadProperties(options.properties)
      
      // Generate date range
      const dates = options.startDate && options.endDate
        ? generateCustomDateRange(options.startDate, options.endDate)
        : generate24MonthRange()
      
      // Use default stay length categories if not provided
      const stayCategories = options.stayLengthCategories.length > 0
        ? options.stayLengthCategories
        : getDefaultStayLengthCategories()
      
      const payloads: LodgifyPayload[] = []
      let totalRatesGenerated = 0
      let totalEntriesBeforeOptimization = 0
      let totalEntriesAfterOptimization = 0
      
      // Process each property
      for (let propertyIndex = 0; propertyIndex < properties.length; propertyIndex++) {
        if (this.abortController?.signal.aborted) {
          throw new Error('Generation cancelled by user')
        }
        
        const property = properties[propertyIndex]
        
        this.reportProgress({
          phase: 'calculating',
          propertyId: property.lodgify_property_id,
          currentProperty: propertyIndex + 1,
          totalProperties: properties.length,
          percentage: (propertyIndex / properties.length) * 80, // 80% for calculation phase
          timeElapsedMs: Date.now() - startTime
        })
        
        try {
          const propertyPayload = await this.generatePropertyPayload(
            property,
            dates,
            stayCategories,
            options
          )
          
          payloads.push(propertyPayload)
          totalRatesGenerated += propertyPayload.rates.length
          
        } catch (error) {
          console.error(`Failed to generate payload for property ${property.lodgify_property_id}:`, error)
          throw new PayloadGenerationErrorImpl(
            'database',
            `Failed to generate payload for property ${property.lodgify_property_id}: ${error}`,
            property.lodgify_property_id
          )
        }
      }
      
      // Optimization phase (if enabled)
      if (options.optimizeRanges) {
        this.reportProgress({
          phase: 'optimizing',
          currentProperty: properties.length,
          totalProperties: properties.length,
          percentage: 85,
          timeElapsedMs: Date.now() - startTime
        })
        
        // Note: Optimization stats would be calculated during property processing
        // This is a placeholder for future enhancement
      }
      
      // Validation phase
      this.reportProgress({
        phase: 'validating',
        currentProperty: properties.length,
        totalProperties: properties.length,
        percentage: 95,
        timeElapsedMs: Date.now() - startTime
      })
      
      const endTime = Date.now()
      const endMemory = this.getMemoryUsage()
      
      const statistics: GenerationStatistics = {
        totalProperties: properties.length,
        totalDates: dates.length,
        totalRatesGenerated,
        optimizationApplied: options.optimizeRanges,
        entriesBeforeOptimization: totalEntriesBeforeOptimization,
        entriesAfterOptimization: totalEntriesAfterOptimization,
        optimizationReduction: totalEntriesBeforeOptimization > 0 
          ? ((totalEntriesBeforeOptimization - totalEntriesAfterOptimization) / totalEntriesBeforeOptimization) * 100
          : 0,
        generationTimeMs: endTime - startTime,
        memoryUsedMB: endMemory && startMemory ? (endMemory - startMemory) / (1024 * 1024) : undefined
      }
      
      this.reportProgress({
        phase: 'complete',
        currentProperty: properties.length,
        totalProperties: properties.length,
        percentage: 100,
        timeElapsedMs: statistics.generationTimeMs
      })
      
      return { payloads, statistics }
      
    } catch (error) {
      this.reportProgress({
        phase: 'error',
        currentProperty: 0,
        totalProperties: options.properties.length,
        percentage: 0,
        timeElapsedMs: Date.now() - startTime
      })
      
      throw error
    } finally {
      this.abortController = null
      this.progressCallback = undefined
    }
  }
  
  /**
   * Generate payload for a single property
   */
  private async generatePropertyPayload(
    property: Property,
    dates: Date[],
    stayCategories: StayLengthCategory[],
    options: PayloadGenerationOptions
  ): Promise<LodgifyPayload> {
    const rates: LodgifyRate[] = []
    
    // Add mandatory default rate
    if (options.includeDefaultRate) {
      rates.push({
        is_default: true,
        price_per_day: parseFloat((property.base_price_per_day).toFixed(2)), // Ensure clean 2 decimal places
        min_stay: 2,
        max_stay: 6,
        price_per_additional_guest: 5,
        additional_guests_starts_from: 2
      })
    }
    
    // Generate rates for each stay length category
    for (const stayCategory of stayCategories) {
      const pricingData: DatePriceData[] = []
      
      // Use bulk pricing for efficiency - process in monthly chunks
      const startDate = dates[0]
      const endDate = dates[dates.length - 1]
      const chunks = this.createMonthlyChunks(startDate, endDate)
      
      for (const chunk of chunks) {
        if (this.abortController?.signal.aborted) {
          throw new Error('Generation cancelled by user')
        }
        
        try {
          // Use preview_pricing_calendar for bulk loading
          const bulkPricing = await pricingApi.getPricingPreview(
            property.lodgify_property_id,
            formatDateForAPI(chunk.start),
            formatDateForAPI(chunk.end),
            stayCategory.stayLength
          )
          
          if (bulkPricing && Array.isArray(bulkPricing)) {
            for (const dayPrice of bulkPricing) {
              pricingData.push({
                date: dayPrice.check_date,
                price: parseFloat((dayPrice.final_price_per_night).toFixed(2)), // Ensure clean 2 decimal places
                minStay: stayCategory.minStay,
                maxStay: stayCategory.maxStay,
                stayLength: stayCategory.stayLength,
                basePrice: parseFloat((dayPrice.base_price).toFixed(2)), // Ensure clean 2 decimal places
                seasonalAdjustment: dayPrice.seasonal_adjustment_percent || 0,
                lastMinuteDiscount: dayPrice.last_minute_discount_percent || 0,
                minPriceEnforced: dayPrice.min_price_enforced || false
              })
            }
          }
        } catch (error) {
          console.warn(`Failed to calculate bulk prices for ${property.lodgify_property_id} in chunk ${formatDateForAPI(chunk.start)} to ${formatDateForAPI(chunk.end)}:`, error)
          // Fall back to individual calculations for this chunk if needed
          await this.fallbackToIndividualCalculations(
            property.lodgify_property_id,
            chunk.start,
            chunk.end,
            stayCategory,
            pricingData
          )
        }
      }
      
      // Optimize or convert to individual entries
      let optimizedRanges: OptimizedRange[]
      
      if (options.optimizeRanges && pricingData.length > 0) {
        optimizedRanges = optimizeConsecutiveDays(pricingData)
        
        // Validate optimization and fallback if needed
        const validation = validateOptimizationResults(pricingData, optimizedRanges)
        if (!validation.valid || !meetsOptimizationThreshold(pricingData.length, optimizedRanges.length)) {
          console.warn(`Optimization failed for ${property.lodgify_property_id}, using individual entries`)
          optimizedRanges = convertToIndividualEntries(pricingData)
        }
      } else {
        optimizedRanges = convertToIndividualEntries(pricingData)
      }
      
      // Convert optimized ranges to Lodgify rates
      for (const range of optimizedRanges) {
        const rate: LodgifyRate = {
          is_default: false,
          start_date: range.startDate,
          end_date: range.endDate,
          price_per_day: parseFloat((range.price).toFixed(2)), // Ensure clean 2 decimal places
          min_stay: range.minStay,
          max_stay: range.maxStay,
          price_per_additional_guest: 5,
          additional_guests_starts_from: 2
        }
        rates.push(rate)
      }
    }
    
    return {
      property_id: parseInt(property.lodgify_property_id),
      room_type_id: property.lodgify_room_type_id || 0,
      rates
    }
  }
  
  /**
   * Load properties from database
   */
  private async loadProperties(propertyIds: string[]): Promise<Property[]> {
    const allProperties = await propertyApi.getAll()
    
    // Filter out any properties with null/invalid IDs (defensive filtering)
    const validProperties = allProperties.filter(p => 
      p.lodgify_property_id && 
      p.lodgify_room_type_id && 
      p.lodgify_room_type_id > 0
    )
    
    if (propertyIds.length === 0) {
      return validProperties
    }
    
    const filtered = validProperties.filter(p => propertyIds.includes(p.lodgify_property_id))
    
    if (filtered.length !== propertyIds.length) {
      const found = filtered.map(p => p.lodgify_property_id)
      const missing = propertyIds.filter(id => !found.includes(id))
      throw new Error(`Properties not found: ${missing.join(', ')}`)
    }
    
    return filtered
  }
  
  /**
   * Cancel current generation
   */
  cancelGeneration(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }
  
  /**
   * Report progress to callback
   */
  private reportProgress(progress: GenerationProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress)
    }
  }
  
  /**
   * Get current memory usage (if available)
   */
  private getMemoryUsage(): number | null {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      return (window.performance as any).memory.usedJSHeapSize
    }
    return null
  }

  /**
   * Create monthly chunks for date range processing
   */
  private createMonthlyChunks(startDate: Date, endDate: Date): Array<{ start: Date; end: Date }> {
    const chunks: Array<{ start: Date; end: Date }> = []
    let currentStart = new Date(startDate)
    
    while (currentStart <= endDate) {
      const chunkEnd = new Date(currentStart)
      chunkEnd.setMonth(chunkEnd.getMonth() + 1)
      chunkEnd.setDate(chunkEnd.getDate() - 1)
      
      if (chunkEnd > endDate) {
        chunkEnd.setTime(endDate.getTime())
      }
      
      chunks.push({
        start: new Date(currentStart),
        end: new Date(chunkEnd)
      })
      
      currentStart.setMonth(currentStart.getMonth() + 1)
    }
    
    return chunks
  }

  /**
   * Fallback to individual price calculations if bulk fails
   */
  private async fallbackToIndividualCalculations(
    propertyId: string,
    startDate: Date,
    endDate: Date,
    stayCategory: StayLengthCategory,
    pricingData: DatePriceData[]
  ): Promise<void> {
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      try {
        const dateStr = formatDateForAPI(currentDate)
        const pricing = await pricingApi.calculatePrice(
          propertyId,
          dateStr,
          stayCategory.stayLength
        )
        
        if (pricing && Array.isArray(pricing) && pricing.length > 0) {
          const result = pricing[0]
          pricingData.push({
            date: dateStr,
            price: Math.round(result.final_price_per_night * 100) / 100, // Round to 2 decimal places
            minStay: stayCategory.minStay,
            maxStay: stayCategory.maxStay,
            stayLength: stayCategory.stayLength,
            basePrice: Math.round(result.base_price * 100) / 100, // Round to 2 decimal places
            seasonalAdjustment: result.seasonal_adjustment,
            lastMinuteDiscount: result.last_minute_discount,
            minPriceEnforced: result.min_price_enforced
          })
        }
      } catch (error) {
        console.warn(`Failed to calculate price for ${propertyId} on ${formatDateForAPI(currentDate)}:`, error)
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }
}

// Export singleton instance
export const lodgifyPayloadService = new LodgifyPayloadService()

// Custom error class
class PayloadGenerationErrorImpl extends Error implements PayloadGenerationError {
  constructor(
    public type: 'database' | 'optimization' | 'validation' | 'memory' | 'timeout',
    message: string,
    public propertyId?: string,
    public date?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'PayloadGenerationError'
  }
}