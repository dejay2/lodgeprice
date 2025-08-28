/**
 * PricingCalendarGrid - Calendar display with pricing data
 * Renders a month view with navigation and interactive cells
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { usePricingContext } from '@/context/PricingContext'
import { usePricingCalculation } from '@/hooks/usePricingCalculation'
import CalendarCell from './CalendarCell'
import type { CalculateFinalPriceReturn } from '@/types/helpers'
import type { PricingCalendarGridProps } from '@/types/pricing'

/**
 * Calendar header with month/year navigation
 */
interface CalendarHeaderProps {
  currentMonth: Date
  onMonthChange: (month: Date) => void
  onTodayClick: () => void
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ 
  currentMonth, 
  onMonthChange, 
  onTodayClick 
}) => {
  const monthYear = currentMonth.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })
  
  const handlePrevMonth = () => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() - 1)
    onMonthChange(newMonth)
  }
  
  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + 1)
    onMonthChange(newMonth)
  }
  
  const handlePrevYear = () => {
    const newMonth = new Date(currentMonth)
    newMonth.setFullYear(newMonth.getFullYear() - 1)
    onMonthChange(newMonth)
  }
  
  const handleNextYear = () => {
    const newMonth = new Date(currentMonth)
    newMonth.setFullYear(newMonth.getFullYear() + 1)
    onMonthChange(newMonth)
  }
  
  return (
    <div className="calendar-header d-flex justify-content-between align-items-center mb-3">
      <div className="btn-group" role="group">
        <button 
          className="btn btn-outline-secondary btn-sm"
          onClick={handlePrevYear}
          title="Previous year"
        >
          &lt;&lt;
        </button>
        <button 
          className="btn btn-outline-secondary btn-sm"
          onClick={handlePrevMonth}
          title="Previous month"
        >
          &lt;
        </button>
      </div>
      
      <div className="d-flex align-items-center gap-3">
        <h3 className="h5 mb-0">{monthYear}</h3>
        <button 
          className="btn btn-outline-primary btn-sm"
          onClick={onTodayClick}
        >
          Today
        </button>
      </div>
      
      <div className="btn-group" role="group">
        <button 
          className="btn btn-outline-secondary btn-sm"
          onClick={handleNextMonth}
          title="Next month"
        >
          &gt;
        </button>
        <button 
          className="btn btn-outline-secondary btn-sm"
          onClick={handleNextYear}
          title="Next year"
        >
          &gt;&gt;
        </button>
      </div>
    </div>
  )
}

/**
 * Calendar controls for view options
 */
interface CalendarControlsProps {
  highlightDiscounts: boolean
  showSeasonalAdjustments: boolean
  onHighlightChange: (value: boolean) => void
  onSeasonalChange: (value: boolean) => void
}

