import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

function NotFound() {
  const location = useLocation()
  
  // Update document title
  useEffect(() => {
    document.title = 'Page Not Found - Lodgeprice'
  }, [])
  
  return (
    <div className="min-h-96 flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="text-9xl font-bold text-gray-300 mb-4">404</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
        <p className="text-lg text-gray-600 mb-2">
          The page you're looking for doesn't exist.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Requested path: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{location.pathname}</code>
        </p>
        
        <div className="space-y-4">
          <div>
            <Link
              to="/calendar"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Go to Calendar
            </Link>
          </div>
          
          <div className="text-sm text-gray-600">
            Or try one of these pages:
          </div>
          
          <div className="flex justify-center space-x-6 text-sm">
            <Link 
              to="/calendar" 
              className="text-indigo-600 hover:text-indigo-800 underline"
            >
              Calendar View
            </Link>
            <Link 
              to="/settings" 
              className="text-indigo-600 hover:text-indigo-800 underline"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound