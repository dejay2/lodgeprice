import { createContext, useContext, useState, ReactNode } from 'react'
import type { Property } from '@/types/database'

interface AppState {
  selectedProperty: Property | null
  selectedDateRange: {
    startDate: string
    endDate: string
  } | null
  stayLength: number
}

interface AppContextType extends AppState {
  setSelectedProperty: (property: Property | null) => void
  setSelectedDateRange: (range: { startDate: string; endDate: string } | null) => void
  setStayLength: (days: number) => void
  clearSelection: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<{
    startDate: string
    endDate: string
  } | null>(null)
  const [stayLength, setStayLength] = useState(3)

  const clearSelection = () => {
    setSelectedProperty(null)
    setSelectedDateRange(null)
    setStayLength(3)
  }

  const value: AppContextType = {
    selectedProperty,
    selectedDateRange,
    stayLength,
    setSelectedProperty,
    setSelectedDateRange,
    setStayLength,
    clearSelection
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext(): AppContextType {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}