/**
 * DateInput - Validated date input component
 * 
 * Features:
 * - Date validation with Zod schema (YYYY-MM-DD format)
 * - Business date range validation (not too far past/future)
 * - Calendar date validation (February 30th, etc.)
 * - Integration with React Hook Form
 * - Visual error states and accessibility
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Controller, Control, FieldError } from 'react-hook-form'
import { dateSchema, formatValidationError } from '../../lib/validation'
import { 
  isValidDateFormat, 
  isValidCalendarDate, 
  isDateInBusinessRange, 
  getTodayDateString,
  debounce 
} from '../../utils/validationHelpers'

interface DateInputProps {
  name: string
  control: Control<Record<string, unknown>>
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
  minDate?: string
  maxDate?: string
  onBlur?: () => void
  onChange?: (value: string) => void
}

interface DateInputState {
  displayValue: string
  isValid: boolean
  validationMessage: string
  isFocused: boolean
  hasBeenBlurred: boolean
}

/**
 * DateInput Component
 * Provides validated date input with real-time feedback
 */
export const DateInput: React.FC<DateInputProps> = ({
  name,
  control,
  label,
  placeholder = "YYYY-MM-DD",
  disabled = false,
  className = "",
  required = false,
  minDate,
  maxDate,
  onBlur,
  onChange
}) => {
  // Component state for managing display value and validation
  const [inputState, setInputState] = useState<DateInputState>({
    displayValue: '',
    isValid: true,
    validationMessage: '',
    isFocused: false,
    hasBeenBlurred: false
  })

  // Initialize display value from field value when component mounts
  useEffect(() => {
    // Skip initialization as Control doesn't have getValues
    // Field value will be provided through Controller's render prop
  }, [])

  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce((value: string) => {
      if (value.trim() === '') {
        setInputState(prev => ({
          ...prev,
          isValid: !required,
          validationMessage: required ? 'Date is required' : ''
        }))
        return
      }

      // Validate with Zod schema
      const result = dateSchema.safeParse(value)
      
      if (!result.success) {
        const errors = formatValidationError(result.error)
        setInputState(prev => ({
          ...prev,
          isValid: false,
          validationMessage: errors[name] || Object.values(errors)[0] || 'Invalid date'
        }))
        return
      }

      // Additional business logic validation
      let validationMessage = ''
      
      if (!isValidDateFormat(value)) {
        validationMessage = 'Please enter date as YYYY-MM-DD (e.g., 2024-12-31)'
      } else if (!isValidCalendarDate(value)) {
        validationMessage = 'Please enter a valid date (e.g., February cannot have 30 days)'
      } else if (!isDateInBusinessRange(value)) {
        validationMessage = 'Date must be within reasonable business range'
      } else if (minDate && value < minDate) {
        validationMessage = `Date cannot be earlier than ${minDate}`
      } else if (maxDate && value > maxDate) {
        validationMessage = `Date cannot be later than ${maxDate}`
      }

      setInputState(prev => ({
        ...prev,
        isValid: validationMessage === '',
        validationMessage
      }))
    }, 300),
    [name, required, minDate, maxDate]
  )

  // Handle input change with validation
  const handleInputChange = useCallback((
    value: string,
    fieldOnChange: (value: string) => void
  ) => {
    // Update display value immediately for responsive UI
    setInputState(prev => ({
      ...prev,
      displayValue: value
    }))

    // Trigger debounced validation
    debouncedValidate(value)

    // Send value to form
    fieldOnChange(value)
    onChange?.(value)
  }, [debouncedValidate, onChange])

  // Handle input focus
  const handleFocus = useCallback(() => {
    setInputState(prev => ({
      ...prev,
      isFocused: true
    }))
  }, [])

  // Handle input blur
  const handleBlur = useCallback((
    fieldOnBlur: () => void
  ) => {
    setInputState(prev => ({
      ...prev,
      isFocused: false,
      hasBeenBlurred: true
    }))

    fieldOnBlur()
    onBlur?.()
  }, [onBlur])

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

  // Get today's date for min/max fallbacks
  const todayString = getTodayDateString()

  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? 'Date is required' : false,
        validate: (value: unknown) => {
          const strValue = String(value || '');
          if (!strValue && !required) return true
          
          const result = dateSchema.safeParse(strValue)
          if (!result.success) {
            const errors = formatValidationError(result.error)
            return Object.values(errors)[0] || 'Invalid date'
          }
          
          if (!isValidCalendarDate(strValue)) {
            return 'Please enter a valid calendar date'
          }
          
          if (minDate && strValue < minDate) {
            return `Date cannot be earlier than ${minDate}`
          }
          
          if (maxDate && strValue > maxDate) {
            return `Date cannot be later than ${maxDate}`
          }
          
          return true
        }
      }}
      render={({ field: { onChange: fieldOnChange, onBlur: fieldOnBlur, value }, fieldState: { error } }) => {

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
              {/* Date input */}
              <input
                id={name}
                type="date"
                placeholder={placeholder}
                disabled={disabled}
                min={minDate || undefined}
                max={maxDate || undefined}
                value={inputState.displayValue}
                onChange={(e) => handleInputChange(e.target.value, fieldOnChange)}
                onFocus={handleFocus}
                onBlur={() => handleBlur(fieldOnBlur)}
                className={getInputClasses(error)}
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
            
            {/* Helper text */}
            {!errorMessage && !disabled && (
              <p className="text-xs text-gray-500">
                Format: YYYY-MM-DD (e.g., {todayString})
              </p>
            )}
          </div>
        )
      }}
    />
  )
}

export default DateInput