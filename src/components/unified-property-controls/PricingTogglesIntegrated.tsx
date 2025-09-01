/**
 * PricingTogglesIntegrated - Toggle switches integrated into unified controls
 * Implements FR-4: Integrated Pricing Toggles
 * Wraps existing PricingToggles component with unified styling
 */

import React from 'react'
import PricingToggles from '../PricingToggles'
import { useUnifiedControlsContext } from './UnifiedPropertyControls'

/**
 * PricingTogglesIntegrated component that embeds existing toggles
 * Provides consistent styling and layout within unified controls
 */
const PricingTogglesIntegrated: React.FC = () => {
  const { selectedProperty, disabled } = useUnifiedControlsContext()

  if (!selectedProperty) {
    return (
      <div className="pricing-toggles-integrated text-muted" data-testid="pricing-toggles">
        <small>Select a property to manage pricing toggles</small>
      </div>
    )
  }

  return (
    <div className="pricing-toggles-integrated" data-testid="pricing-toggles">
      <label className="text-muted small mb-2 d-block">Pricing Components</label>
      <PricingToggles 
        disabled={disabled}
        className="unified-toggles"
      />
    </div>
  )
}

export default PricingTogglesIntegrated