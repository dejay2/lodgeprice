/**
 * Exponential Backoff and Retry Logic for Lodgeprice 2.0
 * Implements intelligent retry mechanisms with configurable delays and jitter
 */

import { ErrorState, RetryConfig, DEFAULT_RETRY_CONFIGS } from './errorTypes'

// =============================================================================
// Exponential Backoff Calculation
// =============================================================================

/**
 * Calculate exponential backoff delay with optional jitter
 * Formula: baseDelay * (2 ^ (attempt - 1)) with ±25% jitter
 * 
 * @param attempt - Current attempt number (1-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  const baseDelay = config.baseDelay || 1000
  const maxDelay = config.maxDelay || 10000
  const jitter = config.jitter !== false
  
  // Exponential backoff: baseDelay * (2 ^ (attempt - 1))
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, attempt - 1),
    maxDelay
  )
  
  if (jitter) {
    // Add random jitter ±25% to prevent thundering herd
    const jitterRange = exponentialDelay * 0.25
    const randomJitter = (Math.random() - 0.5) * 2 * jitterRange
    return Math.max(100, exponentialDelay + randomJitter) // Minimum 100ms
  }
  
  return exponentialDelay
}

// =============================================================================
// Retry Configuration Management
// =============================================================================

/**
 * Get retry configuration based on operation context
 * 
 * @param context - Operation context (e.g., 'properties.getAll')
 * @returns Appropriate retry configuration
 */
export function getRetryConfig(context: string): RetryConfig {
  // Determine operation type from context
  if (context.includes('.get') || context.includes('.list') || context.includes('.fetch')) {
    return DEFAULT_RETRY_CONFIGS.read
  }
  
  if (context.includes('.create') || context.includes('.update') || context.includes('.delete')) {
    return DEFAULT_RETRY_CONFIGS.write
  }
  
  if (context.includes('.critical') || context.includes('.important')) {
    return DEFAULT_RETRY_CONFIGS.critical
  }
  
  // Default to read configuration for unknown operations
  return DEFAULT_RETRY_CONFIGS.read
}

// =============================================================================
// Retry Execution with Cancellation Support
// =============================================================================

/**
 * Abort controller for cancelling retry operations
 */
export class RetryAbortController {
  private abortController: AbortController
  
  constructor() {
    this.abortController = new AbortController()
  }
  
  get signal(): AbortSignal {
    return this.abortController.signal
  }
  
  abort(): void {
    this.abortController.abort()
  }
  
  isAborted(): boolean {
    return this.abortController.signal.aborted
  }
}

/**
 * Execute operation with retry logic and exponential backoff
 * 
 * @param operation - Async operation to execute
 * @param config - Retry configuration
 * @param onRetry - Optional callback for retry attempts
 * @param abortController - Optional abort controller for cancellation
 * @returns Promise resolving to operation result
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  onRetry?: (attempt: number, delay: number, error: Error) => void,
  abortController?: RetryAbortController
): Promise<T> {
  let lastError: Error | undefined
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    // Check if operation was aborted
    if (abortController?.isAborted()) {
      throw new Error('Operation cancelled by user')
    }
    
    try {
      // Attempt the operation
      const result = await operation()
      return result
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Check if error is retryable
      const isRetryable = shouldRetry(lastError, config)
      
      // If not retryable or last attempt, throw the error
      if (!isRetryable || attempt === config.maxAttempts) {
        throw lastError
      }
      
      // Calculate delay for next attempt
      const delay = calculateBackoffDelay(attempt, config)
      
      // Notify about retry attempt
      if (onRetry) {
        onRetry(attempt, delay, lastError)
      }
      
      // Wait before next attempt
      await sleep(delay, abortController)
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed with unknown error')
}

// =============================================================================
// Sleep with Cancellation Support
// =============================================================================

/**
 * Sleep for specified duration with cancellation support
 * 
 * @param ms - Duration in milliseconds
 * @param abortController - Optional abort controller
 * @returns Promise that resolves after delay or rejects if aborted
 */
export function sleep(ms: number, abortController?: RetryAbortController): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, ms)
    
    if (abortController) {
      const handleAbort = () => {
        clearTimeout(timeoutId)
        reject(new Error('Sleep cancelled'))
      }
      
      if (abortController.isAborted()) {
        handleAbort()
      } else {
        abortController.signal.addEventListener('abort', handleAbort, { once: true })
      }
    }
  })
}

