import { useParams, Navigate } from 'react-router-dom'
import { useEffect } from 'react'

function Calendar() {
  const { propertyId } = useParams<{ propertyId?: string }>()
  
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
  
  // If propertyId is provided but invalid, redirect to general calendar
  if (propertyId && !isValidUUID) {
    return <Navigate to="/calendar" replace />
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {propertyId ? `Property Calendar` : 'All Properties Calendar'}
        </h1>
        {propertyId && (
          <p className="mt-1 text-sm text-gray-600">
            Property ID: {propertyId}
          </p>
        )}
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📅</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Calendar View Coming Soon
          </h3>
          <p className="text-gray-600">
            {propertyId 
              ? `The calendar for property ${propertyId} will be displayed here.`
              : 'The master calendar view for all properties will be displayed here.'
            }
          </p>
          <p className="text-sm text-gray-500 mt-4">
            This will show daily pricing, allow inline editing, and manage seasonal rates.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Calendar