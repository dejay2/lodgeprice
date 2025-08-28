/**
 * useInlineEditing Hook
 * 
 * Custom React hook for managing inline price editing state and operations
 * Implements single edit mode enforcement and optimistic updates as per PRP-11
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import BasePriceService, { BasePriceError } from '@/services/base-price.service'
// import type { Database } from '@/types/database.generated'

// type PropertiesRow = Database['public']['Tables']['properties']['Row']

/**
 * State for individual editing operations
 */
interface EditingState {
  date: Date
  propertyId: string
  originalPrice: number
  isLoading: boolean
  error: string | null
}

/**
 * Property information needed for inline editing
 */
interface PropertyEditInfo {
  id: string
  lodgify_property_id: string
  property_name: string
  base_price_per_day: number
  min_price_per_day: number
}

/**
 * Configuration for the inline editing hook
 */
interface InlineEditingConfig {
  propertyId: string
  onPriceChanged?: (propertyId: string, newPrice: number) => void
  onValidationError?: (error: string) => void
  onEditingStateChange?: (isEditing: boolean, date?: Date) => void
}

/**
 * Return type for the useInlineEditing hook
 */
interface UseInlineEditingReturn {
  // Current editing state
  editingDate: Date | null
  isEditing: boolean
  editingError: string | null
  isLoading: boolean
  
  // Property information
  propertyInfo: PropertyEditInfo | null
  isLoadingProperty: boolean
  propertyError: string | null
  
  // Actions
  startEdit: (date: Date) => void
  cancelEdit: () => void
  savePrice: (propertyId: string, newBasePrice: number) => Promise<void>
  clearError: () => void
  
  // Validation
  validatePrice: (price: number) => Promise<{ valid: boolean; error?: string }>
}

/**
 * Custom hook for managing inline price editing functionality
 * 
 * Features:
 * - Single edit mode enforcement (FR-8)
 * - Property information loading and caching
 * - Optimistic updates with rollback on failure
 * - Comprehensive error handling with retry logic
 * - Integration with pricing recalculation pipeline
 */
