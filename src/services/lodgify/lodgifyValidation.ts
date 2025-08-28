/**
 * Lodgify Payload Validation Module
 * 
 * Validates payload structure and data before sending to Lodgify API
 * to prevent malformed requests and ensure data integrity.
 */

import { LodgifyPayload, PayloadValidationResult } from './lodgifyTypes'

/**
 * Date format regex for YYYY-MM-DD validation
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Validates a date string format
 * 
 * @param dateString - Date string to validate
 * @returns True if valid ISO date format
 */
function isValidDateFormat(dateString: string): boolean {
  if (!ISO_DATE_REGEX.test(dateString)) {
    return false
  }

  // Check if it's a valid date
  const date = new Date(dateString)
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dateString
}

/**
 * Validates a single rate object
 * 
 * @param rate - Rate object to validate
 * @param index - Index of rate in array (for error messages)
 * @returns Array of error messages (empty if valid)
 */
function validateRate(rate: any, index: number): string[] {
  const errors: string[] = []

  // Check required fields
  if (typeof rate.price_per_day !== 'number' || rate.price_per_day <= 0) {
    errors.push(`Rate ${index}: price_per_day must be a positive number`)
  }

  // For non-default rates, check dates
  if (!rate.is_default) {
    if (!rate.start_date) {
      errors.push(`Rate ${index}: Non-default rates must have start_date`)
    } else if (!isValidDateFormat(rate.start_date)) {
      errors.push(`Rate ${index}: Invalid start_date format. Use YYYY-MM-DD`)
    }

    if (!rate.end_date) {
      errors.push(`Rate ${index}: Non-default rates must have end_date`)
    } else if (!isValidDateFormat(rate.end_date)) {
      errors.push(`Rate ${index}: Invalid end_date format. Use YYYY-MM-DD`)
    }

    // Check date order
    if (rate.start_date && rate.end_date && isValidDateFormat(rate.start_date) && isValidDateFormat(rate.end_date)) {
      const start = new Date(rate.start_date)
      const end = new Date(rate.end_date)
      if (start > end) {
        errors.push(`Rate ${index}: start_date must be before or equal to end_date`)
      }
    }
  }

  // Validate optional numeric fields if present
  if (rate.min_stay !== undefined && (typeof rate.min_stay !== 'number' || rate.min_stay < 1)) {
    errors.push(`Rate ${index}: min_stay must be a positive integer`)
  }

  if (rate.max_stay !== undefined && (typeof rate.max_stay !== 'number' || rate.max_stay < 1)) {
    errors.push(`Rate ${index}: max_stay must be a positive integer`)
  }

  if (rate.min_stay !== undefined && rate.max_stay !== undefined && rate.min_stay > rate.max_stay) {
    errors.push(`Rate ${index}: min_stay cannot be greater than max_stay`)
  }

  if (rate.price_per_additional_guest !== undefined) {
    if (typeof rate.price_per_additional_guest !== 'number' || rate.price_per_additional_guest < 0) {
      errors.push(`Rate ${index}: price_per_additional_guest must be a non-negative number`)
    }
  }

  if (rate.additional_guests_starts_from !== undefined) {
    if (typeof rate.additional_guests_starts_from !== 'number' || rate.additional_guests_starts_from < 1) {
      errors.push(`Rate ${index}: additional_guests_starts_from must be a positive integer`)
    }
  }

  return errors
}

/**
 * Validates the complete Lodgify payload structure
 * 
 * @param payload - Payload to validate
 * @returns Validation result with errors and warnings
 */
