/**
 * Minimum Price Service
 * 
 * Service layer for managing property minimum price updates with optimistic UI patterns
 * Implements database integration and constraint validation as specified in PRP-49
 */

import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/types/database.generated'

type PropertiesRow = Database['public']['Tables']['properties']['Row']
type PropertiesUpdate = Database['public']['Tables']['properties']['Update']

/**
 * Error types for minimum price operations
 */
export class MinPriceError extends Error {
  constructor(
    message: string,
    public code: string,
    public propertyId?: string,
    public constraint?: string
  ) {
    super(message)
    this.name = 'MinPriceError'
  }
}

/**
 * Result type for minimum price updates
 */
export interface MinPriceUpdateResult {
  success: boolean
  property: PropertiesRow
  previousPrice: number
  newPrice: number
  updatedAt: string
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
 * Minimum Price Service class
 * 
 * Provides methods for updating property minimum prices with proper constraint validation
 * and retry logic as specified in PRP-49 requirements
 */
export class MinPriceService {
  /**
   * Update minimum price for a property with optimistic update support
   * Enforces constraint: min_price_per_day <= base_price_per_day
   * 
   * @param propertyId - Property ID (can be UUID or lodgify_property_id string like "327020")
   * @param newMinPrice - New minimum price per day
   * @param retryConfig - Optional retry configuration
   * @returns Promise with update result
   * @throws MinPriceError for various failure scenarios
   */
  static async updateMinPrice(
    propertyId: string,
    newMinPrice: number,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<MinPriceUpdateResult> {
    // Validate inputs
    if (!propertyId || typeof propertyId !== 'string') {
      throw new MinPriceError('Invalid property ID provided', 'INVALID_PROPERTY_ID')
    }

    if (typeof newMinPrice !== 'number' || newMinPrice <= 0) {
      throw new MinPriceError('Minimum price must be a positive number', 'INVALID_PRICE', propertyId)
    }

    // Ensure precision (database stores 2 decimal places)
    const roundedPrice = Math.round(newMinPrice * 100) / 100

    return this.retryOperation(async () => {
      // Convert propertyId to UUID if it's a lodgify_property_id
      const propertyUuid = await this.getPropertyUuid(propertyId)
      
      // First, get current property data to validate constraints and track previous price
      const { data: currentProperty, error: fetchError } = await supabase
        .from('properties')
        .select('id, lodgify_property_id, property_name, base_price_per_day, min_price_per_day, updated_at')
        .eq('id', propertyUuid)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new MinPriceError(`Property not found: ${propertyId}`, 'PROPERTY_NOT_FOUND', propertyId)
        }
        throw new MinPriceError(`Failed to fetch property: ${fetchError.message}`, 'FETCH_ERROR', propertyId)
      }

      if (!currentProperty) {
        throw new MinPriceError(`Property not found: ${propertyId}`, 'PROPERTY_NOT_FOUND', propertyId)
      }

      // CRITICAL: Validate against base price constraint (client-side pre-validation)
      // min_price_per_day must be <= base_price_per_day
      if (roundedPrice > currentProperty.base_price_per_day) {
        throw new MinPriceError(
          `Minimum price €${roundedPrice.toFixed(2)} cannot exceed base price €${currentProperty.base_price_per_day.toFixed(2)}`,
          'PRICE_EXCEEDS_BASE',
          propertyId,
          'base_price_gte_min'
        )
      }

      // Check if price actually changed
      if (roundedPrice === currentProperty.min_price_per_day) {
        // Return success without update if price hasn't changed
        return {
          success: true,
          property: currentProperty as PropertiesRow,
          previousPrice: currentProperty.min_price_per_day,
          newPrice: roundedPrice,
          updatedAt: currentProperty.updated_at || new Date().toISOString()
        }
      }

      // Perform the update
      const updateData: PropertiesUpdate = {
        min_price_per_day: roundedPrice
      }

      const { data: updatedProperty, error: updateError } = await supabaseAdmin
        .from('properties')
        .update(updateData)
        .eq('id', propertyUuid)
        .select('*')
        .single()

      if (updateError) {
        // Handle specific database constraint errors
        if (updateError.code === '23514' && updateError.message.includes('base_price_gte_min')) {
          throw new MinPriceError(
            `Minimum price €${roundedPrice.toFixed(2)} violates base price constraint. Please check current base price.`,
            'CONSTRAINT_VIOLATION',
            propertyId,
            'base_price_gte_min'
          )
        }

        if (updateError.code === '23502') {
          throw new MinPriceError(
            'Minimum price cannot be null',
            'NULL_CONSTRAINT_VIOLATION',
            propertyId
          )
        }

        throw new MinPriceError(
          `Database update failed: ${updateError.message}`,
          'UPDATE_ERROR',
          propertyId
        )
      }

      if (!updatedProperty) {
        throw new MinPriceError('Update succeeded but no property returned', 'UPDATE_NO_RESULT', propertyId)
      }

      return {
        success: true,
        property: updatedProperty,
        previousPrice: currentProperty.min_price_per_day,
        newPrice: updatedProperty.min_price_per_day,
        updatedAt: updatedProperty.updated_at || new Date().toISOString()
      }
    }, retryConfig)
  }

