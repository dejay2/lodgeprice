/**
 * SafeTextInput - XSS-safe text input component
 * 
 * Features:
 * - Automatic XSS prevention using DOMPurify
 * - Real-time sanitization feedback
 * - Text length and character validation
 * - Integration with React Hook Form
 * - Visual indicators for sanitization actions
 * - Support for multiline text areas
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Controller, Control, FieldError } from 'react-hook-form'
import { safeTextSchema, propertyNameSchema, formatValidationError } from '../../lib/validation'
import { 
  sanitizeText, 
  sanitizeTextStrict, 
  SanitizedTextInput as SanitizationResult 
} from '../../lib/sanitization'
import { 
  containsPotentialXSS, 
  isTextLengthValid, 
  debounce 
} from '../../utils/validationHelpers'

interface SafeTextInputProps {
  name: string
  control: Control<any>
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
  multiline?: boolean
  rows?: number
  minLength?: number
  maxLength?: number
  strict?: boolean // Use strict sanitization mode
  showSanitizationWarnings?: boolean
  validationType?: 'safeText' | 'propertyName'
  onBlur?: () => void
  onChange?: (value: string) => void
}

interface SafeTextState {
  displayValue: string
  sanitizedValue: string
  isValid: boolean
  validationMessage: string
  sanitizationWarnings: string[]
  hasXSS: boolean
  isFocused: boolean
  hasBeenBlurred: boolean
}

/**
 * SafeTextInput Component
 * Provides XSS-safe text input with real-time sanitization
 */
