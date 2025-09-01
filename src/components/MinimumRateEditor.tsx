/**
 * MinimumRateEditor Component
 * 
 * Provides inline editing capability for minimum prices with base price constraint validation
 * Implements requirements from PRP-49 for minimum rate editing within unified property controls
 */

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'

/**
 * Props for the MinimumRateEditor component
 */
export interface MinimumRateEditorProps {
  value: number                      // Current min_price_per_day
  maxPrice: number                   // base_price_per_day for constraint enforcement
  onSave: (newMinRate: number) => Promise<void>
  onCancel: () => void
  onValidationError?: (error: string) => void
  className?: string
  autoFocus?: boolean
  dataTestId?: string
}

/**
 * Validation state for minimum rate
 */
interface MinRateValidationState {
  isValid: boolean
  errorMessage: string | null
  maxPrice: number                   // From property.base_price_per_day
  minAllowed: number                 // Minimum positive value (0.01)
}

/**
 * MinimumRateEditor Component
 * 
 * Features:
 * - Real-time validation against base price constraint (min <= base)
 * - Keyboard navigation (Enter to save, Escape to cancel)
 * - Automatic focus and selection of current value
 * - Client-side constraint validation with specific error messages
 * - Accessibility support with ARIA attributes
 */
const MinimumRateEditor: React.FC<MinimumRateEditorProps> = ({
  value,
  maxPrice,
  onSave,
  onCancel,
  onValidationError,
  className = '',
  autoFocus = true,
  dataTestId = 'minimum-rate-input'
}) => {
  const [inputValue, setInputValue] = useState(value.toString())
  const [validation, setValidation] = useState<MinRateValidationState>({
    isValid: true,
    errorMessage: null,
    maxPrice,
    minAllowed: 0.01
  })
  const [isSaving, setIsSaving] = useState(false)
  const [recentlySaved, setRecentlySaved] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus and select the input value on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [autoFocus])

  // Handle success state timeout
  useEffect(() => {
    if (recentlySaved) {
      const timeout = setTimeout(() => setRecentlySaved(false), 2000)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [recentlySaved])

  /**
   * Validate minimum rate against constraints
   * CRITICAL: Ensures min_price_per_day <= base_price_per_day
   * 
   * @param rateString - Input value as string
   * @returns Validation state with specific error messages
   */
  const validateMinRate = (rateString: string): MinRateValidationState => {
    const trimmed = rateString.trim()
    
    // Check for empty input
    if (!trimmed) {
      return {
        isValid: false,
        errorMessage: 'Minimum rate is required',
        maxPrice,
        minAllowed: 0.01
      }
    }

    // Parse numeric value
    const numericRate = parseFloat(trimmed)
    
    // Check for invalid number
    if (isNaN(numericRate)) {
      return {
        isValid: false,
        errorMessage: 'Minimum rate must be a valid number',
        maxPrice,
        minAllowed: 0.01
      }
    }
    
    // Check for negative or zero values
    if (numericRate <= 0) {
      return {
        isValid: false,
        errorMessage: 'Minimum rate must be a positive number',
        maxPrice,
        minAllowed: 0.01
      }
    }
    
    // CRITICAL CONSTRAINT: Check against base price (FR-3)
    // min_price_per_day must not exceed base_price_per_day
    if (numericRate > maxPrice) {
      return {
        isValid: false,
        errorMessage: `Minimum rate cannot exceed base rate of €${maxPrice.toFixed(2)}`,
        maxPrice,
        minAllowed: 0.01
      }
    }

    // Check for excessive decimal places (database stores 2 decimal places)
    const decimalPlaces = (trimmed.split('.')[1] || '').length
    if (decimalPlaces > 2) {
      return {
        isValid: false,
        errorMessage: 'Minimum rate can have at most 2 decimal places',
        maxPrice,
        minAllowed: 0.01
      }
    }

    return {
      isValid: true,
      errorMessage: null,
      maxPrice,
      minAllowed: 0.01
    }
  }

  /**
   * Handle input value changes with real-time validation
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Perform real-time validation
    const validationResult = validateMinRate(newValue)
    setValidation(validationResult)
    
    // Report validation errors to parent component if callback provided
    if (!validationResult.isValid && onValidationError) {
      onValidationError(validationResult.errorMessage || 'Invalid minimum rate')
    }
  }

  /**
   * Handle save operation with constraint validation
   * Implements FR-4: Save operation with database update
   */
  const handleSave = async () => {
    const validationResult = validateMinRate(inputValue)
    
    if (!validationResult.isValid) {
      setValidation(validationResult)
      if (onValidationError) {
        onValidationError(validationResult.errorMessage || 'Invalid minimum rate')
      }
      return
    }

    const numericRate = parseFloat(inputValue)
    
    // Don't save if value hasn't changed
    if (numericRate === value) {
      onCancel()
      return
    }

    try {
      setIsSaving(true)
      await onSave(numericRate)
      
      // Show success state briefly
      setRecentlySaved(true)
    } catch (error) {
      // onSave should handle its own errors, but catch any unexpected ones
      console.error('Unexpected error in minimum rate save:', error)
      if (onValidationError) {
        if (error instanceof Error && error.message.includes('exceed base')) {
          onValidationError(`Minimum rate cannot exceed base rate of €${maxPrice.toFixed(2)}`)
        } else {
          onValidationError('Failed to save minimum rate. Please try again.')
        }
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
      const validationResult = validateMinRate(inputValue)
      if (validationResult.isValid && parseFloat(inputValue) !== value) {
        handleSave()
      } else {
        onCancel()
      }
    }
  }

  return (
    <div className={`minimum-rate-editor ${className} ${recentlySaved ? 'success' : ''}`}>
      <input
        ref={inputRef}
        type="number"
        min="0.01"
        max={maxPrice}
        step="0.01"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={isSaving}
        className={`minimum-rate-input ${!validation.isValid ? 'error' : ''} ${isSaving ? 'saving' : ''}`}
        data-testid={dataTestId}
        aria-label={`Edit minimum rate (maximum €${maxPrice.toFixed(2)})`}
        aria-describedby={!validation.isValid ? 'min-rate-error' : undefined}
        aria-invalid={!validation.isValid}
      />
      
      {/* Error message display with ARIA support */}
      {!validation.isValid && validation.errorMessage && (
        <div 
          id="min-rate-error"
          className="error-message"
          data-testid="minimum-rate-error"
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
          data-testid="minimum-rate-saving"
          aria-live="polite"
        >
          Saving...
        </div>
      )}
      
      {/* Success indicator (FR-7) */}
      {recentlySaved && !isSaving && (
        <div 
          className="success-indicator"
          data-testid="minimum-rate-success"
          aria-live="polite"
        >
          ✓ Saved
        </div>
      )}
    </div>
  )
}

export default MinimumRateEditor