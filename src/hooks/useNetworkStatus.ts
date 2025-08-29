/**
 * useNetworkStatus Hook
 * 
 * Monitors network connectivity and provides retry mechanisms
 * for failed requests with proper user feedback.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { NetworkStatus } from '@/lib/errorTypes'
import { useToast } from './useToast'

interface UseNetworkStatusReturn extends NetworkStatus {
  checkConnectivity: () => Promise<boolean>
  waitForConnection: (timeout?: number) => Promise<boolean>
  retryQueue: Array<() => Promise<void>>
  addToRetryQueue: (operation: () => Promise<void>) => void
  processRetryQueue: () => Promise<void>
}

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastOfflineAt, setLastOfflineAt] = useState<Date | undefined>()
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'fast' | 'unknown'>('unknown')
  const retryQueue = useRef<Array<() => Promise<void>>>([])
  const { showWarning, showSuccess, showInfo } = useToast()
  
  // Monitor online/offline events
  useEffect(() => {
    const handleOnline = () => {
      const offlineDuration = lastOfflineAt 
        ? Date.now() - lastOfflineAt.getTime() 
        : 0
      
      setIsOnline(true)
      setLastOfflineAt(undefined)
      
      // Show notification about restored connection
      if (offlineDuration > 5000) { // Only show if offline for more than 5 seconds
        showSuccess('Connection restored. Syncing data...')
      }
      
      // Process any queued operations
      if (retryQueue.current.length > 0) {
        processRetryQueue()
      }
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setLastOfflineAt(new Date())
      showWarning('You are currently offline. Some features may be limited.')
    }
    
    // Check initial connection speed
    checkConnectionSpeed()
    
    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Check connection periodically
    const intervalId = setInterval(() => {
      checkConnectivity()
      if (isOnline) {
        checkConnectionSpeed()
      }
    }, 30000) // Check every 30 seconds
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(intervalId)
    }
  }, [lastOfflineAt, showWarning, showSuccess])
  
  /**
   * Check actual connectivity by pinging a reliable endpoint
   */
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setIsOnline(false)
      return false
    }
    
    try {
      // Try to fetch a small resource with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      const connected = response.ok
      setIsOnline(connected)
      return connected
    } catch (error) {
      // Network request failed
      setIsOnline(false)
      return false
    }
  }, [])
  
  /**
   * Check connection speed by measuring fetch time
   */
  const checkConnectionSpeed = useCallback(async () => {
    try {
      const startTime = performance.now()
      
      // Fetch a small known resource
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache'
      })
      
      if (!response.ok) {
        setConnectionSpeed('unknown')
        return
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Classify connection speed based on response time
      if (duration < 200) {
        setConnectionSpeed('fast')
      } else if (duration < 1000) {
        setConnectionSpeed('slow')
      } else {
        setConnectionSpeed('slow')
      }
    } catch {
      setConnectionSpeed('unknown')
    }
  }, [])
  
  /**
   * Wait for connection to be restored with timeout
   */
  const waitForConnection = useCallback(async (timeout = 30000): Promise<boolean> => {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      if (await checkConnectivity()) {
        return true
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return false
  }, [checkConnectivity])
  
  /**
   * Add an operation to the retry queue
   */
  const addToRetryQueue = useCallback((operation: () => Promise<void>) => {
    retryQueue.current.push(operation)
    showInfo(`Operation queued. Will retry when connection is restored. (${retryQueue.current.length} pending)`)
  }, [showInfo])
  
  /**
   * Process all operations in the retry queue
   */
  const processRetryQueue = useCallback(async () => {
    if (retryQueue.current.length === 0) return
    
    const queue = [...retryQueue.current]
    retryQueue.current = []
    
    showInfo(`Processing ${queue.length} queued operations...`)
    
    let successCount = 0
    let failureCount = 0
    
    for (const operation of queue) {
      try {
        await operation()
        successCount++
      } catch (error) {
        failureCount++
        console.error('Failed to process queued operation:', error)
        // Re-add to queue for next retry
        retryQueue.current.push(operation)
      }
    }
    
    if (successCount > 0) {
      showSuccess(`Successfully processed ${successCount} queued operations`)
    }
    
    if (failureCount > 0) {
      showWarning(`${failureCount} operations failed and will be retried later`)
    }
  }, [showInfo, showSuccess, showWarning])
  
  return {
    isOnline,
    lastOfflineAt,
    connectionSpeed,
    checkConnectivity,
    waitForConnection,
    retryQueue: retryQueue.current,
    addToRetryQueue,
    processRetryQueue
  }
}

// =============================================================================
// Network-Aware Data Fetching Hook
// =============================================================================

interface UseNetworkFetchOptions<T> {
  fetcher: () => Promise<T>
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  retryOnReconnect?: boolean
  cacheKey?: string
  cacheDuration?: number
}

export function useNetworkFetch<T>(options: UseNetworkFetchOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { isOnline, addToRetryQueue } = useNetworkStatus()
  const { showError } = useToast()
  
  const fetchData = useCallback(async () => {
    // Check if we're offline
    if (!isOnline) {
      const offlineError = new Error('Cannot fetch data while offline')
      setError(offlineError)
      
      if (options.retryOnReconnect) {
        addToRetryQueue(async () => {
          await fetchData()
        })
      }
      
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Check cache first if cacheKey is provided
      if (options.cacheKey) {
        const cached = getCachedData<T>(options.cacheKey, options.cacheDuration)
        if (cached) {
          setData(cached)
          setLoading(false)
          options.onSuccess?.(cached)
          return
        }
      }
      
      const result = await options.fetcher()
      setData(result)
      
      // Cache the result if cacheKey is provided
      if (options.cacheKey) {
        setCachedData(options.cacheKey, result)
      }
      
      options.onSuccess?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch data')
      setError(error)
      showError(error, 'Data fetch')
      options.onError?.(error)
      
      // Queue for retry if it's a network error
      if (options.retryOnReconnect && error.message.includes('network')) {
        addToRetryQueue(async () => {
          await fetchData()
        })
      }
    } finally {
      setLoading(false)
    }
  }, [isOnline, options, addToRetryQueue, showError])
  
  useEffect(() => {
    fetchData()
  }, []) // Only run on mount
  
  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isOnline
  }
}

// =============================================================================
// Simple Cache Utilities
// =============================================================================

function getCachedData<T>(key: string, maxAge?: number): T | null {
  try {
    const cached = localStorage.getItem(`cache_${key}`)
    if (!cached) return null
    
    const { data, timestamp } = JSON.parse(cached)
    
    // Check if cache is expired
    if (maxAge && Date.now() - timestamp > maxAge) {
      localStorage.removeItem(`cache_${key}`)
      return null
    }
    
    return data
  } catch {
    return null
  }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry))
  } catch (error) {
    console.warn('Failed to cache data:', error)
  }
}