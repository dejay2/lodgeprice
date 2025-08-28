import { useParams, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { usePricingContext } from '../context/PricingContext'
import { useProperties } from '../hooks/useProperties'
import PricingDashboard from '../components/PricingDashboard'

function Calendar() {
  const { propertyId } = useParams<{ propertyId?: string }>()
  const { properties, loading: propertiesLoading } = useProperties()
  const { setSelectedProperty } = usePricingContext()
  
  // Validate UUID format if propertyId is provided
  const isValidUUID = propertyId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)
  
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
    if (propertyId && isValidUUID) {
      const property = properties.find(p => p.lodgify_property_id === propertyId)
      if (property) {
        setSelectedProperty(property)
      }
    } else if (properties.length > 0) {
      // Default to first property if none specified
      setSelectedProperty(properties[0])
    }
  }, [propertyId, isValidUUID, properties, setSelectedProperty])
  
  // If propertyId is provided but invalid, redirect to general calendar
  if (propertyId && !isValidUUID) {
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
  
  // Use PricingDashboard which includes preview functionality
  return <PricingDashboard />
}

export default Calendar