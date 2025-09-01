import { supabase } from '@/lib/supabase'
import type { Property, DateRange } from '@/types/database'
import { 
  syncPricingToLodgify, 
  syncMultiplePropertiesToLodgify,
  testLodgifyConnection,
  getPropertySyncStatus 
} from './lodgify/lodgifyApiClient'
import {
  uuidSchema,
  dateSchema,
  basePriceUpdateSchema,
  seasonalRateCreateSchema,
  supabasePropertyUpdateSchema,
  safeValidate
} from '../lib/validation'
import { sanitizeFormData } from '../lib/sanitization'
import { z } from 'zod'

// =============================================================================
// Validation Wrapper Functions
// =============================================================================

/**
 * Validate and sanitize API payload before database operations
 */
function validateApiPayload<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  sanitize: boolean = false
): z.infer<T> {
  let processedData = data

  // Apply sanitization if requested
  if (sanitize && typeof data === 'object' && data !== null) {
    const sanitizationResult = sanitizeFormData(data as Record<string, any>)
    processedData = sanitizationResult.sanitized

    // Log sanitization warnings
    if (sanitizationResult.warnings.length > 0) {
      console.warn('API payload sanitization warnings:', sanitizationResult.warnings)
    }

    // Throw error if XSS detected
    if (sanitizationResult.hasXSS) {
      throw new Error('Invalid input: potentially unsafe content detected and removed')
    }
  }

  // Validate processed data
  const result = safeValidate(schema, processedData)
  
  if (!result.success) {
    const errors = result.errors || {}
    const errorMessage = `Validation failed: ${Object.values(errors).join(', ')}`
    throw new Error(errorMessage)
  }

  return result.data as z.infer<T>
}

/**
 * Validate UUID parameter
 */
function validateUuid(uuid: string, paramName: string = 'id'): string {
  const result = safeValidate(uuidSchema, uuid)
  if (!result.success) {
    throw new Error(`Invalid ${paramName}: must be a valid UUID`)
  }
  return result.data as string
}


/**
 * Validate date parameter
 */
function validateDate(date: string, paramName: string = 'date'): string {
  const result = safeValidate(dateSchema, date)
  if (!result.success) {
    const errors = result.errors || {}
    throw new Error(`Invalid ${paramName}: ${Object.values(errors).join(', ')}`)
  }
  return result.data as string
}

// =============================================================================
// Property API functions
// =============================================================================
export const propertyApi = {
  // Get all properties
  async getAll(): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('property_name')

    if (error) throw new Error(`Failed to fetch properties: ${error.message}`)
    return data || []
  },

  // Get single property by UUID
  async getById(id: string): Promise<Property | null> {
    // Validate UUID parameter
    const validatedId = validateUuid(id, 'property ID')

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', validatedId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to fetch property: ${error.message}`)
    }
    return data
  },

  // Get single property by lodgify_property_id (lodgify ID)
  async getByPropertyId(propertyId: string): Promise<Property | null> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('lodgify_property_id', propertyId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw new Error(`Failed to fetch property: ${error.message}`)
    }
    return data
  },

  // Update property base price
  async updateBasePrice(id: string, newPrice: number): Promise<void> {
    // Validate and sanitize input data
    const validatedPayload = validateApiPayload(basePriceUpdateSchema, {
      propertyId: id,
      newPrice: newPrice
    }, true)

    const { error } = await supabase
      .from('properties')
      .update({ base_price_per_day: validatedPayload.newPrice })
      .eq('id', validatedPayload.propertyId)

    if (error) throw new Error(`Failed to update property price: ${error.message}`)
  },

  // Update property with validation
  async update(id: string, updates: Partial<Property>): Promise<void> {
    // Validate UUID
    const validatedId = validateUuid(id, 'property ID')
    
    // Prepare and validate update payload
    const updatePayload = {
      id: validatedId,
      ...updates
    }

    const validatedPayload = validateApiPayload(supabasePropertyUpdateSchema, updatePayload, true)

    const { error } = await supabase
      .from('properties')
      .update(validatedPayload)
      .eq('id', validatedId)

    if (error) throw new Error(`Failed to update property: ${error.message}`)
  }
}

// Pricing calculation functions
export const pricingApi = {
  // Calculate final price using database function
  // Note: Uses property_id (TEXT) not UUID
  async calculatePrice(
    propertyId: string,  // This is the TEXT property_id, e.g. "327020"
    checkDate: string, 
    nights: number
  ): Promise<any> {
    // Validate input parameters - note: propertyId here is NOT a UUID, it's a TEXT field
    // Using a custom validation since propertyId is not a UUID in this context
    const validatedPayload = {
      propertyId: propertyId,  // Pass through as-is, it's the lodgify property ID
      checkInDate: validateDate(checkDate, 'check-in date'),
      stayLength: nights
    }

    if (nights < 1 || nights > 365) {
      throw new Error('Stay length must be between 1 and 365 days')
    }

    const result = await supabase
      .rpc('calculate_final_price', {
        p_property_id: validatedPayload.propertyId,
        p_check_date: validatedPayload.checkInDate,
        p_nights: validatedPayload.stayLength
      })

    if (result.error) throw new Error(`Failed to calculate price: ${result.error.message}`)
    return result.data
  },

  // Get pricing preview for a date range
  async getPricingPreview(
    propertyId: string,  // This is the TEXT property_id, e.g. "327020"
    startDate: string,
    endDate: string,
    nights: number = 3
  ) {
    // Validate date range and parameters
    validateDate(startDate, 'start date')
    validateDate(endDate, 'end date')
    
    // Validate that start date is before end date
    if (new Date(startDate) >= new Date(endDate)) {
      throw new Error('Start date must be before end date')
    }

    // Validate nights parameter
    if (nights < 1 || nights > 365) {
      throw new Error('Number of nights must be between 1 and 365')
    }

    const result = await supabase
      .rpc('preview_pricing_calendar', {
        p_property_id: propertyId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_nights: nights
      })

    if (result.error) throw new Error(`Failed to get pricing preview: ${result.error.message}`)
    return result.data
  }
}

