import React, { Component, ReactNode } from 'react'
import { createErrorState, sanitizeErrorForLogging } from '@/lib/errorHandling'
import type { ErrorState } from '@/lib/errorTypes'
import { getLogger } from '@/lib/logging/LoggingService'
import type { IErrorContext } from '@/lib/logging/types'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  onRetry?: () => void
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error?: Error
  errorState?: ErrorState
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  private logger = getLogger('ErrorBoundary')
  
  constructor(props: Props) {
    super(props)
    this.state = { 
      hasError: false,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorState = createErrorState(error, 'Component rendering')
    return { 
      hasError: true, 
      error,
      errorState
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error safely (without sensitive data)
    const errorState = createErrorState(error, errorInfo.componentStack || undefined)
    const safeError = sanitizeErrorForLogging(errorState)
    
    // Create error context for structured logging
    const errorContext: IErrorContext = {
      errorType: error.name,
      componentStack: errorInfo.componentStack || undefined,
      severity: 'high',
      metadata: {
        retryCount: this.state.retryCount,
        hasErrorBoundary: true,
        errorState: safeError
      }
    }
    
    // Log with structured logging service
    this.logger.error('Component error caught by ErrorBoundary', error, errorContext)
    
    // Also log to console for immediate visibility
    console.error('ErrorBoundary caught an error:', safeError)
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo)
    
    // Store error info for potential monitoring/reporting
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const errorLog = {
          ...safeError,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          retryCount: this.state.retryCount
        }
        
        // Store last 10 errors in localStorage for debugging
        const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]')
        const updatedLogs = [errorLog, ...existingLogs].slice(0, 10)
        localStorage.setItem('errorLogs', JSON.stringify(updatedLogs))
        
        this.logger.debug('Error stored in localStorage for debugging', {
          errorCount: updatedLogs.length
        })
      } catch (storageError) {
        this.logger.warn('Failed to store error log in localStorage', storageError)
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Application Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Something went wrong. Please refresh the page and try again.</p>
                  {this.state.error && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium">Error Details</summary>
                      <pre className="mt-1 text-xs bg-red-50 p-2 rounded overflow-auto">
                        {this.state.error.message}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="mt-4 space-x-2">
                  <button
                    type="button"
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    onClick={this.handleRetry}
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    className="bg-gray-100 px-3 py-2 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    onClick={() => window.location.href = '/'}
                  >
                    Go Home
                  </button>
                  <button
                    type="button"
                    className="bg-blue-100 px-3 py-2 rounded-md text-sm font-medium text-blue-800 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
  
  private handleRetry = () => {
    // Log retry attempt
    this.logger.info('User attempting to retry after error', {
      retryCount: this.state.retryCount + 1,
      errorMessage: this.state.error?.message
    })
    
    // Increment retry count
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      errorState: undefined,
      retryCount: prevState.retryCount + 1
    }))
    
    // Call optional retry handler
    this.props.onRetry?.()
  }
}