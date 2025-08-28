import { Link, useLocation, useParams } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  path?: string
  current?: boolean
}

export function Breadcrumbs() {
  const location = useLocation()
  const { propertyId } = useParams<{ propertyId?: string }>()
  
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []
    
    // Always start with Home
    breadcrumbs.push({ label: 'Home', path: '/properties' })
    
    if (pathSegments.length === 0) {
      return breadcrumbs
    }
    
    // Handle different routes
    const firstSegment = pathSegments[0]
    
    switch (firstSegment) {
      case 'properties':
        breadcrumbs.push({ label: 'Properties', current: true })
        break
        
      case 'calendar':
        if (propertyId) {
          breadcrumbs.push({ label: 'Calendar', path: '/calendar' })
          breadcrumbs.push({ label: `Property`, current: true })
        } else {
          breadcrumbs.push({ label: 'Calendar', current: true })
        }
        break
        
      case 'settings':
        breadcrumbs.push({ label: 'Settings', current: true })
        break
        
      default:
        // For unknown routes, just show the path segment capitalized
        breadcrumbs.push({ 
          label: firstSegment.charAt(0).toUpperCase() + firstSegment.slice(1),
          current: true 
        })
    }
    
    return breadcrumbs
  }
  
  const breadcrumbs = generateBreadcrumbs()
  
  // Don't render breadcrumbs if we're only at the home level
  if (breadcrumbs.length <= 1) {
    return null
  }
  
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {breadcrumb.current ? (
              <span className="text-sm font-medium text-gray-500">
                {breadcrumb.label}
              </span>
            ) : (
              <Link
                to={breadcrumb.path!}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                {breadcrumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumbs