/**
 * PriceInput - Validated price input component
 * 
 * Features:
 * - Real-time price validation with Zod schema
 * - Currency formatting and normalization
 * - Debounced validation feedback
 * - Integration with React Hook Form
 * - Visual error states and messages
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Controller, Control, FieldError } from 'react-hook-form'
import { priceSchema, priceStringSchema, formatValidationError } from '../../lib/validation'
import { normalizePriceString, formatPriceForDisplay, debounce } from '../../utils/validationHelpers'

interface PriceInputProps {
  name: string
  control: Control<any>
  label?: string
  placeholder?: string
  currency?: string
  disabled?: boolean
  className?: string
  required?: boolean
  min?: number
  max?: number
  step?: number
  onBlur?: () => void
  onChange?: (value: number) => void
}

interface PriceInputState {
  displayValue: string
  isValid: boolean
  validationMessage: string
  isFocused: boolean
  hasBeenBlurred: boolean
}

/**
 * PriceInput Component
 * Provides validated price input with real-time feedback
 */
export const PriceInput: React.FC<PriceInputProps> = ({
  name,
  control,
  label,
  placeholder = "0.00",
  currency = "$",
  disabled = false,
  className = "",
  required = false,
  min = 0.01,
  max = 10000,
  step = 0.01,
  onBlur,
  onChange
}) => {
  // Component state for managing display value and validation
  const [inputState, setInputState] = useState<PriceInputState>({
    displayValue: '',
    isValid: true,
    validationMessage: '',
    isFocused: false,
    hasBeenBlurred: false
  })

  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce((value: string) => {
      const result = priceStringSchema.safeParse(value)
      
      setInputState(prev => ({
        ...prev,
        isValid: result.success,
        validationMessage: result.success ? '' : formatValidationError(result.error)[name] || 'Invalid price'
      }))
    }, 300),
    [name]
  )

  // Format value for display
  const formatValueForDisplay = useCallback((value: number | string): string => {
    if (typeof value === 'number') {
      return value.toFixed(2)
    }
    if (typeof value === 'string' && value !== '') {
      const normalized = normalizePriceString(value)
      return normalized === '0.00' ? '' : normalized
    }
    return ''
  }, [])

  // Handle input change with validation
  const handleInputChange = useCallback((
    value: string,
    fieldOnChange: (value: number) => void
  ) => {
    // Update display value immediately for responsive UI
    setInputState(prev => ({
      ...prev,
      displayValue: value,
    }))

    // Trigger debounced validation
    if (value.trim() !== '') {
      debouncedValidate(value)
    } else {
      setInputState(prev => ({
        ...prev,
        isValid: !required,
        validationMessage: required ? 'Price is required' : ''
      }))
    }

    // Parse and send numeric value to form
    const normalizedValue = normalizePriceString(value)
    const numericValue = parseFloat(normalizedValue)
    
    if (!isNaN(numericValue) && numericValue >= min && numericValue <= max) {
      fieldOnChange(numericValue)
      onChange?.(numericValue)
    }
  }, [debouncedValidate, required, min, max, onChange])

  // Handle input focus
  const handleFocus = useCallback(() => {
    setInputState(prev => ({
      ...prev,
      isFocused: true
    }))
  }, [])

  // Handle input blur with validation
  const handleBlur = useCallback((
    value: string,
    fieldOnBlur: () => void
  ) => {
    setInputState(prev => ({
      ...prev,
      isFocused: false,
      hasBeenBlurred: true
    }))

    // Format the value on blur
    if (value.trim() !== '') {
      const normalizedValue = normalizePriceString(value)
      const numericValue = parseFloat(normalizedValue)
      
      if (!isNaN(numericValue)) {
        setInputState(prev => ({
          ...prev,
          displayValue: formatValueForDisplay(numericValue)
        }))
      }
    }

    fieldOnBlur()
    onBlur?.()
  }, [formatValueForDisplay, onBlur])

  // Calculate CSS classes based on validation state
  const getInputClasses = useCallback((fieldError?: FieldError): string => {
    const baseClasses = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors"
    const validClasses = "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
    const errorClasses = "border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50"
    const disabledClasses = "bg-gray-100 cursor-not-allowed"
    
    let classes = baseClasses
    
    if (disabled) {
      classes += ` ${disabledClasses}`
    } else if (fieldError || (!inputState.isValid && inputState.hasBeenBlurred)) {
      classes += ` ${errorClasses}`
    } else {
      classes += ` ${validClasses}`
    }
    
    return `${classes} ${className}`.trim()
  }, [inputState.isValid, inputState.hasBeenBlurred, disabled, className])

  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? 'Price is required' : false,
        min: { value: min, message: `Price must be at least ${formatPriceForDisplay(min, currency)}` },
        max: { value: max, message: `Price cannot exceed ${formatPriceForDisplay(max, currency)}` },
        validate: (value: number) => {
          const result = priceSchema.safeParse(value)
          if (!result.success) {
            const errors = formatValidationError(result.error)
            return Object.values(errors)[0] || 'Invalid price'
          }
          return true
        }
      }}
      render={({ field: { onChange: fieldOnChange, onBlur: fieldOnBlur, value }, fieldState: { error } }) => {
        // Initialize display value from field value
        useEffect(() => {
          if (value !== undefined && value !== null) {
            setInputState(prev => ({
              ...prev,
              displayValue: formatValueForDisplay(value)
            }))
          }
        }, [value, formatValueForDisplay])

        // Determine error message priority: field error > validation message
        const errorMessage = error?.message || 
          (!inputState.isValid && inputState.hasBeenBlurred ? inputState.validationMessage : '')

        return (
          <div className="space-y-1">
            {label && (
              <label 
                htmlFor={name} 
                className={`block text-sm font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}
              >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            
            <div className="relative">
              {/* Currency symbol */}
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className={`text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
                  {currency}
                </span>
              </div>
              
              {/* Price input */}
              <input
                id={name}
                type="text"
                inputMode="decimal"
                placeholder={placeholder}
                disabled={disabled}
                value={inputState.displayValue}
                onChange={(e) => handleInputChange(e.target.value, fieldOnChange)}
                onFocus={handleFocus}
                onBlur={() => handleBlur(inputState.displayValue, fieldOnBlur)}
                className={`pl-8 ${getInputClasses(error)}`}
                aria-invalid={!!error}
                aria-describedby={errorMessage ? `${name}-error` : undefined}
              />
              
              {/* Validation indicator */}
              {!disabled && inputState.hasBeenBlurred && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {inputState.isValid && !error ? (
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (error || !inputState.isValid) ? (
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : null}
                </div>
              )}
            </div>
            
            {/* Error message */}
            {errorMessage && (
              <p 
                id={`${name}-error`}
                className="text-sm text-red-600 flex items-center"
                role="alert"
              >
                <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {errorMessage}
              </p>
            )}
          </div>
        )
      }}
    />
  )
}

export default PriceInput