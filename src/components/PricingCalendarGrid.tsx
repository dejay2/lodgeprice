/**
 * PricingCalendarGrid - React Calendar with Pricing Display
 * Implements react-calendar with custom tileContent for pricing as per PRP-10
 * Integrates with calculate_final_price and preview_pricing_calendar database functions
 * Inline editing removed as per PRP-11 - now handled through modal
 */

import React, { useState, useEffect, useCallback } from 'react'
import Calendar from 'react-calendar'
import { handleSupabaseError } from '@/lib/supabase'
import { pricingService, type OverrideAwarePricingOptions } from '@/services/pricing.service'
import { usePricingContext } from '@/context/PricingContext'
import { useDebounce } from '@/hooks/useDebounce'
import PricingTile from './PricingTile'
import StayLengthSelector from './StayLengthSelector'
import PricingLegend from './PricingLegend'
// Removed PropertySelection import - now handled by parent component
// Removed useInlineEditing import - inline editing now handled through modal
import type {
  PricingCalendarGridProps,
  OverrideAwarePricingResult,
  CalendarLoadingState,
  CalendarValue
} from '@/types/pricing-calendar.types'
import './PricingCalendarGrid.css'

// CalendarControlsComponent removed - property selection now handled by parent component
// Stay length selector is integrated directly into the grid


/**
 * Main PricingCalendarGrid component using react-calendar
 * Implements all PRP-10 requirements with database integration
 */
