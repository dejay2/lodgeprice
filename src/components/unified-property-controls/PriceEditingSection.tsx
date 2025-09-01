/**
 * PriceEditingSection - Inline price editing for base and minimum prices
 * Implements FR-3: Inline Price Editing Integration
 * Implements PRP-49: Minimum Rate Editing with Constraint Validation
 * Provides click-to-edit functionality with validation
 */

import React, { useState, useCallback } from 'react'
import { BasePriceService } from '@/services/base-price.service'
import { MinPriceService } from '@/services/min-price.service'
import { usePricingContext } from '@/context/PricingContext'
import { useUnifiedControlsContext } from './UnifiedPropertyControls'
import InlinePriceEditor from '../InlinePriceEditor'
import MinimumRateEditor from '../MinimumRateEditor'
import { Tooltip } from '../contextual-help'
import { HelpContentUtils } from '../contextual-help'
import type { PriceEditingSectionProps } from './types'

/**
 * PriceEditingSection component for inline price editing
 * Displays base and minimum prices with click-to-edit functionality
 */
const PriceEditingSection: React.FC<PriceEditingSectionProps> = ({ 
  property,
  disabled = false,
  onPriceUpdate
}) => {
  const { editingPrice, setEditingPrice, onPriceChange } = useUnifiedControlsContext()
  const { refreshCalendarData } = usePricingContext()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Handle base price save with database persistence using BasePriceService
   * Implements FR-3: Database Integration and Persistence
   * Implements FR-4: Calendar Integration and Real-time Updates
   */
  const handleBasePriceSave = useCallback(async (newPrice: number) => {
    if (!property) return
    
    // Validate min_price constraint
    if (newPrice < property.min_price_per_day) {
      setError(`Base price must be at least €${property.min_price_per_day.toFixed(2)}`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Update database using BasePriceService with retry logic
      const updateResult = await BasePriceService.updateBasePrice(
        property.id,
        newPrice,
        { maxAttempts: 3, baseDelay: 1000, maxDelay: 8000 }
      )

      if (!updateResult.success) {
        throw new Error('Failed to update base price')
      }

      // Update local state with optimistic UI update
      if (onPriceUpdate) {
        onPriceUpdate('base', updateResult.newPrice)
      }
      if (onPriceChange) {
        onPriceChange('base', updateResult.newPrice)
      }

      // Trigger calendar refresh for immediate pricing recalculation (FR-4)
      await refreshCalendarData()

      // Close editor
      setEditingPrice(null)
    } catch (err: any) {
      console.error('Failed to update base price:', err)
      
      // Handle specific error cases with user-friendly messages
      if (err.code === 'CONSTRAINT_VIOLATION') {
        setError(`Price violates minimum price constraint of €${property.min_price_per_day.toFixed(2)}`)
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError('Failed to save price. Please try again.')
      }
      
      throw err // Re-throw for InlinePriceEditor to handle
    } finally {
      setSaving(false)
    }
  }, [property, onPriceUpdate, onPriceChange, setEditingPrice, refreshCalendarData])

  /**
   * Handle minimum price save with database persistence using MinPriceService
   * Implements PRP-49: Minimum Rate Database Integration with Constraint Validation
   * Implements FR-4: Save operation with pricing floor recalculation
   */
  const handleMinPriceSave = useCallback(async (newPrice: number) => {
    if (!property) return

    // Pre-validate base_price constraint (FR-3)
    if (newPrice > property.base_price_per_day) {
      setError(`Minimum price cannot exceed base price of €${property.base_price_per_day.toFixed(2)}`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Update database using MinPriceService with retry logic
      const updateResult = await MinPriceService.updateMinPrice(
        property.id,
        newPrice,
        { maxAttempts: 3, baseDelay: 1000, maxDelay: 8000 }
      )

      if (!updateResult.success) {
        throw new Error('Failed to update minimum price')
      }

      // Update local state with optimistic UI update
      if (onPriceUpdate) {
        onPriceUpdate('min', updateResult.newPrice)
      }
      if (onPriceChange) {
        onPriceChange('min', updateResult.newPrice)
      }

      // Trigger calendar refresh for immediate pricing floor enforcement (FR-10)
      await refreshCalendarData()

      // Close editor
      setEditingPrice(null)
    } catch (err: any) {
      console.error('Failed to update minimum price:', err)
      
      // Handle specific error cases with user-friendly messages
      if (err.code === 'PRICE_EXCEEDS_BASE') {
        setError(`Minimum price cannot exceed base price of €${property.base_price_per_day.toFixed(2)}`)
      } else if (err.code === 'CONSTRAINT_VIOLATION') {
        setError(`Minimum price violates base price constraint. Please check current base price.`)
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError('Failed to save minimum price. Please try again.')
      }
      
      throw err // Re-throw for MinimumRateEditor to handle
    } finally {
      setSaving(false)
    }
  }, [property, onPriceUpdate, onPriceChange, setEditingPrice, refreshCalendarData])

  /**
   * Format price for display
   */
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)
  }

  if (!property) {
    return (
      <div className="price-editing-section text-muted" data-testid="price-editing-section">
        <small>Select a property to edit prices</small>
      </div>
    )
  }

  return (
    <div className="price-editing-section" data-testid="price-editing-section">
      <div className="d-flex flex-column gap-2">
        {/* Base Price Editor */}
        <div className="price-item">
          <label className="text-muted small mb-1">Base Price/Day</label>
          {editingPrice === 'base' ? (
            <InlinePriceEditor
              value={property.base_price_per_day}
              minPrice={property.min_price_per_day}
              onSave={handleBasePriceSave}
              onCancel={() => setEditingPrice(null)}
              onValidationError={setError}
              className="price-editor-base"
              autoFocus
              propertyId={property.id}
              dataTestId="base-price-input"
            />
          ) : (
            <Tooltip
              content={HelpContentUtils.formatContent(
                'Click to edit base rate (minimum €{minPrice} enforced)',
                { minPrice: property.min_price_per_day.toFixed(2) }
              )}
              placement="top"
              delay={200}
            >
              <div 
                className="price-display clickable"
                onClick={() => !disabled && !saving && setEditingPrice('base')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    !disabled && !saving && setEditingPrice('base')
                  }
                }}
                data-testid="base-rate-edit-button"
                aria-label={`Base price ${formatPrice(property.base_price_per_day)}, click to edit`}
                style={{ cursor: disabled || saving ? 'not-allowed' : 'pointer' }}
              >
                <span className="fw-bold">{formatPrice(property.base_price_per_day)}</span>
                {!disabled && !saving && (
                  <span className="ms-1 text-muted small">✏️</span>
                )}
              </div>
            </Tooltip>
          )}
        </div>

        {/* Minimum Price Editor - Implements PRP-49 Requirements */}
        <div className="price-item">
          <label className="text-muted small mb-1">Minimum Price/Day</label>
          {editingPrice === 'min' ? (
            <MinimumRateEditor
              value={property.min_price_per_day}
              maxPrice={property.base_price_per_day}  // Constraint enforcement (FR-3)
              onSave={handleMinPriceSave}
              onCancel={() => setEditingPrice(null)}
              onValidationError={setError}
              className="price-editor-min"
              autoFocus
              dataTestId="minimum-rate-input"
            />
          ) : (
            <Tooltip
              content="Click to edit minimum price floor for this property"
              placement="top"
              delay={200}
            >
              <div 
                className="price-display clickable"
                onClick={() => !disabled && !saving && setEditingPrice('min')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    !disabled && !saving && setEditingPrice('min')
                  }
                }}
                data-testid="minimum-rate-edit-button"
                aria-label={`Minimum price ${formatPrice(property.min_price_per_day)}, click to edit`}
                style={{ cursor: disabled || saving ? 'not-allowed' : 'pointer' }}
              >
                <span className="fw-bold">{formatPrice(property.min_price_per_day)}</span>
                {!disabled && !saving && (
                  <span className="ms-1 text-muted small">✏️</span>
                )}
              </div>
            </Tooltip>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-danger py-1 px-2 mb-0 small" role="alert" data-testid="validation-error">
            {error}
          </div>
        )}

        {/* Saving Indicator */}
        {saving && (
          <div className="text-muted small" data-testid="price-saving-indicator">
            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            Saving...
          </div>
        )}
      </div>
    </div>
  )
}

export default PriceEditingSection