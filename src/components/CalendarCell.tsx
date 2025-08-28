/**
 * CalendarCell - Individual calendar cell with inline editing
 * Displays pricing data and allows inline price editing
 */

import React, { useState, useRef, useEffect } from 'react'
import type { CalculateFinalPriceReturn } from '@/types/helpers'
import { PricingFormatters } from '@/types/pricing'

interface CalendarCellProps {
  date: Date
  priceData: CalculateFinalPriceReturn | null
  isCurrentMonth: boolean
  isToday: boolean
  isEditable: boolean
  highlightDiscount: boolean
  showSeasonalAdjustment: boolean
  onClick: () => void
  onEdit?: (newPrice: number) => Promise<void>
}

/**
 * Calendar cell component with inline editing capabilities
 */
const CalendarCell: React.FC<CalendarCellProps> = React.memo(({
  date,
  priceData,
  isCurrentMonth,
  isToday,
  isEditable,
  highlightDiscount,
  showSeasonalAdjustment,
  onClick,
  onEdit
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const dayNumber = date.getDate()
  const isPastDate = date < new Date(new Date().setHours(0, 0, 0, 0))
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  
  /**
   * Start editing mode
   */
  const startEditing = (e: React.MouseEvent) => {
    if (!isEditable || !priceData || isPastDate) return
    
    e.stopPropagation()
    setIsEditing(true)
    setEditValue(priceData.final_price_per_night.toString())
    setError(null)
  }
  
  /**
   * Handle input change with validation
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    // Allow empty string or valid number
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setEditValue(value)
      setError(null)
      
      // Validate range
      const numValue = parseFloat(value)
      if (value !== '' && (isNaN(numValue) || numValue < 0 || numValue > 10000)) {
        setError('Price must be between 0 and 10,000')
      }
    }
  }
  
  /**
   * Save edited price
   */
  const handleSave = async () => {
    const numValue = parseFloat(editValue)
    
    if (isNaN(numValue) || numValue < 0 || numValue > 10000) {
      setError('Invalid price')
      return
    }
    
    if (onEdit) {
      setIsSubmitting(true)
      try {
        await onEdit(numValue)
        setIsEditing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
        // Reset to original value on error
        if (priceData) {
          setEditValue(priceData.final_price_per_night.toString())
        }
      } finally {
        setIsSubmitting(false)
      }
    }
  }
  
  /**
   * Cancel editing
   */
  const handleCancel = () => {
    setIsEditing(false)
    setError(null)
    if (priceData) {
      setEditValue(priceData.final_price_per_night.toString())
    }
  }
  
  /**
   * Handle keyboard events
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }
  
  /**
   * Focus input when entering edit mode
   */
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])
  
  /**
   * Determine cell classes
   */
  const getCellClasses = () => {
    const classes = ['calendar-cell', 'position-relative']
    
    if (!isCurrentMonth) classes.push('other-month')
    if (isToday) classes.push('today')
    if (isPastDate) classes.push('past-date')
    if (isWeekend) classes.push('weekend')
    if (isEditable && !isPastDate) classes.push('editable')
    if (highlightDiscount) classes.push('has-discount')
    if (showSeasonalAdjustment) classes.push('has-seasonal')
    if (priceData?.min_price_enforced) classes.push('min-price-enforced')
    
    return classes.join(' ')
  }
  
  /**
   * Get badge elements for indicators
   */
  const getBadges = () => {
    const badges = []
    
    if (highlightDiscount && priceData?.last_minute_discount && priceData.last_minute_discount > 0) {
      const discountPercentage = Math.round(
        (priceData.last_minute_discount / (priceData.base_price || 1)) * 100
      )
      badges.push(
        <span key="discount" className="badge bg-success position-absolute top-0 end-0 m-1" style={{ fontSize: '0.6rem' }}>
          -{discountPercentage}%
        </span>
      )
    }
    
    if (showSeasonalAdjustment && priceData?.seasonal_adjustment && priceData.seasonal_adjustment !== 0) {
      const isIncrease = priceData.seasonal_adjustment > 0
      badges.push(
        <span key="seasonal" className="badge bg-info position-absolute top-0 start-0 m-1" style={{ fontSize: '0.6rem' }}>
          {isIncrease ? '+' : ''}{Math.round(priceData.seasonal_adjustment)}
        </span>
      )
    }
    
    if (priceData?.min_price_enforced) {
      badges.push(
        <span key="min-price" className="badge bg-warning position-absolute bottom-0 end-0 m-1" style={{ fontSize: '0.6rem' }}>
          MIN
        </span>
      )
    }
    
    return badges
  }
  
  return (
    <div 
      className={getCellClasses()}
      onClick={!isEditing ? onClick : undefined}
      onDoubleClick={startEditing}
      style={{
        minHeight: '80px',
        cursor: isEditable && !isPastDate ? 'pointer' : 'default',
        opacity: isPastDate ? 0.6 : 1,
        backgroundColor: isToday ? '#e3f2fd' : undefined,
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        padding: '8px'
      }}
    >
      <div className="day-number fw-bold mb-1">{dayNumber}</div>
      
      {priceData && (
        <>
          {isEditing ? (
            <div className="price-edit">
              <input
                ref={inputRef}
                type="text"
                className={`form-control form-control-sm ${error ? 'is-invalid' : ''}`}
                value={editValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                disabled={isSubmitting}
                style={{ width: '80px' }}
              />
              {error && (
                <div className="invalid-feedback d-block" style={{ fontSize: '0.7rem' }}>
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="price-display">
              <div className="price fw-semibold">
                {PricingFormatters.currency(priceData.final_price_per_night)}
              </div>
              {priceData.base_price !== priceData.final_price_per_night && (
                <div className="base-price text-muted text-decoration-line-through" style={{ fontSize: '0.75rem' }}>
                  {PricingFormatters.currency(priceData.base_price)}
                </div>
              )}
            </div>
          )}
          
          {getBadges()}
        </>
      )}
      
      {!priceData && isCurrentMonth && !isPastDate && (
        <div className="no-data text-muted" style={{ fontSize: '0.75rem' }}>
          No pricing
        </div>
      )}
    </div>
  )
})

CalendarCell.displayName = 'CalendarCell'

export default CalendarCell