export const SafeTextInput: React.FC<SafeTextInputProps> = ({
  name,
  control,
  label,
  placeholder = "",
  disabled = false,
  className = "",
  required = false,
  multiline = false,
  rows = 3,
  minLength = 1,
  maxLength = 200,
  strict = false,
  showSanitizationWarnings = true,
  validationType = 'safeText',
  onBlur,
  onChange
}) => {
  // Component state for managing sanitization and validation
  const [inputState, setInputState] = useState<SafeTextState>({
    displayValue: '',
    sanitizedValue: '',
    isValid: true,
    validationMessage: '',
    sanitizationWarnings: [],
    hasXSS: false,
    isFocused: false,
    hasBeenBlurred: false
  })

  // Get appropriate validation schema
  const getValidationSchema = useCallback(() => {
    switch (validationType) {
      case 'propertyName':
        return propertyNameSchema
      case 'safeText':
      default:
        return safeTextSchema.min(minLength).max(maxLength)
    }
  }, [validationType, minLength, maxLength])

  // Debounced validation and sanitization function
  const debouncedValidateAndSanitize = useCallback(
    debounce((value: string) => {
      if (value.trim() === '') {
        setInputState(prev => ({
          ...prev,
          sanitizedValue: '',
          isValid: !required,
          validationMessage: required ? 'This field is required' : '',
          sanitizationWarnings: [],
          hasXSS: false
        }))
        return
      }

      // Sanitize the input
      const sanitizeFn = strict ? sanitizeTextStrict : sanitizeText
      const sanitizationResult: SanitizationResult = sanitizeFn(value)
      
      // Validate the sanitized value
      const validationSchema = getValidationSchema()
      const validationResult = validationSchema.safeParse(sanitizationResult.sanitized)
      
      // Create sanitization warnings
      const warnings: string[] = []
      if (sanitizationResult.hasXSS) {
        warnings.push('Input contained potentially unsafe content and has been cleaned')
      }
      if (sanitizationResult.modificationsMade && !sanitizationResult.hasXSS) {
        warnings.push('Input was modified for safety')
      }
      if (sanitizationResult.removedContent && sanitizationResult.removedContent.length > 0) {
        warnings.push(`Removed: ${sanitizationResult.removedContent.join(', ')}`)
      }

      // Update state
      setInputState(prev => ({
        ...prev,
        sanitizedValue: sanitizationResult.sanitized,
        isValid: validationResult.success,
        validationMessage: validationResult.success 
          ? '' 
          : formatValidationError(validationResult.error)[name] || 'Invalid input',
        sanitizationWarnings: warnings,
        hasXSS: sanitizationResult.hasXSS
      }))
    }, 300),
    [name, required, strict, getValidationSchema]
  )

  // Handle input change with sanitization
  const handleInputChange = useCallback((
    value: string,
    fieldOnChange: (value: string) => void
  ) => {
    // Update display value immediately for responsive UI
    setInputState(prev => ({
      ...prev,
      displayValue: value
    }))

    // Trigger debounced validation and sanitization
    debouncedValidateAndSanitize(value)

    // For real-time updates, send sanitized value to form
    const sanitizeFn = strict ? sanitizeTextStrict : sanitizeText
    const sanitizationResult = sanitizeFn(value)
    
    fieldOnChange(sanitizationResult.sanitized)
    onChange?.(sanitizationResult.sanitized)
  }, [debouncedValidateAndSanitize, strict, onChange])

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
    const warningClasses = "border-yellow-500 focus:ring-yellow-500 focus:border-yellow-500 bg-yellow-50"
    const disabledClasses = "bg-gray-100 cursor-not-allowed"
    
    let classes = baseClasses
    
    if (disabled) {
      classes += ` ${disabledClasses}`
    } else if (fieldError || (!inputState.isValid && inputState.hasBeenBlurred)) {
      classes += ` ${errorClasses}`
    } else if (inputState.hasXSS || (inputState.sanitizationWarnings.length > 0 && inputState.hasBeenBlurred)) {
      classes += ` ${warningClasses}`
    } else {
      classes += ` ${validClasses}`
    }
    
    return `${classes} ${className}`.trim()
  }, [inputState.isValid, inputState.hasXSS, inputState.sanitizationWarnings.length, inputState.hasBeenBlurred, disabled, className])

  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? 'This field is required' : false,
        minLength: { 
          value: minLength, 
          message: `Must be at least ${minLength} character${minLength !== 1 ? 's' : ''}` 
        },
        maxLength: { 
          value: maxLength, 
          message: `Cannot exceed ${maxLength} characters` 
        },
        validate: (value: string) => {
          if (!value && !required) return true
          
          // Check for XSS attempts
          if (containsPotentialXSS(value)) {
            return 'Input contains potentially unsafe content'
          }
          
          // Validate with appropriate schema
          const validationSchema = getValidationSchema()
          const result = validationSchema.safeParse(value)
          
          if (!result.success) {
            const errors = formatValidationError(result.error)
            return Object.values(errors)[0] || 'Invalid input'
          }
          
          return true
        }
      }}
      render={({ field: { onChange: fieldOnChange, onBlur: fieldOnBlur, value }, fieldState: { error } }) => {
        // Initialize display value from field value
        useEffect(() => {
          if (value !== undefined && value !== null && value !== inputState.displayValue) {
            setInputState(prev => ({
              ...prev,
              displayValue: value
            }))
          }
        }, [value, inputState.displayValue])

        // Determine error message priority: field error > validation message
        const errorMessage = error?.message || 
          (!inputState.isValid && inputState.hasBeenBlurred ? inputState.validationMessage : '')

        // Common input props
        const inputProps = {
          id: name,
          placeholder,
          disabled,
          value: inputState.displayValue,
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
            handleInputChange(e.target.value, fieldOnChange),
          onFocus: handleFocus,
          onBlur: () => handleBlur(fieldOnBlur),
          className: getInputClasses(error),
          'aria-invalid': !!error,
          'aria-describedby': errorMessage ? `${name}-error` : undefined,
          maxLength: maxLength
        }

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
              {/* Input or Textarea */}
              {multiline ? (
                <textarea
                  {...inputProps}
                  rows={rows}
                />
              ) : (
                <input
                  type="text"
                  {...inputProps}
                />
              )}
              
              {/* Validation/Sanitization indicator */}
              {!disabled && inputState.hasBeenBlurred && (
                <div className="absolute top-2 right-2 flex items-center pointer-events-none">
                  {inputState.hasXSS ? (
                    <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" title="Content was sanitized">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : inputState.isValid && !error ? (
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
            
            {/* Sanitization warnings */}
            {!errorMessage && showSanitizationWarnings && inputState.sanitizationWarnings.length > 0 && inputState.hasBeenBlurred && (
              <div className="text-sm text-yellow-600">
                {inputState.sanitizationWarnings.map((warning, index) => (
                  <p key={index} className="flex items-center">
                    <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {warning}
                  </p>
                ))}
              </div>
            )}
            
            {/* Character count */}
            {!errorMessage && !disabled && (
              <p className="text-xs text-gray-500">
                {inputState.displayValue.length} / {maxLength} characters
              </p>
            )}
          </div>
        )
      }}
    />
  )
}

export default SafeTextInput