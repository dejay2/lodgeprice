/**
 * Bulk Override Service
 * 
 * Service layer for executing bulk price override operations
 * Implements atomic operations, chunking, and comprehensive error handling
 * as specified in PRP-010
 */

import { supabaseAdmin } from '@/lib/supabase'
import {
  BulkOverrideOperation,
  BulkOperationResult,
  BulkOperationItemResult,
  BulkOperationOptions,
  BulkOperationProgress,
  BulkOverrideFunctionResponse,
  BulkOverrideError,
  BulkOperationErrorCode,
  ValidationResult,
  ProgressCallback,
  chunkOperations,
  isBulkOverrideOperation
} from '@/types/bulk-operations'

/**
 * Default options for bulk operations
 */
const DEFAULT_OPTIONS: Required<BulkOperationOptions> = {
  chunkSize: 1000,
  preValidate: true,
  continueOnError: false,
  timeout: 30000,
  trackProgress: true
}

/**
 * Bulk Override Service
 * 
 * Provides methods for executing bulk price override operations
 * with validation, chunking, and progress tracking
 */
export class BulkOverrideService {
  /**
   * Execute bulk price override operations
   * 
   * Processes multiple set/remove operations atomically using PostgreSQL function
   * Supports chunking for large batches and progress tracking
   * 
   * @param operations - Array of bulk override operations
   * @param options - Optional configuration for execution
   * @param progressCallback - Optional callback for progress updates
   * @returns Promise with comprehensive operation results
   */
  static async executeBulkOperations(
    operations: BulkOverrideOperation[],
    options: BulkOperationOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<BulkOperationResult> {
    const startTime = Date.now()
    const opts = { ...DEFAULT_OPTIONS, ...options }
    
    try {
      // Step 1: Input validation
      if (!operations || !Array.isArray(operations)) {
        throw new BulkOverrideError(
          'Operations must be an array',
          BulkOperationErrorCode.INVALID_OPERATION
        )
      }
      
      if (operations.length === 0) {
        throw new BulkOverrideError(
          'At least one operation must be provided',
          BulkOperationErrorCode.NO_OPERATIONS
        )
      }
      
      // Step 2: Pre-validation if enabled
      if (opts.preValidate) {
        const validation = await this.validateOperations(operations)
        if (!validation.valid) {
          const firstError = validation.errors[0]
          throw new BulkOverrideError(
            `Validation failed: ${firstError.message}`,
            BulkOperationErrorCode.INVALID_OPERATION,
            firstError.operationIndex,
            operations[firstError.operationIndex]
          )
        }
      }
      
      // Step 3: Chunk operations if needed
      const chunks = chunkOperations(operations, opts.chunkSize)
      const allResults: BulkOperationItemResult[] = []
      let successCount = 0
      let failureCount = 0
      
      // Step 4: Process each chunk
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex]
        
        // Report progress if tracking enabled
        if (opts.trackProgress && progressCallback) {
          const progress: BulkOperationProgress = {
            currentChunk: chunkIndex + 1,
            totalChunks: chunks.length,
            processedOperations: chunkIndex * opts.chunkSize,
            totalOperations: operations.length,
            percentComplete: Math.round((chunkIndex / chunks.length) * 100),
            estimatedTimeRemaining: this.estimateTimeRemaining(
              startTime,
              chunkIndex,
              chunks.length
            )
          }
          progressCallback(progress)
        }
        
        try {
          // Execute chunk via database function
          const chunkResults = await this.executeChunk(chunk, opts.timeout)
          
          // Process chunk results
          for (const result of chunkResults) {
            allResults.push(result)
            if (result.success) {
              successCount++
            } else {
              failureCount++
              
              // Stop on first error if continueOnError is false
              if (!opts.continueOnError && !result.success) {
                throw new BulkOverrideError(
                  `Operation failed: ${result.error_message}`,
                  result.error_code || BulkOperationErrorCode.UNKNOWN_ERROR,
                  result.operation_index,
                  operations[result.operation_index - 1]
                )
              }
            }
          }
        } catch (error) {
          // Handle chunk-level errors
          if (!opts.continueOnError) {
            throw error
          }
          
          // Add failed results for remaining operations in chunk
          const baseIndex = chunkIndex * opts.chunkSize
          for (let i = 0; i < chunk.length; i++) {
            allResults.push({
              operation_index: baseIndex + i + 1,
              action: chunk[i].action,
              property_id: chunk[i].property_id,
              override_date: chunk[i].override_date,
              success: false,
              error_code: BulkOperationErrorCode.CHUNK_FAILED,
              error_message: `Chunk processing failed: ${(error as Error).message}`
            })
            failureCount++
          }
        }
      }
      
      // Step 5: Final progress update
      if (opts.trackProgress && progressCallback) {
        progressCallback({
          currentChunk: chunks.length,
          totalChunks: chunks.length,
          processedOperations: operations.length,
          totalOperations: operations.length,
          percentComplete: 100,
          estimatedTimeRemaining: 0
        })
      }
      
      // Step 6: Return comprehensive results
      const executionTime = Date.now() - startTime
      
      return {
        success: failureCount === 0,
        results: allResults,
        summary: {
          total_operations: operations.length,
          successful_operations: successCount,
          failed_operations: failureCount,
          execution_time: executionTime
        }
      }
      
    } catch (error) {
      // Handle top-level errors
      const executionTime = Date.now() - startTime
      
      if (error instanceof BulkOverrideError) {
        return {
          success: false,
          results: [],
          summary: {
            total_operations: operations.length,
            successful_operations: 0,
            failed_operations: operations.length,
            execution_time: executionTime
          },
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            suggestion: this.getErrorSuggestion(error.code)
          }
        }
      }
      
