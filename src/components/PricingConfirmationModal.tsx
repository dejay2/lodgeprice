/**
 * PricingConfirmationModal - Confirmation modal with before/after pricing comparison
 * Implements FR-2: Show before/after pricing comparison in confirmation modal
 * Following UX best practices from PRP research
 */

import React, { useMemo } from 'react'
import { usePricingPreview } from '@/context/PricingPreviewContext'
import { format } from 'date-fns'

interface PricingConfirmationModalProps {
  propertyName?: string
}

const PricingConfirmationModal: React.FC<PricingConfirmationModalProps> = ({ 
  propertyName = 'Property' 
}) => {
  const {
    showConfirmationModal,
    setShowConfirmationModal,
    pendingChanges,
    originalPricing,
    previewPricing,
    confirmChanges,
    isConfirming,
    calculationError,
    clearError
  } = usePricingPreview()
  
  // Calculate affected dates and pricing differences
  const pricingComparison = useMemo(() => {
    const comparison: Array<{
      date: string
      original: number
      preview: number
      difference: number
      percentChange: number
    }> = []
    
    // Get all dates that have changes
    const affectedDates = new Set<string>()
    pendingChanges.forEach(change => {
      if (change.date) {
        affectedDates.add(change.date.toISOString().split('T')[0])
      }
      if (change.dateRange) {
        const current = new Date(change.dateRange.start)
        const end = new Date(change.dateRange.end)
        while (current <= end) {
          affectedDates.add(current.toISOString().split('T')[0])
          current.setDate(current.getDate() + 1)
        }
      }
    })
    
    // Compare pricing for affected dates
    affectedDates.forEach(dateKey => {
      const original = originalPricing.get(dateKey)
      const preview = previewPricing.get(dateKey)
      
      if (original && preview) {
        const originalPrice = original.final_price_per_night || 0
        const previewPrice = preview.final_price_per_night || 0
        const difference = previewPrice - originalPrice
        const percentChange = originalPrice > 0 
          ? ((difference / originalPrice) * 100) 
          : 0
        
        comparison.push({
          date: dateKey,
          original: originalPrice,
          preview: previewPrice,
          difference,
          percentChange
        })
      }
    })
    
    return comparison.sort((a, b) => a.date.localeCompare(b.date))
  }, [pendingChanges, originalPricing, previewPricing])
  
  const handleConfirm = async () => {
    try {
      await confirmChanges()
    } catch (error) {
      console.error('Failed to confirm changes:', error)
    }
  }
  
  const handleCancel = () => {
    if (!isConfirming) {
      setShowConfirmationModal(false)
      clearError()
    }
  }
  
  if (!showConfirmationModal) return null
  
  // Calculate summary statistics
  const totalChanges = pricingComparison.length
  const avgOriginal = pricingComparison.reduce((sum, item) => sum + item.original, 0) / totalChanges || 0
  const avgPreview = pricingComparison.reduce((sum, item) => sum + item.preview, 0) / totalChanges || 0
  const avgDifference = avgPreview - avgOriginal
  const avgPercentChange = avgOriginal > 0 ? ((avgDifference / avgOriginal) * 100) : 0
  
  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="modal-backdrop fade show"
        onClick={handleCancel}
        style={{ zIndex: 1050 }}
      />
      
      {/* Modal Dialog */}
      <div 
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-labelledby="pricing-confirmation-title"
        aria-describedby="pricing-confirmation-description"
        style={{ zIndex: 1051 }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            {/* Modal Header */}
            <div className="modal-header bg-light">
              <div>
                <h5 className="modal-title" id="pricing-confirmation-title">
                  Confirm Pricing Changes
                </h5>
                <p className="text-muted small mb-0" id="pricing-confirmation-description">
                  Review the impact of your pricing adjustments on {totalChanges} date{totalChanges !== 1 ? 's' : ''} for {propertyName}
                </p>
              </div>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={handleCancel}
                disabled={isConfirming}
              />
            </div>
            
            {/* Modal Body */}
            <div className="modal-body">
              {calculationError && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {calculationError}
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={clearError}
                  />
                </div>
              )}
              
              {/* Summary Statistics */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="card border-secondary">
                    <div className="card-body text-center">
                      <h6 className="card-subtitle mb-2 text-muted">Average Current Price</h6>
                      <h4 className="card-title mb-0">€{avgOriginal.toFixed(0)}</h4>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-primary">
                    <div className="card-body text-center">
                      <h6 className="card-subtitle mb-2 text-muted">Average New Price</h6>
                      <h4 className="card-title mb-0 text-primary">€{avgPreview.toFixed(0)}</h4>
                      <small className={`text-${avgDifference > 0 ? 'success' : 'danger'}`}>
                        {avgDifference > 0 ? '+' : ''}€{avgDifference.toFixed(0)} 
                        ({avgPercentChange > 0 ? '+' : ''}{avgPercentChange.toFixed(1)}%)
                      </small>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Detailed Comparison Table */}
              <div className="pricing-comparison">
                <h6 className="mb-3">Detailed Price Comparison</h6>
                <div className="table-responsive" style={{ maxHeight: '400px' }}>
                  <table className="table table-sm table-hover">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>Date</th>
                        <th className="text-end">Current Price</th>
                        <th className="text-end">New Price</th>
                        <th className="text-end">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricingComparison.map(item => (
                        <tr key={item.date}>
                          <td>{format(new Date(item.date), 'EEE, MMM dd, yyyy')}</td>
                          <td className="text-end text-muted">€{item.original.toFixed(0)}</td>
                          <td className="text-end text-primary fw-bold">€{item.preview.toFixed(0)}</td>
                          <td className={`text-end ${item.difference > 0 ? 'text-success' : 'text-danger'}`}>
                            {item.difference > 0 ? '+' : ''}€{item.difference.toFixed(0)}
                            <small className="ms-1 text-muted">
                              ({item.percentChange > 0 ? '+' : ''}{item.percentChange.toFixed(1)}%)
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Change Summary */}
              <div className="mt-3">
                <h6 className="mb-2">Changes to be Applied:</h6>
                <ul className="list-unstyled small">
                  {pendingChanges.map(change => (
                    <li key={change.id} className="mb-1">
                      <i className="bi bi-check-circle text-success me-2"></i>
                      {change.description}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="modal-footer bg-light">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={isConfirming}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Confirm Changes
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

export default PricingConfirmationModal