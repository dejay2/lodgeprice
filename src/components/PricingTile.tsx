/**
 * PricingTile Component
 * Custom tile content for react-calendar with pricing display and inline editing
 * Implements tileContent pattern as specified in PRP-10
 * Enhanced with inline editing capability as per PRP-11
 */

import React, { useState, useCallback } from 'react'
import InlinePriceEditor from './InlinePriceEditor'
import { Tooltip } from './contextual-help'
import type { PricingTileProps } from '@/types/pricing-calendar.types'
import './InlinePriceEditor.css'

const PricingTile: React.FC<PricingTileProps> = ({
  date,
  view,
  priceData,
  stayLength,
  hasSeasonalAdjustment,
  hasDiscount,
  isMinPriceEnforced,
  isOverride = false,
  isEditable = false,
  isEditing = false,
  minPrice = 0,
  propertyId,
  onEditStart,
  onEditCancel,
  onPriceSave,
  onPriceChange
}) => {
  // State for inline editing
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [recentlySaved, setRecentlySaved] = useState(false)

  /**
   * Handle click to start editing (FR-2)
   */
  const handleEditStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // Prevent calendar navigation
    if (isEditable && !isEditing && onEditStart) {
      onEditStart(date)
    }
  }, [isEditable, isEditing, onEditStart, date])

  /**
   * Handle save operation with optimistic updates (FR-4)
   */
  const handleSave = useCallback(async (newBasePrice: number) => {
    if (!propertyId || !onPriceSave) return

    setIsSaving(true)
    setSaveError(null)

    try {
      await onPriceSave(propertyId, newBasePrice)
      
      // Success state with temporary highlighting (FR-7)
      setRecentlySaved(true)
      setTimeout(() => setRecentlySaved(false), 2000)

      // Trigger pricing recalculation (FR-10)
      if (onPriceChange) {
        onPriceChange()
      }
      
    } catch (error) {
      console.error('Failed to save base price:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save price')
    } finally {
      setIsSaving(false)
    }
  }, [propertyId, onPriceSave, onPriceChange])

  /**
   * Handle cancel operation (FR-5)
   */
  const handleCancel = useCallback(() => {
    setSaveError(null)
    if (onEditCancel) {
      onEditCancel()
    }
  }, [onEditCancel])

  /**
   * Handle validation errors
   */
  const handleValidationError = useCallback((error: string) => {
    setSaveError(error)
  }, [])

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

  // Get test ID for current date (today vs other dates)
  const today = new Date()
  const isToday = date.toISOString().split('T')[0] === today.toISOString().split('T')[0]
  const testId = isToday ? 'price-tile-current' : `price-tile-${date.toISOString().split('T')[0]}`

  return (
    <div 
      className={`pricing-tile ${isEditable ? 'editable' : ''} ${isEditing ? 'editing' : ''} ${recentlySaved ? 'success-highlight' : ''} ${isOverride ? 'has-override' : ''}`}
      data-testid={testId}
      data-price={priceData.final_price_per_night}
      data-stay-length={stayLength}
      data-date={date.toISOString().split('T')[0]}
      data-is-override={isOverride}
    >
      {/* Main price display or inline editor */}
      <div className="price-display">
        {isEditing ? (
          <InlinePriceEditor
            value={priceData.base_price}
            minPrice={minPrice}
            onSave={handleSave}
            onCancel={handleCancel}
            onValidationError={handleValidationError}
            className="tile-price-editor"
          />
        ) : (
          <Tooltip
            content={isOverride 
              ? "Override price - manually set and bypasses normal pricing calculations" 
              : "Shows final calculated price including all adjustments (base + seasonal + discounts)"}
            placement="top"
            delay={300}
          >
            <div 
              className={`price-amount ${isEditable ? 'clickable' : ''}`}
              onClick={handleEditStart}
              role={isEditable ? 'button' : undefined}
              tabIndex={isEditable ? 0 : undefined}
              aria-label={isEditable ? `Edit price €${Math.round(priceData.final_price_per_night)}` : undefined}
              data-testid="calendar-price-cell"
              onKeyDown={isEditable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  const mouseEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                  })
                  handleEditStart(mouseEvent as unknown as React.MouseEvent<HTMLDivElement>)
                }
              } : undefined}
            >
              €{Math.round(priceData.final_price_per_night)}
              {isOverride && <span className="override-indicator" title="Override price">⚡</span>}
            </div>
          </Tooltip>
        )}
        
        {/* Total price for multi-night stays */}
        {stayLength > 1 && !isEditing && (
          <div className="total-price small text-muted">
            €{Math.round(priceData.total_price)} total
          </div>
        )}
      </div>

      {/* Error message display (FR-6) */}
      {saveError && (
        <div className="save-error" data-testid="save-error-message" role="alert">
          {saveError}
          <button 
            className="retry-btn"
            onClick={() => setSaveError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Loading indicator during save (FR-9) */}
      {isSaving && (
        <div className="save-loading" data-testid="save-loading-indicator">
          <div className="spinner"></div>
        </div>
      )}

      {/* Visual indicators - hidden during editing to reduce clutter */}
      {!isEditing && (
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
      )}
    </div>
  )
}

export default React.memo(PricingTile)