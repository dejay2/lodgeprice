/**
 * PricingErrorBoundary - Error boundary for pricing components
 * Catches errors and provides fallback UI with recovery options
 */

import React, { Component, ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallbackComponent?: 'calendar' | 'panel' | 'modal' | 'default'
}

interface State {
  hasError: boolean
  errorMessage: string
  errorDetails?: string
  fallbackAction?: 'reload-calendar' | 'reload-page' | 'retry'
}

/**
 * Error fallback component
 */
interface ErrorFallbackProps {
  errorMessage: string
  errorDetails?: string
  onRetry: () => void
  onReload: () => void
  componentType?: string
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  errorMessage, 
  errorDetails,
  onRetry, 
  onReload,
  componentType = 'component'
}) => {
  return (
    <div className="error-boundary-fallback p-4 text-center">
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          Error in {componentType}
        </h4>
        <p className="mb-3">{errorMessage}</p>
        
        {errorDetails && (
          <details className="text-start mb-3">
            <summary className="cursor-pointer">Technical details</summary>
            <pre className="mt-2 p-2 bg-light rounded small">{errorDetails}</pre>
          </details>
        )}
        
        <hr />
        
        <div className="d-flex justify-content-center gap-2">
          <button 
            className="btn btn-primary"
            onClick={onRetry}
          >
            Try Again
          </button>
          <button 
            className="btn btn-secondary"
            onClick={onReload}
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Calendar-specific error boundary
 */
export class CalendarErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      errorMessage: '',
      errorDetails: undefined,
      fallbackAction: undefined
    }
  }
  
  static getDerivedStateFromError(error: Error): State {
    // Determine appropriate fallback action based on error type
    let fallbackAction: State['fallbackAction'] = 'retry'
    let errorMessage = 'Calendar failed to load. Please try refreshing or selecting different dates.'
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = 'Network error: Unable to load calendar data. Please check your connection.'
      fallbackAction = 'reload-calendar'
    } else if (error.message.includes('database') || error.message.includes('supabase')) {
      errorMessage = 'Database error: Unable to retrieve pricing data. Please try again.'
      fallbackAction = 'reload-calendar'
    } else if (error.message.includes('render')) {
      errorMessage = 'Display error: Unable to render calendar. Please reload the page.'
      fallbackAction = 'reload-page'
    }
    
    return {
      hasError: true,
      errorMessage,
      errorDetails: error.stack,
      fallbackAction
    }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error('Calendar Error Boundary caught:', error, errorInfo)
    
    // Could send to error reporting service here
    // reportError({ error, errorInfo, component: 'CalendarErrorBoundary' })
  }
  
  handleRetry = () => {
    // Clear error state and attempt to re-render children
    this.setState({
      hasError: false,
      errorMessage: '',
      errorDetails: undefined,
      fallbackAction: undefined
    })
  }
  
  handleReload = () => {
    // Reload the entire page
    window.location.reload()
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          errorMessage={this.state.errorMessage}
          errorDetails={this.state.errorDetails}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          componentType="Calendar"
        />
      )
    }
    
    return this.props.children
  }
}

/**
 * Panel-specific error boundary (for SeasonalRatePanel, DiscountStrategyPanel)
 */
export class PanelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      errorMessage: '',
      errorDetails: undefined,
      fallbackAction: undefined
    }
  }
  
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: 'Unable to load panel data. Please try refreshing the page.',
      errorDetails: error.stack,
      fallbackAction: 'retry'
    }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Panel Error Boundary caught:', error, errorInfo)
  }
  
  handleRetry = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
      errorDetails: undefined,
      fallbackAction: undefined
    })
  }
  
  handleReload = () => {
    window.location.reload()
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          errorMessage={this.state.errorMessage}
          errorDetails={this.state.errorDetails}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          componentType="Panel"
        />
      )
    }
    
    return this.props.children
  }
}

/**
 * Generic pricing error boundary
 */
class PricingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      errorMessage: '',
      errorDetails: undefined,
      fallbackAction: undefined
    }
  }
  
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: 'An unexpected error occurred in the pricing system.',
      errorDetails: error.stack,
      fallbackAction: 'retry'
    }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Pricing Error Boundary caught:', error, errorInfo)
    
    // Determine component type for better error messages
    const componentStack = errorInfo.componentStack
    let componentType = 'component'
    
    if (componentStack && componentStack.includes('Calendar')) {
      componentType = 'calendar'
    } else if (componentStack && componentStack.includes('Panel')) {
      componentType = 'panel'
    } else if (componentStack && componentStack.includes('Modal')) {
      componentType = 'modal'
    }
    
    console.log(`Error occurred in ${componentType}`)
  }
  
  handleRetry = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
      errorDetails: undefined,
      fallbackAction: undefined
    })
  }
  
  handleReload = () => {
    window.location.reload()
  }
  
  render() {
    if (this.state.hasError) {
      const componentType = this.props.fallbackComponent || 'default'
      
      return (
        <ErrorFallback
          errorMessage={this.state.errorMessage}
          errorDetails={this.state.errorDetails}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          componentType={componentType}
        />
      )
    }
    
    return this.props.children
  }
}

export default PricingErrorBoundary