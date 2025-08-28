/**
 * SeasonalRateForm - Modal form for creating and editing seasonal rates
 * Uses React Hook Form for validation and state management
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSeasonalRateForm } from './hooks/useSeasonalRateForm'
import { useSeasonalRates } from './hooks/useSeasonalRates'
import { usePricingPreview } from './hooks/usePricingPreview'
import type { SeasonalRate } from './types/SeasonalRate'
import type { SeasonalRateFormData } from './types/ValidationSchemas'
import './SeasonalRateForm.css'

interface SeasonalRateFormProps {
  isOpen: boolean
  onClose: () => void
  editingRate?: SeasonalRate
  onSuccess?: () => void
  propertyId?: string
}

export default function SeasonalRateForm({
  isOpen,
  onClose,
  editingRate,
  onSuccess,
  propertyId
}: SeasonalRateFormProps) {
  const { createSeasonalRate, updateSeasonalRate } = useSeasonalRates()
  const { pricingPreview, previewLoading, generatePreview } = usePricingPreview(propertyId)
  const [showPreview, setShowPreview] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    watch,
    reset,
    setError
  } = useSeasonalRateForm(editingRate)

  const watchedValues = watch()
  
  // Memoize the values we want to watch to prevent object reference changes
  const watchedValuesKey = useMemo(() => {
    if (!watchedValues.startDate || !watchedValues.endDate || !watchedValues.rateAdjustment) {
      return null
    }
    return JSON.stringify({
      startDate: watchedValues.startDate.toISOString(),
      endDate: watchedValues.endDate.toISOString(),
      rateAdjustment: watchedValues.rateAdjustment
    })
  }, [watchedValues.startDate, watchedValues.endDate, watchedValues.rateAdjustment])

  // Generate pricing preview when form data changes
  useEffect(() => {
    let debounce: NodeJS.Timeout | undefined
    if (watchedValuesKey && showPreview) {
      const values = JSON.parse(watchedValuesKey)
      debounce = setTimeout(() => {
        generatePreview(
          new Date(values.startDate),
          new Date(values.endDate),
          values.rateAdjustment,
          propertyId
        )
      }, 1000)
    }
    return () => {
      if (debounce) clearTimeout(debounce)
    }
  }, [watchedValuesKey, showPreview, generatePreview, propertyId])

  const onSubmit = async (data: SeasonalRateFormData) => {
    try {
      if (editingRate) {
        await updateSeasonalRate(editingRate.rate_id, {
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          rateAdjustment: data.rateAdjustment
        })
      } else {
        await createSeasonalRate({
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          rateAdjustment: data.rateAdjustment
        })
      }
      
      reset()
      onSuccess?.()
      onClose()
    } catch (error) {
      setError('root', {
        type: 'submission',
        message: error instanceof Error ? error.message : 'Failed to save seasonal rate'
      })
    }
  }

  const handleClose = useCallback(() => {
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        reset()
        onClose()
      }
    } else {
      onClose()
    }
  }, [isDirty, reset, onClose])

  if (!isOpen) return null

  return (
    <div className="seasonal-rate-form-overlay">
      <div className="seasonal-rate-form-modal">
        <div className="seasonal-rate-form-header">
          <h2>{editingRate ? 'Edit Seasonal Rate' : 'Create New Seasonal Rate'}</h2>
          <button
            type="button"
            className="seasonal-rate-form-close"
            onClick={handleClose}
            aria-label="Close form"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="seasonal-rate-form">
          {/* Name field */}
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Name *
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              className={`form-input ${errors.name ? 'form-input--error' : ''}`}
              placeholder="e.g., Summer Peak Season"
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <span id="name-error" className="form-error">
                {errors.name.message}
              </span>
            )}
          </div>

          {/* Date range fields */}
          <div className="form-group-row">
            <div className="form-group">
              <label htmlFor="startDate" className="form-label">
                Start Date *
              </label>
              <input
                {...register('startDate', { valueAsDate: true })}
                type="date"
                id="startDate"
                className={`form-input ${errors.startDate ? 'form-input--error' : ''}`}
                aria-describedby={errors.startDate ? 'start-date-error' : undefined}
              />
              {errors.startDate && (
                <span id="start-date-error" className="form-error">
                  {errors.startDate.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="endDate" className="form-label">
                End Date *
              </label>
              <input
                {...register('endDate', { valueAsDate: true })}
                type="date"
                id="endDate"
                className={`form-input ${errors.endDate ? 'form-input--error' : ''}`}
                aria-describedby={errors.endDate ? 'end-date-error' : undefined}
              />
              {errors.endDate && (
                <span id="end-date-error" className="form-error">
                  {errors.endDate.message}
                </span>
              )}
            </div>
          </div>

          {/* Rate adjustment field */}
          <div className="form-group">
            <label htmlFor="rateAdjustment" className="form-label">
              Rate Adjustment Multiplier *
            </label>
            <input
              {...register('rateAdjustment', { valueAsNumber: true })}
              type="number"
              id="rateAdjustment"
              step="0.1"
              min="-1"
              max="10"
              className={`form-input ${errors.rateAdjustment ? 'form-input--error' : ''}`}
              placeholder="1.0"
              aria-describedby="rate-adjustment-help"
            />
            <small id="rate-adjustment-help" className="form-help">
              1.0 = no change, 1.5 = 50% increase, 0.8 = 20% decrease
            </small>
            {errors.rateAdjustment && (
              <span className="form-error">
                {errors.rateAdjustment.message}
              </span>
            )}
          </div>

          {/* Pricing preview toggle */}
          <div className="form-group">
            <label className="form-checkbox-label">
              <input
                type="checkbox"
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
                className="form-checkbox"
              />
              Show pricing preview
            </label>
          </div>

          {/* Pricing preview section */}
          {showPreview && (
            <div className="pricing-preview-section">
              <h3>Pricing Preview</h3>
              {previewLoading ? (
                <div className="pricing-preview-loading">
                  Calculating pricing impact...
                </div>
              ) : pricingPreview ? (
                <div className="pricing-preview-results">
                  <div className="pricing-preview-summary">
                    <div className="pricing-preview-stat">
                      <span className="pricing-preview-label">Average Impact:</span>
                      <span className="pricing-preview-value">
                        {pricingPreview.averageChange > 0 ? '+' : ''}
                        {pricingPreview.averageChange.toFixed(1)}%
                      </span>
                    </div>
                    <div className="pricing-preview-stat">
                      <span className="pricing-preview-label">Price Range:</span>
                      <span className="pricing-preview-value">
                        £{pricingPreview.minPrice} - £{pricingPreview.maxPrice}
                      </span>
                    </div>
                  </div>
                  
                  {pricingPreview.sampleDates.length > 0 && (
                    <div className="pricing-preview-samples">
                      <h4>Sample Dates:</h4>
                      <div className="pricing-preview-samples-grid">
                        {pricingPreview.sampleDates.map((sample, index) => (
                          <div key={index} className="pricing-preview-sample">
                            <div className="pricing-preview-date">
                              {sample.date}
                            </div>
                            <div className="pricing-preview-prices">
                              <span className="pricing-preview-before">
                                £{sample.basePrice}
                              </span>
                              <span className="pricing-preview-arrow">→</span>
                              <span className="pricing-preview-after">
                                £{sample.adjustedPrice}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Form submission errors */}
          {errors.root && (
            <div className="form-error-section">
              <span className="form-error">
                {errors.root.message}
              </span>
            </div>
          )}

          {/* Form actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || Object.keys(errors).length > 0}
            >
              {isSubmitting ? (
                <>
                  <span className="btn-spinner"></span>
                  {editingRate ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingRate ? 'Update Seasonal Rate' : 'Create Seasonal Rate'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}