  /**
   * Get property information for validation
   * 
   * @param propertyId - Property ID (can be UUID or lodgify_property_id string like "327020")
   * @returns Property data including base and minimum price constraints
   */
  static async getPropertyInfo(propertyId: string): Promise<PropertiesRow> {
    // Convert propertyId to UUID if it's a lodgify_property_id
    const propertyUuid = await this.getPropertyUuid(propertyId)
    
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyUuid)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new MinPriceError(`Property not found: ${propertyId}`, 'PROPERTY_NOT_FOUND', propertyId)
      }
      throw new MinPriceError(`Failed to fetch property info: ${error.message}`, 'FETCH_ERROR', propertyId)
    }

    return data
  }

  /**
   * Retry operation with exponential backoff
   * 
   * @param operation - Async operation to retry
   * @param config - Retry configuration
   * @returns Promise with operation result
   */
  private static async retryOperation<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        // Don't retry certain types of errors
        if (error instanceof MinPriceError) {
          const nonRetryableCodes = [
            'INVALID_PROPERTY_ID',
            'INVALID_PRICE', 
            'PROPERTY_NOT_FOUND',
            'PRICE_EXCEEDS_BASE',
            'CONSTRAINT_VIOLATION',
            'NULL_CONSTRAINT_VIOLATION'
          ]
          
          if (nonRetryableCodes.includes(error.code)) {
            throw error
          }
        }

        // Don't retry on last attempt
        if (attempt === config.maxAttempts) {
          break
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt - 1),
          config.maxDelay
        )
        
        // Add jitter (±25% of delay)
        const jitter = delay * 0.25 * (Math.random() * 2 - 1)
        const finalDelay = Math.max(0, delay + jitter)

        console.warn(`Minimum price update attempt ${attempt} failed, retrying in ${Math.round(finalDelay)}ms:`, error)
        
        await new Promise(resolve => setTimeout(resolve, finalDelay))
      }
    }

    // If we get here, all retries failed
    throw lastError || new MinPriceError('Max retry attempts exceeded', 'MAX_RETRIES_EXCEEDED')
  }

  /**
   * Validate minimum price against property constraints without updating
   * Ensures min_price <= base_price constraint
   * 
   * @param propertyId - Property ID (can be UUID or lodgify_property_id string like "327020")
   * @param newMinPrice - Minimum price to validate
   * @returns Validation result with specific error messages
   */
  static async validateMinPrice(
    propertyId: string,
    newMinPrice: number
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const property = await this.getPropertyInfo(propertyId)
      
      if (newMinPrice <= 0) {
        return { valid: false, error: 'Minimum price must be a positive number' }
      }

      // CRITICAL: Check base price constraint
      if (newMinPrice > property.base_price_per_day) {
        return { 
          valid: false, 
          error: `Minimum price cannot exceed base price of €${property.base_price_per_day.toFixed(2)}` 
        }
      }

      return { valid: true }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof MinPriceError ? error.message : 'Validation failed' 
      }
    }
  }

  /**
   * Check if a minimum price update would violate constraints
   * Useful for pre-validation before attempting database update
   * 
   * @param propertyId - Property ID
   * @param newMinPrice - Proposed minimum price
   * @param currentBasePrice - Optional current base price (will be fetched if not provided)
   * @returns True if update would be valid
   */
  static async canUpdateMinPrice(
    propertyId: string,
    newMinPrice: number,
    currentBasePrice?: number
  ): Promise<boolean> {
    if (newMinPrice <= 0) {
      return false
    }

    let basePrice = currentBasePrice
    if (basePrice === undefined) {
      try {
        const property = await this.getPropertyInfo(propertyId)
        basePrice = property.base_price_per_day
      } catch {
        return false
      }
    }

    return newMinPrice <= basePrice
  }

  /**
   * Convert property ID to UUID for database operations
   * Handles both UUID (returns as-is) and lodgify_property_id (converts to UUID)
   * 
   * @param propertyId - Either UUID or lodgify_property_id string
   * @returns Property UUID for database queries
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

    if (error) {
      throw new MinPriceError(
        `Failed to find property with lodgify_property_id: ${propertyId}`,
        'PROPERTY_LOOKUP_FAILED',
        propertyId
      )
    }

    if (!data?.id) {
      throw new MinPriceError(`Property not found: ${propertyId}`, 'PROPERTY_NOT_FOUND', propertyId)
    }

    return data.id
  }
}

export default MinPriceService