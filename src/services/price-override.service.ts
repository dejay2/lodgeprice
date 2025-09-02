/**
 * Price Override Service
 * 
 * Service layer for managing price overrides with type safety and performance optimization
 * Implements comprehensive CRUD operations as specified in PRP-006
 */

import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/types/database.generated'
import { BulkOverrideService } from './bulk-override.service'
import type { 
  BulkOverrideOperation,
  BulkOperationResult 
} from '@/types/bulk-operations'

// Database type definitions from generated types
type PriceOverrideRow = Database['public']['Tables']['price_overrides']['Row']
type PriceOverrideInsert = Database['public']['Tables']['price_overrides']['Insert']

/**
 * Custom error class for price override operations
 * Follows existing error pattern from base-price.service.ts
 */
export class PriceOverrideError extends Error {
  constructor(
    message: string,
    public code: string,
    public propertyId?: string,
    public date?: string,
    public price?: number
  ) {
    super(message)
    this.name = 'PriceOverrideError'
  }
}

/**
 * Result type for single override operations
 */
export interface PriceOverrideResult {
  success: boolean
  override: PriceOverrideRow
  operation: 'created' | 'updated'
  previousPrice?: number
  updatedAt: string
}

/**
 * Bulk override operation result (deprecated - use BulkOperationResult from bulk-operations.ts)
 * Kept for backward compatibility
 */
export interface BulkOverrideResult {
  success: boolean
  results: Array<{
    propertyId: string
    date: string
    success: boolean
    error?: string
  }>
  totalProcessed: number
  totalSucceeded: number
  totalFailed: number
}

/**
 * Result type for remove override operations
 * As specified in PRP-008
 */
export interface RemoveOverrideResult {
  success: boolean
  error?: string
  deletedCount?: number
}

/**
 * Input type for bulk operations
 */
export interface BulkOverrideInput {
  propertyId: string
  date: string
  price: number
  reason?: string
}

/**
 * Retry configuration for database operations
 */
interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 8000   // 8 seconds
}

/**
 * Simple in-memory cache for price override data
 * Integrates with existing PricingCache pattern from pricing.service.ts
 */
class OverrideCache {
  private cache = new Map<string, { data: any; expires: number }>()
  
  set(key: string, data: any, expirationMinutes: number = 5) {
    const expires = Date.now() + expirationMinutes * 60 * 1000
    this.cache.set(key, { data, expires })
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }
  
  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
  
  clear() {
    this.cache.clear()
  }
}

// Initialize cache instance
const overrideCache = new OverrideCache()

/**
 * Price Override Service class
 * 
 * Provides comprehensive CRUD operations for price overrides with caching,
 * validation, and error handling as specified in PRP-006
 */
export class PriceOverrideService {
  /**
   * Set or update a price override for a specific property and date
   * Implements upsert pattern with PostgreSQL INSERT...ON CONFLICT as per PRP-007
   * 
   * @param propertyId - Property ID (UUID or lodgify_property_id)
   * @param overrideDate - ISO date string (YYYY-MM-DD)
   * @param overridePrice - Override price per night (must be positive)
   * @param reason - Optional reason for the override
   * @param retryConfig - Optional retry configuration for database operations
   * @returns Promise with override result including operation type
   * @throws PriceOverrideError for validation or database errors
   */
  static async setOverride(
    propertyId: string,
    overrideDate: string,
    overridePrice: number,
    reason?: string,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<PriceOverrideResult> {
    // Step 1: VALIDATE_INPUTS (FR-1, FR-3, FR-4)
    await this.validateOverride(propertyId, overrideDate, overridePrice, reason)
    
    // Step 2: PROPERTY_RESOLUTION (FR-2)
    // Use lodgify_property_id directly - price_overrides table stores lodgify format
    const lodgifyPropertyId = await this.getLodgifyPropertyId(propertyId)
    
    // Validate property exists by lodgify_property_id
    await this.validatePropertyByLodgifyId(lodgifyPropertyId)
    
    // Step 3: PREPARE_UPSERT_DATA
    // Round price to 2 decimal places for NUMERIC(10,2) constraint
    const roundedPrice = Math.round(overridePrice * 100) / 100
    
    // Check for existing override to track previous price
    const existingOverride = await this.getExistingOverride(lodgifyPropertyId, overrideDate)
    const previousPrice = existingOverride?.override_price
    
    // Step 4: EXECUTE_UPSERT_WITH_RETRY (FR-5, FR-6)
    const result = await this.retryOperation(async () => {
      const upsertData: PriceOverrideInsert = {
        property_id: lodgifyPropertyId,
        override_date: overrideDate,
        override_price: roundedPrice,
        reason: reason || null,
        is_active: true
      }
      
      // Use Supabase upsert with onConflict resolution
      const { data, error } = await supabaseAdmin
        .from('price_overrides')
        .upsert(upsertData, {
          onConflict: 'property_id,override_date',
          ignoreDuplicates: false
        })
        .select()
        .single()
      
      if (error) {
        // Handle specific PostgreSQL error codes
        if (error.code === '23514') {
          // Check constraint violation (price must be positive)
          throw new PriceOverrideError(
            'Price must be positive',
            'INVALID_PRICE',
            propertyId,
            overrideDate,
            overridePrice
          )
        }
        
        if (error.code === '23503') {
          // Foreign key constraint violation
          throw new PriceOverrideError(
            'Invalid property reference',
            'PROPERTY_NOT_FOUND',
            propertyId,
            overrideDate,
            overridePrice
          )
        }
        
        if (error.code === '23505') {
          // Unique constraint violation (shouldn't occur with upsert but handle anyway)
          throw new PriceOverrideError(
            'Duplicate override detected',
            'DUPLICATE_OVERRIDE',
            propertyId,
            overrideDate,
            overridePrice
          )
        }
        
        // Generic database error
        throw new PriceOverrideError(
          `Database error: ${error.message}`,
          'DATABASE_ERROR',
          propertyId,
          overrideDate,
          overridePrice
        )
      }
      
      if (!data) {
        throw new PriceOverrideError(
          'Upsert succeeded but no data returned',
          'UPSERT_NO_RESULT',
          propertyId,
          overrideDate,
          overridePrice
        )
      }
      
      return data
    }, retryConfig)
    
    // Invalidate relevant cache entries (FR-7)
    this.invalidateOverrideCache(lodgifyPropertyId, overrideDate)
    
    // Return result with operation metadata (FR-7)
    return {
      success: true,
      override: result,
      operation: existingOverride ? 'updated' : 'created',
      previousPrice: previousPrice,
      updatedAt: result.updated_at || new Date().toISOString()
    }
  }
  
  /**
   * Remove a price override for a specific property and date
   * Implements PRP-008 requirements: actual deletion with graceful non-existent handling
   * 
   * @param propertyId - Property ID (UUID or lodgify_property_id)
   * @param date - ISO date string (YYYY-MM-DD)
   * @returns Promise with remove result including deleted count
   */
  static async removeOverride(
    propertyId: string,
    date: string
  ): Promise<RemoveOverrideResult> {
    // Step 1: Input validation (FR-1, FR-2)
    if (!propertyId || typeof propertyId !== 'string') {
      return {
        success: false,
        error: `Invalid property ID: ${propertyId}`,
        deletedCount: 0
      }
    }
    
    if (!this.isValidDate(date)) {
      return {
        success: false,
        error: `Invalid date format: ${date}. Must be YYYY-MM-DD`,
        deletedCount: 0
      }
    }
    
    try {
      // Step 2: Property resolution and validation (FR-2, FR-5)
      // Convert propertyId to lodgify_property_id if needed
      const lodgifyPropertyId = await this.getLodgifyPropertyId(propertyId)
      
      // Step 3: Execute deletion with proper error handling (FR-1, FR-4, FR-6)
      const result = await this.retryOperation(async () => {
        // Perform actual DELETE operation (not soft delete) as per PRP-008
        const { data, error } = await supabaseAdmin
          .from('price_overrides')
          .delete()
          .eq('property_id', lodgifyPropertyId)
          .eq('override_date', date)
          .select()
        
        if (error) {
          // Handle specific PostgreSQL error codes
          if (error.code === 'PGRST116') {
            // No rows found - this is OK for delete operations (FR-4)
            return { success: true, deletedCount: 0 }
          }
          
          if (error.code === '42501') {
            // Permission denied
            throw new PriceOverrideError(
              'Access denied for property',
              'PERMISSION_DENIED',
              propertyId,
              date
            )
          }
          
          // Generic database error
          throw new PriceOverrideError(
            `Database error: ${error.message}`,
            'DATABASE_ERROR',
            propertyId,
            date
          )
        }
        
        // Return result with actual deleted count
        return {
          success: true,
          deletedCount: data ? data.length : 0
        }
      })
      
      // Step 4: Invalidate cache after successful deletion
      this.invalidateOverrideCache(lodgifyPropertyId, date)
      
      // Step 5: Return success result (FR-3)
      return {
        success: true,
        deletedCount: result.deletedCount
      }
      
    } catch (error) {
      // Handle errors gracefully
      if (error instanceof PriceOverrideError) {
        // For specific errors, return structured response
        if (error.code === 'PROPERTY_NOT_FOUND') {
          return {
            success: false,
            error: `Property not found: ${propertyId}`,
            deletedCount: 0
          }
        }
        
        if (error.code === 'PERMISSION_DENIED') {
          return {
            success: false,
            error: 'Access denied for property',
            deletedCount: 0
          }
        }
        
        // Other PriceOverrideError
        return {
          success: false,
          error: error.message,
          deletedCount: 0
        }
      }
      
      // Unexpected error
      const err = error as Error
      return {
        success: false,
        error: `Unexpected error: ${err.message}`,
        deletedCount: 0
      }
    }
  }
  
  /**
   * Get all price overrides for a property within a date range
   * Returns a Map for O(1) lookup performance as specified in PRP-009
   * 
   * @param propertyId - Property UUID or lodgify_property_id string
   * @param startDate - Start date in YYYY-MM-DD format (inclusive)
   * @param endDate - End date in YYYY-MM-DD format (inclusive)
   * @returns Promise<Map<string, number>> - Map with date keys and price values
   * @throws PriceOverrideError for validation failures and database errors
   */
  static async getPropertyPriceOverrides(
    propertyId: string,
    startDate: string,
    endDate: string
  ): Promise<Map<string, number>> {
    // Input validation (FR-5)
    this.validateGetOverridesParams(propertyId, startDate, endDate)
    
    // Convert to lodgify_property_id if needed (property_id column stores lodgify IDs)
    const lodgifyPropertyId = await this.getLodgifyPropertyId(propertyId)
    
    // Single optimized database query (FR-3)
    const { data, error } = await supabase
      .from('price_overrides')
      .select('override_date, override_price')
      .eq('property_id', lodgifyPropertyId)
      .gte('override_date', startDate)
      .lte('override_date', endDate)
      .eq('is_active', true) // Only fetch active overrides
      .order('override_date')
    
    // Error handling (FR-6)
    if (error) {
      throw new PriceOverrideError(
        `Failed to fetch overrides: ${error.message}`,
        'FETCH_ERROR',
        propertyId
      )
    }
    
    // Map construction (FR-2, FR-4)
    const overridesMap = new Map<string, number>()
    data?.forEach(row => {
      // Ensure we're using proper numeric values
      const price = typeof row.override_price === 'string' 
        ? parseFloat(row.override_price) 
        : row.override_price
      overridesMap.set(row.override_date, price)
    })
    
    return overridesMap
  }

  /**
   * Get price overrides for a property within a date range (FR-3)
   * Legacy method that returns array - kept for backward compatibility
   * 
   * @param propertyId - Property ID (UUID or lodgify_property_id)
   * @param startDate - Optional start date (ISO format)
   * @param endDate - Optional end date (ISO format)
   * @returns Array of active price overrides
   */
  static async getOverrides(
    propertyId: string,
    startDate?: string,
    endDate?: string
  ): Promise<PriceOverrideRow[]> {
    // Validate property ID
    if (!propertyId || typeof propertyId !== 'string') {
      throw new PriceOverrideError('Invalid property ID', 'INVALID_PROPERTY_ID', propertyId)
    }
    
    // Validate date range if provided
    if (startDate && !this.isValidDate(startDate)) {
      throw new PriceOverrideError('Invalid start date', 'INVALID_DATE', propertyId, startDate)
    }
    
    if (endDate && !this.isValidDate(endDate)) {
      throw new PriceOverrideError('Invalid end date', 'INVALID_DATE', propertyId, endDate)
    }
    
    // Convert propertyId to lodgify_property_id
    const lodgifyPropertyId = await this.getLodgifyPropertyId(propertyId)
    
    // Check cache first (FR-7)
    const cacheKey = this.generateCacheKey(lodgifyPropertyId, startDate, endDate)
    const cached = overrideCache.get(cacheKey)
    if (cached) {
      return cached
    }
    
    // Build query
    let query = supabase
      .from('price_overrides')
      .select('*')
      .eq('property_id', lodgifyPropertyId)
      .eq('is_active', true)
    
    // Add date range filters if provided
    if (startDate) {
      query = query.gte('override_date', startDate)
    }
    
    if (endDate) {
      query = query.lte('override_date', endDate)
    }
    
    // Execute query with ordering
    const { data, error } = await query.order('override_date', { ascending: true })
    
    if (error) {
      throw new PriceOverrideError(
        `Failed to fetch price overrides: ${error.message}`,
        'FETCH_FAILED',
        propertyId
      )
    }
    
    // Cache the results
    overrideCache.set(cacheKey, data || [], 5) // 5 minute cache
    
    return data || []
  }
  
  /**
   * Bulk set price overrides for multiple dates/properties (FR-4)
   * Now uses the new atomic bulk operations via PostgreSQL function
   * 
   * @param overrides - Array of override inputs
   * @returns Bulk operation result with success/failure details
   */
  static async bulkSetOverrides(
    overrides: BulkOverrideInput[]
  ): Promise<BulkOperationResult> {
    // Convert to BulkOverrideOperation format
    const operations: BulkOverrideOperation[] = overrides.map(override => ({
      action: 'set' as const,
      property_id: override.propertyId,
      override_date: override.date,
      override_price: override.price,
      reason: override.reason
    }))
    
    // Execute using the new BulkOverrideService for atomic operations
    const result = await BulkOverrideService.executeBulkOperations(operations, {
      preValidate: true,
      continueOnError: false
    })
    
    // Invalidate cache for all affected properties
    if (result.success || result.summary.successful_operations > 0) {
      const uniquePropertyIds = [...new Set(overrides.map(o => o.propertyId))]
      for (const propId of uniquePropertyIds) {
        try {
          const lodgifyId = await this.getLodgifyPropertyId(propId)
          overrideCache.invalidate(lodgifyId)
        } catch (error) {
          // Continue even if cache invalidation fails
          console.error('Cache invalidation failed for', propId, error)
        }
      }
    }
    
    return result
  }
  
  /**
   * Bulk remove price overrides for multiple dates (FR-5)
   * Now uses the new atomic bulk operations via PostgreSQL function
   * 
   * @param propertyId - Property ID
   * @param dates - Array of ISO date strings
   * @returns Bulk operation result
   */
  static async bulkRemoveOverrides(
    propertyId: string,
    dates: string[]
  ): Promise<BulkOperationResult> {
    // Validate inputs
    if (!propertyId || typeof propertyId !== 'string') {
      throw new PriceOverrideError('Invalid property ID', 'INVALID_PROPERTY_ID', propertyId)
    }
    
    // Convert to BulkOverrideOperation format
    const operations: BulkOverrideOperation[] = dates.map(date => ({
      action: 'remove' as const,
      property_id: propertyId,
      override_date: date
    }))
    
    // Execute using the new BulkOverrideService for atomic operations
    const result = await BulkOverrideService.executeBulkOperations(operations, {
      preValidate: true,
      continueOnError: false
    })
    
    // Invalidate cache
    if (result.success || result.summary.successful_operations > 0) {
      try {
        const lodgifyId = await this.getLodgifyPropertyId(propertyId)
        overrideCache.invalidate(lodgifyId)
      } catch (error) {
        // If property lookup fails, still return the results
        console.error('Failed to invalidate cache:', error)
      }
    }
    
    return result
  }
  
  /**
   * Validate price override inputs (FR-9)
   */
  static async validateOverride(
    propertyId: string,
    date: string,
    price: number,
    reason?: string
  ): Promise<void> {
    // Validate property ID
    if (!propertyId || typeof propertyId !== 'string') {
      throw new PriceOverrideError('Invalid property ID', 'INVALID_PROPERTY_ID', propertyId)
    }
    
    // Validate date format and range
    if (!this.isValidDate(date)) {
      throw new PriceOverrideError(
        'Date must be in ISO format (YYYY-MM-DD)',
        'INVALID_DATE',
        propertyId,
        date
      )
    }
    
    // Date range validation - not more than 2 years in future as per PRP-007
    const dateObj = new Date(date + 'T00:00:00')
    const maxFutureDate = new Date()
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2)
    
    if (dateObj > maxFutureDate) {
      throw new PriceOverrideError(
        'Date too far in future (max 2 years)',
        'DATE_TOO_FAR_FUTURE',
        propertyId,
        date
      )
    }
    
    // Validate price
    if (typeof price !== 'number' || price <= 0) {
      throw new PriceOverrideError(
        'Price must be a positive number',
        'INVALID_PRICE',
        propertyId,
        date,
        price
      )
    }
    
    // Check reasonable maximum price (€10,000)
    if (price > 10000) {
      throw new PriceOverrideError(
        'Price exceeds maximum allowed (€10,000)',
        'INVALID_PRICE',
        propertyId,
        date,
        price
      )
    }
    
    // Validate reason if provided
    if (reason && typeof reason !== 'string') {
      throw new PriceOverrideError(
        'Reason must be a string',
        'INVALID_REASON',
        propertyId,
        date
      )
    }
    
    if (reason && reason.length > 500) {
      throw new PriceOverrideError(
        'Reason exceeds maximum length (500 characters)',
        'INVALID_REASON',
        propertyId,
        date
      )
    }
    
    // Verify property exists
    await this.getLodgifyPropertyId(propertyId) // This will throw if property not found
  }
  