// Date ranges API (seasonal rates)
export const dateRangesApi = {
  // Get all date ranges
  async getAll(): Promise<DateRange[]> {
    const { data, error } = await supabase
      .from('date_ranges')
      .select('*')
      .order('start_date')

    if (error) throw new Error(`Failed to fetch date ranges: ${error.message}`)
    return data || []
  },

  // Create new date range
  async create(dateRange: Omit<DateRange, 'rate_id' | 'created_at' | 'updated_at'>): Promise<DateRange> {
    // Validate and sanitize the date range data
    const validatedPayload = validateApiPayload(seasonalRateCreateSchema, {
      name: dateRange.rate_name,
      startDate: dateRange.start_date,
      endDate: dateRange.end_date,
      rateAdjustment: dateRange.discount_rate,
      propertyId: (dateRange as any).property_id || (dateRange as any).id
    }, true)

    // Map back to database format
    const dbPayload = {
      rate_name: validatedPayload.name,
      start_date: validatedPayload.startDate,
      end_date: validatedPayload.endDate,
      discount_rate: validatedPayload.rateAdjustment,
      property_id: validatedPayload.propertyId
    }

    const { data, error } = await supabase
      .from('date_ranges')
      .insert([dbPayload])
      .select()
      .single()

    if (error) throw new Error(`Failed to create date range: ${error.message}`)
    return data as DateRange
  },

  // Update date range
  async update(rateId: string, updates: Partial<DateRange>): Promise<void> {
    // Validate UUID
    const validatedRateId = validateUuid(rateId, 'rate ID')

    // Validate update fields if they are provided
    const sanitizedUpdates: any = {}
    
    if (updates.rate_name) {
      const nameResult = safeValidate(z.string().min(1).max(200), updates.rate_name)
      if (nameResult.success && nameResult.data) {
        sanitizedUpdates.rate_name = nameResult.data
      }
    }
    if (updates.start_date) {
      sanitizedUpdates.start_date = validateDate(updates.start_date, 'start date')
    }
    if (updates.end_date) {
      sanitizedUpdates.end_date = validateDate(updates.end_date, 'end date')
    }
    if (updates.discount_rate !== undefined) {
      // Validate rate adjustment is within reasonable bounds
      if (updates.discount_rate < -1 || updates.discount_rate > 10) {
        throw new Error('Rate adjustment must be between -100% (-1) and 1000% (10)')
      }
      sanitizedUpdates.discount_rate = updates.discount_rate
    }

    const { error } = await supabase
      .from('date_ranges')
      .update(sanitizedUpdates)
      .eq('rate_id', validatedRateId)

    if (error) throw new Error(`Failed to update date range: ${error.message}`)
  },

  // Delete date range
  async delete(rateId: string): Promise<void> {
    // Validate UUID
    const validatedRateId = validateUuid(rateId, 'rate ID')

    const { error } = await supabase
      .from('date_ranges')
      .delete()
      .eq('rate_id', validatedRateId)

    if (error) throw new Error(`Failed to delete date range: ${error.message}`)
  }
}

// Booking conflict check
export const bookingApi = {
  // Check for booking conflicts
  async checkConflict(
    propertyId: string,  // This is the TEXT property_id, e.g. "327020"
    arrivalDate: string,
    departureDate: string,
    bookingId?: string
  ): Promise<boolean> {
    const result = await supabase
      .rpc('check_booking_conflict', {
        p_property_id: propertyId,
        p_arrival_date: arrivalDate,
        p_departure_date: departureDate,
        p_exclude_booking_id: bookingId || null
      })

    if (result.error) throw new Error(`Failed to check booking conflict: ${result.error.message}`)
    return result.data
  }
}

// Lodgify API synchronization functions
export const lodgifyApi = {
  /**
   * Sync pricing data for a single property to Lodgify
   * 
   * @param propertyId - UUID of the property in database
   * @param pricingPayload - Payload generated by lodgifyPayloadService
   * @param options - Sync options
   * @returns Sync result with success status and details
   */
  syncPricing: syncPricingToLodgify,

  /**
   * Sync pricing data for multiple properties to Lodgify
   * 
   * @param propertyPayloads - Array of property IDs and their payloads
   * @param options - Sync options
   * @returns Batch sync result with individual results and summary
   */
  syncMultipleProperties: syncMultiplePropertiesToLodgify,

  /**
   * Test Lodgify API connection for a property
   * 
   * @param propertyId - UUID of the property
   * @returns Test result
   */
  testConnection: testLodgifyConnection,

  /**
   * Get sync status for a property
   * 
   * @param propertyId - UUID of the property
   * @returns Status object with sync information
   */
  getSyncStatus: getPropertySyncStatus
}

// Re-export types for convenience
export type { 
  LodgifySyncResult, 
  BatchSyncResult, 
  SyncOptions 
} from './lodgify/lodgifyTypes'