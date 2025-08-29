/**
 * useToast Hook
 * 
 * Provides a convenient interface for displaying toast notifications
 * with proper error handling and accessibility support.
 */

import { useCallback, useRef } from 'react'
import { toast, Id } from 'react-toastify'
import type { ToastOptions as ReactToastOptions } from 'react-toastify'
import type { ToastOptions, ErrorState } from '@/lib/errorTypes'
import { mapErrorMessage } from '@/lib/errorHandling'

interface UseToastReturn {
  showToast: (options: ToastOptions) => void
  showError: (error: unknown, context?: string) => void
  showSuccess: (message: string) => void
  showWarning: (message: string) => void
  showInfo: (message: string) => void
  dismissToast: (toastId?: Id) => void
  dismissAll: () => void
}

export function useToast(): UseToastReturn {
  // Keep track of active toasts to prevent duplicates
  const activeToasts = useRef<Map<string, Id>>(new Map())
  
  /**
   * Show a toast notification with the specified options
   */
  const showToast = useCallback((options: ToastOptions) => {
    // Prevent duplicate toasts for the same message
    const toastKey = `${options.type}-${options.message}`
    if (activeToasts.current.has(toastKey)) {
      return
    }
    
    const toastOptions: Partial<ReactToastOptions> = {
      autoClose: options.duration || 5000,
      closeButton: options.dismissible !== false,
      onClose: () => {
        activeToasts.current.delete(toastKey)
      }
    }
    
    // Add action buttons if provided
    if (options.actions && options.actions.length > 0) {
      toastOptions.closeButton = false // Custom actions replace close button
      toastOptions.autoClose = false // Don't auto-close when actions are present
    }
    
    let toastId: Id
    
    // Create toast content with actions if provided
    const content = options.actions ? (
      <div>
        <div className="mb-2">{options.message}</div>
        <div className="flex gap-2">
          {options.actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.action()
                toast.dismiss(toastId)
              }}
              className="px-2 py-1 text-xs font-medium rounded bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    ) : (
      options.message
    )
    
    // Show toast based on type with proper ARIA attributes
    switch (options.type) {
      case 'error':
        toastId = toast.error(content, {
          ...toastOptions,
          role: 'alert',
          ariaLive: 'assertive'
        } as any)
        break
        
      case 'warning':
        toastId = toast.warning(content, {
          ...toastOptions,
          role: 'alert',
          ariaLive: 'assertive'
        } as any)
        break
        
      case 'success':
        toastId = toast.success(content, {
          ...toastOptions,
          role: 'status',
          ariaLive: 'polite'
        } as any)
        break
        
      case 'info':
      default:
        toastId = toast.info(content, {
          ...toastOptions,
          role: 'status',
          ariaLive: 'polite'
        } as any)
        break
    }
    
    activeToasts.current.set(toastKey, toastId)
  }, [])
  
  /**
   * Show an error toast from an error object or ErrorState
   */
  const showError = useCallback((error: unknown, context?: string) => {
    let message: string
    
    if (typeof error === 'object' && error !== null && 'userMessage' in error) {
      // It's already an ErrorState
      message = (error as ErrorState).userMessage
    } else if (error instanceof Error) {
      // Map error message to user-friendly message
      message = mapErrorMessage(error.message)
    } else if (typeof error === 'string') {
      message = mapErrorMessage(error)
    } else {
      message = 'An unexpected error occurred'
    }
    
    // Add context if provided
    if (context) {
      message = `${context}: ${message}`
    }
    
    showToast({
      type: 'error',
      message,
      duration: 7000 // Errors stay longer
    })
  }, [showToast])
  
  /**
   * Show a success toast
   */
  const showSuccess = useCallback((message: string) => {
    showToast({
      type: 'success',
      message,
      duration: 4000
    })
  }, [showToast])
  
  /**
   * Show a warning toast
   */
  const showWarning = useCallback((message: string) => {
    showToast({
      type: 'warning',
      message,
      duration: 5000
    })
  }, [showToast])
  
  /**
   * Show an info toast
   */
  const showInfo = useCallback((message: string) => {
    showToast({
      type: 'info',
      message,
      duration: 4000
    })
  }, [showToast])
  
  /**
   * Dismiss a specific toast or the most recent one
   */
  const dismissToast = useCallback((toastId?: Id) => {
    if (toastId) {
      toast.dismiss(toastId)
    } else {
      // Dismiss the most recent toast
      const toastIds = Array.from(activeToasts.current.values())
      if (toastIds.length > 0) {
        toast.dismiss(toastIds[toastIds.length - 1])
      }
    }
  }, [])
  
  /**
   * Dismiss all active toasts
   */
  const dismissAll = useCallback(() => {
    toast.dismiss()
    activeToasts.current.clear()
  }, [])
  
  return {
    showToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    dismissToast,
    dismissAll
  }
}