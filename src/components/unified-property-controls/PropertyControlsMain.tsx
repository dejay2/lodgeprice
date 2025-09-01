/**
 * PropertyControlsMain - Container component for unified property controls
 * Provides consistent layout and styling for all control elements
 */

import React from 'react'
import type { PropertyControlsMainProps } from './types'

/**
 * Main container component that wraps all control elements
 * Provides Bootstrap card layout with responsive design
 */
const PropertyControlsMain: React.FC<PropertyControlsMainProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div 
      className={`property-controls-main card shadow-sm ${className}`}
      data-testid="property-controls-main"
    >
      <div className="card-body">
        <div className="d-flex align-items-center mb-3">
          <h5 className="card-title mb-0 me-2">Property Management</h5>
          <span className="badge bg-primary">Unified Controls</span>
        </div>
        {children}
      </div>
    </div>
  )
}

export default PropertyControlsMain