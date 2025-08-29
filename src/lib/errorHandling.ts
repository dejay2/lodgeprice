/**
 * Error Handling Utilities for Lodgeprice Application
 * 
 * Provides utilities for error classification, message mapping,
 * and standardized error processing across the application.
 */

import { 
  ErrorState, 
  ErrorType, 
  SUPABASE_ERROR_CODES,
  SupabaseErrorExtended,
  ErrorSeverity,
  RetryConfig,
  DEFAULT_RETRY_CONFIG
} from './errorTypes'

// =============================================================================
// Error Message Mapping
// =============================================================================

const ERROR_MESSAGES: Record<string, string> = {
  // Supabase/PostgreSQL errors
  [SUPABASE_ERROR_CODES.NOT_FOUND]: 'No data found for your request.',
  [SUPABASE_ERROR_CODES.PERMISSION_DENIED]: 'You do not have permission to access this data.',
  [SUPABASE_ERROR_CODES.NO_ROWS]: 'No data matches your search criteria.',
  [SUPABASE_ERROR_CODES.TABLE_NOT_FOUND]: 'The requested data source is not available.',
  
  // Auth errors
  [SUPABASE_ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
  [SUPABASE_ERROR_CODES.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  
  // Network errors
  [SUPABASE_ERROR_CODES.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection and try again.',
  [SUPABASE_ERROR_CODES.TIMEOUT]: 'Request timed out. Please try again.',
  
  // HTTP status codes
  '400': 'Invalid request. Please check your input and try again.',
  '401': 'Authentication required. Please log in.',
  '403': 'Access denied. You do not have permission to perform this action.',
  '404': 'The requested resource was not found.',
  '409': 'This operation conflicts with existing data. Please refresh and try again.',
  '422': 'The data you provided is invalid. Please check and try again.',
  '429': 'Too many requests. Please wait a moment and try again.',
  '500': 'An internal server error occurred. Please try again later.',
  '502': 'Service temporarily unavailable. Please try again later.',
  '503': 'Service temporarily unavailable. Please try again later.',
  '504': 'Request timed out. Please try again.',
  
  // Validation errors
  'validation/required': 'This field is required.',
  'validation/email': 'Please enter a valid email address.',
  'validation/min': 'Value is too small.',
  'validation/max': 'Value is too large.',
  'validation/pattern': 'Invalid format. Please check your input.',
  'validation/date': 'Please enter a valid date.',
  'validation/price': 'Please enter a valid price.',
  
  // Application-specific errors
  'pricing/calculation-failed': 'Unable to calculate pricing. Please try again.',
  'booking/conflict': 'This booking conflicts with an existing reservation.',
  'property/not-found': 'Property not found. Please select a valid property.',
  'discount/invalid': 'Invalid discount configuration. Please check your settings.',
  'lodgify/sync-failed': 'Failed to sync with Lodgify. Please try again later.',
  
  // Default
  'unknown': 'An unexpected error occurred. Please try again or contact support if the problem persists.'
}

// =============================================================================
// Error Classification
// =============================================================================

export function classifyError(error: unknown): ErrorType {
  if (!error) return 'unknown'
  
  // Check for network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'network'
  }
  
  // Check for Supabase/database errors
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as any).code
    
    if (typeof code === 'string') {
      if (code.startsWith('auth/')) return 'auth'
      if (code.startsWith('PGRST')) return 'database'
      if (code.match(/^\d{5}$/)) return 'database' // PostgreSQL codes
      if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') return 'network'
    }
  }
  
  // Check for validation errors
  if (error instanceof Error) {
    if (error.message.includes('validation') || 
        error.message.includes('invalid') ||
        error.message.includes('required')) {
      return 'validation'
    }
  }
  
  return 'unknown'
}

// =============================================================================
// Error State Creation
// =============================================================================

export function createErrorState(
  error: unknown,
  context?: string
): ErrorState {
  const type = classifyError(error)
  let message = 'An error occurred'
  let code: string | undefined
  let details: Record<string, unknown> | undefined
  
  // Extract error details
  if (error instanceof Error) {
    message = error.message
  } else if (typeof error === 'object' && error !== null) {
    const err = error as any
    message = err.message || err.error || String(error)
    code = err.code
    details = err.details
  } else if (typeof error === 'string') {
    message = error
  }
  
  // Map to user-friendly message
  const userMessage = mapErrorMessage(code || message)
  
  // Determine if error is retryable
  const retryable = isRetryableError(code || message)
  
  return {
    type,
    message,
    userMessage,
    code,
    retryable,
    details: {
      ...details,
      context
    },
    timestamp: new Date()
  }
}

// =============================================================================
// Error Message Mapping
// =============================================================================

