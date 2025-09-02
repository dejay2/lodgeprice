import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import type { LodgifyPayload, PayloadValidationResult } from '@/types/lodgify'
import type { PriceOverride } from '@/types/database'

// Lodgify API JSON Schema
const lodgifyPayloadSchema = {
  type: 'object',
  required: ['property_id', 'room_type_id', 'rates'],
  properties: {
    property_id: { 
      type: 'number',
      minimum: 1
    },
    room_type_id: { 
      type: 'number',
      minimum: 1
    },
    rates: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['is_default', 'price_per_day', 'min_stay', 'max_stay', 'price_per_additional_guest', 'additional_guests_starts_from'],
        properties: {
          is_default: { type: 'boolean' },
          start_date: { 
            type: 'string', 
            format: 'date',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          end_date: { 
            type: 'string', 
            format: 'date',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          price_per_day: { 
            type: 'number', 
            minimum: 0
            // Removed multipleOf due to floating point precision issues
            // Will validate decimal places in custom validation
          },
          min_stay: { 
            type: 'number', 
            minimum: 1
          },
          max_stay: { 
            type: 'number', 
            minimum: 1
          },
          price_per_additional_guest: { 
            type: 'number', 
            minimum: 0
            // Removed multipleOf due to floating point precision issues
            // Will validate decimal places in custom validation
          },
          additional_guests_starts_from: { 
            type: 'number', 
            minimum: 0
          }
        },
        // Conditional validation: non-default rates must have dates
        if: { 
          properties: { is_default: { const: false } } 
        },
        then: { 
          required: ['start_date', 'end_date'] 
        },
        // Default rates should not have dates
        else: {
          not: {
            anyOf: [
              { required: ['start_date'] },
              { required: ['end_date'] }
            ]
          }
        }
      }
    }
  }
}

// Initialize Ajv with formats support
const ajv = new Ajv({ 
  allErrors: true, 
  verbose: true,
  strict: false
})
addFormats(ajv)

// Compile schema once for performance
const validatePayload = ajv.compile(lodgifyPayloadSchema)

/**
 * Check if a number has at most 2 decimal places (with tolerance for floating point)
 */
function hasValidDecimals(value: number): boolean {
  // Convert to string and check decimal places
  const str = value.toString()
  const parts = str.split('.')
  
  if (parts.length === 1) return true // No decimals
  
  const decimalPart = parts[1]
  // Allow up to 15 digits but only consider first 2 as significant for cents
  // This handles cases like 279.33000000000004
  if (decimalPart.length <= 2) return true
  
  // Check if extra digits are just floating point noise (all zeros or near-zero)
  const extra = decimalPart.substring(2)
  return /^0*$/.test(extra) || /^0*[1-9]?0*$/.test(extra) && parseInt(extra) < 5
}

/**
 * Validate single Lodgify payload against API schema
 */
export function validateLodgifyPayload(payload: any): PayloadValidationResult {
  const valid = validatePayload(payload)
  
  if (valid) {
    // Check for decimal place issues
    const decimalErrors: string[] = []
    if (payload.rates && Array.isArray(payload.rates)) {
      payload.rates.forEach((rate: any, index: number) => {
        if (rate.price_per_day && !hasValidDecimals(rate.price_per_day)) {
          decimalErrors.push(`/rates/${index}/price_per_day: has more than 2 decimal places (${rate.price_per_day})`)
        }
        if (rate.price_per_additional_guest && !hasValidDecimals(rate.price_per_additional_guest)) {
          decimalErrors.push(`/rates/${index}/price_per_additional_guest: has more than 2 decimal places (${rate.price_per_additional_guest})`)
        }
      })
    }
    
    if (decimalErrors.length > 0) {
      return {
        valid: false,
        errors: decimalErrors
      }
    }
    
    const warnings = validateBusinessLogic(payload as unknown as LodgifyPayload)
    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }
  
  const errors = validatePayload.errors?.map(err => {
    const instancePath = err.instancePath || 'root'
    const message = err.message || 'Unknown validation error'
    return `${instancePath}: ${message}`
  }) || ['Unknown validation error']
  
  return {
    valid: false,
    errors
  }
}

/**
 * Validate array of payloads
 */
export function validateLodgifyPayloads(payloads: LodgifyPayload[]): PayloadValidationResult[] {
  return payloads.map(payload => validateLodgifyPayload(payload))
}

/**
 * Business logic validation (beyond schema)
 */
function validateBusinessLogic(payload: LodgifyPayload): string[] {
  const warnings: string[] = []
  
  // Check for exactly one default rate
  const defaultRates = payload.rates.filter(rate => rate.is_default)
  if (defaultRates.length === 0) {
    warnings.push('No default rate found (is_default: true is required)')
  } else if (defaultRates.length > 1) {
    warnings.push(`Multiple default rates found: ${defaultRates.length} (only one allowed)`)
  }
  
  // Check for reasonable price ranges
  const maxPrice = Math.max(...payload.rates.map(r => r.price_per_day))
  const minPrice = Math.min(...payload.rates.map(r => r.price_per_day))
  if (maxPrice > 10000) {
    warnings.push(`Very high price detected: €${maxPrice} per day`)
  }
  if (minPrice < 10) {
    warnings.push(`Very low price detected: €${minPrice} per day`)
  }
  
  // Check min_stay vs max_stay logic
  for (const rate of payload.rates) {
    if (rate.min_stay > rate.max_stay) {
      warnings.push(`Invalid stay range: min_stay (${rate.min_stay}) > max_stay (${rate.max_stay})`)
    }
  }
  
  // Check for date range overlaps in non-default rates
  const nonDefaultRates = payload.rates.filter(rate => !rate.is_default)
  for (let i = 0; i < nonDefaultRates.length; i++) {
    for (let j = i + 1; j < nonDefaultRates.length; j++) {
      const rate1 = nonDefaultRates[i]
      const rate2 = nonDefaultRates[j]
      
      if (rate1.start_date && rate1.end_date && rate2.start_date && rate2.end_date &&
          rate1.min_stay === rate2.min_stay && rate1.max_stay === rate2.max_stay) {
        
        const start1 = new Date(rate1.start_date)
        const end1 = new Date(rate1.end_date)
        const start2 = new Date(rate2.start_date)
        const end2 = new Date(rate2.end_date)
        
        if ((start1 <= end2 && end1 >= start2)) {
          warnings.push(`Date range overlap detected for stay length ${rate1.min_stay}-${rate1.max_stay} nights`)
        }
      }
    }
  }
  
  return warnings
}

