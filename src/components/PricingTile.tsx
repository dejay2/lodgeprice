/**
 * PricingTile Component
 * Custom tile content for react-calendar with pricing display only
 * Implements tileContent pattern as specified in PRP-10
 * Inline editing removed as per PRP-11 - now handled through modal
 */

import React from 'react'
import { Tooltip } from './contextual-help'
import type { PricingTileProps } from '@/types/pricing-calendar.types'

const PricingTile: React.FC<PricingTileProps> = ({
  date,
  view,
  priceData,
  stayLength,
  isOverride = false
}) => {
  // No state needed for display-only tiles

  // Only show content in month view as per react-calendar best practices
  if (view !== 'month') return null

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

  // Format enhanced tooltip content for overrides
  const formatOverrideTooltip = (): string => {
    if (!isOverridden || !priceData) {
      return "Shows final calculated price including all adjustments (base + seasonal + discounts)"
    }
    
    const overridePrice = Math.round(priceData.final_price_per_night)
    const calculatedPrice = Math.round(priceData.calculated_price || priceData.base_price)
    
    return `Manual override: €${overridePrice} (replaces calculated €${calculatedPrice})`
  }

  // Get test ID for current date (today vs other dates)
  const today = new Date()
  const isToday = date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
  const testId = isToday ? 'price-tile-current' : `price-tile-${date.toISOString().split('T')[0]}`

  return (
    <div 
      className={`pricing-tile ${isOverridden ? 'override-tile' : ''}`}
      data-testid={testId}
      data-price={priceData.final_price_per_night}
      data-stay-length={stayLength}
      data-date={date.toISOString().split('T')[0]}
      data-is-override={isOverridden}
      role="button"
      tabIndex={0}
      aria-label={`Price for ${date.toLocaleDateString()}: €${Math.round(priceData.final_price_per_night)}${isOverridden ? ' (manually overridden)' : ''}`}
      aria-describedby={isOverridden ? 'override-description' : undefined}
    >
      {/* Main price display */}
      <div className="price-display">
        <Tooltip
          content={formatOverrideTooltip()}
          placement="top"
          delay={300}
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

      {/* Visual indicators */}
      <div className="price-indicators">
          {isOverridden && (
            <div 
              className="override-indicator"
              role="status"
              aria-label="Price manually overridden"
            >
              <span className="indicator-badge override">OVERRIDE</span>
            </div>
          )}
          
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