export function mapErrorMessage(codeOrMessage: string): string {
  // Direct code match
  if (ERROR_MESSAGES[codeOrMessage]) {
    return ERROR_MESSAGES[codeOrMessage]
  }
  
  // Check if message contains known patterns
  const lowerMessage = codeOrMessage.toLowerCase()
  
  if (lowerMessage.includes('network')) {
    return ERROR_MESSAGES[SUPABASE_ERROR_CODES.NETWORK_ERROR]
  }
  if (lowerMessage.includes('timeout')) {
    return ERROR_MESSAGES[SUPABASE_ERROR_CODES.TIMEOUT]
  }
  if (lowerMessage.includes('permission') || lowerMessage.includes('denied')) {
    return ERROR_MESSAGES[SUPABASE_ERROR_CODES.PERMISSION_DENIED]
  }
  if (lowerMessage.includes('not found')) {
    return ERROR_MESSAGES[SUPABASE_ERROR_CODES.NOT_FOUND]
  }
  if (lowerMessage.includes('auth') || lowerMessage.includes('session')) {
    return ERROR_MESSAGES[SUPABASE_ERROR_CODES.AUTH_SESSION_EXPIRED]
  }
  
  // Default message
  return ERROR_MESSAGES['unknown']
}

// =============================================================================
// Retryable Error Detection
// =============================================================================

export function isRetryableError(codeOrMessage: string): boolean {
  const retryableCodes = [
    SUPABASE_ERROR_CODES.NETWORK_ERROR,
    SUPABASE_ERROR_CODES.TIMEOUT,
    '429', // Too Many Requests
    '502', // Bad Gateway
    '503', // Service Unavailable
    '504'  // Gateway Timeout
  ]
  
  // Check direct code match
  if (retryableCodes.includes(codeOrMessage)) {
    return true
  }
  
  // Check message patterns
  const lowerMessage = codeOrMessage.toLowerCase()
  return lowerMessage.includes('network') ||
         lowerMessage.includes('timeout') ||
         lowerMessage.includes('temporarily')
}

// =============================================================================
// Error Severity Classification
// =============================================================================

export function getErrorSeverity(error: ErrorState): ErrorSeverity {
  // Critical errors - require immediate attention
  if (error.type === 'auth' && error.code === SUPABASE_ERROR_CODES.AUTH_SESSION_EXPIRED) {
    return 'critical'
  }
  
  // High severity - significant functionality impact
  if (error.type === 'database' && !error.retryable) {
    return 'high'
  }
  
  // Medium severity - feature-specific issues
  if (error.type === 'validation' || error.code === SUPABASE_ERROR_CODES.NOT_FOUND) {
    return 'medium'
  }
  
  // Low severity - temporary or recoverable issues
  if (error.retryable || error.type === 'network') {
    return 'low'
  }
  
  return 'medium'
}

// =============================================================================
// Exponential Backoff Retry Logic
// =============================================================================

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: unknown
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Check if error is retryable
      const errorState = createErrorState(error)
      if (!errorState.retryable && !finalConfig.retryableErrors?.includes(errorState.code || '')) {
        throw error
      }
      
      // Don't delay after the last attempt
      if (attempt === finalConfig.maxAttempts) {
        throw error
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.initialDelay * Math.pow(finalConfig.backoffFactor, attempt - 1),
        finalConfig.maxDelay
      )
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay
      const finalDelay = delay + jitter
      
      console.log(`Retry attempt ${attempt}/${finalConfig.maxAttempts} after ${Math.round(finalDelay)}ms`)
      
      await new Promise(resolve => setTimeout(resolve, finalDelay))
    }
  }
  
  throw lastError
}

// =============================================================================
// Supabase Error Handling
// =============================================================================

export function handleSupabaseError(error: unknown): ErrorState {
  // Handle specific Supabase error types
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const supabaseError = error as SupabaseErrorExtended
    
    // Special handling for "not found" - not always an error
    if (supabaseError.code === SUPABASE_ERROR_CODES.NOT_FOUND) {
      return createErrorState({
        ...supabaseError,
        message: 'No data found'
      })
    }
  }
  
  return createErrorState(error, 'Supabase operation')
}

// =============================================================================
// Form Validation Error Formatting
// =============================================================================

export function formatValidationErrors(errors: Record<string, string>): string {
  const errorMessages = Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join(', ')
  
  return errorMessages || 'Please check your input'
}

// =============================================================================
// Safe Error Logging (without sensitive data)
// =============================================================================

export function sanitizeErrorForLogging(error: ErrorState): Record<string, unknown> {
  const { details, ...safeError } = error
  
  // Remove potentially sensitive fields from details
  const safeDetails = details ? { ...details } : {}
  const sensitiveKeys = ['password', 'token', 'apikey', 'secret', 'authorization']
  
  for (const key of Object.keys(safeDetails)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
      safeDetails[key] = '[REDACTED]'
    }
  }
  
  return {
    ...safeError,
    details: safeDetails
  }
}