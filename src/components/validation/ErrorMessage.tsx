/**
 * ErrorMessage - Reusable error display component
 * 
 * Features:
 * - Consistent error message styling
 * - Accessibility compliance (ARIA attributes)
 * - Multiple error types and severity levels
 * - Icon support for visual indication
 * - Action buttons for error resolution
 * - Animation support for smooth transitions
 */

import React from 'react'

export type ErrorMessageType = 'error' | 'warning' | 'info' | 'success'

export interface ErrorMessageAction {
  label: string
  onClick: () => void
  primary?: boolean
}

export interface ErrorMessageProps {
  /** Error message text */
  message: string
  /** Type of message determining styling and icon */
  type?: ErrorMessageType
  /** Unique ID for accessibility */
  id?: string
  /** Additional CSS classes */
  className?: string
  /** Show icon alongside message */
  showIcon?: boolean
  /** Action buttons for error resolution */
  actions?: ErrorMessageAction[]
  /** Callback when message is dismissed */
  onDismiss?: () => void
  /** Whether message can be dismissed */
  dismissible?: boolean
  /** Additional role for screen readers */
  role?: 'alert' | 'status' | 'region'
  /** Animate message appearance */
  animated?: boolean
}

/**
 * Get styling configuration for different message types
 */
const getMessageConfig = (type: ErrorMessageType) => {
  switch (type) {
    case 'error':
      return {
        containerClass: 'bg-red-50 border-red-200 text-red-700',
        iconClass: 'text-red-500',
        buttonClass: 'text-red-600 hover:text-red-800',
        icon: (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      }
    case 'warning':
      return {
        containerClass: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        iconClass: 'text-yellow-500',
        buttonClass: 'text-yellow-600 hover:text-yellow-800',
        icon: (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      }
    case 'info':
      return {
        containerClass: 'bg-blue-50 border-blue-200 text-blue-700',
        iconClass: 'text-blue-500',
        buttonClass: 'text-blue-600 hover:text-blue-800',
        icon: (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
      }
    case 'success':
      return {
        containerClass: 'bg-green-50 border-green-200 text-green-700',
        iconClass: 'text-green-500',
        buttonClass: 'text-green-600 hover:text-green-800',
        icon: (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      }
    default:
      return getMessageConfig('error')
  }
}

/**
 * ErrorMessage Component
 * Displays error messages with consistent styling and accessibility
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  type = 'error',
  id,
  className = '',
  showIcon = true,
  actions = [],
  onDismiss,
  dismissible = false,
  role = 'alert',
  animated = true
}) => {
  const config = getMessageConfig(type)
  
  // Build CSS classes
  const containerClasses = [
    'border rounded-md p-4',
    config.containerClass,
    animated ? 'transition-all duration-300 ease-in-out' : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <div
      id={id}
      className={containerClasses}
      role={role}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start">
        {/* Icon */}
        {showIcon && (
          <div className={`flex-shrink-0 mr-3 ${config.iconClass}`}>
            {config.icon}
          </div>
        )}
        
        {/* Message content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-5">
            {message}
          </p>
          
          {/* Actions */}
          {actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={action.onClick}
                  className={`
                    text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded
                    ${config.buttonClass}
                    ${action.primary ? 'font-semibold' : ''}
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Dismiss button */}
        {(dismissible || onDismiss) && (
          <div className="ml-3 flex-shrink-0">
            <button
              type="button"
              onClick={onDismiss}
              className={`
                inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current
                ${config.buttonClass}
              `}
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Specialized error message components for common use cases
 */

export const ValidationError: React.FC<Omit<ErrorMessageProps, 'type' | 'showIcon'>> = (props) => (
  <ErrorMessage {...props} type="error" showIcon={true} role="alert" />
)

export const ValidationWarning: React.FC<Omit<ErrorMessageProps, 'type' | 'showIcon'>> = (props) => (
  <ErrorMessage {...props} type="warning" showIcon={true} role="status" />
)

export const ValidationSuccess: React.FC<Omit<ErrorMessageProps, 'type' | 'showIcon'>> = (props) => (
  <ErrorMessage {...props} type="success" showIcon={true} role="status" />
)

export const ValidationInfo: React.FC<Omit<ErrorMessageProps, 'type' | 'showIcon'>> = (props) => (
  <ErrorMessage {...props} type="info" showIcon={true} role="status" />
)

/**
 * Error summary component for displaying multiple validation errors
 */
export interface ErrorSummaryProps {
  errors: Record<string, string>
  title?: string
  className?: string
  onFieldFocus?: (fieldName: string) => void
}

export const ErrorSummary: React.FC<ErrorSummaryProps> = ({
  errors,
  title = 'Please correct the following errors:',
  className = '',
  onFieldFocus
}) => {
  const errorEntries = Object.entries(errors).filter(([_, message]) => message && message.trim() !== '')
  
  if (errorEntries.length === 0) return null

  return (
    <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`} role="alert">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            {title}
          </h3>
          <div className="mt-2">
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
              {errorEntries.map(([fieldName, message]) => (
                <li key={fieldName}>
                  {onFieldFocus ? (
                    <button
                      type="button"
                      onClick={() => onFieldFocus(fieldName)}
                      className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                    >
                      {message}
                    </button>
                  ) : (
                    message
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorMessage