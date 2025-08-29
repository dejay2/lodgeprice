/**
 * useFormValidation - Form-level validation hook
 * 
 * Features:
 * - Integration with React Hook Form
 * - Real-time and submit-time validation
 * - Sanitization and validation pipelines
 * - Cross-field validation support
 * - Error summary management
 * - Form submission state management
 */

import { useCallback, useEffect } from 'react'
import { useForm, UseFormReturn, SubmitHandler, FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { sanitizeFormData } from '../lib/sanitization'
import { safeValidate } from '../lib/validation'
import { hasValidationErrors, createValidationSummary } from '../utils/validationHelpers'

export interface FormValidationOptions<T extends FieldValues> {
  /** Zod validation schema */
  schema: z.ZodSchema<T>
  /** Default form values */
  defaultValues?: Partial<T>
  /** Enable sanitization before validation */
  sanitize?: boolean
  /** Validation mode */
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all'
  /** Re-validate mode */
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit'
  /** Show validation summary */
  showValidationSummary?: boolean
  /** Custom validation function */
  customValidation?: (data: T) => Record<string, string> | null
}

export interface FormValidationState {
  /** Whether form has validation errors */
  hasErrors: boolean
  /** Error count */
  errorCount: number
  /** Validation summary */
  validationSummary: string
  /** Field names with errors */
  errorFields: string[]
  /** Whether form is being submitted */
  isSubmitting: boolean
  /** Whether sanitization warnings exist */
  hasSanitizationWarnings: boolean
  /** Sanitization warnings */
  sanitizationWarnings: string[]
}

export interface UseFormValidationReturn<T extends FieldValues> extends UseFormReturn<T> {
  /** Enhanced form submission handler */
  handleValidatedSubmit: (onValid: SubmitHandler<T>, onInvalid?: (errors: any) => void) => (e?: React.BaseSyntheticEvent) => Promise<void>
  /** Validation state */
  validationState: FormValidationState
  /** Validate entire form */
  validateForm: () => Promise<boolean>
  /** Validate specific field */
  validateField: (fieldName: keyof T) => Promise<boolean>
  /** Clear all validation errors */
  clearValidation: () => void
  /** Get sanitized form data */
  getSanitizedData: () => { sanitized: T; warnings: string[] }
}

/**
 * Enhanced form validation hook with Zod integration
 */
export function useFormValidation<T extends FieldValues>(
  options: FormValidationOptions<T>
): UseFormValidationReturn<T> {
  const {
    schema,
    defaultValues = {} as Partial<T>,
    sanitize = false,
    mode = 'onSubmit',
    reValidateMode = 'onChange',
    showValidationSummary = true,
    customValidation
  } = options

  // Initialize React Hook Form with Zod resolver
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode,
    reValidateMode,
    criteriaMode: 'all'
  })

  const {
    handleSubmit,
    formState: { errors, isSubmitting, touchedFields, dirtyFields },
    getValues,
    trigger,
    clearErrors,
    setError
  } = form

  // Calculate validation state
  const getValidationState = useCallback((): FormValidationState => {
    const hasErrors = hasValidationErrors(errors)
    const errorFields = Object.keys(errors)
    const errorCount = errorFields.length
    const validationSummary = createValidationSummary(
      Object.fromEntries(
        Object.entries(errors).map(([key, error]) => [key, error?.message || 'Error'])
      )
    ).summary

    return {
      hasErrors,
      errorCount,
      validationSummary,
      errorFields,
      isSubmitting,
      hasSanitizationWarnings: false, // Will be updated during sanitization
      sanitizationWarnings: []
    }
  }, [errors, isSubmitting])

  // Enhanced form validation function
  const validateForm = useCallback(async (): Promise<boolean> => {
    const isValid = await trigger()
    
    if (isValid && customValidation) {
      const formData = getValues()
      const customErrors = customValidation(formData)
      
      if (customErrors) {
        Object.entries(customErrors).forEach(([fieldName, errorMessage]) => {
          setError(fieldName as keyof T, {
            type: 'custom',
            message: errorMessage
          })
        })
        return false
      }
    }
    
    return isValid
  }, [trigger, customValidation, getValues, setError])

  // Validate specific field
  const validateField = useCallback(async (fieldName: keyof T): Promise<boolean> => {
    return await trigger(fieldName)
  }, [trigger])

  // Clear all validation errors
  const clearValidation = useCallback(() => {
    clearErrors()
  }, [clearErrors])

  // Get sanitized form data
  const getSanitizedData = useCallback((): { sanitized: T; warnings: string[] } => {
    const rawData = getValues()
    
    if (!sanitize) {
      return { sanitized: rawData, warnings: [] }
    }

    const sanitizationResult = sanitizeFormData(rawData)
    
    return {
      sanitized: sanitizationResult.sanitized as T,
      warnings: sanitizationResult.warnings
    }
  }, [getValues, sanitize])

  // Enhanced submit handler with validation and sanitization
  const handleValidatedSubmit = useCallback((
    onValid: SubmitHandler<T>,
    onInvalid?: (errors: any) => void
  ) => {
    return handleSubmit(
      async (data: T) => {
        try {
          // Apply sanitization if enabled
          let processedData = data
          let sanitizationWarnings: string[] = []
          
          if (sanitize) {
            const sanitized = getSanitizedData()
            processedData = sanitized.sanitized
            sanitizationWarnings = sanitized.warnings
            
            // Log sanitization warnings
            if (sanitizationWarnings.length > 0) {
              console.warn('Form sanitization warnings:', sanitizationWarnings)
            }
          }

          // Final validation with processed data
          const validationResult = safeValidate(schema, processedData)
          
          if (!validationResult.success) {
            // Set validation errors
            if (validationResult.errors) {
              Object.entries(validationResult.errors).forEach(([fieldName, errorMessage]) => {
                setError(fieldName as keyof T, {
                  type: 'validation',
                  message: errorMessage
                })
              })
            }
            
            if (onInvalid) {
              onInvalid(validationResult.errors)
            }
            return
          }

          // Apply custom validation if provided
          if (customValidation) {
            const customErrors = customValidation(processedData)
            if (customErrors) {
              Object.entries(customErrors).forEach(([fieldName, errorMessage]) => {
                setError(fieldName as keyof T, {
                  type: 'custom',
                  message: errorMessage
                })
              })
              
              if (onInvalid) {
                onInvalid(customErrors)
              }
              return
            }
          }

          // All validation passed - submit the form
          await onValid(processedData)
        } catch (error) {
          console.error('Form submission error:', error)
          
          // Set general form error
          setError('root' as keyof T, {
            type: 'submit',
            message: error instanceof Error ? error.message : 'Submission failed'
          })
          
          if (onInvalid) {
            onInvalid({ submission: 'Form submission failed' })
          }
        }
      },
      onInvalid
    )
  }, [handleSubmit, sanitize, getSanitizedData, schema, customValidation, setError])

  return {
    ...form,
    handleValidatedSubmit,
    validationState: getValidationState(),
    validateForm,
    validateField,
    clearValidation,
    getSanitizedData
  }
}

