/**
 * Custom hook for managing property selection state and data fetching
 * Handles Supabase integration, error handling, and session persistence
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, Property, withRetry, handleSupabaseError } from '../../lib/supabase'
import { UsePropertySelectionReturn, ERROR_SCENARIOS, STORAGE_KEYS, CONFIG } from './PropertySelection.types'

/**
 * Custom hook for property selection functionality
 * @returns {UsePropertySelectionReturn} Hook state and methods
 */
export function usePropertySelection(): UsePropertySelectionReturn {
  // State management
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Refs to prevent memory leaks and race conditions
  const isMounted = useRef(true)
  const fetchAbortController = useRef<AbortController | null>(null)
  
  // Reset isMounted on each render to handle StrictMode double-mounting
  useEffect(() => {
    isMounted.current = true
  })
  
  /**
   * Check if cached data is still valid
   */
  const getCachedProperties = useCallback((): Property[] | null => {
    try {
      const cachedData = sessionStorage.getItem(STORAGE_KEYS.PROPERTY_CACHE)
      const cacheTimestamp = sessionStorage.getItem(STORAGE_KEYS.CACHE_TIMESTAMP)
      
      if (!cachedData || !cacheTimestamp) return null
      
      const timestamp = parseInt(cacheTimestamp, 10)
      const age = Date.now() - timestamp
      
      if (age > CONFIG.CACHE_MAX_AGE) {
        // Cache is too old, clear it
        sessionStorage.removeItem(STORAGE_KEYS.PROPERTY_CACHE)
        sessionStorage.removeItem(STORAGE_KEYS.CACHE_TIMESTAMP)
        return null
      }
      
      return JSON.parse(cachedData) as Property[]
    } catch (error) {
      console.error('Error parsing cached properties:', error)
      return null
    }
  }, [])
  
  /**
   * Cache properties data in session storage
   */
  const cacheProperties = useCallback((data: Property[]) => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.PROPERTY_CACHE, JSON.stringify(data))
      sessionStorage.setItem(STORAGE_KEYS.CACHE_TIMESTAMP, Date.now().toString())
    } catch (error) {
      console.warn('Failed to cache properties:', error)
    }
  }, [])
  
  /**
   * Fetch properties from Supabase with error handling and retry logic
   */
  const fetchProperties = useCallback(async (useCache = true) => {
    // Check for cached data first
    if (useCache) {
      const cached = getCachedProperties()
      if (cached && cached.length > 0) {
        setProperties(cached)
        setIsLoading(false)
        return
      }
    }
    
    // Abort any pending fetch
    if (fetchAbortController.current) {
      fetchAbortController.current.abort()
    }
    
    // Create new abort controller
    fetchAbortController.current = new AbortController()
    
    setIsLoading(true)
    setError(null)
    
    const startTime = Date.now()
    
    try {
      // Fetch with retry logic
      const result = await withRetry(
        async () => {
          const queryResult = await supabase
            .from('properties')
            .select('*')
            .order('property_name', { ascending: true })
            
          return queryResult
        },
        CONFIG.MAX_RETRY_ATTEMPTS,
        CONFIG.RETRY_BASE_DELAY
      )
      
      const { data, error: fetchError } = result
      
      if (fetchError) {
        throw new Error(fetchError.message)
      }
      
      if (!data || data.length === 0) {
        throw new Error('No properties found')
      }
      
      // Ensure minimum loading duration for better UX
      const loadDuration = Date.now() - startTime
      if (loadDuration < CONFIG.MIN_LOADING_DURATION) {
        await new Promise(resolve => 
          setTimeout(resolve, CONFIG.MIN_LOADING_DURATION - loadDuration)
        )
      }
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setProperties(data)
        cacheProperties(data)
        setError(null)
        
        // Log successful fetch in development
        if (import.meta.env.DEV) {
          console.log(`Fetched ${data.length} properties successfully`)
        }
      }
    } catch (err) {
      if (isMounted.current) {
        const errorMessage = handleSupabaseError(err)
        setError(errorMessage)
        
        // Determine error scenario and log appropriately
        const scenario = determineErrorScenario(errorMessage)
        const logLevel = ERROR_SCENARIOS[scenario].logLevel || 'error'
        
        if (logLevel === 'error') {
          console.error('Property fetch error:', err)
        } else if (logLevel === 'warn') {
          console.warn('Property fetch warning:', err)
        }
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false)
      }
    }
  }, [getCachedProperties, cacheProperties])
  
  /**
   * Determine which error scenario applies
   */
  const determineErrorScenario = (errorMessage: string): keyof typeof ERROR_SCENARIOS => {
    if (errorMessage.includes('Network') || errorMessage.includes('connection')) {
      return 'networkError'
    }
    if (errorMessage.includes('Authorization') || errorMessage.includes('Session')) {
      return 'authError'
    }
    if (errorMessage.includes('No properties')) {
      return 'dataError'
    }
    if (errorMessage.includes('format') || errorMessage.includes('parse')) {
      return 'parseError'
    }
    return 'unknownError'
  }
  
  /**
   * Select a property and update session storage
   */
  const selectProperty = useCallback((propertyId: string) => {
    const property = properties.find(p => p.id === propertyId)
    
    if (property) {
      setSelectedProperty(property)
      
      // Persist selection in session storage
      try {
        sessionStorage.setItem(STORAGE_KEYS.SELECTED_PROPERTY_ID, propertyId)
      } catch (error) {
        console.warn('Failed to persist property selection:', error)
      }
      
      // Log selection in development
      if (import.meta.env.DEV) {
        console.log('Property selected:', property.property_name)
      }
    }
  }, [properties])
  
  /**
   * Refetch properties (bypass cache)
   */
  const refetch = useCallback(() => {
    fetchProperties(false)
  }, [fetchProperties])
  
  /**
   * Fetch properties on mount
   */
  useEffect(() => {
    fetchProperties(true)
    
    // Cleanup function
    return () => {
      isMounted.current = false
      if (fetchAbortController.current) {
        fetchAbortController.current.abort()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array - only run on mount
  
  /**
   * Restore selected property from session storage
   */
  useEffect(() => {
    if (properties.length === 0) return
    
    try {
      const savedId = sessionStorage.getItem(STORAGE_KEYS.SELECTED_PROPERTY_ID)
      
      if (savedId) {
        const property = properties.find(p => p.id === savedId)
        if (property) {
          setSelectedProperty(property)
          
          if (import.meta.env.DEV) {
            console.log('Restored selected property:', property.property_name)
          }
        } else {
          // Saved ID doesn't match any property, clear it
          sessionStorage.removeItem(STORAGE_KEYS.SELECTED_PROPERTY_ID)
        }
      }
    } catch (error) {
      console.warn('Failed to restore selected property:', error)
    }
  }, [properties])
  
  return {
    properties,
    selectedProperty,
    isLoading,
    error,
    selectProperty,
    refetch
  }
}