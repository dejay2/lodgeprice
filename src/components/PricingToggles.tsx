/**
 * PricingToggles - Toggle switches for pricing calculation components
 * Implements FR-1 through FR-4 of pricing-toggles-prp
 * Provides toggle controls for seasonal rates and discount strategies
 */

import React, { useCallback, memo } from 'react'
import { usePricingContext } from '@/context/PricingContext'

/**
 * Props for PricingToggles component
 */
export interface PricingTogglesProps {
  className?: string
  disabled?: boolean
}

/**
 * PricingToggles component with Bootstrap form-switch styling
 * Implements accessibility requirements with ARIA attributes
 */
const PricingToggles: React.FC<PricingTogglesProps> = memo(({ 
  className = '', 
  disabled = false 
}) => {
  const { 
    toggles, 
    updateToggle 
  } = usePricingContext()

  /**
   * Handle toggle change with optimistic update
   */
  const handleSeasonalToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked
    updateToggle('seasonal', enabled)
  }, [updateToggle])

  const handleDiscountToggle = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked
    updateToggle('discount', enabled)
  }, [updateToggle])

  return (
    <div className={`pricing-toggles d-flex gap-4 ${className}`}>
      {/* Seasonal Rates Toggle */}
      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          role="switch"
          id="seasonal-rates-toggle"
          data-testid="seasonal-rates-toggle"
          checked={toggles.seasonalRatesEnabled}
          onChange={handleSeasonalToggle}
          disabled={disabled}
          aria-checked={toggles.seasonalRatesEnabled}
          aria-label="Toggle seasonal rates"
        />
        <label 
          className="form-check-label" 
          htmlFor="seasonal-rates-toggle"
        >
          <span className="d-flex align-items-center gap-1">
            <span>Seasonal Rates</span>
            {!toggles.seasonalRatesEnabled && (
              <span 
                className="badge bg-secondary"
                data-testid="seasonal-rates-indicator"
              >
                Off
              </span>
            )}
          </span>
        </label>
      </div>

      {/* Discount Strategies Toggle */}
      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          role="switch"
          id="discount-strategies-toggle"
          data-testid="discount-strategies-toggle"
          checked={toggles.discountStrategiesEnabled}
          onChange={handleDiscountToggle}
          disabled={disabled}
          aria-checked={toggles.discountStrategiesEnabled}
          aria-label="Toggle discount strategies"
        />
        <label 
          className="form-check-label" 
          htmlFor="discount-strategies-toggle"
        >
          <span className="d-flex align-items-center gap-1">
            <span>Discount Strategies</span>
            {!toggles.discountStrategiesEnabled && (
              <span 
                className="badge bg-secondary"
                data-testid="discount-strategies-indicator"
              >
                Off
              </span>
            )}
          </span>
        </label>
      </div>

      {/* Visual indicator when both are disabled */}
      {!toggles.seasonalRatesEnabled && !toggles.discountStrategiesEnabled && (
        <div className="text-muted small d-flex align-items-center">
          <span className="badge bg-warning text-dark">Base pricing only</span>
        </div>
      )}
    </div>
  )
})

PricingToggles.displayName = 'PricingToggles'

export default PricingToggles