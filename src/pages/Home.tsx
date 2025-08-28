import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { validateSupabaseConnection } from '@/lib/supabase'
import { useProperties } from '@/hooks/useProperties'

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<{
    loading: boolean
    success: boolean
    error?: string
  }>({
    loading: true,
    success: false
  })

  const { properties, loading: propertiesLoading, error: propertiesError } = useProperties()

  useEffect(() => {
    async function checkConnection() {
      const result = await validateSupabaseConnection()
      setConnectionStatus({
        loading: false,
        success: result.success,
        error: result.error
      })
    }

    checkConnection()
  }, [])

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
          Lodgeprice 2.0
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Holiday Rental Pricing Management Interface for efficient property pricing, 
          seasonal adjustments, and discount strategies.
        </p>
      </div>

      {/* Connection Status Card */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            System Status
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Database connection and application health status.</p>
          </div>
          
          <div className="mt-5">
            <div className="flex items-center space-x-3">
              <div className={`flex-shrink-0 h-3 w-3 rounded-full ${
                connectionStatus.loading 
                  ? 'bg-yellow-400 animate-pulse' 
                  : connectionStatus.success 
                    ? 'bg-green-400' 
                    : 'bg-red-400'
              }`}></div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Database Connection: {
                    connectionStatus.loading 
                      ? 'Checking...' 
                      : connectionStatus.success 
                        ? 'Connected' 
                        : 'Failed'
                  }
                </p>
                {connectionStatus.error && (
                  <p className="text-sm text-red-600 mt-1">
                    Error: {connectionStatus.error}
                  </p>
                )}
              </div>
            </div>
            
            <div className="mt-3 flex items-center space-x-3">
              <div className={`flex-shrink-0 h-3 w-3 rounded-full ${
                propertiesLoading 
                  ? 'bg-yellow-400 animate-pulse' 
                  : propertiesError 
                    ? 'bg-red-400' 
                    : 'bg-green-400'
              }`}></div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Properties Loaded: {
                    propertiesLoading 
                      ? 'Loading...' 
                      : propertiesError 
                        ? 'Failed' 
                        : `${properties.length} properties`
                  }
                </p>
                {propertiesError && (
                  <p className="text-sm text-red-600 mt-1">
                    Error: {propertiesError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Properties Overview */}
      {!propertiesLoading && !propertiesError && properties.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Property Portfolio
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Overview of your {properties.length} holiday rental properties.</p>
            </div>
            
            <div className="mt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties.slice(0, 6).map((property) => (
                  <div key={property.id} className="border border-gray-200 rounded-lg p-3">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {property.property_name}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Base: €{property.base_price_per_day}/day
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Lodgify ID: {property.property_id}
                    </p>
                  </div>
                ))}
              </div>
              
              {properties.length > 6 && (
                <p className="mt-3 text-sm text-gray-500">
                  And {properties.length - 6} more properties...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Quick Actions
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Get started with pricing management.</p>
          </div>
          
          <div className="mt-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/properties"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Manage Properties
              </Link>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled
              >
                View Calendar (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <details className="text-sm text-gray-600">
          <summary className="cursor-pointer font-medium">Environment Information</summary>
          <div className="mt-2 space-y-1">
            <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</p>
            <p>API Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</p>
            <p>Node Environment: {import.meta.env.MODE}</p>
          </div>
        </details>
      </div>
    </div>
  )
}