/**
 * Validate complete payloads array and provide summary
 */
export function validateCompletePayload(payloads: LodgifyPayload[]): {
  valid: boolean
  totalPayloads: number
  validPayloads: number
  invalidPayloads: number
  errors: string[]
  warnings: string[]
} {
  const results = validateLodgifyPayloads(payloads)
  
  let validCount = 0
  let invalidCount = 0
  const allErrors: string[] = []
  const allWarnings: string[] = []
  
  results.forEach((result, index) => {
    if (result.valid) {
      validCount++
      if (result.warnings) {
        allWarnings.push(`Property ${index + 1}: ${result.warnings.join(', ')}`)
      }
    } else {
      invalidCount++
      if (result.errors) {
        allErrors.push(`Property ${index + 1}: ${result.errors.join(', ')}`)
      }
    }
  })
  
  return {
    valid: invalidCount === 0,
    totalPayloads: payloads.length,
    validPayloads: validCount,
    invalidPayloads: invalidCount,
    errors: allErrors,
    warnings: allWarnings
  }
}

/**
 * Validate that overrides are properly included in the payload
 * @param payload - The generated Lodgify payload
 * @param overrides - List of price overrides that should be included
 * @returns Validation result with any missing overrides
 */
export function validateOverrideInclusion(
  payload: LodgifyPayload, 
  overrides: PriceOverride[]
): {
  valid: boolean
  includedCount: number
  missingCount: number
  missingDates: string[]
  warnings: string[]
} {
  const warnings: string[] = []
  const missingDates: string[] = []
  let includedCount = 0
  let missingCount = 0
  
  if (!overrides || overrides.length === 0) {
    return {
      valid: true,
      includedCount: 0,
      missingCount: 0,
      missingDates: [],
      warnings: []
    }
  }
  
  // Build a map of dates covered by the payload rates
  const coveredDates = new Set<string>()
  
  for (const rate of payload.rates) {
    if (rate.is_default) {
      // Default rate covers all dates not explicitly specified
      continue
    }
    
    if (rate.start_date && rate.end_date) {
      // Add all dates in the range
      const start = new Date(rate.start_date)
      const end = new Date(rate.end_date)
      const current = new Date(start)
      
      while (current <= end) {
        coveredDates.add(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }
    }
  }
  
  // Check each override
  for (const override of overrides) {
    if (!override.is_active) {
      continue // Skip inactive overrides
    }
    
    const overrideDate = override.override_date
    
    // Check if this date is covered by non-default rates
    if (coveredDates.has(overrideDate)) {
      // Need to verify the price matches
      const ratesForDate = payload.rates.filter(rate => {
        if (rate.is_default) return false
        if (!rate.start_date || !rate.end_date) return false
        
        const start = new Date(rate.start_date)
        const end = new Date(rate.end_date)
        const check = new Date(overrideDate)
        
        return check >= start && check <= end
      })
      
      if (ratesForDate.length > 0) {
        // Check if any rate has the override price
        const hasOverridePrice = ratesForDate.some(rate => 
          Math.abs(rate.price_per_day - override.override_price) < 0.01
        )
        
        if (hasOverridePrice) {
          includedCount++
        } else {
          missingCount++
          missingDates.push(overrideDate)
          warnings.push(`Override for ${overrideDate} (€${override.override_price}) not reflected in payload`)
        }
      } else {
        // Covered by default rate - override might not be applied
        missingCount++
        missingDates.push(overrideDate)
        warnings.push(`Override for ${overrideDate} appears to use default rate instead`)
      }
    } else {
      // Date not explicitly covered - will use default rate
      // This might be intentional if the override price matches the default
      const defaultRate = payload.rates.find(r => r.is_default)
      if (defaultRate && Math.abs(defaultRate.price_per_day - override.override_price) < 0.01) {
        includedCount++ // Override matches default, so it's effectively included
      } else {
        missingCount++
        missingDates.push(overrideDate)
        warnings.push(`Override for ${overrideDate} not found in payload (will use default rate)`)
      }
    }
  }
  
  // Validate override price ranges
  const overridePrices = overrides
    .filter(o => o.is_active)
    .map(o => o.override_price)
  
  if (overridePrices.length > 0) {
    const maxOverride = Math.max(...overridePrices)
    const minOverride = Math.min(...overridePrices)
    
    if (maxOverride > 10000) {
      warnings.push(`Very high override price detected: €${maxOverride}`)
    }
    if (minOverride < 0) {
      warnings.push(`Invalid negative override price detected: €${minOverride}`)
    }
  }
  
  return {
    valid: missingCount === 0,
    includedCount,
    missingCount,
    missingDates,
    warnings
  }
}