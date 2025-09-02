/**
 * PricingTile Component
 * Custom tile content for react-calendar with pricing display and click handling
 * Implements tileContent pattern as specified in PRP-10
 * Enhanced with click handlers for override management as per PRP-014
 */

import React, { useCallback, useRef, useEffect, useState } from 'react'
import { Tooltip } from './contextual-help'
import { useClickHandlerState } from '@/hooks/useClickHandlerState'
import type { PricingTileProps } from '@/types/pricing-calendar.types'

const PricingTile: React.FC<PricingTileProps> = ({
  date,
  view,
  priceData,
  stayLength,
  isOverride = false,
  propertyId,
  onOverrideModalOpen,
  onShowPriceBreakdown,
  isOverrideModalAvailable = false
}) => {
  // Click handler state management
  const { clickState, setClickState, resetClickState, isWithinDoubleClickWindow } = useClickHandlerState({
    doubleClickDelay: 300,
    debug: false
  })
  
  // State for showing price breakdown
  const [showBreakdown, setShowBreakdown] = useState(false)
  const tileRef = useRef<HTMLDivElement>(null)

  // Enhanced override detection logic
  const detectOverrideState = (data: typeof priceData): boolean => {
    if (!data) return false
    
    try {
      // Primary detection: explicit override flag
      if (data.is_override) return true
      
      // Secondary detection: compare override_price vs calculated_price
      if (data.override_price !== undefined && data.calculated_price !== undefined) {
        return Math.abs(data.override_price - data.calculated_price) > 0.01
      }
      
      // Fallback: use prop value
      return isOverride
    } catch (error) {
      console.warn('Override detection failed:', error)
      return false
    }
  }

  // Format enhanced tooltip content for overrides
  const formatOverrideTooltip = useCallback((): string => {
    if (!priceData || !detectOverrideState(priceData)) {
      return "Shows final calculated price including all adjustments (base + seasonal + discounts)"
    }
    
    const overridePrice = Math.round(priceData.final_price_per_night)
    const calculatedPrice = Math.round(priceData.calculated_price || priceData.base_price)
    
    return `Manual override: €${overridePrice} (replaces calculated €${calculatedPrice})`
  }, [priceData, detectOverrideState])
  
  /**
   * Handle single click - show price breakdown
   */
  const executeSingleClick = useCallback(() => {
    if (onShowPriceBreakdown) {
      onShowPriceBreakdown(date)
    } else {
      // Fallback: show inline breakdown tooltip
      setShowBreakdown(true)
      // Auto-hide after 5 seconds
      setTimeout(() => setShowBreakdown(false), 5000)
    }
  }, [date, onShowPriceBreakdown])
  
  /**
   * Handle double click - open override modal
   */
  const executeDoubleClick = useCallback(() => {
    if (isOverrideModalAvailable && onOverrideModalOpen && propertyId) {
      onOverrideModalOpen(date, propertyId)
    } else {
      // Fallback to single click if modal not available
      console.warn('Override modal not available, falling back to price breakdown')
      executeSingleClick()
    }
  }, [date, propertyId, isOverrideModalAvailable, onOverrideModalOpen, executeSingleClick])
  
  /**
   * Main click handler with single/double-click detection
   */
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation() // Prevent calendar navigation
    e.preventDefault()
    
    const now = Date.now()
    
    // Reset if too much time has passed since last click
    if (!isWithinDoubleClickWindow(now)) {
      resetClickState()
    }
    
    const newClickCount = clickState.clickCount + 1
    
    if (newClickCount === 1) {
      // First click - start timer for single-click
      const timeout = setTimeout(() => {
        executeSingleClick()
        resetClickState()
      }, 300) // Wait for potential second click
      
      setClickState({
        clickTimeout: timeout,
        clickCount: newClickCount,
        lastClickTime: now
      })
    } else if (newClickCount === 2) {
      // Second click - execute double-click
      if (clickState.clickTimeout) {
        clearTimeout(clickState.clickTimeout)
      }
      executeDoubleClick()
      resetClickState()
    }
  }, [clickState, isWithinDoubleClickWindow, resetClickState, setClickState, executeSingleClick, executeDoubleClick])
  
  /**
   * Handle keyboard accessibility
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      
      // Shift + Enter/Space for override modal
      if (e.shiftKey && isOverrideModalAvailable && onOverrideModalOpen && propertyId) {
        executeDoubleClick()
      } else {
        // Plain Enter/Space for price breakdown
        executeSingleClick()
      }
    }
  }, [isOverrideModalAvailable, onOverrideModalOpen, propertyId, executeDoubleClick, executeSingleClick])
  
  /**
   * Handle touch events for mobile devices
   */
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    // Store touch start time for double-tap detection
    const now = Date.now()
    
    if (!isWithinDoubleClickWindow(now)) {
      resetClickState()
    }
    
    const newClickCount = clickState.clickCount + 1
    
    if (newClickCount === 2) {
      // Double tap detected
      e.preventDefault()
      executeDoubleClick()
      resetClickState()
    } else {
      // First tap - set state
      setClickState({
        clickTimeout: null,
        clickCount: newClickCount,
        lastClickTime: now
      })
      
      // Set timeout for single tap
      setTimeout(() => {
        if (clickState.clickCount === 1) {
          executeSingleClick()
          resetClickState()
        }
      }, 300)
    }
  }, [clickState, isWithinDoubleClickWindow, resetClickState, setClickState, executeSingleClick, executeDoubleClick])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clickState.clickTimeout) {
        clearTimeout(clickState.clickTimeout)
      }
    }
  }, [clickState.clickTimeout])
  
  // Only show content in month view as per react-calendar best practices
  if (view !== 'month') return null
  
  const isOverridden = detectOverrideState(priceData)

  // Loading state when price data is not yet available
  if (!priceData) {
    return (
      <div className="pricing-tile loading" data-testid="price-tile-loading">
        <div className="price-display">
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Loading price...</span>
          </div>
        </div>
      </div>
    )
  }

  // Calculate indicators based on price data
  const hasSeasonalRate = Math.abs(priceData.seasonal_adjustment) > 0.01
  const hasLastMinuteDiscount = priceData.last_minute_discount > 0.01
  const isAtMinPrice = priceData.min_price_enforced

  // Get test ID for current date (today vs other dates)
  const today = new Date()
  const isToday = date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
  const testId = isOverridden 
    ? 'price-tile-override' 
    : (isToday ? 'price-tile-current' : `price-tile-${date.toISOString().split('T')[0]}`)

  return (
    <div 
      ref={tileRef}
      className={`pricing-tile ${isOverridden ? 'override-tile' : ''} ${propertyId ? 'clickable' : ''}`}
      data-testid={testId}
      data-price={priceData.final_price_per_night}
      data-stay-length={stayLength}
      data-date={date.toISOString().split('T')[0]}
      data-is-override={isOverridden}
      role="button"
      tabIndex={0}
      aria-label={`Price for ${date.toLocaleDateString()}: €${Math.round(priceData.final_price_per_night)}${isOverridden ? ' (manually overridden)' : ''}. Press Enter for details, Shift+Enter to set override.`}
      aria-describedby={isOverridden ? 'override-description' : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      style={{ cursor: propertyId ? 'pointer' : 'default' }}
    >
      {/* Main price display */}
      <div className="price-display">
        <Tooltip
          content={
            <div>
              {formatOverrideTooltip()}
              {showBreakdown && priceData && (
                <div className="mt-2 pt-2 border-top">
                  <div className="small">
                    <div>Base: €{Math.round(priceData.base_price)}</div>
                    {priceData.seasonal_adjustment !== 0 && (
                      <div>Seasonal: {priceData.seasonal_adjustment > 0 ? '+' : ''}€{Math.round(priceData.seasonal_adjustment)}</div>
                    )}
                    {priceData.last_minute_discount > 0 && (
                      <div>Discount: -€{Math.round(priceData.last_minute_discount)}</div>
                    )}
                    {priceData.min_price_enforced && (
                      <div>Min price enforced</div>
                    )}
                  </div>
                  {isOverrideModalAvailable && propertyId && (
                    <button
                      className="btn btn-outline-primary btn-sm mt-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        if (onOverrideModalOpen) {
                          onOverrideModalOpen(date, propertyId)
                        }
                      }}
                      aria-label={`Set price override for ${date.toLocaleDateString()}`}
                    >
                      Set Override
                    </button>
                  )}
                </div>
              )}
            </div>
          }
          placement="top"
          delay={showBreakdown ? 0 : 300}
        >
          <div 
            className="price-amount"
            data-testid="calendar-price-cell"
          >
            €{Math.round(priceData.final_price_per_night)}
          </div>
        </Tooltip>
        
        {/* Total price for multi-night stays */}
        {stayLength > 1 && (
          <div className="total-price small text-muted">
            €{Math.round(priceData.total_price)} total
          </div>
        )}
      </div>

      {/* Override badge - positioned absolutely */}
      {isOverridden && (
        <div 
          className="override-indicator"
          role="status"
          aria-label={`Manual override: €${Math.round(priceData.final_price_per_night)}, replaces calculated €${Math.round(priceData.calculated_price || priceData.base_price)}`}
          title="Price manually overridden"
        >
          <span className="indicator-badge override">OVERRIDE</span>
        </div>
      )}
      
      {/* Visual indicators */}
      <div className="price-indicators">          
          {hasSeasonalRate && (
            <div 
              className="seasonal-indicator"
              title={`Seasonal adjustment: ${priceData.seasonal_adjustment > 0 ? '+' : ''}€${Math.round(priceData.seasonal_adjustment)}`}
            >
              <span className="indicator-dot seasonal">●</span>
            </div>
          )}
          
          {hasLastMinuteDiscount && (
            <div 
              className="discount-indicator"
              title={`Last minute discount: €${Math.round(priceData.last_minute_discount)} off`}
            >
              <span className="indicator-symbol discount">%</span>
            </div>
          )}
          
          {isAtMinPrice && (
            <div 
              className="min-price-indicator"
              title="Minimum price enforced"
            >
              <span className="indicator-text min-price">MIN</span>
            </div>
          )}
      </div>
    </div>
  )
}

export default React.memo(PricingTile)