export function useInlineEditing({
  propertyId,
  onPriceChanged,
  onValidationError,
  onEditingStateChange
}: InlineEditingConfig): UseInlineEditingReturn {
  // Core editing state
  const [editingState, setEditingState] = useState<EditingState | null>(null)
  
  // Property information state
  const [propertyInfo, setPropertyInfo] = useState<PropertyEditInfo | null>(null)
  const [isLoadingProperty, setIsLoadingProperty] = useState(false)
  const [propertyError, setPropertyError] = useState<string | null>(null)
  
  // Track current property ID to reload info when it changes
  const currentPropertyIdRef = useRef<string>('')
  
  /**
   * Load property information for validation and constraints
   */
  const loadPropertyInfo = useCallback(async (propId: string) => {
    if (!propId) return
    
    setIsLoadingProperty(true)
    setPropertyError(null)
    
    try {
      const property = await BasePriceService.getPropertyInfo(propId)
      
      setPropertyInfo({
        id: property.id,
        lodgify_property_id: property.lodgify_property_id,
        property_name: property.property_name,
        base_price_per_day: property.base_price_per_day,
        min_price_per_day: property.min_price_per_day
      })
    } catch (error) {
      console.error('Failed to load property info:', error)
      const errorMessage = error instanceof BasePriceError 
        ? error.message 
        : 'Failed to load property information'
      setPropertyError(errorMessage)
      
      if (onValidationError) {
        onValidationError(errorMessage)
      }
    } finally {
      setIsLoadingProperty(false)
    }
  }, [onValidationError])
  
  /**
   * Load property info when propertyId changes
   */
  useEffect(() => {
    if (propertyId && propertyId !== currentPropertyIdRef.current) {
      currentPropertyIdRef.current = propertyId
      loadPropertyInfo(propertyId)
    }
  }, [propertyId, loadPropertyInfo])
  
  /**
   * Start inline editing for a specific date (FR-8: Single edit mode)
   */
  const startEdit = useCallback((date: Date) => {
    if (!propertyInfo) {
      console.warn('Cannot start editing: property info not loaded')
      return
    }
    
    // Cancel any existing edit first (single edit mode enforcement)
    if (editingState) {
      setEditingState(null)
      if (onEditingStateChange) {
        onEditingStateChange(false, editingState.date)
      }
    }
    
    // Start new edit
    const newEditingState: EditingState = {
      date,
      propertyId: propertyInfo.lodgify_property_id,
      originalPrice: propertyInfo.base_price_per_day,
      isLoading: false,
      error: null
    }
    
    setEditingState(newEditingState)
    
    if (onEditingStateChange) {
      onEditingStateChange(true, date)
    }
  }, [propertyInfo, editingState, onEditingStateChange])
  
  /**
   * Cancel current editing operation (FR-5)
   */
  const cancelEdit = useCallback(() => {
    const currentDate = editingState?.date
    setEditingState(null)
    
    if (onEditingStateChange && currentDate) {
      onEditingStateChange(false, currentDate)
    }
  }, [editingState, onEditingStateChange])
  
  /**
   * Save new base price with optimistic updates (FR-4)
   */
  const savePrice = useCallback(async (propId: string, newBasePrice: number) => {
    if (!editingState || editingState.propertyId !== propId) {
      throw new Error('No active editing session for this property')
    }
    
    // Update loading state
    setEditingState(prev => prev ? { ...prev, isLoading: true, error: null } : null)
    
    try {
      // Perform database update with retry logic
      const result = await BasePriceService.updateBasePrice(propId, newBasePrice)
      
      if (!result.success) {
        throw new Error('Update operation reported failure')
      }
      
      // Update cached property info with new price
      setPropertyInfo(prev => prev ? {
        ...prev,
        base_price_per_day: result.newPrice
      } : null)
      
      // Clear editing state on success
      const editDate = editingState.date
      setEditingState(null)
      
      // Notify parent about the price change (triggers recalculation)
      if (onPriceChanged) {
        onPriceChanged(propId, result.newPrice)
      }
      
      if (onEditingStateChange) {
        onEditingStateChange(false, editDate)
      }
      
    } catch (error) {
      console.error('Failed to save base price:', error)
      
      let errorMessage: string
      if (error instanceof BasePriceError) {
        errorMessage = error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      } else {
        errorMessage = 'Failed to save price'
      }
      
      // Update editing state with error
      setEditingState(prev => prev ? {
        ...prev,
        isLoading: false,
        error: errorMessage
      } : null)
      
      if (onValidationError) {
        onValidationError(errorMessage)
      }
      
      // Re-throw for component-level handling
      throw error
    }
  }, [editingState, onPriceChanged, onValidationError, onEditingStateChange])
  
  /**
   * Clear current error state
   */
  const clearError = useCallback(() => {
    setEditingState(prev => prev ? { ...prev, error: null } : null)
    setPropertyError(null)
  }, [])
  
  /**
   * Validate price against property constraints
   */
  const validatePrice = useCallback(async (price: number) => {
    if (!propertyInfo) {
      return { valid: false, error: 'Property information not available' }
    }
    
    return BasePriceService.validatePrice(propertyInfo.id, price)
  }, [propertyInfo])
  
  // Cleanup editing state when component unmounts or property changes
  useEffect(() => {
    return () => {
      if (editingState && onEditingStateChange) {
        onEditingStateChange(false, editingState.date)
      }
    }
  }, []) // Only run on unmount
  
  return {
    // Current editing state
    editingDate: editingState?.date || null,
    isEditing: Boolean(editingState),
    editingError: editingState?.error || null,
    isLoading: editingState?.isLoading || false,
    
    // Property information
    propertyInfo,
    isLoadingProperty,
    propertyError,
    
    // Actions
    startEdit,
    cancelEdit,
    savePrice,
    clearError,
    validatePrice
  }
}

export default useInlineEditing