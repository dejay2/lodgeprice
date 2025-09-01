import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

interface TitleMap {
  [key: string]: string
}

const DEFAULT_TITLE = 'Lodgeprice'

const titleMap: TitleMap = {
  '/': 'Calendar - Lodgeprice',
  '/calendar': 'Calendar - Lodgeprice',
  '/settings': 'Settings - Lodgeprice'
}

export function useDocumentTitle(customTitle?: string) {
  const location = useLocation()
  
  useEffect(() => {
    if (customTitle) {
      document.title = customTitle
    } else {
      // Check if current path matches any predefined titles
      const title = titleMap[location.pathname]
      if (title) {
        document.title = title
      } else if (location.pathname.startsWith('/calendar/')) {
        // Handle dynamic calendar routes
        document.title = 'Property Calendar - Lodgeprice'
      } else {
        document.title = DEFAULT_TITLE
      }
    }
  }, [location.pathname, customTitle])
}

export default useDocumentTitle