/**
 * useErrorHandler Hook
 * 
 * Centralized error handling hook that provides consistent error management
 * across the application with retry capabilities and user notifications.
 */

import { useState, useCallback, useRef } from 'react'
import type { ErrorState, UseErrorHandlerReturn } from '@/lib/errorTypes'
import { createErrorState, retryWithBackoff } from '@/lib/errorHandling'
import { useToast } from './useToast'

export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setError] = useState<ErrorState | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const retryOperationRef = useRef<(() => Promise<void>) | null>(null)
  const { showError, dismissAll } = useToast()
  
  /**
   * Handle an error by creating an ErrorState and showing a toast
   */
  const handleError = useCallback((error: unknown, context?: string) => {
    // Create error state from the error
    const errorState = createErrorState(error, context)
    
    // Update state
    setError(errorState)
    
    // Show toast notification
    showError(errorState, context)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`Error in ${context || 'unknown context'}:`, error)
    }
  }, [showError])
  
  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setError(null)
    dismissAll()
  }, [dismissAll])
  
  /**
   * Retry the last failed operation
   */
  const retryOperation = useCallback(async () => {
    if (!retryOperationRef.current) {
      console.warn('No operation to retry')
      return
    }
    
    setIsRetrying(true)
    clearError()
    
    try {
      await retryOperationRef.current()
    } catch (error) {
      handleError(error, 'Retry operation')
    } finally {
      setIsRetrying(false)
    }
  }, [handleError, clearError])
  
  /**
   * Set the operation that can be retried
   */
  const setRetryableOperation = useCallback((operation: () => Promise<void>) => {
    retryOperationRef.current = operation
  }, [])
  
  /**
   * Execute an operation with error handling and optional retry
   */
  const executeWithErrorHandling = useCallback(async <T,>(
    operation: () => Promise<T>,
    options?: {
      context?: string
      retryable?: boolean
      onError?: (error: ErrorState) => void
      onSuccess?: (result: T) => void
    }
  ): Promise<T | null> => {
    try {
      const result = await operation()
      options?.onSuccess?.(result)
      clearError()
      return result
    } catch (error) {
      const errorState = createErrorState(error, options?.context)
      
      if (options?.retryable && errorState.retryable) {
        // Store operation for potential retry
        setRetryableOperation(async () => {
          await operation()
        })
      }
      
      handleError(error, options?.context)
      options?.onError?.(errorState)
      return null
    }
  }, [handleError, clearError, setRetryableOperation])
  
  /**
   * Execute an operation with automatic retry on failure
   */
  const executeWithRetry = useCallback(async <T,>(
    operation: () => Promise<T>,
    options?: {
      context?: string
      maxAttempts?: number
      onError?: (error: ErrorState) => void
      onSuccess?: (result: T) => void
    }
  ): Promise<T | null> => {
    try {
      const result = await retryWithBackoff(operation, {
        maxAttempts: options?.maxAttempts || 3
      })
      options?.onSuccess?.(result)
      clearError()
      return result
    } catch (error) {
      const errorState = createErrorState(error, options?.context)
      handleError(error, options?.context)
      options?.onError?.(errorState)
      return null
    }
  }, [handleError, clearError])
  
  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retryOperation,
    // Extended functionality not in interface but useful
    executeWithErrorHandling: executeWithErrorHandling as any,
    executeWithRetry: executeWithRetry as any
  } as UseErrorHandlerReturn
}