/**
 * TypeScript interfaces for PropertySelection component
 * Provides type safety for property selection functionality
 */

import type { Property } from '../../lib/supabase'

/**
 * Props for the PropertySelection component
 */
export interface PropertySelectionProps {
  /** Currently selected property ID */
  value?: string
  /** Callback fired when a property is selected */
  onChange: (propertyId: string, property: Property) => void
  /** Placeholder text when no property is selected */
  placeholder?: string
  /** Whether the dropdown is disabled */
  disabled?: boolean
  /** Additional CSS classes for styling */
  className?: string
  /** Label text for accessibility */
  label?: string
  /** Helper text displayed below the select */
  helperText?: string
  /** Error message to display */
  error?: string
}

/**
 * Return type for the usePropertySelection custom hook
 */
export interface UsePropertySelectionReturn {
  /** List of all properties from database */
  properties: Property[]
  /** Currently selected property object */
  selectedProperty: Property | null
  /** Whether data is being fetched */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Function to select a property */
  selectProperty: (propertyId: string) => void
  /** Function to retry fetching properties */
  refetch: () => void
}

/**
 * Error scenarios and their handling strategies
 */
export interface ErrorScenario {
  /** User-friendly error message */
  message: string
  /** Action to take: retry, refresh, or fallback */
  action: 'retry' | 'refresh' | 'fallback'
  /** Number of retry attempts (if action is retry) */
  retryAttempts?: number
  /** Log level for this error */
  logLevel?: 'error' | 'warn' | 'info'
  /** Fallback behavior (if action is fallback) */
  fallback?: string
}

/**
 * Error scenarios mapping
 */
export const ERROR_SCENARIOS: Record<string, ErrorScenario> = {
  networkError: {
    message: 'Unable to connect to server. Check your connection.',
    action: 'retry',
    retryAttempts: 3,
    logLevel: 'warn'
  },
  authError: {
    message: 'Session expired. Please refresh the page.',
    action: 'refresh',
    logLevel: 'warn'
  },
  dataError: {
    message: 'No properties found. Contact support if this persists.',
    action: 'fallback',
    fallback: 'empty state with contact info',
    logLevel: 'error'
  },
  parseError: {
    message: 'Data format error. Please try again.',
    action: 'retry',
    retryAttempts: 1,
    logLevel: 'error'
  },
  unknownError: {
    message: 'An unexpected error occurred. Please try again.',
    action: 'retry',
    retryAttempts: 2,
    logLevel: 'error'
  }
}

/**
 * Session storage keys
 */
export const STORAGE_KEYS = {
  SELECTED_PROPERTY_ID: 'selectedPropertyId',
  PROPERTY_CACHE: 'propertyCache',
  CACHE_TIMESTAMP: 'propertyCacheTimestamp'
} as const

/**
 * Configuration constants
 */
export const CONFIG = {
  /** Maximum cache age in milliseconds (5 minutes) */
  CACHE_MAX_AGE: 5 * 60 * 1000,
  /** Retry delay base in milliseconds */
  RETRY_BASE_DELAY: 1000,
  /** Maximum retry attempts */
  MAX_RETRY_ATTEMPTS: 3,
  /** Loading state minimum duration for UX */
  MIN_LOADING_DURATION: 200
} as const