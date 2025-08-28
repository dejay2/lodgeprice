/**
 * useSeasonalRateForm - Form validation and management with React Hook Form
 * Handles validation, overlap detection, and form state management
 */

import { useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { supabase } from '@/lib/supabase'
import { seasonalRateValidationSchema } from '../types/ValidationSchemas'
import type { SeasonalRate } from '../types/SeasonalRate'
import type { SeasonalRateFormData } from '../types/ValidationSchemas'

export const useSeasonalRateForm = (editingRate?: SeasonalRate) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    watch,
    reset,
    setError,
    clearErrors
  } = useForm<SeasonalRateFormData>({
    resolver: yupResolver(seasonalRateValidationSchema),
    defaultValues: editingRate ? {
      name: editingRate.rate_name || '',
      startDate: new Date(editingRate.start_date),
      endDate: new Date(editingRate.end_date),
      rateAdjustment: editingRate.discount_rate
    } : {
      name: '',
      startDate: new Date(),
      endDate: new Date(),
      rateAdjustment: 1.0
    }
  })

  const startDate = watch('startDate')
  const endDate = watch('endDate')

  // Custom async validation for date range overlaps (using local validation for now)
  const validateDateRangeOverlap = useCallback(async (startDate: Date, endDate: Date): Promise<string | true> => {
    try {
      // For now, we'll fetch existing rates and check locally
      const { data: existingRates } = await supabase
        .from('date_ranges')
        .select('*')
      
      if (!existingRates) return true
      
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]
      
      const overlapping = existingRates.find(rate => 
        rate.rate_id !== editingRate?.rate_id &&
        (rate.start_date <= endDateStr && rate.end_date >= startDateStr)
      )
      
      if (overlapping) {
        return `Date range overlaps with "${overlapping.rate_name}" (${overlapping.start_date} to ${overlapping.end_date})`
      }

      return true
    } catch (error) {
      console.error('Overlap validation error:', error)
      return 'Unable to validate date range overlap. Please try again.'
    }
  }, [editingRate?.rate_id])

  // Use ref for timeout to avoid state updates
  const overlapValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    if (startDate && endDate && startDate < endDate) {
      // Clear previous timeout
      if (overlapValidationTimeoutRef.current) {
        clearTimeout(overlapValidationTimeoutRef.current)
      }

      // Clear previous overlap errors
      clearErrors(['startDate', 'endDate'])

      // Set new timeout for validation
      overlapValidationTimeoutRef.current = setTimeout(async () => {
        const validationResult = await validateDateRangeOverlap(startDate, endDate)
        if (validationResult !== true) {
          setError('endDate', {
            type: 'overlap',
            message: validationResult
          })
        }
      }, 500) // 500ms debounce
    }

    return () => {
      if (overlapValidationTimeoutRef.current) {
        clearTimeout(overlapValidationTimeoutRef.current)
        overlapValidationTimeoutRef.current = null
      }
    }
  }, [startDate, endDate, clearErrors, setError, validateDateRangeOverlap])

  // Form submission handler with additional validation
  const onSubmit = async (data: SeasonalRateFormData, onSuccess: (data: SeasonalRateFormData) => void) => {
    try {
      // Final validation before submission
      const overlapValidation = await validateDateRangeOverlap(data.startDate, data.endDate)
      if (overlapValidation !== true) {
        setError('endDate', {
          type: 'overlap',
          message: overlapValidation
        })
        return
      }

      // Call success handler
      onSuccess(data)
    } catch (error) {
      setError('root', {
        type: 'submission',
        message: error instanceof Error ? error.message : 'Failed to submit form'
      })
    }
  }

  // Form reset with optional new values
  const resetForm = (newValues?: Partial<SeasonalRateFormData>) => {
    if (newValues) {
      reset(newValues)
    } else if (editingRate) {
      reset({
        name: editingRate.rate_name || '',
        startDate: new Date(editingRate.start_date),
        endDate: new Date(editingRate.end_date),
        rateAdjustment: editingRate.discount_rate
      })
    } else {
      reset({
        name: '',
        startDate: new Date(),
        endDate: new Date(),
        rateAdjustment: 1.0
      })
    }
  }

  return {
    register,
    handleSubmit: (onSuccess: (data: SeasonalRateFormData) => void) => 
      handleSubmit((data) => onSubmit(data, onSuccess)),
    formState: { errors, isSubmitting, isDirty },
    setValue,
    watch,
    reset: resetForm,
    setError,
    clearErrors,
    validateDateRangeOverlap
  }
}