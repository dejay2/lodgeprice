/**
 * PreviewSummary - Shows summary of pending pricing changes
 * Implements FR-7: Handle multiple simultaneous pricing changes
 */

import React from 'react'
import { usePricingPreview } from '@/context/PricingPreviewContext'
import { format } from 'date-fns'

interface PreviewSummaryProps {
  className?: string
  compact?: boolean
}

const PreviewSummary: React.FC<PreviewSummaryProps> = ({ 
  className = '', 
  compact = false 
}) => {
  const { pendingChanges, removePricingChange, clearAllChanges, isPreviewMode } = usePricingPreview()
  
  if (!isPreviewMode || pendingChanges.length === 0) {
    return null
  }
  
  if (compact) {
    return (
      <div className={`preview-summary preview-summary--compact ${className}`}>
        <div className="alert alert-warning mb-0 d-flex justify-content-between align-items-center">
          <span>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {pendingChanges.length} unsaved change{pendingChanges.length !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-warning"
            onClick={clearAllChanges}
          >
            Clear All
          </button>
        </div>
      </div>
    )
  }
  
  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'basePrice':
        return 'bi-currency-euro'
      case 'seasonal':
        return 'bi-calendar-range'
      case 'discount':
        return 'bi-percent'
      default:
        return 'bi-pencil-square'
    }
  }
  
  const formatChangeValue = (type: string, value: any) => {
    if (type === 'basePrice') {
      return `€${value}`
    }
    if (type === 'discount') {
      return `${value}%`
    }
    return value
  }
  
  return (
    <div className={`preview-summary ${className}`}>
      <div className="card">
        <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="bi bi-list-check me-2"></i>
            Pending Changes ({pendingChanges.length})
          </h6>
          <button
            type="button"
            className="btn btn-sm btn-warning"
            onClick={clearAllChanges}
          >
            Clear All
          </button>
        </div>
        <div className="card-body">
          <div className="list-group list-group-flush">
            {pendingChanges.map((change) => (
              <div key={change.id} className="list-group-item px-0">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      <i className={`${getChangeIcon(change.type)} me-2 text-primary`}></i>
                      <strong>{change.description}</strong>
                    </div>
                    <div className="text-muted small">
                      {change.date && (
                        <span className="me-3">
                          <i className="bi bi-calendar me-1"></i>
                          {format(change.date, 'MMM dd, yyyy')}
                        </span>
                      )}
                      {change.dateRange && (
                        <span className="me-3">
                          <i className="bi bi-calendar-range me-1"></i>
                          {format(change.dateRange.start, 'MMM dd')} - {format(change.dateRange.end, 'MMM dd, yyyy')}
                        </span>
                      )}
                      <span>
                        {formatChangeValue(change.type, change.oldValue)} 
                        <i className="bi bi-arrow-right mx-1"></i>
                        <strong className="text-primary">
                          {formatChangeValue(change.type, change.newValue)}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger ms-2"
                    onClick={() => removePricingChange(change.id)}
                    title="Remove this change"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreviewSummary