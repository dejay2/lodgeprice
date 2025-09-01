/**
 * TypeScript type definitions for UnifiedPropertyControls component
 * Defines interfaces for all sub-components and shared state
 */

import type { Property } from '@/types/database'
import type { PropertySelectionProps } from '../PropertySelection/PropertySelection.types'
import type { InlinePriceEditorProps } from '../InlinePriceEditor'

/**
 * Main compound component interface
 * Provides all property management functions in unified interface
 */
export interface UnifiedPropertyControlsProps {
  className?: string
  onPropertyChange?: (property: Property | null) => void
  onPriceChange?: (type: 'base' | 'min', value: number) => void
  disabled?: boolean
  children?: React.ReactNode
}

/**
 * Property selector integration
 * Extends existing PropertySelection with unified control context
 */
export interface PropertySelectorProps extends Omit<PropertySelectionProps, 'onChange'> {
  integration: 'unified-controls'
  onSelectionChange: (propertyId: string | null, property?: Property) => void
}

/**
 * Inline price editor integration  
 * Adapted for property control context with type specification
 */
export interface InlinePriceEditorIntegratedProps extends Omit<InlinePriceEditorProps, 'value' | 'minPrice' | 'onSave'> {
  propertyId: string
  priceType: 'base_price_per_day' | 'min_price_per_day'
  onSaveComplete?: () => void
}

/**
 * Price display and editing section props
 */
export interface PriceEditingSectionProps {
  property: Property | null
  disabled?: boolean
  onPriceUpdate?: (type: 'base' | 'min', value: number) => void
}

/**
 * Quick action buttons props
 */
export interface QuickActionButtonsProps {
  property: Property | null
  disabled?: boolean
  className?: string
}

/**
 * Unified controls context value
 * Shared state between compound components
 */
export interface UnifiedControlsContextValue {
  selectedProperty: Property | null
  onPropertyChange: (property: Property | null) => void
  onPriceChange?: (type: 'base' | 'min', value: number) => void
  disabled: boolean
  editingPrice: 'base' | 'min' | null
  setEditingPrice: (type: 'base' | 'min' | null) => void
}

/**
 * Container component props
 */
export interface PropertyControlsMainProps {
  children: React.ReactNode
  className?: string
}