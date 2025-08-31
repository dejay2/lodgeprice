import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProperties } from '@/hooks/useProperties'
import { formatCurrency } from '@/utils/dateHelpers'
import type { Property } from '@/types/database'

export default function Properties() {
  // Update document title
  useEffect(() => {
    document.title = 'Properties - Lodgeprice'
  }, [])
  const navigate = useNavigate()
  const { properties, loading, error, refetch } = useProperties()
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading properties...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error Loading Properties
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                onClick={() => refetch()}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Property Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your {properties.length} holiday rental properties and their pricing settings.
        </p>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {properties.map((property) => (
          <div
            key={property.id}
            className="bg-white shadow rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedProperty(property)}
          >
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {property.property_name}
                </h3>
                <span className="text-sm text-gray-500">
                  Lodgify ID: {property.lodgify_property_id}
                </span>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Base Price</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(property.base_price_per_day)}/day
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Minimum Price</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(property.min_price_per_day)}/day
                  </p>
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Last updated: {property.updated_at 
                    ? new Date(property.updated_at).toLocaleDateString() 
                    : 'Never'
                  }
                </div>
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedProperty(property)
                  }}
                >
                  View Details →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Property Details Modal/Panel */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedProperty.property_name}
                </h3>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => setSelectedProperty(null)}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Internal ID (UUID)
                    </label>
                    <p className="mt-1 text-xs text-gray-900 font-mono">{selectedProperty.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Lodgify Property ID
                    </label>
                    <p className="mt-1 text-sm text-gray-900 font-semibold">{selectedProperty.lodgify_property_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Base Price per Day
                    </label>
                    <p className="mt-1 text-lg font-semibold text-green-600">
                      {formatCurrency(selectedProperty.base_price_per_day)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Minimum Price per Day
                    </label>
                    <p className="mt-1 text-lg font-semibold text-red-600">
                      {formatCurrency(selectedProperty.min_price_per_day)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Created
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedProperty.created_at ? new Date(selectedProperty.created_at).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Last Updated
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedProperty.updated_at ? new Date(selectedProperty.updated_at).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Actions</h4>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/calendar/${selectedProperty.lodgify_property_id}`)
                      }}
                    >
                      Manage Pricing
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {properties.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No properties</h3>
          <p className="mt-1 text-sm text-gray-500">
            No properties found in the database.
          </p>
        </div>
      )}
    </div>
  )
}