/**
 * Specialized form validation hooks for common use cases
 */

/**
 * Hook for price editing forms
 */
export function usePriceFormValidation(
  schema: z.ZodSchema<any>,
  options?: Omit<FormValidationOptions<any>, 'schema'>
) {
  return useFormValidation({
    schema,
    sanitize: false, // Prices don't need HTML sanitization
    mode: 'onChange',
    reValidateMode: 'onChange',
    ...options
  })
}

/**
 * Hook for text-heavy forms with XSS concerns
 */
export function useSafeTextFormValidation<T extends FieldValues>(
  schema: z.ZodSchema<T>,
  options?: Omit<FormValidationOptions<T>, 'schema' | 'sanitize'>
) {
  return useFormValidation({
    schema,
    sanitize: true, // Enable sanitization for text forms
    mode: 'onBlur',
    reValidateMode: 'onChange',
    showValidationSummary: true,
    ...options
  })
}

/**
 * Hook for date range forms
 */
export function useDateRangeFormValidation<T extends FieldValues>(
  schema: z.ZodSchema<T>,
  options?: Omit<FormValidationOptions<T>, 'schema'>
) {
  return useFormValidation({
    schema,
    sanitize: false,
    mode: 'onBlur',
    reValidateMode: 'onChange',
    ...options
  })
}

/**
 * Hook for property management forms
 */
export function usePropertyFormValidation<T extends FieldValues>(
  schema: z.ZodSchema<T>,
  options?: Omit<FormValidationOptions<T>, 'schema'>
) {
  return useFormValidation({
    schema,
    sanitize: true, // Property names and descriptions need sanitization
    mode: 'onBlur',
    reValidateMode: 'onChange',
    showValidationSummary: true,
    ...options
  })
}