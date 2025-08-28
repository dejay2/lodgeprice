/**
 * PricingContext - Global state management for pricing operations
 * Manages calendar data, seasonal rates, discount strategies, and pricing calculations
 */

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
import type { 
  Property,
  SeasonalRate,
  DiscountStrategy,
} from '@/types/database-aliases'
import type { 
  CalculateFinalPriceReturn
} from '@/types/helpers'

/**
 * Pricing data structure for individual dates
 */
export interface PricingData extends CalculateFinalPriceReturn {
  date: string
  nights: number
}

/**
 * Global pricing context state and actions
 */
export interface PricingContextValue {
  // Core application state
  selectedProperty: Property | null
  selectedDateRange: { start: Date; end: Date }
  defaultNights: number
  
  // Cached pricing data
  calendarData: Map<string, PricingData>
  seasonalRates: SeasonalRate[]
  discountStrategies: DiscountStrategy[]
  
  // UI state
  loading: boolean
  error: string | null
  lastRefresh: Date | null
  
  // Actions
  setSelectedProperty: (property: Property | null) => void
  setDateRange: (range: { start: Date; end: Date }) => void
  setDefaultNights: (nights: number) => void
  refreshCalendarData: () => Promise<void>
  refreshSeasonalRates: () => Promise<void>
  refreshDiscountStrategies: () => Promise<void>
  updateCalendarCell: (date: string, data: PricingData) => void
  clearError: () => void
  clearCache: () => void
}

const PricingContext = createContext<PricingContextValue | undefined>(undefined)

interface PricingProviderProps {
  children: ReactNode
}

/**
 * Cache expiration time (6 hours as per PRP specification)
 */
const CACHE_EXPIRATION_MS = 6 * 60 * 60 * 1000

export function PricingProvider({ children }: PricingProviderProps) {
  // Core state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date(new Date().setMonth(new Date().getMonth() + 1))
  })
  const [defaultNights, setDefaultNights] = useState(3)
  
  // Cached data
  const [calendarData, setCalendarData] = useState<Map<string, PricingData>>(new Map())
  const [seasonalRates, setSeasonalRates] = useState<SeasonalRate[]>([])
  const [discountStrategies, setDiscountStrategies] = useState<DiscountStrategy[]>([])
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  
  /**
   * Set date range with validation
   */
  const setDateRange = useCallback((range: { start: Date; end: Date }) => {
    if (range.start > range.end) {
      setError('Start date must be before end date')
      return
    }
    setSelectedDateRange(range)
  }, [])
  
  /**
   * Set default nights with validation
   */
  const setDefaultNightsValidated = useCallback((nights: number) => {
    if (nights < 1 || nights > 365) {
      setError('Nights must be between 1 and 365')
      return
    }
    setDefaultNights(nights)
  }, [])
  
  /**
   * Refresh calendar data from database
   * Uses preview_pricing_calendar function for bulk loading
   */
  const refreshCalendarData = useCallback(async () => {
    if (!selectedProperty) {
      setError('No property selected')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // This will be implemented with actual Supabase call in database hooks
      // For now, we're setting up the structure
      console.log('Refreshing calendar data for property:', selectedProperty.lodgify_property_id)
      
      // Placeholder for actual implementation
      // const { data, error: dbError } = await supabase.rpc('preview_pricing_calendar', {
      //   property_id: selectedProperty.lodgify_property_id,
      //   start_date: selectedDateRange.start.toISOString().split('T')[0],
      //   end_date: selectedDateRange.end.toISOString().split('T')[0],
      //   nights: defaultNights
      // })
      
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }, [selectedProperty, selectedDateRange, defaultNights])
  
  /**
   * Refresh seasonal rates from database
   */
  const refreshSeasonalRates = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Placeholder for actual implementation
      console.log('Refreshing seasonal rates')
      // const { data, error } = await supabase
      //   .from('date_ranges')
      //   .select('*')
      //   .order('start_date', { ascending: true })
      
      setSeasonalRates([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load seasonal rates')
    } finally {
      setLoading(false)
    }
  }, [])
  
  /**
   * Refresh discount strategies from database
   */
  const refreshDiscountStrategies = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Placeholder for actual implementation
      console.log('Refreshing discount strategies')
      // const { data, error } = await supabase
      //   .from('discount_strategies')
      //   .select('*')
      //   .eq('is_active', true)
      
      setDiscountStrategies([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load discount strategies')
    } finally {
      setLoading(false)
    }
  }, [])
  
  /**
   * Update a single calendar cell (for optimistic updates)
   */
  const updateCalendarCell = useCallback((date: string, data: PricingData) => {
    setCalendarData(prev => {
      const newMap = new Map(prev)
      newMap.set(date, data)
      return newMap
    })
  }, [])
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  /**
   * Clear all cached data
   */
  const clearCache = useCallback(() => {
    setCalendarData(new Map())
    setSeasonalRates([])
    setDiscountStrategies([])
    setLastRefresh(null)
  }, [])
  
  /**
   * Context value with memoization for performance
   */
  const contextValue = useMemo<PricingContextValue>(() => ({
    // State
    selectedProperty,
    selectedDateRange,
    defaultNights,
    calendarData,
    seasonalRates,
    discountStrategies,
    loading,
    error,
    lastRefresh,
    
    // Actions
    setSelectedProperty,
    setDateRange,
    setDefaultNights: setDefaultNightsValidated,
    refreshCalendarData,
    refreshSeasonalRates,
    refreshDiscountStrategies,
    updateCalendarCell,
    clearError,
    clearCache
  }), [
    selectedProperty,
    selectedDateRange,
    defaultNights,
    calendarData,
    seasonalRates,
    discountStrategies,
    loading,
    error,
    lastRefresh,
    setDateRange,
    setDefaultNightsValidated,
    refreshCalendarData,
    refreshSeasonalRates,
    refreshDiscountStrategies,
    updateCalendarCell,
    clearError,
    clearCache
  ])
  
  return (
    <PricingContext.Provider value={contextValue}>
      {children}
    </PricingContext.Provider>
  )
}

/**
 * Hook to use the pricing context
 * Throws error if used outside of PricingProvider
 */
export function usePricingContext(): PricingContextValue {
  const context = useContext(PricingContext)
  if (context === undefined) {
    throw new Error('usePricingContext must be used within a PricingProvider')
  }
  return context
}

/**
 * Hook for cache management utilities
 */
export function usePricingCache() {
  const { calendarData, lastRefresh, clearCache } = usePricingContext()
  
  const isCacheExpired = useCallback(() => {
    if (!lastRefresh) return true
    return Date.now() - lastRefresh.getTime() > CACHE_EXPIRATION_MS
  }, [lastRefresh])
  
  const getCachedPrice = useCallback((date: string): PricingData | undefined => {
    return calendarData.get(date)
  }, [calendarData])
  
  const cacheSize = useMemo(() => calendarData.size, [calendarData])
  
  return {
    isCacheExpired,
    getCachedPrice,
    cacheSize,
    clearCache
  }
}