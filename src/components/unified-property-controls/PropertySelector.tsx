/**
 * PropertySelector - Property dropdown integration for unified controls
 * Implements FR-2: Integrated Property Selection
 * Wraps existing PropertySelection component with unified control context
 */

import React, { useEffect } from 'react'
import { usePricingContext } from '@/context/PricingContext'
import { useAppContext } from '@/context/AppContext'
import PropertySelection from '../PropertySelection/PropertySelection'
import { useUnifiedControlsContext } from './UnifiedPropertyControls'
import { Tooltip } from '../contextual-help'
import type { Property } from '@/types/database'

/**
 * PropertySelector component that integrates existing PropertySelection
 * Ensures single property dropdown with context synchronization
 */
const PropertySelector: React.FC = () => {
  const { onPropertyChange, disabled } = useUnifiedControlsContext()
  const { selectedProperty, setSelectedProperty } = usePricingContext()
  const { setSelectedProperty: setAppSelectedProperty } = useAppContext()

  /**
   * Handle property selection with context synchronization
   * Updates both PricingContext and AppContext for consistency
   */
  const handlePropertyChange = (propertyId: string | null, property?: Property) => {
    if (property) {
      // Update all contexts
      setSelectedProperty(property)
      setAppSelectedProperty(property)
      onPropertyChange(property)
      
      // Store in session storage for persistence
      try {
        sessionStorage.setItem('selectedPropertyId', propertyId!)
      } catch (error) {
        console.warn('Failed to persist property selection:', error)
      }
    } else if (propertyId === null) {
      // Handle deselection
      setSelectedProperty(null)
      setAppSelectedProperty(null)
      onPropertyChange(null)
      sessionStorage.removeItem('selectedPropertyId')
    }
  }

  /**
   * Sync initial property selection from context
   */
  useEffect(() => {
    if (selectedProperty) {
      onPropertyChange(selectedProperty)
    }
  }, [selectedProperty, onPropertyChange]) // Proper dependencies

  return (
    <Tooltip
      content="Controls all pricing functionality for selected property. Selection persists across pages."
      placement="bottom"
      delay={300}
    >
      <div className="property-selector-wrapper" data-testid="property-selector">
        <PropertySelection
          value={selectedProperty?.id || undefined}
          onChange={handlePropertyChange}
          placeholder="Select a property..."
          label="Property"
          helperText=""
          disabled={disabled}
          variant="standard"
          showGlobalTemplate={false}
        />
      </div>
    </Tooltip>
  )
}

export default PropertySelector