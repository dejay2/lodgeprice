/**
 * Bulk Operations Type Definitions
 * 
 * Type definitions for bulk price override operations as specified in PRP-010
 * Provides comprehensive types for bulk set/remove operations with validation
 */

import type { Database } from './database.generated'

// Database type aliases for clarity
type PriceOverrideRow = Database['public']['Tables']['price_overrides']['Row']

/**
 * Single bulk override operation
 * Represents one operation in a bulk batch
 */
export interface BulkOverrideOperation {
  /** Operation type: 'set' to create/update, 'remove' to delete */
  action: 'set' | 'remove'
  
  /** Property ID - can be UUID or lodgify_property_id */
  property_id: string
  
  /** Override date in ISO 8601 format (YYYY-MM-DD) */
  override_date: string
  
  /** Override price per night - required for 'set' operations, must be positive */
  override_price?: number
  
  /** Optional reason for the override (max 500 characters) */
  reason?: string
}

/**
 * Result of a single operation within a bulk batch
 * Provides detailed status and error information per operation
 */
export interface BulkOperationItemResult {
  /** Index of the operation in the original batch (1-based) */
  operation_index: number
  
  /** The action that was attempted */
  action: 'set' | 'remove'
  
  /** Property ID from the operation */
  property_id: string
  
  /** Override date from the operation */
  override_date: string
  
  /** Whether the operation succeeded */
  success: boolean
  
  /** Error code if operation failed */
  error_code?: string
  
  /** Human-readable error message if operation failed */
  error_message?: string
  
  /** The price that was set (for successful 'set' operations) */
  override_price?: number
}

/**
 * Complete result of a bulk operation batch
 * Includes individual results and aggregate statistics
 */
export interface BulkOperationResult {
  /** Overall success - true only if ALL operations succeeded */
  success: boolean
  
  /** Detailed results for each operation in the batch */
  results: BulkOperationItemResult[]
  
  /** Aggregate statistics for the batch */
  summary: {
    /** Total number of operations attempted */
    total_operations: number
    
    /** Number of operations that succeeded */
    successful_operations: number
    
    /** Number of operations that failed */
    failed_operations: number
    
    /** Time taken to execute the batch in milliseconds */
    execution_time: number
  }
  
  /** Error information if the entire batch failed */
  error?: {
    /** Error code for batch-level failures */
    code: string
    
    /** Human-readable error message */
    message: string
    
    /** Additional error details for debugging */
    details?: any
    
    /** Suggested remediation for the error */
    suggestion?: string
  }
}

/**
 * Options for bulk operation execution
 * Controls chunking, validation, and performance settings
 */
export interface BulkOperationOptions {
  /** Maximum operations per database call (default: 1000) */
  chunkSize?: number
  
  /** Whether to validate all operations before execution (default: true) */
  preValidate?: boolean
  
  /** Whether to continue on error or stop at first failure (default: false) */
  continueOnError?: boolean
  
  /** Custom timeout for database operations in milliseconds (default: 30000) */
  timeout?: number
  
  /** Whether to track progress for large batches (default: true for >100 operations) */
  trackProgress?: boolean
}

/**
 * Progress tracking for large bulk operations
 * Used to report progress during long-running operations
 */
export interface BulkOperationProgress {
  /** Current chunk being processed (1-based) */
  currentChunk: number
  
  /** Total number of chunks */
  totalChunks: number
  
  /** Operations processed so far */
  processedOperations: number
  
  /** Total operations to process */
  totalOperations: number
  
  /** Percentage complete (0-100) */
  percentComplete: number
  
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number
}

/**
 * Callback for progress updates during bulk operations
 */
export type ProgressCallback = (progress: BulkOperationProgress) => void

/**
 * Validation result for pre-execution validation
 */
export interface ValidationResult {
  /** Whether all operations are valid */
  valid: boolean
  
