/**
 * TypeScript interfaces for Lodgify API synchronization
 * 
 * This module defines all the types required for the Lodgify API sync feature,
 * including request/response structures, error handling, and operation results.
 */

import type { LodgifyPayload } from '@/types/lodgify'


/**
 * Primary sync function result interface
 * Contains complete information about the sync operation including timing and errors
 */
export interface LodgifySyncResult {
  success: boolean
  propertyId: string
  statusCode?: number
  message: string
  requestId?: string
  timestamp: string
  retryCount: number
  duration: number
  error?: LodgifySyncError
}

/**
 * Error details for sync operations
 * Categorizes errors for appropriate handling and recovery
 */
export interface LodgifySyncError {
  type: 'auth' | 'validation' | 'network' | 'api' | 'timeout'
  details: string
  recoverable: boolean
}

/**
 * Options for sync operations
 */
export interface SyncOptions {
  timeout?: number         // Request timeout in milliseconds (default 30000)
  maxRetries?: number      // Maximum retry attempts (default 3)
  validatePayload?: boolean // Validate payload before sending (default true)
}

/**
 * Batch sync payload structure
 */
export interface BatchSyncPayload {
  propertyId: string
  payload: LodgifyPayload
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries: number
  baseDelay: number       // Base delay in milliseconds
  maxDelay: number        // Maximum delay cap
  retryableStatuses: number[]
}

/**
 * Log entry structure for API operations
 */
export interface LogEntry {
  timestamp: string
  propertyId: string
  action: 'request' | 'response' | 'error' | 'retry'
  statusCode?: number
  duration?: number
  retryCount?: number
  message: string
  metadata?: Record<string, any>
}

/**
 * API authentication headers
 */
export interface AuthHeaders extends Record<string, string> {
  'X-ApiKey': string
  'Content-Type': string
  'User-Agent': string
}

/**
 * Sync operation tracking for UI feedback
 */
export interface SyncOperation {
  id: string
  propertyId: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  result?: LodgifySyncResult
  progress?: number
}

/**
 * Batch sync result with summary statistics
 */
export interface BatchSyncResult {
  totalProperties: number
  successful: number
  failed: number
  results: LodgifySyncResult[]
  duration: number
  summary: string
}

/**
 * API response from Lodgify
 * Note: Actual response structure may vary - adjust based on API documentation
 */
export interface LodgifyApiResponse {
  success?: boolean
  message?: string
  errors?: string[]
  requestId?: string
  [key: string]: any
}

/**
 * Validation result for payload checking
 */
export interface PayloadValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  payload?: LodgifyPayload
}

/**
 * Extended error class for Lodgify operations
 */
export class LodgifyApiError extends Error {
  constructor(
    message: string,
    public readonly type: LodgifySyncError['type'],
    public readonly statusCode?: number,
    public readonly recoverable: boolean = false,
    public readonly details?: any
  ) {
    super(message)
    this.name = 'LodgifyApiError'
  }
}

/**
 * Type guards for error checking
 */
export const isLodgifyApiError = (error: any): error is LodgifyApiError => {
  return error instanceof LodgifyApiError
}

export const isNetworkError = (error: any): boolean => {
  return error?.message?.includes('fetch') || 
         error?.message?.includes('network') ||
         error?.message?.includes('ECONNREFUSED')
}

export const isTimeoutError = (error: any): boolean => {
  return error?.message?.includes('timeout') ||
         error?.name === 'AbortError'
}

/**
 * Constants for API operations
 */
export const LODGIFY_API_CONSTANTS = {
  ENDPOINT: 'https://api.lodgify.com/v1/rates/savewithoutavailability',
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  BASE_DELAY: 1000,
  MAX_DELAY: 8000,
  RETRYABLE_STATUSES: [429, 500, 502, 503, 504],
  USER_AGENT: 'Lodgeprice/2.0',
  BATCH_DELAY: 1000 // Delay between batch operations
}

/**
 * Re-export commonly used types from lodgify.ts
 */
export type { LodgifyRate, LodgifyPayload } from '@/types/lodgify'