export function validateLodgifyPayload(payload: unknown): PayloadValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if payload is an object
  if (!payload || typeof payload !== 'object') {
    return {
      valid: false,
      errors: ['Payload must be a valid object'],
      warnings: []
    }
  }

  const p = payload as any

  // Validate property_id
  if (!p.property_id) {
    errors.push('property_id is required')
  } else if (typeof p.property_id !== 'number' || p.property_id <= 0) {
    errors.push('property_id must be a positive number')
  }

  // Validate room_type_id (optional but recommended)
  if (p.room_type_id !== undefined) {
    if (typeof p.room_type_id !== 'number' || p.room_type_id <= 0) {
      errors.push('room_type_id must be a positive number when provided')
    }
  } else {
    warnings.push('room_type_id is not provided - this may cause issues with some Lodgify configurations')
  }

  // Validate rates array
  if (!p.rates) {
    errors.push('rates array is required')
  } else if (!Array.isArray(p.rates)) {
    errors.push('rates must be an array')
  } else if (p.rates.length === 0) {
    errors.push('rates array must not be empty')
  } else {
    // Check for default rate
    const defaultRates = p.rates.filter((r: any) => r.is_default === true)
    
    if (defaultRates.length === 0) {
      errors.push('Payload must include at least one rate with is_default: true')
    } else if (defaultRates.length > 1) {
      warnings.push('Multiple default rates found - only one should be marked as default')
    }

    // Validate each rate
    p.rates.forEach((rate: any, index: number) => {
      const rateErrors = validateRate(rate, index)
      errors.push(...rateErrors)
    })

    // Check for date overlaps in non-default rates
    const nonDefaultRates = p.rates.filter((r: any) => !r.is_default && r.start_date && r.end_date)
    for (let i = 0; i < nonDefaultRates.length; i++) {
      for (let j = i + 1; j < nonDefaultRates.length; j++) {
        const rate1 = nonDefaultRates[i]
        const rate2 = nonDefaultRates[j]
        
        // Check if same stay length category
        if (rate1.min_stay === rate2.min_stay && rate1.max_stay === rate2.max_stay) {
          const start1 = new Date(rate1.start_date)
          const end1 = new Date(rate1.end_date)
          const start2 = new Date(rate2.start_date)
          const end2 = new Date(rate2.end_date)
          
          // Check for overlap
          if (!(end1 < start2 || end2 < start1)) {
            warnings.push(
              `Date overlap detected between rates ${i} and ${j} for stay length ${rate1.min_stay}-${rate1.max_stay} nights`
            )
          }
        }
      }
    }

    // Check payload size
    const payloadSize = JSON.stringify(p).length
    if (payloadSize > 1000000) { // 1MB warning threshold
      warnings.push(`Large payload detected (${(payloadSize / 1024).toFixed(2)} KB) - consider optimizing date ranges`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    payload: errors.length === 0 ? (p as LodgifyPayload) : undefined
  }
}

/**
 * Validates a batch of payloads
 * 
 * @param payloads - Array of payloads to validate
 * @returns Map of property IDs to validation results
 */
export function validateBatchPayloads(
  payloads: Array<{ propertyId: string; payload: unknown }>
): Map<string, PayloadValidationResult> {
  const results = new Map<string, PayloadValidationResult>()

  for (const { propertyId, payload } of payloads) {
    results.set(propertyId, validateLodgifyPayload(payload))
  }

  return results
}

/**
 * Sanitizes a payload to ensure data types are correct
 * This can help fix minor issues before validation
 * 
 * @param payload - Payload to sanitize
 * @returns Sanitized payload
 */
export function sanitizeLodgifyPayload(payload: any): any {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const sanitized = { ...payload }

  // Ensure property_id is a number
  if (sanitized.property_id && typeof sanitized.property_id === 'string') {
    sanitized.property_id = parseInt(sanitized.property_id, 10)
  }

  // Ensure room_type_id is a number if present
  if (sanitized.room_type_id && typeof sanitized.room_type_id === 'string') {
    sanitized.room_type_id = parseInt(sanitized.room_type_id, 10)
  }

  // Sanitize rates
  if (Array.isArray(sanitized.rates)) {
    sanitized.rates = sanitized.rates.map((rate: any) => {
      const sanitizedRate = { ...rate }

      // Ensure numeric fields are numbers
      if (typeof sanitizedRate.price_per_day === 'string') {
        sanitizedRate.price_per_day = parseFloat(sanitizedRate.price_per_day)
      }

      if (sanitizedRate.min_stay && typeof sanitizedRate.min_stay === 'string') {
        sanitizedRate.min_stay = parseInt(sanitizedRate.min_stay, 10)
      }

      if (sanitizedRate.max_stay && typeof sanitizedRate.max_stay === 'string') {
        sanitizedRate.max_stay = parseInt(sanitizedRate.max_stay, 10)
      }

      if (sanitizedRate.price_per_additional_guest && typeof sanitizedRate.price_per_additional_guest === 'string') {
        sanitizedRate.price_per_additional_guest = parseFloat(sanitizedRate.price_per_additional_guest)
      }

      if (sanitizedRate.additional_guests_starts_from && typeof sanitizedRate.additional_guests_starts_from === 'string') {
        sanitizedRate.additional_guests_starts_from = parseInt(sanitizedRate.additional_guests_starts_from, 10)
      }

      // Ensure boolean fields are booleans
      if (sanitizedRate.is_default !== undefined) {
        sanitizedRate.is_default = Boolean(sanitizedRate.is_default)
      }

      return sanitizedRate
    })
  }

  return sanitized
}

/**
 * Creates a minimal valid payload for testing
 * 
 * @param propertyId - Lodgify property ID
 * @param roomTypeId - Lodgify room type ID
 * @param defaultPrice - Default price per day
 * @returns Minimal valid payload
 */
export function createMinimalPayload(
  propertyId: number,
  roomTypeId: number,
  defaultPrice: number
): LodgifyPayload {
  return {
    property_id: propertyId,
    room_type_id: roomTypeId,
    rates: [
      {
        is_default: true,
        price_per_day: defaultPrice,
        min_stay: 1,
        max_stay: 1000,
        price_per_additional_guest: 0,
        additional_guests_starts_from: 1
      }
    ]
  }
}