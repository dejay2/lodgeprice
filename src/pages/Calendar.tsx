import { useParams, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import DateRangePicker from '../components/DateRangePicker'
import PricingCalendarGrid from '../components/PricingCalendarGrid'
import { useProperties } from '../hooks/useProperties'
import { addDays } from 'date-fns'
import type { DateRange } from '../types/helpers'

function Calendar() {
  const { propertyId } = useParams<{ propertyId?: string }>()
  const { properties, loading: propertiesLoading } = useProperties()
  
  // State for date range selection (nullable for DateRangePicker)
  const [dateRange, setDateRange] = useState<{start: Date | null, end: Date | null}>(() => {
    // Default to next 30 days
    const today = new Date()
    return {
      start: today,
      end: addDays(today, 30)
    }
  })
  
  // Create DateRange for PricingCalendarGrid (non-nullable)
  const calendarDateRange: DateRange | undefined = 
    dateRange.start && dateRange.end 
      ? { start: dateRange.start, end: dateRange.end } 
      : undefined
  
  // State for selected property (fallback to first property if none provided)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  
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
      setSelectedPropertyId(propertyId)
    } else if (properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(properties[0].lodgify_property_id)
    }
  }, [propertyId, isValidUUID, properties, selectedPropertyId])
  
  // Handle date range changes from DateRangePicker
  const handleDateRangeChange = (startDate: Date | null, endDate: Date | null) => {
    setDateRange({ start: startDate, end: endDate })
  }
  
  // Handle property selection change
  const handlePropertyChange = (newPropertyId: string) => {
    setSelectedPropertyId(newPropertyId)
  }
  
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
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {propertyId ? `Property Calendar` : 'Pricing Calendar'}
        </h1>
        {selectedPropertyId && (
          <p className="mt-1 text-sm text-gray-600">
            Property: {properties.find(p => p.lodgify_property_id === selectedPropertyId)?.property_name || selectedPropertyId}
          </p>
        )}
      </div>
      
      {/* Property selection dropdown (if not specified in URL) */}
      {!propertyId && properties.length > 0 && (
        <div className="bg-white shadow rounded-lg p-4">
          <label htmlFor="property-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Property
          </label>
          <select
            id="property-select"
            value={selectedPropertyId}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose a property...</option>
            {properties.map((property) => (
              <option key={property.lodgify_property_id} value={property.lodgify_property_id}>
                {property.property_name} ({property.lodgify_property_id})
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Date Range Picker */}
      <DateRangePicker
        onDateRangeChange={handleDateRangeChange}
        initialStartDate={dateRange.start || undefined}
        initialEndDate={dateRange.end || undefined}
        className="bg-white shadow rounded-lg"
      />
      
      {/* Pricing Calendar Grid */}
      {selectedPropertyId ? (
        <div className="bg-white shadow rounded-lg p-6">
          <PricingCalendarGrid
            propertyId={selectedPropertyId}
            selectedStayLength={3} // Default to 3 nights stay
            enableInlineEditing={true}
            onBasePriceChanged={(propertyId, newPrice) => {
              console.log('Base price changed:', propertyId, newPrice)
              // Price change is already handled by the PricingCalendarGrid component
            }}
          />
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Select a Property
            </h3>
            <p className="text-gray-600">
              Choose a property above to view its pricing calendar.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar