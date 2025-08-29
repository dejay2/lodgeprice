/**
 * Loading and Error State Components
 * 
 * Provides reusable components for displaying loading states,
 * error messages, and empty states with proper accessibility.
 */

import React from 'react'
import type { ErrorState, RecoveryOption } from '@/lib/errorTypes'

// =============================================================================
// Loading State Component
// =============================================================================

interface LoadingStateProps {
  message?: string
  size?: 'small' | 'medium' | 'large'
  inline?: boolean
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  size = 'medium',
  inline = false 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  }
  
  const spinnerSize = sizeClasses[size]
  
  if (inline) {
    return (
      <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
        <svg 
          className={`animate-spin ${spinnerSize} text-blue-600`}
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm text-gray-600">{message}</span>
      </span>
    )
  }
  
  return (
    <div className="flex flex-col items-center justify-center p-8" role="status" aria-live="polite">
      <svg 
        className={`animate-spin ${spinnerSize} text-blue-600 mb-4`}
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  )
}

// =============================================================================
// Skeleton Loading Component
// =============================================================================

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rect' | 'circle'
  width?: string | number
  height?: string | number
  count?: number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
  width,
  height,
  count = 1
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700'
  
  const variantClasses = {
    text: 'h-4 rounded',
    rect: 'rounded',
    circle: 'rounded-full'
  }
  
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height
  
  const skeletonClass = `${baseClasses} ${variantClasses[variant]} ${className}`
  
  if (count > 1) {
    return (
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className={skeletonClass} style={style} />
        ))}
      </div>
    )
  }
  
  return <div className={skeletonClass} style={style} aria-hidden="true" />
}

// =============================================================================
// Error Display Component
// =============================================================================

interface ErrorDisplayProps {
  error: ErrorState | string
  onRetry?: () => void
  recoveryOptions?: RecoveryOption[]
  showDetails?: boolean
  inline?: boolean
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  recoveryOptions = [],
  showDetails = false,
  inline = false
}) => {
  const errorMessage = typeof error === 'string' ? error : error.userMessage
  const errorDetails = typeof error === 'object' ? error : null
  const isRetryable = errorDetails?.retryable || false
  
  // Add default retry option if retryable
  const allRecoveryOptions = [...recoveryOptions]
  if (isRetryable && onRetry && !recoveryOptions.some(opt => opt.label === 'Try Again')) {
    allRecoveryOptions.unshift({
      label: 'Try Again',
      action: onRetry,
      variant: 'primary'
    })
  }
  
  if (inline) {
    return (
      <div className="inline-flex items-center gap-2 text-red-600" role="alert">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span className="text-sm">{errorMessage}</span>
      </div>
    )
  }
  
  return (
    <div className="rounded-md bg-red-50 p-4" role="alert" aria-live="assertive">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{errorMessage}</p>
          </div>
          
          {showDetails && errorDetails && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium text-red-800">
                Technical Details
              </summary>
              <div className="mt-1 space-y-1 text-xs text-red-600">
                {errorDetails.code && <p>Code: {errorDetails.code}</p>}
                {errorDetails.message && <p>Message: {errorDetails.message}</p>}
                {errorDetails.timestamp && (
                  <p>Time: {new Date(errorDetails.timestamp).toLocaleString()}</p>
                )}
              </div>
            </details>
          )}
          
          {allRecoveryOptions.length > 0 && (
            <div className="mt-4 flex gap-2">
              {allRecoveryOptions.map((option, index) => {
                const variantClasses = {
                  primary: 'bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500',
                  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-500',
                  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                }
                
                const buttonClass = variantClasses[option.variant || 'secondary']
                
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => option.action()}
                    className={`px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${buttonClass}`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Empty State Component
// =============================================================================

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action
}) => {
  const defaultIcon = (
    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  )
  
  return (
    <div className="text-center py-12">
      {icon || defaultIcon}
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Composite Loading/Error/Empty State Handler
// =============================================================================

interface DataStateProps<T> {
  data: T | null
  loading: boolean
  error: ErrorState | string | null
  onRetry?: () => void
  loadingMessage?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: {
    label: string
    onClick: () => void
  }
  children: (data: T) => React.ReactNode
}

export function DataState<T>({
  data,
  loading,
  error,
  onRetry,
  loadingMessage = 'Loading data...',
  emptyTitle = 'No data found',
  emptyDescription,
  emptyAction,
  children
}: DataStateProps<T>) {
  if (loading) {
    return <LoadingState message={loadingMessage} />
  }
  
  if (error) {
    return <ErrorDisplay error={error} onRetry={onRetry} />
  }
  
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }
  
  return <>{children(data)}</>
}