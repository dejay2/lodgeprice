import { useParams, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { usePricingContext } from '../context/PricingContext'
import { useProperties } from '../hooks/useProperties'
import PricingDashboard from '../components/PricingDashboard'

function Calendar() {
  const { propertyId } = useParams<{ propertyId?: string }>()
  const { properties, loading: propertiesLoading } = useProperties()
  const { selectedProperty, setSelectedProperty } = usePricingContext()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  
  // Validate propertyId format - accept numeric strings (lodgify_property_id)
  const isValidPropertyId = propertyId && /^\d+$/.test(propertyId)
  
  // Update document title based on route
  useEffect(() => {
    if (propertyId) {
      document.title = `Property Calendar - Lodgeprice`
    } else {
      document.title = `Calendar - Lodgeprice`
    }
  }, [propertyId])
  

  // Set selected property from URL or default to first property
  useEffect(() => {
    if (propertyId && isValidPropertyId) {
      const property = properties.find(p => p.lodgify_property_id === propertyId)
      if (property) {
        setSelectedProperty(property)
        setSelectedPropertyId(property.id)
      }
    } else if (properties.length > 0 && !selectedProperty) {
      // Default to first property if none specified
      setSelectedProperty(properties[0])
      setSelectedPropertyId(properties[0].id)
    }
  }, [propertyId, isValidPropertyId, properties, setSelectedProperty, selectedProperty])

  // Sync selectedPropertyId with selectedProperty
  useEffect(() => {
    if (selectedProperty && selectedPropertyId !== selectedProperty.id) {
      setSelectedPropertyId(selectedProperty.id)
    }
  }, [selectedProperty, selectedPropertyId])
  
  // If propertyId is provided but invalid, redirect to general calendar
  if (propertyId && !isValidPropertyId) {
    return <Navigate to="/calendar" replace />
  }
  
  // Show loading state while properties are loading
  if (propertiesLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📅</div>
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    )
  }
  
  // Render PricingDashboard which now contains unified property controls in its header
  return (
    <div className="calendar-page">
      {/* Pricing Dashboard with integrated unified property controls in header */}
      <PricingDashboard />
    </div>
  )
}

export default Calendar