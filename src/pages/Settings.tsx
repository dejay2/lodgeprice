import { useEffect } from 'react'

function Settings() {
  // Update document title
  useEffect(() => {
    document.title = 'Settings - Lodgeprice'
  }, [])
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure your pricing management preferences and integrations.
        </p>
      </div>
      
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">General Settings</h2>
          <p className="mt-1 text-sm text-gray-600">
            Basic configuration options for the application.
          </p>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Property View
              </label>
              <select className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                <option>All Properties</option>
                <option>Property Grid View</option>
                <option>Calendar View</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Date Range
              </label>
              <select className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                <option>Next 30 days</option>
                <option>Next 90 days</option>
                <option>Next 6 months</option>
                <option>Next 12 months</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Lodgify Integration</h2>
          <p className="mt-1 text-sm text-gray-600">
            Configure API settings for syncing pricing data to Lodgify.
          </p>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sync Schedule
              </label>
              <select className="block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                <option>Manual Only</option>
                <option>Hourly</option>
                <option>Daily</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Enable automatic sync to Lodgify
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">⚙️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Settings Configuration Coming Soon
            </h3>
            <p className="text-gray-600">
              Additional configuration options will be available here including:
            </p>
            <ul className="text-sm text-gray-500 mt-4 space-y-1">
              <li>• Lodgify API key management</li>
              <li>• Default pricing preferences</li>
              <li>• Notification settings</li>
              <li>• Data backup options</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings