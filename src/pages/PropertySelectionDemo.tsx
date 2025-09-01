/**
 * Demo page for PropertySelection component
 * Demonstrates the component functionality and integration
 */

import { useState } from 'react'
import { PropertySelection } from '../components/PropertySelection'
import type { Property } from '../lib/supabase'

export default function PropertySelectionDemo() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  const handlePropertyChange = (propertyId: string | null, property?: Property) => {
    if (propertyId && property) {
      setSelectedPropertyId(propertyId)
      setSelectedProperty(property)
      console.log('Property selected:', property)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Property Selection Component Demo</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Component Demo</h2>
        
        <PropertySelection
          value={selectedPropertyId}
          onChange={handlePropertyChange}
          label="Select a Holiday Property"
          placeholder="Choose a property..."
          helperText="Select a property to view its details and manage pricing."
        />
      </div>

      {selectedProperty && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Selected Property Details</h3>
          <dl className="space-y-2">
            <div className="flex">
              <dt className="font-medium w-40">Property Name:</dt>
              <dd>{selectedProperty.property_name}</dd>
            </div>
            <div className="flex">
              <dt className="font-medium w-40">Property ID:</dt>
              <dd>{selectedProperty.id}</dd>
            </div>
            <div className="flex">
              <dt className="font-medium w-40">Lodgify ID:</dt>
              <dd>{selectedProperty.lodgify_property_id}</dd>
            </div>
            <div className="flex">
              <dt className="font-medium w-40">Base Price/Day:</dt>
              <dd>€{selectedProperty.base_price_per_day}</dd>
            </div>
            <div className="flex">
              <dt className="font-medium w-40">Min Price/Day:</dt>
              <dd>€{selectedProperty.min_price_per_day}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-100 rounded text-sm">
        <h4 className="font-semibold mb-2">Component Features:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>✅ Fetches properties from Supabase database</li>
          <li>✅ Shows loading state while fetching</li>
          <li>✅ Handles errors with retry functionality</li>
          <li>✅ Persists selection in session storage</li>
          <li>✅ Fully accessible with ARIA attributes</li>
          <li>✅ Keyboard navigation support</li>
          <li>✅ TypeScript type safety</li>
        </ul>
      </div>
    </div>
  )
}