/**
 * useValidation - Custom validation hook
 * 
 * Features:
 * - Real-time validation with debouncing
 * - Zod schema integration
 * - Sanitization support
 * - Validation state management
 * - Error formatting and handling
 */

import { useState, useCallback, useEffect } from 'react'
import { z } from 'zod'
import { formatValidationError, safeValidate } from '../lib/validation'
import { sanitizeBeforeValidation } from '../lib/sanitization'
import { debounce } from '../utils/validationHelpers'

export interface ValidationState {
  isValid: boolean
  isValidating: boolean
  errors: Record<string, string>
  hasBeenValidated: boolean
  lastValidatedValue: any
}

export interface ValidationOptions {
  /** Debounce delay in milliseconds */
  debounceMs?: number
  /** Enable sanitization before validation */
  sanitize?: boolean
  /** Validate on initial value */
  validateOnMount?: boolean
  /** Custom validation function */
  customValidator?: (value: any) => string | null
}

export interface UseValidationReturn<T> {
  /** Current validation state */
  state: ValidationState
  /** Validate a value */
  validate: (value: any) => Promise<boolean>
  /** Validate synchronously */
  validateSync: (value: any) => boolean
  /** Clear validation state */
  clearValidation: () => void
  /** Check if value is valid */
  isValid: boolean
  /** Get first error message */
  firstError: string | null
  /** Get all error messages */
  errors: Record<string, string>
  /** Whether validation is in progress */
  isValidating: boolean
}

/**
 * Custom hook for field-level validation using Zod schemas
 */
export function useValidation<T>(
  schema: z.ZodSchema<T>,
  options: ValidationOptions = {}
): UseValidationReturn<T> {
  const {
    debounceMs = 300,
    sanitize = false,
    validateOnMount = false,
    customValidator
  } = options

  // Validation state
  const [state, setState] = useState<ValidationState>({
    isValid: true,
    isValidating: false,
    errors: {},
    hasBeenValidated: false,
    lastValidatedValue: undefined
  })

  // Synchronous validation function
  const validateSync = useCallback((value: any): boolean => {
    setState(prev => ({ ...prev, isValidating: true }))

    try {
      let validationResult: { success: boolean; data?: T; errors?: Record<string, string> }

      if (sanitize) {
        // Use sanitization + validation
        validationResult = sanitizeBeforeValidation(
          typeof value === 'object' ? value : { value },
          (data: any) => safeValidate(schema, data.value || data)
        )
      } else {
        // Direct validation
        validationResult = safeValidate(schema, value)
      }

      let errors = validationResult.errors || {}

      // Apply custom validation if provided
      if (customValidator && validationResult.success) {
        const customError = customValidator(value)
        if (customError) {
          errors = { custom: customError }
          validationResult.success = false
        }
      }

      // Update state
      setState({
        isValid: validationResult.success,
        isValidating: false,
        errors,
        hasBeenValidated: true,
        lastValidatedValue: value
      })

      return validationResult.success
    } catch (error) {
      // Handle unexpected validation errors
      setState({
        isValid: false,
        isValidating: false,
        errors: { validation: 'An unexpected validation error occurred' },
        hasBeenValidated: true,
        lastValidatedValue: value
      })
      return false
    }
  }, [schema, sanitize, customValidator])

  // Debounced validation function
  const debouncedValidateSync = useCallback(
    debounce(validateSync, debounceMs),
    [validateSync, debounceMs]
  )

  // Async validation function
  const validate = useCallback(async (value: any): Promise<boolean> => {
    return new Promise((resolve) => {
      // Use debounced validation for async calls
      const originalCallback = debouncedValidateSync
      
      // Override the debounced function to resolve the promise
      const enhancedValidation = (val: any) => {
        const result = validateSync(val)
        resolve(result)
        return result
      }

      enhancedValidation(value)
    })
  }, [validateSync, debouncedValidateSync])

  // Clear validation state
  const clearValidation = useCallback(() => {
    setState({
      isValid: true,
      isValidating: false,
      errors: {},
      hasBeenValidated: false,
      lastValidatedValue: undefined
    })
  }, [])

  // Computed properties
  const isValid = state.isValid
  const isValidating = state.isValidating
  const errors = state.errors
  const firstError = Object.values(errors)[0] || null

  return {
    state,
    validate,
    validateSync,
    clearValidation,
    isValid,
    firstError,
    errors,
    isValidating
  }
}