  /** Array of validation errors if any */
  errors: Array<{
    /** Index of the invalid operation */
    operationIndex: number
    
    /** Field that failed validation */
    field: string
    
    /** Validation error message */
    message: string
  }>
}

/**
 * Database function response type
 * Maps to the PostgreSQL function return type
 */
export interface BulkOverrideFunctionResponse {
  operation_index: number
  action: string
  property_id: string
  override_date: string
  success: boolean
  error_code: string | null
  error_message: string | null
  override_price: number | null
}

/**
 * Error class for bulk operation failures
 * Extends Error with additional context for debugging
 */
export class BulkOverrideError extends Error {
  constructor(
    message: string,
    public code: string,
    public operationIndex?: number,
    public operation?: BulkOverrideOperation,
    public details?: any
  ) {
    super(message)
    this.name = 'BulkOverrideError'
  }
}

/**
 * Type guard to check if an object is a BulkOverrideOperation
 */
export function isBulkOverrideOperation(obj: any): obj is BulkOverrideOperation {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ['set', 'remove'].includes(obj.action) &&
    typeof obj.property_id === 'string' &&
    typeof obj.override_date === 'string' &&
    (obj.action === 'remove' || typeof obj.override_price === 'number')
  )
}

/**
 * Type guard to check if an error is a BulkOverrideError
 */
export function isBulkOverrideError(error: any): error is BulkOverrideError {
  return error instanceof BulkOverrideError
}

/**
 * Enum for common error codes
 */
export enum BulkOperationErrorCode {
  // Validation errors
  INVALID_OPERATION = 'INVALID_OPERATION',
  INVALID_PROPERTY_ID = 'INVALID_PROPERTY_ID',
  INVALID_DATE = 'INVALID_DATE',
  INVALID_PRICE = 'INVALID_PRICE',
  INVALID_ACTION = 'INVALID_ACTION',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Database errors
  PROPERTY_NOT_FOUND = 'PROPERTY_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  CHECK_VIOLATION = 'CHECK_VIOLATION',
  
  // Batch errors
  BATCH_TOO_LARGE = 'BATCH_TOO_LARGE',
  NO_OPERATIONS = 'NO_OPERATIONS',
  CHUNK_FAILED = 'CHUNK_FAILED',
  
  // System errors
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Helper type for date range operations
 */
export interface DateRangeOperation {
  /** Start date (inclusive) */
  startDate: string
  
  /** End date (inclusive) */
  endDate: string
  
  /** Action to perform on all dates in range */
  action: 'set' | 'remove'
  
  /** Price for all dates (if action is 'set') */
  price?: number
  
  /** Reason for all dates */
  reason?: string
  
  /** Property ID for the operation */
  propertyId: string
}

/**
 * Utility function to convert date range to individual operations
 */
export function expandDateRangeToOperations(range: DateRangeOperation): BulkOverrideOperation[] {
  const operations: BulkOverrideOperation[] = []
  const startDate = new Date(range.startDate + 'T00:00:00')
  const endDate = new Date(range.endDate + 'T00:00:00')
  
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    const dateString = date.toISOString().split('T')[0]
    
    const operation: BulkOverrideOperation = {
      action: range.action,
      property_id: range.propertyId,
      override_date: dateString
    }
    
    if (range.action === 'set' && range.price !== undefined) {
      operation.override_price = range.price
    }
    
    if (range.reason) {
      operation.reason = range.reason
    }
    
    operations.push(operation)
  }
  
  return operations
}

/**
 * Utility function to chunk operations for batch processing
 */
export function chunkOperations(
  operations: BulkOverrideOperation[], 
  chunkSize: number = 1000
): BulkOverrideOperation[][] {
  const chunks: BulkOverrideOperation[][] = []
  
  for (let i = 0; i < operations.length; i += chunkSize) {
    chunks.push(operations.slice(i, i + chunkSize))
  }
  
  return chunks
}