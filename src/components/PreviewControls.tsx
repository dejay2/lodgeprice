/**
 * PreviewControls - Control buttons for preview mode functionality
 * Implements FR-5: Clear cancel/confirm workflow with visual feedback
 */

import React from 'react'
import { usePricingPreview } from '@/context/PricingPreviewContext'

interface PreviewControlsProps {
  className?: string
}

const PreviewControls: React.FC<PreviewControlsProps> = ({ className = '' }) => {
  const {
    isPreviewMode,
    startPreview,
    cancelPreview,
    pendingChanges,
    setShowConfirmationModal,
    isCalculating
  } = usePricingPreview()
  
  if (!isPreviewMode) {
    return (
      <div className={`preview-controls ${className}`}>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={startPreview}
          disabled={isCalculating}
        >
          <i className="bi bi-eye me-2"></i>
          Enter Preview Mode
        </button>
      </div>
    )
  }
  
  const hasChanges = pendingChanges.length > 0
  
  return (
    <div className={`preview-controls preview-controls--active ${className}`}>
      <div className="d-flex align-items-center gap-3">
        <div className="preview-mode-badge">
          <span className="badge bg-warning text-dark">
            <i className="bi bi-eye-fill me-1"></i>
            PREVIEW MODE
          </span>
          {hasChanges && (
            <span className="badge bg-info ms-2">
              {pendingChanges.length} change{pendingChanges.length !== 1 ? 's' : ''} pending
            </span>
          )}
        </div>
        
        <div className="preview-actions d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={cancelPreview}
            disabled={isCalculating}
          >
            <i className="bi bi-x-circle me-2"></i>
            Cancel Preview
          </button>
          
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowConfirmationModal(true)}
            disabled={!hasChanges || isCalculating}
          >
            <i className="bi bi-check-circle me-2"></i>
            Apply Changes ({pendingChanges.length})
          </button>
        </div>
      </div>
    </div>
  )
}

export default PreviewControls