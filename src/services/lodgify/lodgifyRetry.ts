/**
 * Lodgify API Retry Logic Module
 * 
 * Implements exponential backoff retry mechanism for handling
 * transient failures, rate limiting, and network issues.
 */

import { RetryOptions, LodgifyApiError, isTimeoutError, isNetworkError } from './lodgifyTypes'

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,    // 1 second
  maxDelay: 8000,     // 8 seconds
  retryableStatuses: [429, 500, 502, 503, 504]
}

/**
 * Determines if an HTTP status code is retryable
 * 
 * @param status - HTTP status code
 * @param retryableStatuses - Array of retryable status codes
 * @returns True if the status should trigger a retry
 */
export function isRetryableStatus(status: number, retryableStatuses: number[]): boolean {
  return retryableStatuses.includes(status)
}

/**
 * Determines if an error is retryable
 * 
 * @param error - Error to check
 * @returns True if the error should trigger a retry
 */
export function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (isNetworkError(error)) {
    return true
  }

  // Timeout errors are retryable
  if (isTimeoutError(error)) {
    return true
  }

  // LodgifyApiError with recoverable flag
  if (error instanceof LodgifyApiError) {
    return error.recoverable
  }

  // Specific error messages that indicate transient issues
  const retryableMessages = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EHOSTUNREACH',
    'EAI_AGAIN',
    'socket hang up',
    'network timeout'
  ]

  const errorMessage = error?.message?.toLowerCase() || ''
  return retryableMessages.some(msg => errorMessage.includes(msg.toLowerCase()))
}

/**
 * Calculates exponential backoff delay with jitter
 * 
 * @param attempt - Current attempt number (0-based)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay cap in milliseconds
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  // Calculate exponential delay
  const exponentialDelay = baseDelay * Math.pow(2, attempt)
  
  // Add jitter (±25% randomization) to prevent thundering herd
  const jitterFactor = 0.75 + Math.random() * 0.5 // 0.75 to 1.25
  const delayWithJitter = exponentialDelay * jitterFactor
  
  // Cap at maximum delay
  return Math.min(delayWithJitter, maxDelay)
}

/**
 * Extracts retry-after header value from response
 * 
 * @param response - Fetch response object
 * @returns Delay in milliseconds, or null if no retry-after header
 */
export function getRetryAfterDelay(response: Response): number | null {
  const retryAfter = response.headers.get('retry-after')
  
  if (!retryAfter) {
    return null
  }

  // Check if it's a number (seconds) or a date
  const retryAfterSeconds = parseInt(retryAfter, 10)
  
  if (!isNaN(retryAfterSeconds)) {
    // It's a number of seconds
    return retryAfterSeconds * 1000
  }

  // Try to parse as date
  const retryAfterDate = new Date(retryAfter)
  if (!isNaN(retryAfterDate.getTime())) {
    // Calculate milliseconds until that date
    const now = Date.now()
    const delay = retryAfterDate.getTime() - now
    return delay > 0 ? delay : null
  }

  return null
}

/**
 * Makes an HTTP request with exponential backoff retry logic
 * 
 * @param url - Request URL
 * @param options - Fetch options
 * @param retryOptions - Retry configuration (optional)
 * @returns Response object
 * @throws Error if all retry attempts fail
 */
export async function makeRequestWithRetry(
  url: string,
  options: RequestInit,
  retryOptions: Partial<RetryOptions> = {}
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions }
  let lastError: Error | null = null
  let retryCount = 0

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`Making request to ${url} (attempt ${attempt + 1}/${config.maxRetries + 1})`)
      
      // Make the request
      const response = await fetch(url, options)
      
      // Check if response is successful
      if (response.ok) {
        console.log(`Request successful with status ${response.status}`)
        return response
      }

      // Check if status is retryable
      if (!isRetryableStatus(response.status, config.retryableStatuses)) {
        // Not retryable, throw error immediately
        const errorText = await response.text().catch(() => 'No error details')
        throw new LodgifyApiError(
          `HTTP ${response.status}: ${response.statusText}. Details: ${errorText}`,
          'api',
          response.status,
          false
        )
      }

      // Status is retryable
      console.warn(`Request failed with retryable status ${response.status}`)
      
      // Check if this is the last attempt
      if (attempt === config.maxRetries) {
        const errorText = await response.text().catch(() => 'No error details')
        throw new LodgifyApiError(
          `HTTP ${response.status} after ${attempt + 1} attempts. Details: ${errorText}`,
          'api',
          response.status,
          true
        )
      }

      // Calculate delay for retry
      let delay: number
      
      // Check for retry-after header (rate limiting)
      const retryAfterDelay = getRetryAfterDelay(response)
      if (retryAfterDelay !== null) {
        delay = Math.min(retryAfterDelay, config.maxDelay)
        console.log(`Using retry-after header delay: ${delay}ms`)
      } else {
        delay = calculateBackoffDelay(attempt, config.baseDelay, config.maxDelay)
        console.log(`Using exponential backoff delay: ${delay}ms`)
      }

      // Wait before retrying
      await sleep(delay)
      retryCount++
      
    } catch (error) {
      lastError = error as Error
      
      // Check if error is retryable
      if (!isRetryableError(error)) {
        console.error(`Non-retryable error encountered:`, error)
        throw error
      }

      console.warn(`Retryable error encountered:`, error)
      
      // Check if this is the last attempt
      if (attempt === config.maxRetries) {
        throw new LodgifyApiError(
          `Request failed after ${attempt + 1} attempts: ${lastError.message}`,
          isTimeoutError(error) ? 'timeout' : 'network',
          undefined,
          true,
          lastError
        )
      }

      // Calculate delay and retry
      const delay = calculateBackoffDelay(attempt, config.baseDelay, config.maxDelay)
      console.log(`Retrying after ${delay}ms due to error`)
      await sleep(delay)
      retryCount++
    }
  }

  // This shouldn't be reached, but just in case
  throw lastError || new Error('Request failed after all retry attempts')
}

/**
 * Helper function to sleep for a specified duration
 * 
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Creates a timeout signal for fetch requests
 * 
 * @param timeoutMs - Timeout in milliseconds
 * @returns AbortSignal that triggers after timeout
 */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request timeout after ${timeoutMs}ms`))
  }, timeoutMs)

  // Clean up timeout when signal is aborted for other reasons
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timeoutId)
  })

  return controller.signal
}

/**
 * Combines multiple abort signals into one
 * Useful for combining timeout with user cancellation
 * 
 * @param signals - Array of abort signals
 * @returns Combined abort signal
 */
export function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }

    signal.addEventListener('abort', () => {
      controller.abort(signal.reason)
    })
  }

  return controller.signal
}