/**
 * DiscountStrategies - Main page component for managing discount strategies
 * Provides complete CRUD operations for discount strategies across all properties
 */

import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useProperties } from '@/hooks/useProperties'
import DiscountStrategyPanel from '@/components/DiscountStrategyPanel'
import PropertySelection from '@/components/PropertySelection/PropertySelection'
import type { Property } from '@/types/database'

export default function DiscountStrategies() {
  const location = useLocation()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [_selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const { properties, loading: propertiesLoading, error: propertiesError, refetch } = useProperties()

  // Handle incoming property context from navigation state (FR-3)
  useEffect(() => {
    if (location.state && location.state.propertyId) {
      const { propertyId } = location.state as {
        propertyId: string
        lodgifyPropertyId?: string
        propertyName?: string
        fromCalendar?: boolean
      }
      
      // Set the property ID from navigation state
      setSelectedPropertyId(propertyId)
      
      // Find and set the full property object
      const property = properties.find(p => p.id === propertyId)
      if (property) {
        setSelectedProperty(property)
      }
    } else {
      // Fallback to sessionStorage if no navigation state
      const storedPropertyId = sessionStorage.getItem('selectedPropertyId')
      if (storedPropertyId) {
        setSelectedPropertyId(storedPropertyId)
        const property = properties.find(p => p.id === storedPropertyId)
        if (property) {
          setSelectedProperty(property)
        }
      }
    }
  }, [location.state, properties])

  /**
   * Handle property selection change
   */
  const handlePropertyChange = (propertyId: string | null, property?: Property) => {
    if (propertyId && property) {
      setSelectedPropertyId(propertyId)
      setSelectedProperty(property)
    }
  }

  /**
   * Handle strategy changes
   */
  const handleStrategyChange = () => {
    // Refresh can be triggered here if needed
    // Currently DiscountStrategyPanel manages its own state
  }

  return (
    <div className="discount-strategies-page">
      {/* Page Header */}
      <div className="page-header mb-6">
        <div className="page-title-section">
          <h1 className="text-2xl font-bold text-gray-900">Discount Strategies Management</h1>
          <p className="page-subtitle text-gray-600 mt-1">
            Create and manage last-minute discount strategies for your properties
          </p>
        </div>
      </div>

      {/* Property Selection */}
      <div className="property-selection-section mb-6">
        <PropertySelection
          value={selectedPropertyId || undefined}
          onChange={handlePropertyChange}
          placeholder="Select a property to manage discount strategies..."
          label="Select Property"
          helperText="Choose a property to view and manage its discount strategies. You can also apply strategies to all properties."
          disabled={propertiesLoading}
          variant="enhanced"
          showGlobalTemplate={true}
        />
      </div>

      {/* Error Display for Properties */}
      {propertiesError && (
        <div className="error-banner bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <strong>Error:</strong> {propertiesError}
          <button onClick={() => refetch()} className="ml-2 text-red-700 hover:text-red-900 underline">
            Retry
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="page-content">
        <DiscountStrategyPanel
          propertyId={selectedPropertyId || undefined}
          onStrategyChange={handleStrategyChange}
        />
      </div>

      {/* Help Section */}
      <div className="help-section mt-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Help</h3>
        <div className="help-grid grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="help-item">
            <h4 className="font-medium text-gray-800 mb-1">📅 Activation Window</h4>
            <p className="text-sm text-gray-600">
              Define how many days before check-in the discount strategy becomes active.
            </p>
          </div>
          <div className="help-item">
            <h4 className="font-medium text-gray-800 mb-1">📊 Discount Range</h4>
            <p className="text-sm text-gray-600">
              Set minimum and maximum discount percentages. Rules within this range apply based on proximity to check-in.
            </p>
          </div>
          <div className="help-item">
            <h4 className="font-medium text-gray-800 mb-1">📋 Rules Management</h4>
            <p className="text-sm text-gray-600">
              Add specific rules for different days before check-in. Rules can be limited to specific stay lengths.
            </p>
          </div>
          <div className="help-item">
            <h4 className="font-medium text-gray-800 mb-1">🏠 Property Application</h4>
            <p className="text-sm text-gray-600">
              Apply strategies to individual properties or all properties at once for consistent discount policies.
            </p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Discounts are automatically applied when bookings are made within the activation window. 
            The final price will never go below the property's minimum price per day.
          </p>
        </div>
      </div>
    </div>
  )
}