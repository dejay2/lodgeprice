/**
 * InlinePriceEditor Component
 * 
 * Provides inline editing capability for base prices with validation and keyboard support
 * Implements optimistic UI updates as specified in PRP-11
 * Enhanced for preview mode functionality (PRP-14)
 */

import React, { useState, useRef, useEffect, KeyboardEvent, useContext } from 'react'
import { PricingPreviewContext } from '@/context/PricingPreviewContext'

// Types for the inline price editor
export interface InlinePriceEditorProps {
  value: number
  minPrice: number
  onSave: (newPrice: number) => Promise<void>
  onCancel: () => void
  onValidationError?: (error: string) => void
  className?: string
  autoFocus?: boolean
  date?: Date  // Added for preview mode tracking
  propertyId?: string  // Added for preview mode tracking
}

interface ValidationState {
  isValid: boolean
  errorMessage: string | null
}

/**
 * InlinePriceEditor Component
 * 
 * Features:
 * - Real-time validation against minimum price constraints
 * - Keyboard navigation (Enter to save, Escape to cancel)
 * - Automatic focus and selection of current value
 * - Client-side validation with specific error messages
 */
const InlinePriceEditor: React.FC<InlinePriceEditorProps> = ({
  value,
  minPrice,
  onSave,
  onCancel,
  onValidationError,
  className = '',
  autoFocus = true,
  date,
  propertyId
}) => {
  const [inputValue, setInputValue] = useState(value.toString())
  const [validation, setValidation] = useState<ValidationState>({
    isValid: true,
    errorMessage: null
  })
  const [isSaving, setIsSaving] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Access preview context if available
  const previewContext = useContext(PricingPreviewContext)

  // Auto-focus and select the input value on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [autoFocus])

  /**
   * Validate price input against constraints
   * Provides specific error messages as per PRP requirements
   */
  const validatePrice = (priceString: string): ValidationState => {
    const trimmed = priceString.trim()
    
    // Check for empty input
    if (!trimmed) {
      return {
        isValid: false,
        errorMessage: 'Price is required'
      }
    }

    // Parse numeric value
    const numericPrice = parseFloat(trimmed)
    
    // Check for invalid number
    if (isNaN(numericPrice)) {
      return {
        isValid: false,
        errorMessage: 'Price must be a valid number'
      }
    }
    
    // Check for negative or zero values
    if (numericPrice <= 0) {
      return {
        isValid: false,
        errorMessage: 'Price must be a positive number'
      }
    }
    
    // Check against minimum price constraint (FR-3)
    if (numericPrice < minPrice) {
      return {
        isValid: false,
        errorMessage: `Price must be at least €${minPrice.toFixed(2)}`
      }
    }

    // Check for excessive decimal places (database stores 2 decimal places)
    const decimalPlaces = (trimmed.split('.')[1] || '').length
    if (decimalPlaces > 2) {
      return {
        isValid: false,
        errorMessage: 'Price can have at most 2 decimal places'
      }
    }

    return {
      isValid: true,
      errorMessage: null
    }
  }

  /**
   * Handle input value changes with real-time validation
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Perform real-time validation
    const validationResult = validatePrice(newValue)
    setValidation(validationResult)
    
    // Report validation errors to parent component if callback provided
    if (!validationResult.isValid && onValidationError) {
      onValidationError(validationResult.errorMessage || 'Invalid price')
    }
  }

  /**
   * Handle save operation with validation check
   * Enhanced for preview mode (PRP-14)
   */
  const handleSave = async () => {
    const validationResult = validatePrice(inputValue)
    
    if (!validationResult.isValid) {
      setValidation(validationResult)
      if (onValidationError) {
        onValidationError(validationResult.errorMessage || 'Invalid price')
      }
      return
    }

    const numericPrice = parseFloat(inputValue)
    
    // Don't save if value hasn't changed
    if (numericPrice === value) {
      onCancel()
      return
    }

    // Check if we're in preview mode
    if (previewContext?.isPreviewMode && date && propertyId) {
      // In preview mode, add change to preview context instead of saving to database
      previewContext.addPricingChange({
        type: 'basePrice',
        propertyId,
        date,
        oldValue: value,
        newValue: numericPrice,
        description: `Base price change for ${date.toLocaleDateString()}`
      })
      // Call onSave without actually saving to database
      onCancel() // Close the editor
      return
    }

    // Normal save operation (not in preview mode)
    try {
      setIsSaving(true)
      await onSave(numericPrice)
    } catch (error) {
      // onSave should handle its own errors, but catch any unexpected ones
      console.error('Unexpected error in price save:', error)
      if (onValidationError) {
        onValidationError('Failed to save price. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Handle keyboard events (FR-5: Enter to save, Escape to cancel)
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  /**
   * Handle blur event - save if valid, cancel if invalid
   * This provides intuitive behavior where clicking away saves valid changes
   */
  const handleBlur = () => {
    if (!isSaving) {
      const validationResult = validatePrice(inputValue)
      if (validationResult.isValid && parseFloat(inputValue) !== value) {
        handleSave()
      } else {
        onCancel()
      }
    }
  }

  return (
    <div className={`inline-price-editor ${className}`}>
      <input
        ref={inputRef}
        type="number"
        min={minPrice}
        step="0.01"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={isSaving}
        className={`inline-price-input ${!validation.isValid ? 'error' : ''} ${isSaving ? 'saving' : ''}`}
        data-testid="inline-price-input"
        aria-label={`Edit price (minimum €${minPrice.toFixed(2)})`}
        aria-describedby={!validation.isValid ? 'price-error' : undefined}
      />
      
      {/* Error message display */}
      {!validation.isValid && validation.errorMessage && (
        <div 
          id="price-error"
          className="price-error-message"
          data-testid="price-error-message"
          role="alert"
          aria-live="polite"
        >
          {validation.errorMessage}
        </div>
      )}
      
      {/* Saving indicator */}
      {isSaving && (
        <div 
          className="saving-indicator"
          data-testid="saving-indicator"
          aria-live="polite"
        >
          Saving...
        </div>
      )}
    </div>
  )
}

export default InlinePriceEditor