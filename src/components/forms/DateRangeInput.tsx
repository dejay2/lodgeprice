/**
 * DateRangeInput - Validated date range input component
 * 
 * Features:
 * - Date range validation with Zod schema
 * - Start date must be before end date validation
 * - Maximum duration validation (365 days)
 * - Individual date field validation
 * - Integration with React Hook Form
 * - Visual error states and accessibility
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Controller, Control, FieldError } from 'react-hook-form'
import { dateRangeSchema, formatValidationError } from '../../lib/validation'
import { DateInput } from './DateInput'
import { 
  isValidDateRange, 
  daysBetweenDates, 
  getTodayDateString,
  debounce 
} from '../../utils/validationHelpers'

interface DateRangeInputProps {
  startDateName: string
  endDateName: string
  control: Control<any>
  label?: string
  disabled?: boolean
  className?: string
  required?: boolean
  minDate?: string
  maxDate?: string
  maxDuration?: number // Maximum days between start and end
  onBlur?: () => void
  onChange?: (dateRange: { startDate: string; endDate: string }) => void
}

interface DateRangeState {
  startDate: string
  endDate: string
  isValidRange: boolean
  rangeValidationMessage: string
  hasBeenValidated: boolean
}

/**
 * DateRangeInput Component
 * Provides validated date range input with cross-field validation
 */
export const DateRangeInput: React.FC<DateRangeInputProps> = ({
  startDateName,
  endDateName,
  control,
  label,
  disabled = false,
  className = "",
  required = false,
  minDate,
  maxDate,
  maxDuration = 365,
  onBlur,
  onChange
}) => {
  // Component state for managing date range validation
  const [rangeState, setRangeState] = useState<DateRangeState>({
    startDate: '',
    endDate: '',
    isValidRange: true,
    rangeValidationMessage: '',
    hasBeenValidated: false
  })

  // Debounced range validation function
  const debouncedValidateRange = useCallback(
    debounce((startDate: string, endDate: string) => {
      if (!startDate || !endDate) {
        setRangeState(prev => ({
          ...prev,
          isValidRange: !required,
          rangeValidationMessage: required && (!startDate || !endDate) ? 'Both start and end dates are required' : '',
          hasBeenValidated: true
        }))
        return
      }

      // Validate with Zod schema
      const result = dateRangeSchema.safeParse({ startDate, endDate })
      
      if (!result.success) {
        const errors = formatValidationError(result.error)
        const errorMessage = errors.endDate || Object.values(errors)[0] || 'Invalid date range'
        setRangeState(prev => ({
          ...prev,
          isValidRange: false,
          rangeValidationMessage: errorMessage,
          hasBeenValidated: true
        }))
        return
      }

      // Additional business logic validation
      const rangeValidation = isValidDateRange(startDate, endDate)
      
      if (!rangeValidation.isValid) {
        setRangeState(prev => ({
          ...prev,
          isValidRange: false,
          rangeValidationMessage: rangeValidation.errors[0] || 'Invalid date range',
          hasBeenValidated: true
        }))
        return
      }

      // Check duration limit
      const daysDiff = daysBetweenDates(startDate, endDate)
      if (daysDiff > maxDuration) {
        setRangeState(prev => ({
          ...prev,
          isValidRange: false,
          rangeValidationMessage: `Date range cannot exceed ${maxDuration} days`,
          hasBeenValidated: true
        }))
        return
      }

      // Range is valid
      setRangeState(prev => ({
        ...prev,
        isValidRange: true,
        rangeValidationMessage: '',
        hasBeenValidated: true
      }))
    }, 500),
    [required, maxDuration]
  )

  // Handle date change for either start or end date
  const handleDateChange = useCallback((
    field: 'startDate' | 'endDate',
    value: string
  ) => {
    setRangeState(prev => {
      const newState = { ...prev, [field]: value }
      
      // Trigger range validation when both dates are present
      if (newState.startDate && newState.endDate) {
        debouncedValidateRange(newState.startDate, newState.endDate)
      }
      
      // Call onChange callback
      if (newState.startDate && newState.endDate) {
        onChange?.({ startDate: newState.startDate, endDate: newState.endDate })
      }
      
      return newState
    })
  }, [debouncedValidateRange, onChange])

  // Custom validation rule for React Hook Form
  const validateDateRange = useCallback((value: any, formValues: any) => {
    const startDate = formValues[startDateName]
    const endDate = formValues[endDateName]
    
    if (!startDate || !endDate) {
      return required ? 'Both start and end dates are required' : true
    }

    const result = dateRangeSchema.safeParse({ startDate, endDate })
    if (!result.success) {
      const errors = formatValidationError(result.error)
      return Object.values(errors)[0] || 'Invalid date range'
    }

    const rangeValidation = isValidDateRange(startDate, endDate)
    if (!rangeValidation.isValid) {
      return rangeValidation.errors[0] || 'Invalid date range'
    }

    const daysDiff = daysBetweenDates(startDate, endDate)
    if (daysDiff > maxDuration) {
      return `Date range cannot exceed ${maxDuration} days`
    }

    return true
  }, [startDateName, endDateName, required, maxDuration])

  // Calculate duration display
  const getDurationDisplay = useCallback((): string => {
    if (!rangeState.startDate || !rangeState.endDate || !rangeState.isValidRange) {
      return ''
    }
    
    const days = daysBetweenDates(rangeState.startDate, rangeState.endDate)
    return days === 1 ? '1 day' : `${days} days`
  }, [rangeState])

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <legend className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </legend>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date Input */}
        <Controller
          name={startDateName}
          control={control}
          rules={{
            required: required ? 'Start date is required' : false,
            validate: validateDateRange
          }}
          render={({ field: { onChange: fieldOnChange, value }, fieldState: { error } }) => (
            <DateInput
              name={startDateName}
              control={control}
              label="Start Date"
              required={required}
              disabled={disabled}
              minDate={minDate}
              maxDate={rangeState.endDate || maxDate}
              onChange={(dateValue) => {
                fieldOnChange(dateValue)
                handleDateChange('startDate', dateValue)
              }}
              onBlur={onBlur}
            />
          )}
        />

        {/* End Date Input */}
        <Controller
          name={endDateName}
          control={control}
          rules={{
            required: required ? 'End date is required' : false,
            validate: validateDateRange
          }}
          render={({ field: { onChange: fieldOnChange, value }, fieldState: { error } }) => (
            <DateInput
              name={endDateName}
              control={control}
              label="End Date"
              required={required}
              disabled={disabled}
              minDate={rangeState.startDate || minDate}
              maxDate={maxDate}
              onChange={(dateValue) => {
                fieldOnChange(dateValue)
                handleDateChange('endDate', dateValue)
              }}
              onBlur={onBlur}
            />
          )}
        />
      </div>
      
      {/* Range validation message */}
      {rangeState.rangeValidationMessage && rangeState.hasBeenValidated && (
        <div className="text-sm text-red-600 flex items-center" role="alert">
          <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          {rangeState.rangeValidationMessage}
        </div>
      )}
      
      {/* Duration display */}
      {rangeState.isValidRange && getDurationDisplay() && (
        <div className="text-sm text-gray-600 flex items-center">
          <svg className="h-4 w-4 mr-1 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Duration: {getDurationDisplay()}
        </div>
      )}
      
      {/* Helper text */}
      {!rangeState.rangeValidationMessage && !disabled && (
        <p className="text-xs text-gray-500">
          Maximum duration: {maxDuration} days
        </p>
      )}
    </div>
  )
}

export default DateRangeInput