const PricingCalendarGrid: React.FC<PricingCalendarGridProps> = ({
  propertyId: initialPropertyId,
  selectedStayLength: initialStayLength = 3,
  onStayLengthChange,
  onDateClick,
  onOverrideModalOpen,
  onShowPriceBreakdown,
  className = ''
}) => {
  // Component state - property selection removed as it's handled by parent
  // Use prop directly to ensure reactivity when prop changes
  const propertyId = initialPropertyId // Using prop directly for reactivity
  const [selectedStayLength, setSelectedStayLength] = useState(initialStayLength)
  const [calendarValue, setCalendarValue] = useState<CalendarValue>(new Date())
  const [currentMonthYear, setCurrentMonthYear] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [pricingData, setPricingData] = useState<Map<string, OverrideAwarePricingResult>>(new Map())
  const [loadingState, setLoadingState] = useState<CalendarLoadingState>({
    isLoadingPrices: false,
    isLoadingProperty: false,
    isChangingStayLength: false,
    error: null
  })
  
  // Get toggle state and refresh trigger from context (FR-3, FR-4)
  const { toggles, lastRefresh } = usePricingContext()
  
  // Debounce toggle changes to prevent excessive API calls (FR-6)
  const debouncedToggles = useDebounce(toggles, 300)
  
  // Clear pricing data and trigger immediate reload when property changes
  useEffect(() => {
    console.log('Property changed, clearing pricing data and reloading for property:', propertyId)
    // Clear existing data immediately to show loading state
    setPricingData(new Map())
    // Force a reload of calendar data for the new property
    setLoadingState(prev => ({ ...prev, isLoadingPrices: true, error: null }))
  }, [propertyId])
  
  /**
   * Load pricing data using pricing service with override support
   * Implements bulk loading as specified in PRP-10 with proper service layer
   * Extended to support conditional pricing based on toggles and price overrides
   */
  const loadCalendarPricing = useCallback(async (
    propId: string,
    startDate: Date,
    endDate: Date,
    stayLength: number,
    toggleStates = { seasonalRatesEnabled: true, discountStrategiesEnabled: true }
  ) => {
    if (!propId) return
    
    console.log('Refreshing calendar data for property:', propId)
    setLoadingState(prev => ({ ...prev, isLoadingPrices: true, error: null }))
    
    try {
      // Use pricing service with toggle options and override support
      const dateRange = { start: startDate, end: endDate }
      const options: OverrideAwarePricingOptions = {
        includeSeasonalRates: toggleStates.seasonalRatesEnabled,
        includeDiscountStrategies: toggleStates.discountStrategiesEnabled,
        includeOverrides: true, // Always include overrides for calendar display
        fallbackOnOverrideError: true // Gracefully degrade if override loading fails
      }
      
      const result = await pricingService.loadCalendarDataWithOverrides(
        propId, 
        dateRange, 
        stayLength,
        options
      )
      
      // Convert to pricing data map with override-aware structure
      const newPricingData = new Map<string, OverrideAwarePricingResult>()
      
      result.forEach(dayData => {
        newPricingData.set(dayData.check_date, {
          base_price: dayData.base_price,
          seasonal_adjustment: dayData.seasonal_adjustment_percent * dayData.base_price / 100,
          last_minute_discount: dayData.last_minute_discount_percent * dayData.base_price / 100,
          final_price_per_night: dayData.final_price_per_night,
          total_price: dayData.total_price,
          min_price_enforced: dayData.min_price_enforced,
          is_override: dayData.is_overridden, // Use correct field name
          is_overridden: dayData.is_overridden,
          override_price: dayData.override_price,
          override_reason: dayData.override_reason,
          original_calculated_price: dayData.original_calculated_price
        })
      })
      
      setPricingData(newPricingData)
      setLoadingState(prev => ({ ...prev, isLoadingPrices: false }))
      
    } catch (error) {
      console.error('Failed to load calendar pricing:', error)
      setLoadingState(prev => ({
        ...prev,
        isLoadingPrices: false,
        error: handleSupabaseError(error)
      }))
    }
  }, [])
  
  /**
   * Load pricing data when property, stay length, visible month, or toggles change
   * FR-6: Calendar grid updates within 500ms of toggle state change
   */
  useEffect(() => {
    if (!propertyId) return
    
    // Log refresh trigger for debugging
    if (lastRefresh) {
      console.log('PricingCalendarGrid: Refresh triggered by context at:', lastRefresh.toISOString())
    }
    
    // Calculate date range for current view (current month + neighboring days)
    const currentDate = calendarValue instanceof Date ? calendarValue : new Date()
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Get first and last day of calendar view (including neighboring month days)
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // Extend to include neighboring days shown in calendar
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const endDate = new Date(lastDay)
    const daysToAdd = (6 - lastDay.getDay())
    if (daysToAdd > 0) {
      endDate.setDate(endDate.getDate() + daysToAdd)
    }
    
    // Load with current toggle states (uses debounced values to prevent excessive calls)
    loadCalendarPricing(propertyId, startDate, endDate, selectedStayLength, debouncedToggles)
  }, [propertyId, selectedStayLength, calendarValue, currentMonthYear, debouncedToggles, lastRefresh, loadCalendarPricing])
  
  // Property selection now handled by parent component
  
  /**
   * Handle stay length change with loading state
   */
  const handleStayLengthChange = useCallback((newLength: number) => {
    setLoadingState(prev => ({ ...prev, isChangingStayLength: true }))
    setSelectedStayLength(newLength)
    if (onStayLengthChange) {
      onStayLengthChange(newLength)
    }
    // Loading will be cleared by useEffect when pricing data reloads
    setTimeout(() => {
      setLoadingState(prev => ({ ...prev, isChangingStayLength: false }))
    }, 100)
  }, [onStayLengthChange])
  
  /**
   * Handle calendar date selection/click
   */
  const handleDateClick = useCallback((date: Date) => {
    const dateKey = date.toISOString().split('T')[0]
    const priceData = pricingData.get(dateKey)
    
    if (onDateClick) {
      onDateClick(date, priceData || null)
    }
  }, [pricingData, onDateClick])
  
  /**
   * Custom tileContent function for react-calendar
   * Renders PricingTile component for each date (display only)
   */
  const tileContent = useCallback(({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null
    
    const dateKey = date.toISOString().split('T')[0]
    const priceData = pricingData.get(dateKey)
    
    return (
      <PricingTile
        date={date}
        view={view}
        priceData={priceData}
        stayLength={selectedStayLength}
        hasSeasonalAdjustment={priceData ? Math.abs(priceData.seasonal_adjustment) > 0.01 : false}
        hasDiscount={priceData ? priceData.last_minute_discount > 0.01 : false}
        isMinPriceEnforced={priceData ? priceData.min_price_enforced : false}
        isOverride={priceData ? priceData.is_overridden : false}
        propertyId={propertyId}
        onOverrideModalOpen={onOverrideModalOpen}
        onShowPriceBreakdown={onShowPriceBreakdown}
        isOverrideModalAvailable={!!onOverrideModalOpen}
      />
    )
  }, [
    pricingData, 
    selectedStayLength,
    propertyId,
    onOverrideModalOpen,
    onShowPriceBreakdown
  ])
  
  /**
   * Custom tileClassName function for conditional styling
   */
  const tileClassName = useCallback(({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null
    
    const dateKey = date.toISOString().split('T')[0]
    const priceData = pricingData.get(dateKey)
    
    const classes = []
    
    if (priceData?.seasonal_adjustment && Math.abs(priceData.seasonal_adjustment) > 0.01) {
      classes.push('has-seasonal')
    }
    
    if (priceData?.last_minute_discount && priceData.last_minute_discount > 0.01) {
      classes.push('has-discount')
    }
    
    if (priceData?.min_price_enforced) {
      classes.push('min-price-enforced')
    }
    
    return classes.length > 0 ? classes.join(' ') : null
  }, [pricingData])
  
  const isLoading = loadingState.isLoadingPrices || loadingState.isChangingStayLength
  
  return (
    <div className={`pricing-calendar-grid ${className}`} data-testid="calendar-grid">
      {/* Stay Length Selector - Property selection now handled by parent */}
      <div className="calendar-controls mb-3">
        <StayLengthSelector
          selectedLength={selectedStayLength}
          onLengthChange={handleStayLengthChange}
          availableLengths={[1, 2, 3, 4, 5, 6, 7, 14, 21, 30]}
        />
      </div>
      
      {/* Error Display */}
      {loadingState.error && (
        <div className="alert alert-danger mb-3">
          <strong>Error loading calendar data: </strong>
          {loadingState.error}
          <button 
            className="btn btn-link btn-sm ms-2"
            onClick={() => {
              setLoadingState(prev => ({ ...prev, error: null }))
              // Retry loading
              if (propertyId) {
                const currentDate = calendarValue instanceof Date ? calendarValue : new Date()
                const year = currentDate.getFullYear()
                const month = currentDate.getMonth()
                
                const firstDay = new Date(year, month, 1)
                const lastDay = new Date(year, month + 1, 0)
                
                const startDate = new Date(firstDay)
                startDate.setDate(startDate.getDate() - firstDay.getDay())
                
                const endDate = new Date(lastDay)
                const daysToAdd = (6 - lastDay.getDay())
                if (daysToAdd > 0) {
                  endDate.setDate(endDate.getDate() + daysToAdd)
                }
                
                loadCalendarPricing(propertyId, startDate, endDate, selectedStayLength)
              }
            }}
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Loading State */}
      {isLoading ? (
        <div className="calendar-loading">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">
                {loadingState.isChangingStayLength ? 'Updating prices...' : 'Loading calendar...'}
              </span>
            </div>
            <div className="mt-2 text-muted">
              {loadingState.isChangingStayLength ? 
                `Calculating prices for ${selectedStayLength} night${selectedStayLength !== 1 ? 's' : ''}...` :
                'Loading pricing data...'
              }
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* React Calendar with Custom Pricing Display */}
          <Calendar
            value={calendarValue}
            onChange={(value) => {
              if (value instanceof Date) {
                setCalendarValue(value)
              }
            }}
            onActiveStartDateChange={({ activeStartDate, view }) => {
              // Update calendar value when navigating months to trigger data reload
              if (view === 'month' && activeStartDate) {
                console.log('Month navigation detected, updating to:', activeStartDate)
                
                // Force new Date object to trigger useEffect dependency
                const newCalendarValue = new Date(activeStartDate.getTime())
                
                // Add month/year string for reliable tracking
                const monthYear = `${newCalendarValue.getFullYear()}-${String(newCalendarValue.getMonth() + 1).padStart(2, '0')}`
                
                // Update state to trigger useEffect
                setCalendarValue(newCalendarValue)
                setCurrentMonthYear(monthYear)
                
                // Clear previous month's cached data to ensure fresh load
                setPricingData(new Map())
              }
            }}
            view="month"
            showFixedNumberOfWeeks={false}
            showNeighboringMonth={true}
            tileContent={tileContent}
            tileClassName={tileClassName}
            onClickDay={handleDateClick}
            className="pricing-calendar"
          />
          
          {/* Pricing Legend */}
          <PricingLegend
            showSeasonalIndicator={true}
            showDiscountIndicator={true}
            showMinPriceIndicator={true}
            className="mt-3"
          />
        </>
      )}
    </div>
  )
}

export default React.memo(PricingCalendarGrid)