      // Unknown error
      const err = error as Error
      return {
        success: false,
        results: [],
        summary: {
          total_operations: operations.length,
          successful_operations: 0,
          failed_operations: operations.length,
          execution_time: executionTime
        },
        error: {
          code: BulkOperationErrorCode.UNKNOWN_ERROR,
          message: err.message,
          suggestion: 'Check the operation format and try again'
        }
      }
    }
  }
  
  /**
   * Execute a single chunk of operations
   * 
   * @param chunk - Array of operations to execute
   * @param timeout - Timeout in milliseconds
   * @returns Array of operation results
   */
  private static async executeChunk(
    chunk: BulkOverrideOperation[],
    timeout: number
  ): Promise<BulkOperationItemResult[]> {
    // Prepare operations for database function
    const operationsJson = chunk.map(op => ({
      action: op.action,
      property_id: op.property_id,
      override_date: op.override_date,
      override_price: op.override_price,
      reason: op.reason
    }))
    
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new BulkOverrideError(
          'Operation timed out',
          BulkOperationErrorCode.TIMEOUT
        ))
      }, timeout)
    })
    
    // Execute database function with timeout
    const executionPromise = supabaseAdmin.rpc('bulk_price_override_operations', {
      operations: operationsJson
    })
    
    // Race between execution and timeout
    const result = await Promise.race([executionPromise, timeoutPromise])
    
    if (result.error) {
      throw new BulkOverrideError(
        `Database error: ${result.error.message}`,
        BulkOperationErrorCode.DATABASE_ERROR,
        undefined,
        undefined,
        result.error
      )
    }
    
    if (!result.data || !Array.isArray(result.data)) {
      throw new BulkOverrideError(
        'Invalid response from database function',
        BulkOperationErrorCode.DATABASE_ERROR
      )
    }
    
    // Convert database response to typed results
    const typedResults: BulkOperationItemResult[] = result.data.map((row: BulkOverrideFunctionResponse) => ({
      operation_index: row.operation_index,
      action: row.action as 'set' | 'remove',
      property_id: row.property_id,
      override_date: row.override_date,
      success: row.success,
      error_code: row.error_code || undefined,
      error_message: row.error_message || undefined,
      override_price: row.override_price || undefined
    }))
    
    return typedResults
  }
  
  /**
   * Validate operations before execution
   * 
   * Performs comprehensive validation of all operations
   * Checks required fields, data types, and business rules
   * 
   * @param operations - Array of operations to validate
   * @returns Validation result with any errors
   */
  static async validateOperations(operations: BulkOverrideOperation[]): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = []
    
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i]
      const index = i + 1 // 1-based for user-friendly error messages
      
      // Check if operation is valid object
      if (!op || typeof op !== 'object') {
        errors.push({
          operationIndex: index,
          field: 'operation',
          message: 'Operation must be an object'
        })
        continue
      }
      
      // Validate action
      if (!op.action || !['set', 'remove'].includes(op.action)) {
        errors.push({
          operationIndex: index,
          field: 'action',
          message: 'Action must be "set" or "remove"'
        })
      }
      
      // Validate property_id
      if (!op.property_id || typeof op.property_id !== 'string' || op.property_id.trim() === '') {
        errors.push({
          operationIndex: index,
          field: 'property_id',
          message: 'Property ID is required and must be a non-empty string'
        })
      }
      
      // Validate override_date
      if (!op.override_date || !this.isValidDate(op.override_date)) {
        errors.push({
          operationIndex: index,
          field: 'override_date',
          message: 'Override date must be in YYYY-MM-DD format'
        })
      } else {
        // Additional date validation
        const dateObj = new Date(op.override_date + 'T00:00:00')
        const maxFutureDate = new Date()
        maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2)
        
        if (dateObj > maxFutureDate) {
          errors.push({
            operationIndex: index,
            field: 'override_date',
            message: 'Date cannot be more than 2 years in the future'
          })
        }
      }
      
      // Validate price for 'set' operations
      if (op.action === 'set') {
        if (op.override_price === undefined || op.override_price === null) {
          errors.push({
            operationIndex: index,
            field: 'override_price',
            message: 'Override price is required for "set" operations'
          })
        } else if (typeof op.override_price !== 'number' || op.override_price <= 0) {
          errors.push({
            operationIndex: index,
            field: 'override_price',
            message: 'Override price must be a positive number'
          })
        } else if (op.override_price > 10000) {
          errors.push({
            operationIndex: index,
            field: 'override_price',
            message: 'Override price cannot exceed 10000'
          })
        }
      }
      
      // Validate reason if provided
      if (op.reason !== undefined && op.reason !== null) {
        if (typeof op.reason !== 'string') {
          errors.push({
            operationIndex: index,
            field: 'reason',
            message: 'Reason must be a string'
          })
        } else if (op.reason.length > 500) {
          errors.push({
            operationIndex: index,
            field: 'reason',
            message: 'Reason cannot exceed 500 characters'
          })
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Check if a date string is valid ISO format (YYYY-MM-DD)
   */
  private static isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/
    if (!regex.test(dateString)) {
      return false
    }
    
    const date = new Date(dateString + 'T00:00:00')
    return date instanceof Date && !isNaN(date.getTime())
  }
  
  /**
   * Estimate time remaining for bulk operation
   */
  private static estimateTimeRemaining(
    startTime: number,
    currentChunk: number,
    totalChunks: number
  ): number {
    if (currentChunk === 0) return 0
    
    const elapsedTime = Date.now() - startTime
    const timePerChunk = elapsedTime / currentChunk
    const remainingChunks = totalChunks - currentChunk
    
    return Math.round(timePerChunk * remainingChunks)
  }
  
  /**
   * Get suggestion for error recovery
   */
  private static getErrorSuggestion(errorCode: string): string {
    const suggestions: Record<string, string> = {
      [BulkOperationErrorCode.INVALID_PROPERTY_ID]: 'Verify the property ID exists in the system',
      [BulkOperationErrorCode.INVALID_DATE]: 'Use YYYY-MM-DD format for dates',
      [BulkOperationErrorCode.INVALID_PRICE]: 'Ensure price is a positive number',
      [BulkOperationErrorCode.PROPERTY_NOT_FOUND]: 'Check that the property ID is correct',
      [BulkOperationErrorCode.BATCH_TOO_LARGE]: 'Split operations into smaller batches',
      [BulkOperationErrorCode.TIMEOUT]: 'Reduce batch size or increase timeout',
      [BulkOperationErrorCode.DATABASE_ERROR]: 'Check database connection and retry',
      [BulkOperationErrorCode.NO_OPERATIONS]: 'Provide at least one operation',
      [BulkOperationErrorCode.INVALID_ACTION]: 'Use "set" or "remove" as action type'
    }
    
    return suggestions[errorCode] || 'Check operation format and try again'
  }
  
  /**
   * Create operations for a date range
   * Helper method to generate operations for continuous date ranges
   * 
   * @param propertyId - Property ID
   * @param startDate - Start date (inclusive)
   * @param endDate - End date (inclusive)
   * @param action - Action to perform
   * @param price - Price for 'set' operations
   * @param reason - Optional reason
   * @returns Array of bulk operations
   */
  static createDateRangeOperations(
    propertyId: string,
    startDate: string,
    endDate: string,
    action: 'set' | 'remove',
    price?: number,
    reason?: string
  ): BulkOverrideOperation[] {
    const operations: BulkOverrideOperation[] = []
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    
    if (start > end) {
      throw new BulkOverrideError(
        'Start date must be before or equal to end date',
        BulkOperationErrorCode.INVALID_DATE
      )
    }
    
    // Generate operation for each date in range
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split('T')[0]
      
      const operation: BulkOverrideOperation = {
        action,
        property_id: propertyId,
        override_date: dateString
      }
      
      if (action === 'set') {
        if (price === undefined || price === null) {
          throw new BulkOverrideError(
            'Price is required for set operations',
            BulkOperationErrorCode.INVALID_PRICE
          )
        }
        operation.override_price = price
      }
      
      if (reason) {
        operation.reason = reason
      }
      
      operations.push(operation)
    }
    
    return operations
  }
  
  /**
   * Create operations for specific weekdays in a date range
   * Helper method to generate operations for specific days of week
   * 
   * @param propertyId - Property ID
   * @param startDate - Start date
   * @param endDate - End date
   * @param weekdays - Array of weekday numbers (0=Sunday, 6=Saturday)
   * @param action - Action to perform
   * @param price - Price for 'set' operations
   * @param reason - Optional reason
   * @returns Array of bulk operations for specified weekdays
   */
  static createWeekdayOperations(
    propertyId: string,
    startDate: string,
    endDate: string,
    weekdays: number[],
    action: 'set' | 'remove',
    price?: number,
    reason?: string
  ): BulkOverrideOperation[] {
    const operations: BulkOverrideOperation[] = []
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    
    // Validate weekdays
    if (!weekdays.every(day => day >= 0 && day <= 6)) {
      throw new BulkOverrideError(
        'Weekdays must be 0-6 (0=Sunday, 6=Saturday)',
        BulkOperationErrorCode.INVALID_OPERATION
      )
    }
    
    // Generate operations for matching weekdays
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      if (weekdays.includes(date.getDay())) {
        const dateString = date.toISOString().split('T')[0]
        
        const operation: BulkOverrideOperation = {
          action,
          property_id: propertyId,
          override_date: dateString
        }
        
        if (action === 'set' && price !== undefined) {
          operation.override_price = price
        }
        
        if (reason) {
          operation.reason = reason
        }
        
        operations.push(operation)
      }
    }
    
    return operations
  }
}