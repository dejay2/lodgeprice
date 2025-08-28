/**
 * PricingCalendarGrid - React Calendar with Pricing Display
 * Implements react-calendar with custom tileContent for pricing as per PRP-10
 * Integrates with calculate_final_price and preview_pricing_calendar database functions
 */

import React, { useState, useEffect, useCallback } from 'react'
import Calendar from 'react-calendar'
import { supabase, withRetry, handleSupabaseError } from '@/lib/supabase'
import PricingTile from './PricingTile'
import StayLengthSelector from './StayLengthSelector'
import PricingLegend from './PricingLegend'
import { PropertySelection } from './PropertySelection'
import type {
  PricingCalendarGridProps,
  CalculateFinalPriceResult,
  PreviewPricingCalendarResult,
  CalendarLoadingState,
  CalendarValue
} from '@/types/pricing-calendar.types'
import './PricingCalendarGrid.css'

/**
 * Calendar Controls Component
 * Property selection and stay length controls as per PRP-10 architecture
 */
interface CalendarControlsComponentProps {
  propertyId: string
  selectedStayLength: number
  onPropertyChange: (propertyId: string) => void
  onStayLengthChange: (nights: number) => void
}

const CalendarControlsComponent: React.FC<CalendarControlsComponentProps> = ({
  propertyId,
  selectedStayLength,
  onPropertyChange,
  onStayLengthChange
}) => {
  return (
    <div className="calendar-controls">
      <div className="row g-3">
        <div className="col-md-6">
          <PropertySelection
            value={propertyId}
            onChange={(newPropertyId, _property) => onPropertyChange(newPropertyId)}
          />
        </div>
        <div className="col-md-6">
          <StayLengthSelector
            selectedLength={selectedStayLength}
            onLengthChange={onStayLengthChange}
            availableLengths={[1, 2, 3, 4, 5, 6, 7, 14, 21, 30]}
          />
        </div>
      </div>
    </div>
  )
}


/**
 * Main PricingCalendarGrid component using react-calendar
 * Implements all PRP-10 requirements with database integration
 */
const PricingCalendarGrid: React.FC<PricingCalendarGridProps> = ({
  propertyId: initialPropertyId,
  selectedStayLength: initialStayLength = 3,
  onPropertyChange,
  onStayLengthChange,
  onDateClick,
  className = ''
}) => {
  // Component state
  const [propertyId, setPropertyId] = useState(initialPropertyId)
  const [selectedStayLength, setSelectedStayLength] = useState(initialStayLength)
  const [calendarValue, setCalendarValue] = useState<CalendarValue>(new Date())
  const [pricingData, setPricingData] = useState<Map<string, CalculateFinalPriceResult>>(new Map())
  const [loadingState, setLoadingState] = useState<CalendarLoadingState>({
    isLoadingPrices: false,
    isLoadingProperty: false,
    isChangingStayLength: false,
    error: null
  })
  
  /**
   * Load pricing data using preview_pricing_calendar for performance
   * Implements bulk loading as specified in PRP-10
   */
  const loadCalendarPricing = useCallback(async (
    propId: string,
    startDate: Date,
    endDate: Date,
    stayLength: number
  ) => {
    if (!propId) return
    
    setLoadingState(prev => ({ ...prev, isLoadingPrices: true, error: null }))
    
    try {
      const result = await withRetry(async () => {
        const { data, error } = await supabase.rpc('preview_pricing_calendar', {
          p_property_id: propId,
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0],
          p_nights: stayLength
        })
        
        if (error) throw error
        return data as PreviewPricingCalendarResult[]
      })
      
      // Convert to pricing data map
      const newPricingData = new Map<string, CalculateFinalPriceResult>()
      
      result.forEach(dayData => {
        newPricingData.set(dayData.check_date, {
          base_price: dayData.base_price,
          seasonal_adjustment: dayData.seasonal_adjustment_percent * dayData.base_price / 100,
          last_minute_discount: dayData.last_minute_discount_percent * dayData.base_price / 100,
          final_price_per_night: dayData.final_price_per_night,
          total_price: dayData.total_price,
          min_price_enforced: dayData.min_price_enforced
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
   * Load pricing data when property, stay length, or visible month changes
   */
  useEffect(() => {
    if (!propertyId) return
    
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
    
    loadCalendarPricing(propertyId, startDate, endDate, selectedStayLength)
  }, [propertyId, selectedStayLength, calendarValue, loadCalendarPricing])
  
  /**
   * Handle property selection change
   */
  const handlePropertyChange = useCallback((newPropertyId: string) => {
    setPropertyId(newPropertyId)
    if (onPropertyChange) {
      onPropertyChange(newPropertyId)
    }
  }, [onPropertyChange])
  
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
   * Renders PricingTile component for each date
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
      />
    )
  }, [pricingData, selectedStayLength])
  
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
    <div className={`pricing-calendar-grid ${className}`} data-testid="pricing-calendar">
      {/* Calendar Controls */}
      <CalendarControlsComponent
        propertyId={propertyId}
        selectedStayLength={selectedStayLength}
        onPropertyChange={handlePropertyChange}
        onStayLengthChange={handleStayLengthChange}
      />
      
      {/* Error Display */}
      {loadingState.error && (
        <div className="alert alert-danger mb-3">
          <strong>Error loading calendar data:</strong> {loadingState.error}
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