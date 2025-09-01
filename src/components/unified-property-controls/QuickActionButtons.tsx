/**
 * QuickActionButtons - Quick navigation to management pages
 * Implements FR-5: Quick Access Navigation
 * Provides buttons for seasonal rates and discount management with context preservation
 */

import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUnifiedControlsContext } from './UnifiedPropertyControls'
import { Tooltip } from '../contextual-help'
import type { QuickActionButtonsProps } from './types'

/**
 * QuickActionButtons component for navigation to management pages
 * Preserves property context across page transitions using React Router state
 */
const QuickActionButtons: React.FC<QuickActionButtonsProps> = ({ 
  property,
  disabled = false,
  className = ''
}) => {
  const navigate = useNavigate()
  const { selectedProperty } = useUnifiedControlsContext()
  const activeProperty = property || selectedProperty

  /**
   * Navigate to seasonal rates management with property context
   * FR-1: Navigation to /seasonal-rates with property context preserved
   */
  const handleSeasonalRatesClick = useCallback(() => {
    if (!activeProperty) return
    
    // Navigate with property context in state (React Router v6 pattern)
    navigate('/seasonal-rates', {
      state: {
        propertyId: activeProperty.id,
        lodgifyPropertyId: activeProperty.lodgify_property_id,
        propertyName: activeProperty.property_name,
        fromCalendar: true
      }
    })
    
    // Also store in sessionStorage as backup for page refreshes
    sessionStorage.setItem('selectedPropertyId', activeProperty.id)
  }, [activeProperty, navigate])

  /**
   * Navigate to discount strategies management with property context
   * FR-2: Navigation to /discount-strategies with property context preserved
   */
  const handleDiscountStrategiesClick = useCallback(() => {
    if (!activeProperty) return
    
    // Navigate with property context in state (React Router v6 pattern)
    navigate('/discount-strategies', {
      state: {
        propertyId: activeProperty.id,
        lodgifyPropertyId: activeProperty.lodgify_property_id,
        propertyName: activeProperty.property_name,
        fromCalendar: true
      }
    })
    
    // Also store in sessionStorage as backup for page refreshes
    sessionStorage.setItem('selectedPropertyId', activeProperty.id)
  }, [activeProperty, navigate])

  // FR-6: Buttons disabled when no property selected
  if (!activeProperty) {
    return (
      <div className={`quick-action-buttons text-muted ${className}`} data-testid="quick-action-buttons">
        <small>Select a property to enable quick management access</small>
      </div>
    )
  }

  return (
    <div className={`quick-action-buttons ${className}`} data-testid="quick-action-buttons">
      <label className="text-muted small mb-2 d-block">Quick Actions</label>
      <div className="d-flex flex-column gap-2">
        <Tooltip
          content="Navigate to Seasonal Rates management (property context preserved)"
          placement="top"
          delay={200}
        >
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={handleSeasonalRatesClick}
            disabled={disabled || !activeProperty}
            data-testid="manage-seasonal-rates-button"
            aria-label={`Manage seasonal rates for ${activeProperty?.property_name || 'selected property'}`}
          >
            <span className="d-flex align-items-center justify-content-center">
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                className="me-1"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Manage Seasonal Rates
            </span>
          </button>
        </Tooltip>
        
        <Tooltip
          content="Navigate to Discount Strategy management (property context preserved)"
          placement="top"
          delay={200}
        >
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={handleDiscountStrategiesClick}
            disabled={disabled || !activeProperty}
            data-testid="manage-discounts-button"
            aria-label={`Manage discount strategies for ${activeProperty?.property_name || 'selected property'}`}
          >
          <span className="d-flex align-items-center justify-content-center">
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className="me-1"
              aria-hidden="true"
            >
              <polyline points="20 12 20 22 4 22 4 12"></polyline>
              <rect x="2" y="7" width="20" height="5"></rect>
              <line x1="12" y1="22" x2="12" y2="7"></line>
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
            </svg>
            Manage Discounts
          </span>
        </button>
        </Tooltip>
      </div>
    </div>
  )
}

export default QuickActionButtons