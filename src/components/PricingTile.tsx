/**
 * PricingTile Component
 * Custom tile content for react-calendar with pricing display
 * Implements tileContent pattern as specified in PRP-10
 */

import React from 'react'
import type { PricingTileProps } from '@/types/pricing-calendar.types'

const PricingTile: React.FC<PricingTileProps> = ({
  date,
  view,
  priceData,
  stayLength
}) => {
  // Only show content in month view as per react-calendar best practices
  if (view !== 'month') return null

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

  return (
    <div 
      className="pricing-tile"
      data-testid={`price-tile-${date.toISOString().split('T')[0]}`}
      data-price={priceData.final_price_per_night}
      data-stay-length={stayLength}
    >
      {/* Main price display */}
      <div className="price-display">
        <span className="price-amount">
          €{Math.round(priceData.final_price_per_night)}
        </span>
        {stayLength > 1 && (
          <div className="total-price small text-muted">
            €{Math.round(priceData.total_price)} total
          </div>
        )}
      </div>

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