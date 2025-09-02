/**
 * OverridePriceModal - Modal for setting and removing price overrides
 * 
 * Features:
 * - Set new price overrides with validation
 * - Remove existing price overrides
 * - Clear price comparison display
 * - Form validation with React Hook Form + Zod
 * - Accessibility compliance with focus management
 * - Error handling with user-friendly messages
 * 
 * Follows patterns from PricingConfirmationModal.tsx and PRP-012 specifications
 */

import React, { useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import PriceInput from './forms/PriceInput'
import { useOverridePricing } from '@/hooks/useOverridePricing'
import { priceOverrideSchema } from '@/lib/validation'
import type { 
  OverridePriceModalProps, 
  OverridePriceFormData 
} from './OverridePriceModal.types'

/**
 * OverridePriceModal Component
 * Modal interface for managing price overrides on specific dates
 */
const OverridePriceModal: React.FC<OverridePriceModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  date,
  currentPrice,
  existingOverride = null,
  onOverrideSet,
  onOverrideRemoved
}) => {
  // Initialize React Hook Form with Zod validation
  const form = useForm<OverridePriceFormData>({
    resolver: zodResolver(priceOverrideSchema.pick({ 
      overridePrice: true, 
      reason: true 
    })),
    mode: 'onChange',
    defaultValues: {
      overridePrice: existingOverride?.override_price || 0,
      reason: existingOverride?.reason || ''
    }
  })

  // Custom hook for price override operations
  const {
    isSubmitting,
    error,
    handleSubmit: handleOverrideSubmit,
    handleRemoveOverride,
    clearError
  } = useOverridePricing({
    propertyId,
    date,
    existingOverride,
    onOverrideSet,
    onOverrideRemoved,
    onClose
  })

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      form.reset({
        overridePrice: existingOverride?.override_price || 0,
        reason: existingOverride?.reason || ''
      })
      clearError()
    }
  }, [isOpen, existingOverride, form, clearError])

  // Handle form submission
  const onSubmit = async (data: OverridePriceFormData) => {
    await handleOverrideSubmit(data)
  }

  // Handle modal close
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      form.reset()
      clearError()
      onClose()
    }
  }, [isSubmitting, form, clearError, onClose])

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey)
      return () => document.removeEventListener('keydown', handleEscapeKey)
    }
    
    return undefined
  }, [isOpen, isSubmitting, handleClose])

  if (!isOpen) return null

  // Calculate price comparison for display
  const calculatedPrice = currentPrice.final_price_per_night || 0
  const overridePrice = form.watch('overridePrice') || existingOverride?.override_price || 0
  const priceDifference = overridePrice - calculatedPrice
  const percentChange = calculatedPrice > 0 ? ((priceDifference / calculatedPrice) * 100) : 0

  // Format date for display
  const formattedDate = format(date, 'EEEE, MMMM dd, yyyy')

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="modal-backdrop fade show"
        onClick={handleClose}
        style={{ zIndex: 1050 }}
        aria-hidden="true"
      />
      
      {/* Modal Dialog */}
      <div 
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-labelledby="override-price-title"
        aria-describedby="override-price-description"
        style={{ zIndex: 1051 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            {/* Modal Header */}
            <div className="modal-header bg-light">
              <div>
                <h5 className="modal-title" id="override-price-title">
                  {existingOverride ? 'Update Price Override' : 'Set Price Override'}
                </h5>
                <p className="text-muted small mb-0" id="override-price-description">
                  {formattedDate} • Property {propertyId}
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={handleClose}
                disabled={isSubmitting}
              />
            </div>
            
            {/* Modal Body */}
            <div className="modal-body">
              {/* Error Display */}
              {error && (
                <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Dismiss error"
                    onClick={clearError}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Price Comparison */}
              <div className="row mb-4">
                <div className="col-6">
                  <div className="card border-secondary">
                    <div className="card-body text-center">
                      <h6 className="card-subtitle mb-2 text-muted">Current Calculated Price</h6>
                      <h4 className="card-title mb-0" data-testid="calculated-price">
                        €{calculatedPrice.toFixed(2)}
                      </h4>
                      <small className="text-muted">
                        Base: €{currentPrice.base_price_per_night || 0} 
                        {currentPrice.seasonal_adjustment !== 0 && (
                          <span> • Seasonal: {currentPrice.seasonal_adjustment > 0 ? '+' : ''}€{currentPrice.seasonal_adjustment}</span>
                        )}
                        {currentPrice.last_minute_discount > 0 && (
                          <span> • Discount: -€{currentPrice.last_minute_discount}</span>
                        )}
                      </small>
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="card border-primary">
                    <div className="card-body text-center">
                      <h6 className="card-subtitle mb-2 text-muted">
                        {existingOverride ? 'Current Override' : 'New Override Price'}
                      </h6>
                      <h4 className="card-title mb-0 text-primary" data-testid="override-input">
                        €{overridePrice.toFixed(2)}
                      </h4>
                      {overridePrice > 0 && calculatedPrice > 0 && (
                        <small className={`text-${priceDifference >= 0 ? 'success' : 'danger'}`}>
                          {priceDifference >= 0 ? '+' : ''}€{priceDifference.toFixed(2)} 
                          ({percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Override Form */}
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <div className="mb-3">
                  <Controller
                    name="overridePrice"
                    control={form.control}
                    render={() => (
                      <PriceInput
                        name="overridePrice"
                        control={form.control}
                        label="Override Price"
                        currency="€"
                        placeholder="Enter override price"
                        required
                        min={0.01}
                        max={10000}
                        disabled={isSubmitting}
                        className="form-control"
                      />
                    )}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="reason" className="form-label">
                    Reason (Optional)
                  </label>
                  <textarea
                    id="reason"
                    className={`form-control ${form.formState.errors.reason ? 'is-invalid' : ''}`}
                    rows={3}
                    placeholder="Optional reason for price override..."
                    disabled={isSubmitting}
                    {...form.register('reason')}
                  />
                  {form.formState.errors.reason && (
                    <div className="invalid-feedback">
                      {form.formState.errors.reason.message}
                    </div>
                  )}
                </div>
              </form>
            </div>
            
            {/* Modal Footer */}
            <div className="modal-footer bg-light">
              {/* Cancel Button */}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>

              {/* Remove Override Button (only if override exists) */}
              {existingOverride && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleRemoveOverride}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Removing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash me-2"></i>
                      Remove Override
                    </>
                  )}
                </button>
              )}

              {/* Set/Update Override Button */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting || !form.formState.isValid}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {existingOverride ? 'Updating...' : 'Setting Override...'}
                  </>
                ) : (
                  <>
                    <i className={`bi ${existingOverride ? 'bi-pencil' : 'bi-check-circle'} me-2`}></i>
                    {existingOverride ? 'Update Override' : 'Set Override'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default OverridePriceModal