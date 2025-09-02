/**
 * useOverridePricing Hook
 * 
 * Custom hook for managing price override operations in the OverridePriceModal
 * Provides state management, API integration, and error handling
 * 
 * Features:
 * - Form submission handling with validation
 * - Override removal with confirmation
 * - Error state management with recovery
 * - Loading states for UI feedback
 */

import { useState, useCallback } from 'react'
import { PriceOverrideService } from '@/services/price-override.service'
import type { 
  UseOverridePricingReturn, 
  OverridePriceFormData,
  PriceOverride,
  OverridePriceModalError
} from '@/components/OverridePriceModal.types'

/**
 * Hook parameters
 */
interface UseOverridePricingParams {
  propertyId: string
  date: Date
  existingOverride?: PriceOverride | null
  onOverrideSet?: (override: PriceOverride) => void
  onOverrideRemoved?: (date: string) => void
  onClose?: () => void
}

/**
 * Custom hook for price override operations
 * Encapsulates all business logic for the modal
 */
export function useOverridePricing({
  propertyId,
  date,
  existingOverride,
  onOverrideSet,
  onOverrideRemoved,
  onClose
}: UseOverridePricingParams): UseOverridePricingReturn {
  // Internal state management
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [_errorType, setErrorType] = useState<OverridePriceModalError | null>(null)

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
    setErrorType(null)
  }, [])

  /**
   * Handle API errors with user-friendly messages
   */
  const handleApiError = useCallback((error: unknown, operation: string) => {
    console.error(`Price override ${operation} failed:`, error)
    
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      
      // Network errors
      if (message.includes('network') || message.includes('connection')) {
        setError('Connection error, please try again')
        setErrorType('NETWORK_ERROR')
        return
      }
      
      // Validation errors
      if (message.includes('validation') || message.includes('invalid')) {
        setError(error.message)
        setErrorType('VALIDATION_ERROR')
        return
      }
      
      // Permission errors
      if (message.includes('permission') || message.includes('unauthorized')) {
        setError('You don\'t have permission to set price overrides')
        setErrorType('PERMISSION_ERROR')
        return
      }
      
      // Database constraint errors
      if (message.includes('constraint') || message.includes('duplicate')) {
        setError('Price override already exists for this date')
        setErrorType('DATABASE_ERROR')
        return
      }
      
      // Generic error with message
      setError(error.message)
      setErrorType('DATABASE_ERROR')
    } else {
      // Unknown error
      setError(`Failed to ${operation} price override`)
      setErrorType('UNKNOWN_ERROR')
    }
  }, [])

  /**
   * Handle form submission for setting override price
   */
  const handleSubmit = useCallback(async (data: OverridePriceFormData) => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    clearError()
    
    try {
      // Validate inputs
      if (!propertyId || !date) {
        throw new Error('Missing required parameters')
      }
      
      if (data.overridePrice <= 0) {
        throw new Error('Override price must be greater than zero')
      }
      
      if (data.overridePrice > 10000) {
        throw new Error('Override price cannot exceed €10,000')
      }
      
      // Format date for API
      const dateString = date.toISOString().split('T')[0]
      
      // Call price override service
      const result = await PriceOverrideService.setOverride(
        propertyId,
        dateString,
        data.overridePrice,
        data.reason || undefined
      )
      
      if (!result.success || !result.override) {
        throw new Error('Failed to set price override')
      }
      
      // Notify parent component of success
      onOverrideSet?.(result.override)
      
      // Close modal on success
      onClose?.()
      
    } catch (error) {
      handleApiError(error, 'set')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting, 
    propertyId, 
    date, 
    onOverrideSet, 
    onClose, 
    clearError, 
    handleApiError
  ])

  /**
   * Handle removing existing override
   */
  const handleRemoveOverride = useCallback(async () => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    clearError()
    
    try {
      // Validate inputs
      if (!propertyId || !date) {
        throw new Error('Missing required parameters')
      }
      
      if (!existingOverride) {
        throw new Error('No existing override to remove')
      }
      
      // Format date for API
      const dateString = date.toISOString().split('T')[0]
      
      // Call price override service to remove
      const result = await PriceOverrideService.removeOverride(
        propertyId,
        dateString
      )
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove price override')
      }
      
      // Notify parent component of removal
      onOverrideRemoved?.(dateString)
      
      // Close modal on success
      onClose?.()
      
    } catch (error) {
      handleApiError(error, 'remove')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    propertyId,
    date,
    existingOverride,
    onOverrideRemoved,
    onClose,
    clearError,
    handleApiError
  ])

  return {
    isSubmitting,
    error,
    handleSubmit,
    handleRemoveOverride,
    clearError
  }
}

export default useOverridePricing