  /**
   * Validate a date range
   */
  static validateDateRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (start > end) {
        throw new PriceOverrideError(
          'Start date must be before end date',
          'INVALID_DATE_RANGE'
        )
      }
    }
  }

  /**
   * Validate input parameters for getPropertyPriceOverrides
   * Implements comprehensive validation as specified in PRP-009
   * 
   * @param propertyId - Property ID to validate
   * @param startDate - Start date to validate (must be YYYY-MM-DD format)
   * @param endDate - End date to validate (must be YYYY-MM-DD format)
   * @throws PriceOverrideError for validation failures
   */
  private static validateGetOverridesParams(
    propertyId: string,
    startDate: string,
    endDate: string
  ): void {
    // Property ID validation
    if (!propertyId || propertyId.trim() === '') {
      throw new PriceOverrideError('Property ID is required', 'INVALID_PROPERTY_ID')
    }
    
    // Date format validation (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate)) {
      throw new PriceOverrideError(
        `Invalid start date format: ${startDate}. Must be YYYY-MM-DD`,
        'INVALID_DATE_FORMAT'
      )
    }
    if (!dateRegex.test(endDate)) {
      throw new PriceOverrideError(
        `Invalid end date format: ${endDate}. Must be YYYY-MM-DD`,
        'INVALID_DATE_FORMAT'
      )
    }
    
    // Date range validation
    if (new Date(startDate) > new Date(endDate)) {
      throw new PriceOverrideError(
        'Start date must be <= end date',
        'INVALID_DATE_RANGE',
        propertyId
      )
    }
    
    // Optional: Limit date range to 90 days for performance
    const start = new Date(startDate)
    const end = new Date(endDate)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff > 90) {
      console.warn(`Large date range requested: ${daysDiff} days. Performance may be impacted.`)
    }
  }
  
  /**
   * Get property UUID from either UUID or lodgify_property_id
   * Follows pattern from base-price.service.ts
   */
  private static async getPropertyUuid(propertyId: string): Promise<string> {
    // Check if it's already a UUID (contains hyphens and is 36 chars)
    if (propertyId.length === 36 && propertyId.includes('-')) {
      return propertyId
    }

    // It's likely a lodgify_property_id, convert to UUID
    const { data, error } = await supabase
      .from('properties')
      .select('id')
      .eq('lodgify_property_id', propertyId)
      .single()

    if (error || !data?.id) {
      throw new PriceOverrideError(
        `Property not found: ${propertyId}`,
        'PROPERTY_NOT_FOUND',
        propertyId
      )
    }

    return data.id
  }

  /**
   * Validate property exists and get full property data
   */
  private static async validatePropertyExists(propertyUuid: string): Promise<Database['public']['Tables']['properties']['Row']> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyUuid)
      .single()

    if (error || !data) {
      throw new PriceOverrideError(
        `Property not found: ${propertyUuid}`,
        'PROPERTY_NOT_FOUND',
        propertyUuid
      )
    }

    return data
  }

  /**
   * Validate property exists by lodgify_property_id and get full property data
   * Used by setOverride to avoid UUID conversion issues
   */
  private static async validatePropertyByLodgifyId(lodgifyPropertyId: string): Promise<Database['public']['Tables']['properties']['Row']> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('lodgify_property_id', lodgifyPropertyId)
      .single()

    if (error || !data) {
      throw new PriceOverrideError(
        `Property not found: ${lodgifyPropertyId}`,
        'PROPERTY_NOT_FOUND',
        lodgifyPropertyId
      )
    }

    return data
  }

  /**
   * Validate property ID format and prevent UUID usage where inappropriate
   * Added per PRP-024 for TypeScript validation enforcement
   */
  private static validatePropertyIdFormat(id: string, context: string): void {
    if (this.isUuid(id) && context.includes('override')) {
      throw new PriceOverrideError(
        `UUID format not recommended in ${context}. Use lodgify_property_id for better performance.`,
        'UUID_FORMAT_WARNING',
        id
      )
    }
  }

  /**
   * Check if string is UUID format (36 chars with hyphens)
   */
  private static isUuid(id: string): boolean {
    return id.length === 36 && id.includes('-')
  }

  /**
   * Check if string is lodgify_property_id format (6-digit string)  
   */
  private static isLodgifyId(id: string): boolean {
    return /^\d{6}$/.test(id)
  }

  /**
   * Get lodgify_property_id from either UUID or lodgify_property_id format
   * Follows pattern from pricing.service.ts for consistency
   * Updated per PRP-024 to standardize property ID handling
   */
  private static async getLodgifyPropertyId(propertyId: string): Promise<string> {
    if (propertyId.length === 6 && !propertyId.includes('-')) {
      // Validate lodgify_property_id exists
      const { data, error } = await supabase
        .from('properties')
        .select('lodgify_property_id')
        .eq('lodgify_property_id', propertyId)
        .single()
      
      if (error || !data) {
        throw new PriceOverrideError(
          `Property not found: ${propertyId}`,
          'PROPERTY_NOT_FOUND',
          propertyId
        )
      }
      return propertyId
    }
    
    // Convert UUID to lodgify_property_id
    const { data, error } = await supabase
      .from('properties')
      .select('lodgify_property_id')
      .eq('id', propertyId)
      .single()

    if (error || !data?.lodgify_property_id) {
      throw new PriceOverrideError(
        `Property not found: ${propertyId}`,
        'PROPERTY_NOT_FOUND',
        propertyId
      )
    }

    return data.lodgify_property_id
  }
  
  /**
   * Get existing override for a property and date
   */
  private static async getExistingOverride(
    lodgifyPropertyId: string,
    date: string
  ): Promise<PriceOverrideRow | null> {
    const { data, error } = await supabase
      .from('price_overrides')
      .select('*')
      .eq('property_id', lodgifyPropertyId)
      .eq('override_date', date)
      .eq('is_active', true)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new PriceOverrideError(
        `Failed to check existing override: ${error.message}`,
        'FETCH_FAILED',
        lodgifyPropertyId,
        date
      )
    }
    
    return data
  }
  
  /**
   * Check if a date string is valid ISO format
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
   * Generate cache key for override queries
   */
  private static generateCacheKey(
    propertyId: string,
    startDate?: string,
    endDate?: string
  ): string {
    return `override:${propertyId}:${startDate || 'all'}:${endDate || 'all'}`
  }
  
  /**
   * Invalidate cache entries for a property
   */
  private static invalidateOverrideCache(propertyId: string, date?: string): void {
    if (date) {
      // Invalidate specific date and any ranges that might include it
      overrideCache.invalidate(`override:${propertyId}`)
    } else {
      // Invalidate all entries for this property
      overrideCache.invalidate(`override:${propertyId}`)
    }
  }
  
  /**
   * Retry operation with exponential backoff
   * Follows pattern from base-price.service.ts
   */
  private static async retryOperation<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry certain error types
        if (error instanceof PriceOverrideError) {
          const nonRetryableCodes = [
            'INVALID_PROPERTY_ID',
            'INVALID_DATE',
            'INVALID_PRICE',
            'INVALID_REASON',
            'PROPERTY_NOT_FOUND',
            'OVERRIDE_NOT_FOUND',
            'INVALID_DATE_RANGE'
          ]
          
          if (nonRetryableCodes.includes(error.code)) {
            throw error
          }
        }
        
        // Exponential backoff with jitter
        if (attempt < config.maxAttempts) {
          const delay = Math.min(
            config.baseDelay * Math.pow(2, attempt - 1),
            config.maxDelay
          )
          const jitter = delay * 0.25 * (Math.random() * 2 - 1)
          await new Promise(resolve => setTimeout(resolve, Math.max(0, delay + jitter)))
        }
      }
    }
    
    throw lastError || new PriceOverrideError(
      'Max retry attempts exceeded',
      'MAX_RETRIES_EXCEEDED'
    )
  }
}