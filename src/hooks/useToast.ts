/**
 * Toast Hook for Managing Notifications
 * Provides a simple interface for showing toast notifications
 */

import { useCallback } from 'react'
import { toast as toastify } from 'react-toastify'
import type { ToastOptions, ToastAction } from '@/lib/errorTypes'

/**
 * Custom hook for managing toast notifications
 */
export function useToast() {
  /**
   * Show a toast notification with proper ARIA attributes
   */
  const showToast = useCallback((options: ToastOptions) => {
    const {
      type,
      message,
      duration = 5000,
      dismissible = true,
      actions,
      ariaLive
    } = options
    
    // Determine ARIA attributes based on type
    const ariaRole = type === 'error' ? 'alert' : 'status'
    const defaultAriaLive = type === 'error' ? 'assertive' : 'polite'
    
    // Create action content if provided (plain text for TypeScript file)
    const actionContent = actions ? 
      actions.map(action => action.label).join(' | ') : 
      undefined
    
    // Show toast with appropriate method
    const toastOptions = {
      autoClose: duration || false,
      closeButton: dismissible,
      role: ariaRole,
      ariaLive: ariaLive || defaultAriaLive,
      closeOnClick: dismissible
    }
    
    // Show toast with action content if provided
    const content = actionContent ? `${message} (${actionContent})` : message
    
    switch (type) {
      case 'error':
        return toastify.error(content, toastOptions)
      case 'warning':
        return toastify.warning(content, toastOptions)
      case 'success':
        return toastify.success(content, toastOptions)
      case 'info':
        return toastify.info(content, toastOptions)
    }
  }, [])
  
  /**
   * Show error toast with retry action
   */
  const showErrorWithRetry = useCallback((
    message: string,
    retryAction: () => void | Promise<void>
  ) => {
    showToast({
      type: 'error',
      message,
      duration: 0, // Don't auto-dismiss errors with retry
      actions: [
        {
          label: 'Retry',
          action: retryAction,
          style: 'primary'
        }
      ]
    })
  }, [showToast])
  
  /**
   * Show network error toast
   */
  const showNetworkError = useCallback((
    customMessage?: string
  ) => {
    showToast({
      type: 'error',
      message: customMessage || 'Network connection failed. Please check your internet connection.',
      duration: 0,
      ariaLive: 'assertive'
    })
  }, [showToast])
  
  /**
   * Show validation error toast
   */
  const showValidationError = useCallback((
    errors: string | string[]
  ) => {
    const message = Array.isArray(errors) 
      ? errors.join(', ') 
      : errors
    
    showToast({
      type: 'warning',
      message: `Validation failed: ${message}`,
      duration: 7000
    })
  }, [showToast])
  
  /**
   * Show success toast
   */
  const showSuccess = useCallback((
    message: string,
    duration = 3000
  ) => {
    showToast({
      type: 'success',
      message,
      duration
    })
  }, [showToast])
  
  /**
   * Show info toast
   */
  const showInfo = useCallback((
    message: string,
    duration = 5000
  ) => {
    showToast({
      type: 'info',
      message,
      duration
    })
  }, [showToast])
  
  /**
   * Dismiss all toasts
   */
  const dismissAll = useCallback(() => {
    toastify.dismiss()
  }, [])
  
  /**
   * Dismiss specific toast by ID
   */
  const dismiss = useCallback((toastId: string | number) => {
    toastify.dismiss(toastId)
  }, [])
  
  return {
    showToast,
    showErrorWithRetry,
    showNetworkError,
    showValidationError,
    showSuccess,
    showInfo,
    dismissAll,
    dismiss,
    // Direct access to toastify for advanced usage
    toast: toastify
  }
}

/**
 * Singleton toast instance for use outside of React components
 */
export const toast = {
  error: (message: string, options?: Partial<ToastOptions>) => {
    toastify.error(message, {
      role: 'alert',
      ariaLive: 'assertive',
      ...options
    })
  },
  
  warning: (message: string, options?: Partial<ToastOptions>) => {
    toastify.warning(message, {
      role: 'alert',
      ariaLive: 'assertive',
      ...options
    })
  },
  
  success: (message: string, options?: Partial<ToastOptions>) => {
    toastify.success(message, {
      role: 'status',
      ariaLive: 'polite',
      ...options
    })
  },
  
  info: (message: string, options?: Partial<ToastOptions>) => {
    toastify.info(message, {
      role: 'status',
      ariaLive: 'polite',
      ...options
    })
  },
  
  dismiss: toastify.dismiss,
  dismissAll: () => toastify.dismiss()
}

export default useToast