/**
 * Hook for validating multiple fields with cross-field dependencies
 */
export interface CrossFieldValidationRule<T> {
  fieldNames: (keyof T)[]
  validator: (values: Partial<T>) => Record<string, string>
  debounceMs?: number
}

export interface UseMultiFieldValidationOptions<T> {
  schemas: Record<keyof T, z.ZodSchema<any>>
  crossFieldRules?: CrossFieldValidationRule<T>[]
  validateOnMount?: boolean
}

export function useMultiFieldValidation<T extends Record<string, any>>(
  options: UseMultiFieldValidationOptions<T>
) {
  const { schemas, crossFieldRules = [], validateOnMount = false } = options
  
  const [state, setState] = useState<{
    fieldStates: Record<keyof T, ValidationState>
    isValidating: boolean
    isValid: boolean
  }>({
    fieldStates: {} as Record<keyof T, ValidationState>,
    isValidating: false,
    isValid: true
  })

  // Initialize field states
  useEffect(() => {
    const initialFieldStates: Record<keyof T, ValidationState> = {} as any
    
    Object.keys(schemas).forEach(fieldName => {
      initialFieldStates[fieldName as keyof T] = {
        isValid: true,
        isValidating: false,
        errors: {},
        hasBeenValidated: false,
        lastValidatedValue: undefined
      }
    })
    
    setState(prev => ({
      ...prev,
      fieldStates: initialFieldStates
    }))
  }, [schemas])

  // Validate individual field
  const validateField = useCallback((
    fieldName: keyof T, 
    value: any, 
    allValues: Partial<T> = {}
  ): boolean => {
    const schema = schemas[fieldName]
    if (!schema) return true

    // Validate individual field
    const result = safeValidate(schema, value)
    
    // Update field state
    setState(prev => ({
      ...prev,
      fieldStates: {
        ...prev.fieldStates,
        [fieldName]: {
          isValid: result.success,
          isValidating: false,
          errors: result.errors || {},
          hasBeenValidated: true,
          lastValidatedValue: value
        }
      }
    }))

    // Run cross-field validation
    const affectedRules = crossFieldRules.filter(rule => 
      rule.fieldNames.includes(fieldName)
    )

    affectedRules.forEach(rule => {
      const crossFieldErrors = rule.validator(allValues)
      
      // Update affected fields with cross-field errors
      rule.fieldNames.forEach(affectedField => {
        const fieldError = crossFieldErrors[affectedField as string]
        if (fieldError) {
          setState(prev => ({
            ...prev,
            fieldStates: {
              ...prev.fieldStates,
              [affectedField]: {
                ...prev.fieldStates[affectedField],
                isValid: false,
                errors: {
                  ...prev.fieldStates[affectedField]?.errors,
                  crossField: fieldError
                }
              }
            }
          }))
        }
      })
    })

    return result.success
  }, [schemas, crossFieldRules])

  // Validate all fields
  const validateAll = useCallback((values: Partial<T>): boolean => {
    setState(prev => ({ ...prev, isValidating: true }))
    
    let overallValid = true
    
    // Validate each field
    Object.entries(values).forEach(([fieldName, value]) => {
      const fieldValid = validateField(fieldName as keyof T, value, values)
      if (!fieldValid) {
        overallValid = false
      }
    })

    // Update overall state
    setState(prev => ({
      ...prev,
      isValidating: false,
      isValid: overallValid
    }))

    return overallValid
  }, [validateField])

  // Get all errors across all fields
  const getAllErrors = useCallback((): Record<string, string> => {
    const allErrors: Record<string, string> = {}
    
    Object.entries(state.fieldStates).forEach(([fieldName, fieldState]) => {
      Object.entries(fieldState.errors).forEach(([errorKey, errorMessage]) => {
        allErrors[`${fieldName}.${errorKey}`] = errorMessage
      })
    })
    
    return allErrors
  }, [state.fieldStates])

  return {
    validateField,
    validateAll,
    getAllErrors,
    fieldStates: state.fieldStates,
    isValidating: state.isValidating,
    isValid: state.isValid,
    clearAll: () => setState(prev => ({
      ...prev,
      fieldStates: Object.keys(prev.fieldStates).reduce((acc, key) => ({
        ...acc,
        [key]: {
          isValid: true,
          isValidating: false,
          errors: {},
          hasBeenValidated: false,
          lastValidatedValue: undefined
        }
      }), {} as Record<keyof T, ValidationState>)
    }))
  }
}