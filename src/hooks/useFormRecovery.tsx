/**
 * Form Recovery Hook
 * Provides automatic form data persistence and recovery during failures
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { debounce } from 'lodash'
import type { FormRecoveryData } from '@/lib/errorTypes'
import { useToast } from './useToast'

/**
 * Options for form recovery hook
 */
interface UseFormRecoveryOptions {
  ttl?: number              // Time to live in milliseconds (default: 24 hours)
  debounceMs?: number       // Debounce save operations (default: 500ms)
  clearOnSuccess?: boolean  // Clear recovery data on successful submission (default: true)
  excludeFields?: string[]  // Fields to exclude from persistence (e.g., passwords)
  autoRecover?: boolean     // Automatically recover data on mount (default: false)
}

/**
 * SSR-safe localStorage wrapper
 */
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.warn('Failed to save to localStorage:', error)
    }
  },
  
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Hook for form data recovery with SSR-safe implementation
 */
export function useFormRecovery<T extends Record<string, any>>(
  formId: string,
  initialValues: T,
  options: UseFormRecoveryOptions = {}
) {
  const {
    ttl = 24 * 60 * 60 * 1000, // 24 hours default
    debounceMs = 500,
    clearOnSuccess = true,
    excludeFields = [],
    autoRecover = false
  } = options
  
  const [values, setValues] = useState<T>(initialValues)
  const [hasRecoveryData, setHasRecoveryData] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)
  const { showToast, showSuccess } = useToast()
  
  // Create storage key
  const storageKey = `form_recovery_${formId}`
  
  // Ref to track if we've already attempted recovery
  const recoveryAttempted = useRef(false)
  
  /**
   * Filter out excluded fields from data
   */
  const filterData = useCallback((data: T): Partial<T> => {
    const filtered = { ...data }
    excludeFields.forEach(field => {
      delete filtered[field]
    })
    return filtered
  }, [excludeFields])
  
  /**
   * Save form data to localStorage (debounced)
   */
  const saveToStorage = useRef(
    debounce((data: T) => {
      const filteredData = filterData(data)
      
      const recoveryData: FormRecoveryData = {
        formId,
        data: filteredData,
        timestamp: new Date(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        ttl
      }
      
      safeLocalStorage.setItem(storageKey, JSON.stringify(recoveryData))
    }, debounceMs)
  ).current
  
  /**
   * Load recovery data from localStorage
   */
  const loadFromStorage = useCallback((): FormRecoveryData | null => {
    const saved = safeLocalStorage.getItem(storageKey)
    
    if (!saved) return null
    
    try {
      const recoveryData: FormRecoveryData = JSON.parse(saved)
      
      // Check if data is still valid (within TTL)
      const age = Date.now() - new Date(recoveryData.timestamp).getTime()
      if (age > ttl) {
        // Data expired, clean up
        safeLocalStorage.removeItem(storageKey)
        return null
      }
      
      return recoveryData
    } catch {
      // Invalid data, clean up
      safeLocalStorage.removeItem(storageKey)
      return null
    }
  }, [storageKey, ttl])
  
  /**
   * Check for recovery data on mount
   */
  useEffect(() => {
    if (recoveryAttempted.current) return
    recoveryAttempted.current = true
    
    const recoveryData = loadFromStorage()
    
    if (recoveryData && recoveryData.data) {
      setHasRecoveryData(true)
      
      if (autoRecover) {
        // Automatically recover data
        recoverData()
      } else {
        // Show notification about available recovery data
        showToast({
          type: 'info',
          message: 'We found unsaved changes from your previous session.',
          duration: 0,
          actions: [
            {
              label: 'Restore',
              action: () => recoverData(),
              style: 'primary'
            },
            {
              label: 'Discard',
              action: () => clearRecovery()
            }
          ]
        })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  /**
   * Update a single field value
   */
  const updateValue = useCallback((key: keyof T, value: any) => {
    setValues(prev => {
      const updated = { ...prev, [key]: value }
      
      // Save to localStorage (debounced)
      saveToStorage(updated)
      
      return updated
    })
  }, [saveToStorage])
  
  /**
   * Update multiple field values
   */
  const updateValues = useCallback((updates: Partial<T>) => {
    setValues(prev => {
      const updated = { ...prev, ...updates }
      
      // Save to localStorage (debounced)
      saveToStorage(updated)
      
      return updated
    })
  }, [saveToStorage])
  
  /**
   * Recover data from localStorage
   */
  const recoverData = useCallback(() => {
    setIsRecovering(true)
    
    const recoveryData = loadFromStorage()
    
    if (recoveryData && recoveryData.data) {
      // Merge recovered data with current values
      setValues(prev => ({
        ...prev,
        ...recoveryData.data as T
      }))
      
      showSuccess('Form data restored successfully')
      setHasRecoveryData(false)
    }
    
    setIsRecovering(false)
  }, [loadFromStorage, showSuccess])
  
  /**
   * Clear recovery data
   */
  const clearRecovery = useCallback(() => {
    safeLocalStorage.removeItem(storageKey)
    setHasRecoveryData(false)
  }, [storageKey])
  
  /**
   * Reset form to initial values and clear recovery
   */
  const reset = useCallback(() => {
    setValues(initialValues)
    clearRecovery()
  }, [initialValues, clearRecovery])
  
  /**
   * Mark form as successfully submitted
   */
  const markAsSubmitted = useCallback(() => {
    if (clearOnSuccess) {
      clearRecovery()
    }
  }, [clearOnSuccess, clearRecovery])
  
  /**
   * Get recovery data age in milliseconds
   */
  const getRecoveryAge = useCallback((): number | null => {
    const recoveryData = loadFromStorage()
    
    if (!recoveryData) return null
    
    return Date.now() - new Date(recoveryData.timestamp).getTime()
  }, [loadFromStorage])
  
  /**
   * Save current form state immediately (bypass debounce)
   */
  const saveNow = useCallback(() => {
    saveToStorage.flush()
  }, [saveToStorage])
  
  return {
    // Form values
    values,
    setValues,
    updateValue,
    updateValues,
    
    // Recovery operations
    hasRecoveryData,
    isRecovering,
    recoverData,
    clearRecovery,
    getRecoveryAge,
    
    // Form operations
    reset,
    markAsSubmitted,
    saveNow,
    
    // Utilities
    storageKey
  }
}

/**
 * Higher-order component for form recovery
 */
export function withFormRecovery<P extends object>(
  Component: React.ComponentType<P>,
  formId: string,
  options?: UseFormRecoveryOptions
) {
  return (props: P) => {
    const recovery = useFormRecovery(formId, {}, options)
    
    return <Component {...props} formRecovery={recovery} />
  }
}

export default useFormRecovery