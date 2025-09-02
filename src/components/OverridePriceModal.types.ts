/**
 * TypeScript interfaces for OverridePriceModal component
 * Follows the interface definitions from PRP-012
 */

import type { CalculateFinalPriceReturn } from '@/types/helpers'

/**
 * Price override data structure
 * Matches the database schema for price_overrides table
 */
export interface PriceOverride {
  id: string
  property_id: string
  override_date: string
  override_price: number
  reason?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Props for OverridePriceModal component
 * As specified in PRP-012 Interface Definitions
 */
export interface OverridePriceModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: string
  date: Date
  currentPrice: CalculateFinalPriceReturn
  existingOverride?: PriceOverride | null
  onOverrideSet?: (override: PriceOverride) => void
  onOverrideRemoved?: (date: string) => void
}

/**
 * Form data structure for the override price modal
 * Used with React Hook Form and Zod validation
 */
export interface OverridePriceFormData {
  overridePrice: number
  reason?: string
}

/**
 * Hook return type for useOverridePricing
 */
export interface UseOverridePricingReturn {
  isSubmitting: boolean
  error: string | null
  handleSubmit: (data: OverridePriceFormData) => Promise<void>
  handleRemoveOverride: () => Promise<void>
  clearError: () => void
}

/**
 * Error types for the override modal
 */
export type OverridePriceModalError = 
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR' 
  | 'DATABASE_ERROR'
  | 'PERMISSION_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * Modal state for internal component management
 */
export interface OverridePriceModalState {
  isSubmitting: boolean
  error: string | null
  errorType: OverridePriceModalError | null
  showRemoveConfirmation: boolean
}