// =============================================================================
// Error Classification for Retry Decision
// =============================================================================

/**
 * Determine if an error should trigger a retry
 * 
 * @param error - Error to evaluate
 * @param config - Retry configuration with retryable error codes
 * @returns True if error should trigger retry
 */
export function shouldRetry(error: Error, config: RetryConfig): boolean {
  const errorMessage = error.message.toLowerCase()
  const errorCode = (error as any).code
  const httpStatus = (error as any).status
  
  // Check if error code is in retryable list
  if (errorCode && config.retryableErrors?.includes(errorCode)) {
    return true
  }
  
  // Check HTTP status codes
  if (httpStatus) {
    // Server errors (5xx) are generally retryable
    if (httpStatus >= 500 && httpStatus < 600) {
      return true
    }
    
    // Rate limiting is retryable
    if (httpStatus === 429) {
      return true
    }
    
    // Client errors (4xx) are generally not retryable
    if (httpStatus >= 400 && httpStatus < 500) {
      return false
    }
  }
  
  // Network-related errors are retryable
  const networkErrorPatterns = [
    'network',
    'timeout',
    'fetch',
    'connection',
    'econnrefused',
    'enotfound',
    'etimedout',
    'socket hang up'
  ]
  
  if (networkErrorPatterns.some(pattern => errorMessage.includes(pattern))) {
    return true
  }
  
  // Supabase-specific retryable errors
  if (errorCode === '08006' || // Connection failure
      errorCode === '53300' || // Too many connections
      errorCode === '57P01') { // Admin shutdown
    return true
  }
  
  // Default to not retrying unknown errors
  return false
}

// =============================================================================
// Batch Retry for Multiple Operations
// =============================================================================

/**
 * Options for batch retry operations
 */
export interface BatchRetryOptions<T> {
  operations: Array<() => Promise<T>>
  config?: RetryConfig
  concurrency?: number
  continueOnError?: boolean
  onProgress?: (completed: number, total: number) => void
}

/**
 * Execute multiple operations with retry logic
 * 
 * @param options - Batch retry options
 * @returns Array of results or errors
 */
export async function batchWithRetry<T>(
  options: BatchRetryOptions<T>
): Promise<Array<{ success: true; data: T } | { success: false; error: Error }>> {
  const {
    operations,
    config = DEFAULT_RETRY_CONFIGS.read,
    concurrency = 3,
    continueOnError = true,
    onProgress
  } = options
  
  const results: Array<{ success: true; data: T } | { success: false; error: Error }> = []
  const queue = [...operations]
  let completed = 0
  
  // Process operations in batches
  const processBatch = async () => {
    const batch = queue.splice(0, concurrency)
    
    const batchPromises = batch.map(async (operation) => {
      try {
        const result = await withRetry(operation, config)
        return { success: true as const, data: result }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        if (!continueOnError) {
          throw err
        }
        return { success: false as const, error: err }
      }
    })
    
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
    
    completed += batch.length
    if (onProgress) {
      onProgress(completed, operations.length)
    }
    
    // Process next batch if there are more operations
    if (queue.length > 0) {
      await processBatch()
    }
  }
  
  await processBatch()
  return results
}

// =============================================================================
// Retry State Management Hook Helper
// =============================================================================

/**
 * Retry state for React components
 */
export interface RetryState {
  attempt: number
  isRetrying: boolean
  lastError?: Error
  nextRetryAt?: Date
}

/**
 * Create initial retry state
 */
export function createInitialRetryState(): RetryState {
  return {
    attempt: 0,
    isRetrying: false
  }
}

/**
 * Update retry state for new attempt
 */
export function updateRetryState(
  currentState: RetryState,
  error?: Error,
  delay?: number
): RetryState {
  return {
    attempt: currentState.attempt + 1,
    isRetrying: true,
    lastError: error,
    nextRetryAt: delay ? new Date(Date.now() + delay) : undefined
  }
}

/**
 * Reset retry state after success or final failure
 */
export function resetRetryState(): RetryState {
  return createInitialRetryState()
}