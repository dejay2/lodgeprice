/**
 * UnifiedPropertyControls module exports
 * Provides compound component and all sub-components
 */

export { default as UnifiedPropertyControls } from './UnifiedPropertyControls'
export { useUnifiedControlsContext } from './UnifiedPropertyControls'
export { default as PropertyControlsMain } from './PropertyControlsMain'
export { default as PropertySelector } from './PropertySelector'
export { default as PriceEditingSection } from './PriceEditingSection'
export { default as PricingTogglesIntegrated } from './PricingTogglesIntegrated'
export { default as QuickActionButtons } from './QuickActionButtons'

// Export types
export type {
  UnifiedPropertyControlsProps,
  PropertySelectorProps,
  InlinePriceEditorIntegratedProps,
  PriceEditingSectionProps,
  QuickActionButtonsProps,
  UnifiedControlsContextValue,
  PropertyControlsMainProps
} from './types'