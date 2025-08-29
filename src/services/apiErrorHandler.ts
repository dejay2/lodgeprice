/**
 * API Error Handler for Supabase Operations
 * 
 * Provides standardized error handling patterns for all Supabase
 * database operations, auth errors, and Edge Function calls.
 */

import { 
  FunctionsHttpError, 
  FunctionsRelayError, 
  FunctionsFetchError 
} from '@supabase/supabase-js'
import type { PostgrestError } from '@supabase/postgrest-js'
import type { Result, ErrorState } from '@/lib/errorTypes'
import { 
  createErrorState, 
  handleSupabaseError,
  retryWithBackoff 
} from '@/lib/errorHandling'
import { SUPABASE_ERROR_CODES } from '@/lib/errorTypes'

// =============================================================================
// Supabase Operation Wrapper
// =============================================================================

/**
 * Wraps a Supabase operation with standardized error handling
 * Returns a Result type for safe error handling
 */
export async function executeSupabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  context?: string
): Promise<Result<T | null>> {
  try {
    const { data, error } = await operation()
    
    if (error) {
      // Special handling for "not found" - not always an error
      if (error.code === SUPABASE_ERROR_CODES.NOT_FOUND) {
        return { success: true, data: null }
      }
      
      // Create error state from Supabase error
      const errorState = handleSupabaseError(error)
      return { success: false, error: errorState }
    }
    
    return { success: true, data }
  } catch (error) {
    // Handle unexpected errors
    const errorState = createErrorState(error, context || 'Supabase operation')
    return { success: false, error: errorState }
  }
}

/**
 * Wraps a Supabase operation with automatic retry for transient failures
 */
export async function executeSupabaseOperationWithRetry<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options?: {
    context?: string
    maxAttempts?: number
  }
): Promise<Result<T | null>> {
  try {
    const result = await retryWithBackoff(
      async () => {
        const { data, error } = await operation()
        
        if (error) {
          // Don't retry for non-retryable errors
          if (error.code === SUPABASE_ERROR_CODES.NOT_FOUND) {
            return null // This will be handled as success
          }
          
          // Check if error is retryable
          const errorState = handleSupabaseError(error)
          if (!errorState.retryable) {
            throw error // This will stop retrying
          }
          
          throw error // This will trigger retry
        }
        
        return data
      },
      { maxAttempts: options?.maxAttempts || 3 }
    )
    
    return { success: true, data: result }
  } catch (error) {
    const errorState = createErrorState(error, options?.context || 'Supabase operation')
    return { success: false, error: errorState }
  }
}

// =============================================================================
// Edge Functions Error Handling
// =============================================================================

/**
 * Handles errors from Supabase Edge Functions
 */
export async function handleEdgeFunctionError(
  error: unknown,
  functionName: string
): Promise<ErrorState> {
  if (error instanceof FunctionsHttpError) {
    // Function executed but returned an error
    try {
      const errorMessage = await error.context.json()
      const errorState = createErrorState(
        {
          code: 'edge-function-error',
          message: errorMessage.error || errorMessage.message || 'Edge function error',
          details: errorMessage
        },
        `Edge function: ${functionName}`
      )
      errorState.code = 'edge-function-error'
      return errorState
    } catch {
      const errorState = createErrorState(error, `Edge function: ${functionName}`)
      errorState.code = 'edge-function-error'
      return errorState
    }
  } else if (error instanceof FunctionsRelayError) {
    // Network/relay error
    return createErrorState(
      {
        code: SUPABASE_ERROR_CODES.NETWORK_ERROR,
        message: error.message,
        retryable: true
      },
      `Edge function relay: ${functionName}`
    )
  } else if (error instanceof FunctionsFetchError) {
    // Function unreachable
    return createErrorState(
      {
        code: SUPABASE_ERROR_CODES.NETWORK_ERROR,
        message: 'Edge function unreachable',
        retryable: true
      },
      `Edge function fetch: ${functionName}`
    )
  }
  
  // Unknown error type
  return createErrorState(error, `Edge function: ${functionName}`)
}

/**
 * Executes an Edge Function with error handling
 */
export async function executeEdgeFunction<T>(
  supabase: any,
  functionName: string,
  options?: {
    body?: any
    headers?: Record<string, string>
  }
): Promise<Result<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, options)
    
    if (error) {
      const errorState = await handleEdgeFunctionError(error, functionName)
      return { success: false, error: errorState }
    }
    
    return { success: true, data }
  } catch (error) {
    const errorState = createErrorState(error, `Edge function: ${functionName}`)
    return { success: false, error: errorState }
  }
}

// =============================================================================
// Auth Error Handling
// =============================================================================

/**
 * Handles authentication-related errors
 */
export function handleAuthError(error: any): ErrorState {
  const errorState = createErrorState(error, 'Authentication')
  
  // Add specific auth error handling
  if (error?.message?.includes('refresh_token')) {
    errorState.code = SUPABASE_ERROR_CODES.AUTH_SESSION_EXPIRED
    errorState.userMessage = 'Your session has expired. Please log in again.'
    errorState.retryable = false
  } else if (error?.message?.includes('Invalid login credentials')) {
    errorState.code = SUPABASE_ERROR_CODES.AUTH_INVALID_CREDENTIALS
    errorState.userMessage = 'Invalid email or password. Please try again.'
    errorState.retryable = false
  }
  
  return errorState
}

// =============================================================================
// Batch Operation Error Handling
// =============================================================================

export interface BatchOperationResult<T> {
  successful: T[]
  failed: Array<{
    item: any
    error: ErrorState
  }>
  hasErrors: boolean
}

/**
 * Executes multiple operations and collects results
 */
export async function executeBatchOperations<T, U>(
  items: T[],
  operation: (item: T) => Promise<Result<U>>,
  options?: {
    continueOnError?: boolean
    context?: string
  }
): Promise<BatchOperationResult<U>> {
  const successful: U[] = []
  const failed: Array<{ item: T; error: ErrorState }> = []
  
  for (const item of items) {
    try {
      const result = await operation(item)
      
      if (result.success) {
        if (result.data !== null) {
          successful.push(result.data)
        }
      } else {
        failed.push({ item, error: result.error })
        
        if (!options?.continueOnError) {
          break // Stop on first error
        }
      }
    } catch (error) {
      const errorState = createErrorState(error, options?.context)
      failed.push({ item, error: errorState })
      
      if (!options?.continueOnError) {
        break
      }
    }
  }
  
  return {
    successful,
    failed,
    hasErrors: failed.length > 0
  }
}

// =============================================================================
// Type Guards for Result Pattern
// =============================================================================

export function unwrapResult<T>(result: Result<T>): T {
  if (result.success) {
    return result.data
  }
  throw new Error(result.error.message)
}

export function isSuccessResult<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success === true
}

export function isErrorResult<T>(result: Result<T>): result is { success: false; error: ErrorState } {
  return result.success === false
}