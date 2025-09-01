/**
 * PropertySelection Component
 * A reusable dropdown component for selecting properties from the database
 * Includes loading states, error handling, and accessibility features
 */

import React, { ChangeEvent, useId, useEffect, useRef } from 'react'
import { usePropertySelection } from './usePropertySelection'
import { PropertySelectionProps, ERROR_SCENARIOS } from './PropertySelection.types'

/**
 * PropertySelection component for selecting a holiday rental property
 * Supports both standard HTML select and enhanced react-select variants
 */
export function PropertySelection({
  value,
  onChange,
  placeholder = 'Select a property...',
  disabled = false,
  className = '',
  label = 'Select Property',
  helperText = 'Choose a property to manage pricing and bookings.',
  error: externalError,
  variant = 'standard',
  showGlobalTemplate = false
}: PropertySelectionProps) {
  // Always call ALL hooks at the top level before any conditionals
  const {
    properties,
    isLoading,
    error: fetchError,
    refetch
  } = usePropertySelection()
  
  // Generate unique IDs for accessibility (must be before any returns)
  const selectId = useId()
  const helperId = useId()
  const errorId = useId()
  
  // Ref for managing focus (must be before any returns)
  const selectRef = useRef<HTMLSelectElement>(null)
  
  // Determine which error to display (external error takes precedence)
  const displayError = externalError || fetchError
  
  /**
   * Handle selection change
   */
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const propertyId = event.target.value
    
    if (!propertyId) {
      // Handle empty selection if needed
      return
    }
    
    // Handle global template selection
    if (propertyId === 'global' && showGlobalTemplate) {
      onChange(null, undefined)
      return
    }
    
    const property = properties.find(p => p.id === propertyId)
    
    if (property) {
      onChange(propertyId, property)
      
      // Store in session storage
      try {
        sessionStorage.setItem('selectedPropertyId', propertyId)
      } catch (error) {
        console.warn('Failed to persist selection:', error)
      }
    }
  }
  
  /**
   * Handle retry button click
   */
  const handleRetry = () => {
    refetch()
    // Focus back on select after retry
    setTimeout(() => {
      selectRef.current?.focus()
    }, 100)
  }
  
  /**
   * Determine if retry button should be shown
   */
  const shouldShowRetry = () => {
    if (!fetchError) return false
    
    // Determine error scenario
    const errorLower = fetchError.toLowerCase()
    
    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return ERROR_SCENARIOS.networkError.action === 'retry'
    }
    if (errorLower.includes('authorization') || errorLower.includes('session')) {
      return ERROR_SCENARIOS.authError.action === 'refresh'
    }
    if (errorLower.includes('no properties')) {
      return ERROR_SCENARIOS.dataError.action === 'fallback'
    }
    
    return true // Default to showing retry
  }
  
  /**
   * Format property option text
   */
  const formatOptionText = (property: typeof properties[0]) => {
    return `${property.property_name} (€${property.base_price_per_day}/day)`
  }
  
  /**
   * Announce changes to screen readers
   */
  useEffect(() => {
    if (isLoading) {
      // Announce loading state to screen readers
      const announcement = document.createElement('div')
      announcement.setAttribute('role', 'status')
      announcement.setAttribute('aria-live', 'polite')
      announcement.className = 'sr-only'
      announcement.textContent = 'Loading properties...'
      document.body.appendChild(announcement)
      
      return () => {
        document.body.removeChild(announcement)
      }
    }
    return undefined
  }, [isLoading])
  
  /**
   * Announce errors to screen readers
   */
  useEffect(() => {
    if (displayError) {
      // Announce error to screen readers
      const announcement = document.createElement('div')
      announcement.setAttribute('role', 'alert')
      announcement.setAttribute('aria-live', 'assertive')
      announcement.className = 'sr-only'
      announcement.textContent = `Error: ${displayError}`
      document.body.appendChild(announcement)
      
      return () => {
        document.body.removeChild(announcement)
      }
    }
    return undefined
  }, [displayError])
  
  // Build component classes
  const containerClasses = `property-selection ${className}`.trim()
  const selectClasses = [
    'property-selection__select',
    'w-full px-3 py-2 border rounded-lg',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    'disabled:bg-gray-100 disabled:cursor-not-allowed',
    displayError ? 'border-red-500' : 'border-gray-300'
  ].join(' ')
  
  // Lazy load the enhanced variant when needed
  if (variant === 'enhanced') {
    const PropertySelectionEnhanced = React.lazy(() => import('./PropertySelectionEnhanced'))
    return (
      <React.Suspense fallback={
        <div className="flex items-center justify-center py-3 px-4 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-gray-600">Loading enhanced selector...</span>
        </div>
      }>
        <PropertySelectionEnhanced
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
          label={label}
          helperText={helperText}
          error={externalError}
          showGlobalTemplate={showGlobalTemplate}
        />
      </React.Suspense>
    )
  }
  
  return (
    <div className={containerClasses} data-testid="property-selection">
      {/* Label */}
      <label 
        htmlFor={selectId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      
      {/* Loading State */}
      {isLoading && (
        <div 
          className="flex items-center justify-center py-3 px-4 bg-gray-50 border border-gray-200 rounded-lg"
          role="status"
          aria-live="polite"
        >
          <svg 
            className="animate-spin h-5 w-5 mr-3 text-gray-500" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
              fill="none"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-gray-600">Loading properties...</span>
        </div>
      )}
      
      {/* Error State */}
      {!isLoading && displayError && (
        <div 
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-2"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start">
            <svg 
              className="flex-shrink-0 h-5 w-5 text-red-400 mt-0.5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                clipRule="evenodd" 
              />
            </svg>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium" id={errorId}>
                {displayError}
              </p>
              {shouldShowRetry() && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-2 text-sm text-red-700 hover:text-red-900 underline font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  aria-label="Retry loading properties"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Select Dropdown */}
      {!isLoading && !fetchError && (
        <>
          <select
            ref={selectRef}
            id={selectId}
            data-testid="selected-property"
            value={value === null ? 'global' : (value || '')}
            onChange={handleChange}
            disabled={disabled || properties.length === 0}
            className={selectClasses}
            aria-describedby={`${helperId} ${displayError ? errorId : ''}`}
            aria-invalid={!!displayError}
            aria-busy={isLoading}
          >
            <option value="">{placeholder}</option>
            {showGlobalTemplate && (
              <option value="global">
                🌍 Global Template (All Properties)
              </option>
            )}
            {properties.map(property => (
              <option 
                key={property.id} 
                value={property.id}
                data-testid={`property-option-${property.id}`}
              >
                {formatOptionText(property)}
              </option>
            ))}
          </select>
          
          {/* Helper Text */}
          {helperText && !displayError && (
            <p 
              id={helperId} 
              className="mt-1 text-sm text-gray-500"
            >
              {helperText}
            </p>
          )}
          
          {/* Global Template Info */}
          {showGlobalTemplate && value !== undefined && (
            <div className="mt-2">
              {value === null ? (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  This strategy will be a template that can be applied to all properties
                </div>
              ) : value && (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  This strategy will apply only to selected property
                </div>
              )}
            </div>
          )}
        </>
      )}
      
      {/* Empty State */}
      {!isLoading && !fetchError && properties.length === 0 && (
        <div 
          className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg"
          role="status"
        >
          <p className="text-sm">
            No properties available. Please contact support if this issue persists.
          </p>
        </div>
      )}
      
      {/* Development Mode Info */}
      {import.meta.env.DEV && properties.length > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          <p>Dev Mode: {properties.length} properties loaded</p>
        </div>
      )}
    </div>
  )
}

// Default export for convenience
export default PropertySelection