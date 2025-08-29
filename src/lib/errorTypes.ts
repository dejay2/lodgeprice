/**
 * Error Type System for Lodgeprice Application
 * 
 * Provides comprehensive type definitions and interfaces for error handling
 * across React components, Supabase operations, and user interactions.
 */

// =============================================================================
// Core Error Types
// =============================================================================

export type ErrorType = 'network' | 'validation' | 'auth' | 'database' | 'unknown'

export interface ErrorState {
  type: ErrorType
  message: string
  userMessage: string
  code?: string
  retryable: boolean
  details?: Record<string, unknown>
  timestamp: Date
}

// =============================================================================
// Result Pattern for Safe Error Handling
// =============================================================================

export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: ErrorState }

// Helper type guards
export function isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success === true
}

export function isError<T>(result: Result<T>): result is { success: false; error: ErrorState } {
  return result.success === false
}

// =============================================================================
// Error Handler Hook Interface
// =============================================================================

export interface UseErrorHandlerReturn {
  handleError: (error: unknown, context?: string) => void
  clearError: () => void
  retryOperation: () => Promise<void>
  error: ErrorState | null
  isRetrying: boolean
}

// =============================================================================
// Toast Notification Interfaces
// =============================================================================

export interface ToastOptions {
  type: 'error' | 'warning' | 'success' | 'info'
  message: string
  duration?: number
  dismissible?: boolean
  actions?: Array<{
    label: string
    action: () => void
  }>
}

export interface ToastState {
  id: string
  options: ToastOptions
  timestamp: Date
}

// =============================================================================
// Form Validation Error Interface
// =============================================================================

export interface ValidationError {
  field: string
  message: string
  code?: string
}

export interface FormErrorState {
  errors: ValidationError[]
  touched: Record<string, boolean>
  isValid: boolean
}

// =============================================================================
// Network Status Interface
// =============================================================================

export interface NetworkStatus {
  isOnline: boolean
  lastOfflineAt?: Date
  connectionSpeed?: 'slow' | 'fast' | 'unknown'
}

// =============================================================================
// Error Recovery Options
// =============================================================================

export interface RecoveryOption {
  label: string
  action: () => void | Promise<void>
  variant?: 'primary' | 'secondary' | 'danger'
}

export interface ErrorRecoveryState {
  canRecover: boolean
  recoveryOptions: RecoveryOption[]
  fallbackPath?: string
}

// =============================================================================
// Supabase Error Extensions
// =============================================================================

export interface SupabaseErrorExtended {
  code: string
  message: string
  details?: string
  hint?: string
  httpStatus?: number
}

// Common Supabase error codes
export const SUPABASE_ERROR_CODES = {
  NOT_FOUND: 'PGRST116',
  PERMISSION_DENIED: 'PGRST301',
  NO_ROWS: 'PGRST204',
  TABLE_NOT_FOUND: '42P01',
  AUTH_INVALID_CREDENTIALS: 'auth/invalid-credentials',
  AUTH_SESSION_EXPIRED: 'auth/session-expired',
  NETWORK_ERROR: 'network-error',
  TIMEOUT: 'timeout'
} as const

// =============================================================================
// Error Context for Logging
// =============================================================================

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  propertyId?: string
  timestamp: Date
  environment: 'development' | 'production'
  additionalData?: Record<string, unknown>
}

// =============================================================================
// Retry Configuration
// =============================================================================

export interface RetryConfig {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffFactor: number
  retryableErrors?: string[]
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableErrors: [
    SUPABASE_ERROR_CODES.NETWORK_ERROR,
    SUPABASE_ERROR_CODES.TIMEOUT,
    '503', // Service Unavailable
    '504', // Gateway Timeout
    '429'  // Too Many Requests
  ]
}

// =============================================================================
// Error Severity Levels
// =============================================================================

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface SeverityConfig {
  level: ErrorSeverity
  notifyUser: boolean
  logToConsole: boolean
  reportToMonitoring: boolean
}

// =============================================================================
// Type Guards for Error Checking
// =============================================================================

export function isNetworkError(error: ErrorState): boolean {
  return error.type === 'network' || 
         error.code === SUPABASE_ERROR_CODES.NETWORK_ERROR ||
         error.code === SUPABASE_ERROR_CODES.TIMEOUT
}

export function isAuthError(error: ErrorState): boolean {
  return error.type === 'auth' || 
         error.code?.startsWith('auth/')
}

export function isDatabaseError(error: ErrorState): boolean {
  return error.type === 'database' || 
         error.code?.startsWith('PGRST') ||
         error.code?.match(/^\d{5}$/) !== null // PostgreSQL error codes
}

export function isValidationError(error: ErrorState): boolean {
  return error.type === 'validation'
}

export function isRetryableError(error: ErrorState): boolean {
  return error.retryable || isNetworkError(error)
}