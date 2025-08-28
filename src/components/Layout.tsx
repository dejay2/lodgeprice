import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import Breadcrumbs from './Breadcrumbs'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <Navigation />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumbs />
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-500">
            Lodgeprice 2.0 - Connected to Supabase ({import.meta.env.VITE_SUPABASE_URL ? 'Connected' : 'Not Connected'})
          </div>
        </div>
      </footer>
    </div>
  )
}