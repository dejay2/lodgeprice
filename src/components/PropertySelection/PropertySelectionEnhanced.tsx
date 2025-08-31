/**
 * PropertySelectionEnhanced Component
 * Enhanced property selection using react-select library with support for global templates
 * Used for Discount Strategies page and other features requiring advanced selection
 */

import { useId, useEffect } from 'react'
import Select, { SingleValue } from 'react-select'
import { usePropertySelection } from './usePropertySelection'
import { PropertySelectionProps } from './PropertySelection.types'
import type { Property } from '../../lib/supabase'

interface PropertyOption {
  value: string | null
  label: string
  property?: Property
  isGlobal?: boolean
  description?: string
}

/**
 * Enhanced PropertySelection component using react-select
 */
export function PropertySelectionEnhanced({
  value,
  onChange,
  placeholder = 'Select a property...',
  disabled = false,
  className = '',
  label = 'Select Property',
  helperText = 'Choose a property to manage pricing and bookings.',
  error: externalError,
  showGlobalTemplate = false
}: Omit<PropertySelectionProps, 'variant'>) {
  const {
    properties,
    isLoading,
    error: fetchError,
    refetch
  } = usePropertySelection()
  
  // Generate unique IDs for accessibility
  const selectId = useId()
  const helperId = useId()
  const errorId = useId()
  
  // Determine which error to display (external error takes precedence)
  const displayError = externalError || fetchError
  
  // Create options array
  const createOptions = (): PropertyOption[] => {
    const options: PropertyOption[] = []
    
    // Add global template option if enabled
    if (showGlobalTemplate) {
      options.push({
        value: null,
        label: '🌍 Global Template (All Properties)',
        isGlobal: true,
        description: 'Apply to all properties'
      })
    }
    
    // Add individual property options
    options.push(...properties.map(property => ({
      value: property.id,
      label: property.property_name,
      property,
      isGlobal: false,
      description: `Base: €${property.base_price_per_day}/night • Min: €${property.min_price_per_day}/night`
    })))
    
    return options
  }
  
  const options = createOptions()
  
  // Group options if global template is shown
  const groupedOptions = showGlobalTemplate ? [
    {
      label: 'Template Options',
      options: options.filter(opt => opt.isGlobal)
    },
    {
      label: 'Individual Properties',
      options: options.filter(opt => !opt.isGlobal)
    }
  ] : options
  
  // Find selected option
  const selectedOption = options.find(opt => opt.value === value) || null
  
  /**
   * Handle selection change
   */
  const handleChange = (newValue: SingleValue<PropertyOption>) => {
    if (newValue?.value === null && showGlobalTemplate) {
      // Handle global template selection - use special property object
      const globalProperty: Property = {
        id: 'global',
        lodgify_property_id: '0',
        property_id: 'global-template',
        lodgify_room_type_id: null,
        property_name: 'Global Template',
        base_price_per_day: 0,
        min_price_per_day: 0,
        active_discount_strategy_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      onChange('global', globalProperty)
    } else if (newValue?.property) {
      onChange(newValue.value!, newValue.property)
      
      // Store in session storage
      try {
        sessionStorage.setItem('selectedPropertyId', newValue.value!)
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
  }
  
  /**
   * Custom option label with additional info
   */
  const formatOptionLabel = (option: PropertyOption) => (
    <div className="property-option">
      <div className="property-option-main">
        {option.label}
      </div>
      {option.description && (
        <div className="property-option-description text-xs text-gray-500">
          {option.description}
        </div>
      )}
    </div>
  )
  
  /**
   * Custom styles for react-select
   */
  const customStyles = {
    control: (base: any, state: any) => ({
      ...base,
      borderColor: state.isFocused ? '#3b82f6' : displayError ? '#ef4444' : '#d1d5db',
      boxShadow: state.isFocused 
        ? '0 0 0 3px rgba(59, 130, 246, 0.1)'
        : displayError 
        ? '0 0 0 3px rgba(239, 68, 68, 0.1)'
        : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#3b82f6' : '#9ca3af'
      }
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected 
        ? '#3b82f6'
        : state.isFocused 
        ? '#f3f4f6' 
        : 'white',
      color: state.isSelected ? 'white' : '#1f2937',
      padding: '8px 12px',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: '#3b82f6',
        color: 'white'
      }
    }),
    menu: (base: any) => ({
      ...base,
      zIndex: 9999
    }),
    menuPortal: (base: any) => ({
      ...base,
      zIndex: 9999
    })
  }
  
  /**
   * Announce changes to screen readers
   */
  useEffect(() => {
    if (isLoading) {
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
  const containerClasses = `property-selection property-selection--enhanced ${className}`.trim()
  
  return (
    <div className={containerClasses} data-testid="property-selection-enhanced">
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
              <button
                type="button"
                onClick={handleRetry}
                className="mt-2 text-sm text-red-700 hover:text-red-900 underline font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                aria-label="Retry loading properties"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* React-Select Dropdown */}
      {!isLoading && !fetchError && (
        <>
          <Select
            inputId={selectId}
            value={selectedOption}
            onChange={handleChange}
            options={showGlobalTemplate ? groupedOptions : options}
            placeholder={placeholder}
            isSearchable
            isClearable={false}
            isDisabled={disabled || properties.length === 0}
            formatOptionLabel={formatOptionLabel}
            styles={customStyles}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            classNamePrefix="property-select"
            noOptionsMessage={() => "No properties found"}
            aria-describedby={`${helperId} ${displayError ? errorId : ''}`}
            aria-invalid={!!displayError}
          />
          
          {/* Helper Text */}
          {helperText && !displayError && (
            <p 
              id={helperId} 
              className="mt-1 text-sm text-gray-500"
            >
              {helperText}
            </p>
          )}
          
          {/* Selected Property Info */}
          {selectedOption && showGlobalTemplate && (
            <div className="mt-2">
              {selectedOption.isGlobal ? (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  This strategy will be a template that can be applied to all properties
                </div>
              ) : (
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  This strategy will apply only to {selectedOption.label}
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

export default PropertySelectionEnhanced