const CalendarControls: React.FC<CalendarControlsProps> = ({
  highlightDiscounts,
  showSeasonalAdjustments,
  onHighlightChange,
  onSeasonalChange
}) => {
  return (
    <div className="calendar-controls d-flex gap-3 mb-3">
      <div className="form-check">
        <input
          className="form-check-input"
          type="checkbox"
          id="highlight-discounts"
          checked={highlightDiscounts}
          onChange={(e) => onHighlightChange(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="highlight-discounts">
          Highlight discounts
        </label>
      </div>
      <div className="form-check">
        <input
          className="form-check-input"
          type="checkbox"
          id="show-seasonal"
          checked={showSeasonalAdjustments}
          onChange={(e) => onSeasonalChange(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="show-seasonal">
          Show seasonal adjustments
        </label>
      </div>
    </div>
  )
}

/**
 * Main PricingCalendarGrid component
 */
const PricingCalendarGrid: React.FC<PricingCalendarGridProps> = ({
  propertyId,
  dateRange,
  nights,
  onPriceClick,
  onPriceEdit,
  editable = false,
  highlightDiscounts: initialHighlight = true,
  showSeasonalAdjustments: initialSeasonal = true
}) => {
  const { calendarData, loading: contextLoading } = usePricingContext()
  const { calculateBulk, loading: calcLoading, error } = usePricingCalculation()
  
  // Set initial month based on date range or default to current month
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (dateRange?.start) {
      return new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), 1)
    }
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  
  const [highlightDiscounts, setHighlightDiscounts] = useState(initialHighlight)
  const [showSeasonalAdjustments, setShowSeasonalAdjustments] = useState(initialSeasonal)
  const [monthData, setMonthData] = useState<Map<string, CalculateFinalPriceReturn>>(new Map())
  
  /**
   * Calculate the days to display in the calendar grid
   */
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    
    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)
    
    // Start of the calendar (previous month's days)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    // End of the calendar (next month's days to complete the grid)
    const endDate = new Date(lastDay)
    const daysToAdd = (6 - lastDay.getDay())
    if (daysToAdd > 0) {
      endDate.setDate(endDate.getDate() + daysToAdd)
    }
    
    // Generate all days
    const days: Date[] = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }, [currentMonth])
  
  /**
   * Load pricing data for the current month, respecting dateRange filter
   */
  useEffect(() => {
    const loadMonthData = async () => {
      if (!propertyId) return
      
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      
      // Get first and last day of the month
      let firstDay = new Date(year, month, 1)
      let lastDay = new Date(year, month + 1, 0)
      
      // If dateRange is specified, use it to constrain the data loading
      if (dateRange?.start && dateRange?.end) {
        // Only load data for the intersection of current month and date range
        firstDay = new Date(Math.max(firstDay.getTime(), dateRange.start.getTime()))
        lastDay = new Date(Math.min(lastDay.getTime(), dateRange.end.getTime()))
        
        // If no intersection, skip loading
        if (firstDay > lastDay) {
          setMonthData(new Map())
          return
        }
      }
      
      try {
        const data = await calculateBulk({
          propertyId,
          dateRange: { start: firstDay, end: lastDay },
          nights
        })
        
        setMonthData(data)
      } catch (err) {
        console.error('Failed to load calendar data:', err)
      }
    }
    
    loadMonthData()
  }, [propertyId, currentMonth, nights, dateRange, calculateBulk])
  
  /**
   * Navigate to today
   */
  const handleTodayClick = useCallback(() => {
    const today = new Date()
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }, [])
  
  /**
   * Handle date click
   */
  const handleCellClick = useCallback((date: Date) => {
    const dateKey = date.toISOString().split('T')[0]
    const priceData = monthData.get(dateKey) || calendarData.get(dateKey)
    
    if (priceData && onPriceClick) {
      onPriceClick(date, priceData)
    }
  }, [monthData, calendarData, onPriceClick])
  
  /**
   * Handle price edit
   */
  const handleCellEdit = useCallback(async (date: Date, newPrice: number) => {
    if (onPriceEdit) {
      await onPriceEdit(date, newPrice)
    }
  }, [onPriceEdit])
  
  /**
   * Check if a date is in the current month
   */
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth() && 
           date.getFullYear() === currentMonth.getFullYear()
  }
  
  /**
   * Check if a date is today
   */
  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }
  
  const loading = contextLoading || calcLoading
  
  return (
    <div className="pricing-calendar-grid">
      <CalendarHeader
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        onTodayClick={handleTodayClick}
      />
      
      <CalendarControls
        highlightDiscounts={highlightDiscounts}
        showSeasonalAdjustments={showSeasonalAdjustments}
        onHighlightChange={setHighlightDiscounts}
        onSeasonalChange={setShowSeasonalAdjustments}
      />
      
      {error && (
        <div className="alert alert-danger mb-3">
          Error loading calendar data: {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading calendar...</span>
          </div>
        </div>
      ) : (
        <div className="calendar-grid">
          {/* Weekday headers */}
          <div className="row g-0 border-bottom mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="col text-center fw-bold py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="calendar-days">
            {Array.from({ length: Math.ceil(calendarDays.length / 7) }, (_, weekIndex) => (
              <div key={weekIndex} className="row g-0">
                {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map(date => {
                  const dateKey = date.toISOString().split('T')[0]
                  const priceData = monthData.get(dateKey) || calendarData.get(dateKey)
                  
                  return (
                    <div key={dateKey} className="col p-1">
                      <CalendarCell
                        date={date}
                        priceData={priceData || null}
                        isCurrentMonth={isCurrentMonth(date)}
                        isToday={isToday(date)}
                        isEditable={editable && isCurrentMonth(date)}
                        highlightDiscount={highlightDiscounts && (priceData?.last_minute_discount ?? 0) > 0}
                        showSeasonalAdjustment={showSeasonalAdjustments && (priceData?.seasonal_adjustment ?? 0) !== 0}
                        onClick={() => handleCellClick(date)}
                        onEdit={editable ? (newPrice) => handleCellEdit(date, newPrice) : undefined}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="calendar-legend mt-3 d-flex gap-3 text-muted small">
        <div>
          <span className="badge bg-success me-1">&nbsp;</span>
          Discount applied
        </div>
        <div>
          <span className="badge bg-info me-1">&nbsp;</span>
          Seasonal adjustment
        </div>
        <div>
          <span className="badge bg-warning me-1">&nbsp;</span>
          Minimum price enforced
        </div>
      </div>
    </div>
  )
}

export default React.memo(PricingCalendarGrid)