/**
 * UnifiedPropertyControls - Compound component for unified property management
 * Implements FR-1: Unified Control Component Architecture
 * Provides all property management functions in a single, cohesive interface
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Property } from '@/types/database'
import type { 
  UnifiedPropertyControlsProps, 
  UnifiedControlsContextValue 
} from './types'
import { usePricingContext } from '@/context/PricingContext'

// Import sub-components
import PropertyControlsMain from './PropertyControlsMain'
import PropertySelector from './PropertySelector'
import PriceEditingSection from './PriceEditingSection'
import PricingTogglesIntegrated from './PricingTogglesIntegrated'
import QuickActionButtons from './QuickActionButtons'

/**
 * Context for sharing state between compound components
 */
const UnifiedControlsContext = createContext<UnifiedControlsContextValue | undefined>(undefined)

/**
 * Hook to access unified controls context
 * Throws error if used outside provider
 */
export const useUnifiedControlsContext = () => {
  const context = useContext(UnifiedControlsContext)
  if (!context) {
    throw new Error('useUnifiedControlsContext must be used within UnifiedPropertyControls')
  }
  return context
}

/**
 * Main compound component that provides unified property controls
 * Uses compound pattern for flexible composition
 */
const UnifiedPropertyControls: React.FC<UnifiedPropertyControlsProps> & {
  Main: typeof PropertyControlsMain
  PropertySelector: typeof PropertySelector
  PriceEditor: typeof PriceEditingSection
  Toggles: typeof PricingTogglesIntegrated
  QuickActions: typeof QuickActionButtons
} = ({ 
  className = '',
  onPropertyChange: externalOnPropertyChange,
  onPriceChange,
  disabled = false,
  children
}) => {
  // Get the existing selected property from PricingContext to initialize state
  const { selectedProperty: contextProperty } = usePricingContext()
  
  // Local state for compound components - initialize with context value
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(contextProperty)
  const [editingPrice, setEditingPrice] = useState<'base' | 'min' | null>(null)

  /**
   * Handle property change with external callback
   */
  const handlePropertyChange = useCallback((property: Property | null) => {
    setSelectedProperty(property)
    setEditingPrice(null) // Reset editing state on property change
    if (externalOnPropertyChange) {
      externalOnPropertyChange(property)
    }
  }, [externalOnPropertyChange])

  /**
   * Handle price change with external callback
   */
  const handlePriceChange = useCallback((type: 'base' | 'min', value: number) => {
    if (onPriceChange) {
      onPriceChange(type, value)
    }
  }, [onPriceChange])

  // Create context value
  const contextValue: UnifiedControlsContextValue = {
    selectedProperty,
    onPropertyChange: handlePropertyChange,
    onPriceChange: handlePriceChange,
    disabled,
    editingPrice,
    setEditingPrice
  }

  return (
    <UnifiedControlsContext.Provider value={contextValue}>
      <div 
        className={`unified-property-controls ${className}`}
        data-testid="unified-property-controls"
      >
        {children || (
          // Default composition if no children provided
          <PropertyControlsMain>
            <div className="row g-3 align-items-start">
              <div className="col-lg-3 col-md-4">
                <PropertySelector />
              </div>
              <div className="col-lg-3 col-md-4">
                <PriceEditingSection property={selectedProperty} />
              </div>
              <div className="col-lg-3 col-md-4">
                <PricingTogglesIntegrated />
              </div>
              <div className="col-lg-3 col-md-12">
                <QuickActionButtons property={selectedProperty} />
              </div>
            </div>
          </PropertyControlsMain>
        )}
      </div>
    </UnifiedControlsContext.Provider>
  )
}

// Attach sub-components to main component for compound pattern
UnifiedPropertyControls.Main = PropertyControlsMain
UnifiedPropertyControls.PropertySelector = PropertySelector
UnifiedPropertyControls.PriceEditor = PriceEditingSection
UnifiedPropertyControls.Toggles = PricingTogglesIntegrated
UnifiedPropertyControls.QuickActions = QuickActionButtons

export default UnifiedPropertyControls