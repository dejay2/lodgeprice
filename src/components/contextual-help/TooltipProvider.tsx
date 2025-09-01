/**
 * TooltipProvider Context
 * 
 * Manages global tooltip state and coordination to prevent:
 * - Multiple tooltips showing simultaneously
 * - Tooltip conflicts with other UI elements
 * - Memory leaks from tooltip event listeners
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback,
  ReactNode,
  useEffect
} from 'react'

export interface TooltipContextValue {
  /** Currently active tooltip ID (only one at a time) */
  activeTooltipId: string | null
  
  /** Register a tooltip as active */
  setActiveTooltip: (id: string | null) => void
  
  /** Check if tooltips are globally disabled */
  disabled: boolean
  
  /** Disable/enable all tooltips globally */
  setDisabled: (disabled: boolean) => void
  
  /** Performance monitoring for development */
  stats: {
    totalTooltips: number
    activeTooltips: number
    renderTime: number
  }
}

const TooltipContext = createContext<TooltipContextValue | undefined>(undefined)

export interface TooltipProviderProps {
  /** Child components */
  children: ReactNode
  
  /** Initially disable all tooltips */
  disabled?: boolean
  
  /** Development mode for performance monitoring */
  development?: boolean
}

/**
 * TooltipProvider Component
 * 
 * Provides global tooltip coordination and state management
 * Prevents tooltip conflicts and manages accessibility concerns
 */
export const TooltipProvider: React.FC<TooltipProviderProps> = ({
  children,
  disabled = false,
  development = process.env.NODE_ENV === 'development'
}) => {
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null)
  const [globalDisabled, setGlobalDisabled] = useState(disabled)
  const [stats, setStats] = useState({
    totalTooltips: 0,
    activeTooltips: 0,
    renderTime: 0
  })

  // Set active tooltip with conflict prevention
  const setActiveTooltip = useCallback((id: string | null) => {
    if (development) {
      const startTime = performance.now()
      setActiveTooltipId(id)
      const endTime = performance.now()
      
      setStats(prev => ({
        ...prev,
        activeTooltips: id ? 1 : 0,
        renderTime: endTime - startTime
      }))
    } else {
      setActiveTooltipId(id)
    }
  }, [development])

  // Global disable/enable handler
  const setDisabled = useCallback((disabled: boolean) => {
    setGlobalDisabled(disabled)
    
    // If disabling, close any active tooltip
    if (disabled && activeTooltipId) {
      setActiveTooltipId(null)
    }
  }, [activeTooltipId])

  // Keyboard shortcut to disable tooltips (Ctrl+Shift+T)
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault()
        setDisabled(!globalDisabled)
        
        // Announce state change to screen readers
        const announcement = document.createElement('div')
        announcement.setAttribute('role', 'status')
        announcement.setAttribute('aria-live', 'polite')
        announcement.className = 'sr-only'
        announcement.textContent = `Tooltips ${globalDisabled ? 'enabled' : 'disabled'}`
        document.body.appendChild(announcement)
        
        setTimeout(() => {
          if (document.body.contains(announcement)) {
            document.body.removeChild(announcement)
          }
        }, 1000)
      }
    }

    document.addEventListener('keydown', handleKeyboard)
    return () => document.removeEventListener('keydown', handleKeyboard)
  }, [globalDisabled, setDisabled])

  // Development mode performance monitoring
  useEffect(() => {
    if (development) {
      const interval = setInterval(() => {
        const tooltipElements = document.querySelectorAll('[role="tooltip"]')
        setStats(prev => ({
          ...prev,
          totalTooltips: tooltipElements.length
        }))
      }, 1000)
      
      return () => clearInterval(interval)
    }
    
    // Return empty function when not in development
    return () => {}
  }, [development])

  // Log performance stats in development
  useEffect(() => {
    if (development && stats.renderTime > 50) {
      console.warn(
        `Tooltip render took ${stats.renderTime.toFixed(2)}ms - consider optimization`,
        { stats }
      )
    }
  }, [development, stats])

  const contextValue: TooltipContextValue = {
    activeTooltipId,
    setActiveTooltip,
    disabled: globalDisabled,
    setDisabled,
    stats
  }

  return (
    <TooltipContext.Provider value={contextValue}>
      {children}
      
      {/* Development overlay showing tooltip stats */}
      {development && (
        <div 
          className="tooltip-dev-stats"
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px',
            fontSize: '12px',
            borderRadius: '4px',
            zIndex: 10000,
            display: stats.totalTooltips > 0 ? 'block' : 'none'
          }}
        >
          <div>Total Tooltips: {stats.totalTooltips}</div>
          <div>Active: {stats.activeTooltips}</div>
          <div>Render Time: {stats.renderTime.toFixed(1)}ms</div>
          <div>Disabled: {globalDisabled ? 'Yes' : 'No'}</div>
        </div>
      )}
    </TooltipContext.Provider>
  )
}

/**
 * Hook to access tooltip context
 * 
 * @returns TooltipContextValue
 * @throws Error if used outside TooltipProvider
 */
export const useTooltipContext = (): TooltipContextValue => {
  const context = useContext(TooltipContext)
  
  if (context === undefined) {
    throw new Error('useTooltipContext must be used within a TooltipProvider')
  }
  
  return context
}

/**
 * HOC to wrap components with tooltip functionality
 */
export const withTooltipProvider = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P) => (
    <TooltipProvider>
      <Component {...props} />
    </TooltipProvider>
  )
  
  WrappedComponent.displayName = `withTooltipProvider(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default TooltipProvider