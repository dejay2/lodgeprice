/**
 * Validation Helper Functions
 * 
 * Pure utility functions for common validation tasks
 * that complement the Zod schemas in src/lib/validation.ts
 */

import { formatDate } from './dateHelpers'

// =============================================================================
// Price Validation Helpers
// =============================================================================

/**
 * Check if a string represents a valid price
 * Allows for common price input formats
 */
export function isValidPriceString(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  
  // Remove common currency symbols and spaces
  const cleanValue = value.replace(/[$£€¥\s,]/g, '')
  
  // Check if it matches price pattern: digits with optional decimal
  const priceRegex = /^\d+(\.\d{1,2})?$/
  
  if (!priceRegex.test(cleanValue)) return false
  
  const numValue = parseFloat(cleanValue)
  return numValue >= 0.01 && numValue <= 10000
}

/**
 * Normalize price string to standard format
 * Removes currency symbols, handles commas, etc.
 */
export function normalizePriceString(value: string): string {
  if (!value || typeof value !== 'string') return '0.00'
  
  // Remove currency symbols and spaces
  let normalized = value.replace(/[$£€¥\s]/g, '')
  
  // Handle comma as decimal separator (European format)
  if (normalized.includes(',') && !normalized.includes('.')) {
    normalized = normalized.replace(',', '.')
  } else if (normalized.includes(',')) {
    // Remove thousand separators (commas)
    const lastCommaIndex = normalized.lastIndexOf(',')
    const lastDotIndex = normalized.lastIndexOf('.')
    
    if (lastCommaIndex > lastDotIndex) {
      // Comma is decimal separator
      normalized = normalized.replace(/,(?=\d{1,2}$)/, '.')
      normalized = normalized.replace(/,/g, '')
    } else {
      // Comma is thousand separator
      normalized = normalized.replace(/,/g, '')
    }
  }
  
  // Ensure at most 2 decimal places
  const parts = normalized.split('.')
  if (parts.length > 2) return '0.00'
  
  if (parts.length === 2) {
    parts[1] = parts[1].substring(0, 2)
    normalized = parts.join('.')
  }
  
  // Validate final result
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return '0.00'
  
  const numValue = parseFloat(normalized)
  if (isNaN(numValue) || numValue < 0) return '0.00'
  
  return numValue.toFixed(2)
}

/**
 * Format price for display with currency symbol
 */
export function formatPriceForDisplay(value: number, currency: string = '$'): string {
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    return `${currency}0.00`
  }
  
  return `${currency}${value.toFixed(2)}`
}

/**
 * Calculate percentage change safely
 */
export function calculatePercentageChange(oldPrice: number, newPrice: number): number {
  if (oldPrice <= 0) return 0
  return ((newPrice - oldPrice) / oldPrice) * 100
}

// =============================================================================
// Date Validation Helpers
// =============================================================================

/**
 * Check if date string is in YYYY-MM-DD format
 */
export function isValidDateFormat(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString)
}

/**
 * Check if date string represents a valid calendar date
 */
export function isValidCalendarDate(dateString: string): boolean {
  if (!isValidDateFormat(dateString)) return false
  
  const date = new Date(dateString + 'T00:00:00')
  const [year, month, day] = dateString.split('-').map(Number)
  
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

/**
 * Check if date is within reasonable business range (not too far in past/future)
 */
export function isDateInBusinessRange(dateString: string): boolean {
  if (!isValidCalendarDate(dateString)) return false
  
  const date = new Date(dateString)
  const now = new Date()
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(now.getFullYear() - 1)
  const twoYearsFromNow = new Date()
  twoYearsFromNow.setFullYear(now.getFullYear() + 2)
  
  return date >= oneYearAgo && date <= twoYearsFromNow
}

/**
 * Calculate number of days between two dates
 */
export function daysBetweenDates(startDate: string, endDate: string): number {
  if (!isValidCalendarDate(startDate) || !isValidCalendarDate(endDate)) {
    return 0
  }
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = end.getTime() - start.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if date range is valid (start before end, reasonable duration)
 */
export function isValidDateRange(startDate: string, endDate: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (!isValidCalendarDate(startDate)) {
    errors.push('Start date is invalid')
  }
  
  if (!isValidCalendarDate(endDate)) {
    errors.push('End date is invalid')
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors }
  }
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (start >= end) {
    errors.push('End date must be after start date')
  }
  
  const daysDiff = daysBetweenDates(startDate, endDate)
  if (daysDiff > 365) {
    errors.push('Date range cannot exceed 365 days')
  }
  
  if (daysDiff < 1) {
    errors.push('Date range must be at least 1 day')
  }
  
  return { isValid: errors.length === 0, errors }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return formatDate(new Date())
}

/**
 * Add days to a date string
 */
export function addDaysToDateString(dateString: string, days: number): string {
  if (!isValidCalendarDate(dateString)) return dateString
  
  const date = new Date(dateString)
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

// =============================================================================
// Text Validation Helpers
// =============================================================================

/**
 * Check if text contains potentially harmful content
 */
export function containsPotentialXSS(text: string): boolean {
  if (!text || typeof text !== 'string') return false
  
  const xssPatterns = [
    /<script.*?>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe.*?>/i,
    /<object.*?>/i,
    /<embed.*?>/i,
    /expression\s*\(/i,
    /vbscript:/i,
    /data:\s*text\/html/i
  ]
  
  return xssPatterns.some(pattern => pattern.test(text))
}

/**
 * Check if text length is within reasonable limits
 */
export function isTextLengthValid(text: string, minLength: number = 1, maxLength: number = 200): boolean {
  if (typeof text !== 'string') return false
  const trimmed = text.trim()
  return trimmed.length >= minLength && trimmed.length <= maxLength
}

/**
 * Validate property name format
 */
export function isValidPropertyName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  
  const trimmed = name.trim()
  
  // Length check
  if (trimmed.length < 2 || trimmed.length > 100) return false
  
  // No XSS content
  if (containsPotentialXSS(trimmed)) return false
  
  // Basic character validation (letters, numbers, spaces, hyphens, apostrophes)
  const validNamePattern = /^[a-zA-Z0-9\s\-']+$/
  return validNamePattern.test(trimmed)
}

// =============================================================================
// Form Validation Helpers
// =============================================================================

/**
 * Debounce function for validation calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Create validation summary from multiple field errors
 */
export function createValidationSummary(fieldErrors: Record<string, string>): {
  hasErrors: boolean
  errorCount: number
  fieldNames: string[]
  summary: string
} {
  const fieldNames = Object.keys(fieldErrors)
  const errorCount = fieldNames.length
  
  if (errorCount === 0) {
    return {
      hasErrors: false,
      errorCount: 0,
      fieldNames: [],
      summary: 'All fields are valid'
    }
  }
  
  let summary = `${errorCount} field${errorCount > 1 ? 's' : ''} need${errorCount === 1 ? 's' : ''} attention: `
  summary += fieldNames.join(', ')
  
  return {
    hasErrors: true,
    errorCount,
    fieldNames,
    summary
  }
}

/**
 * Check if form has any validation errors
 */
export function hasValidationErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(error => error && error.length > 0)
}

/**
 * Get first validation error message
 */
export function getFirstValidationError(errors: Record<string, string | undefined>): string | null {
  for (const error of Object.values(errors)) {
    if (error && error.length > 0) {
      return error
    }
  }
  return null
}

// =============================================================================
// UUID and ID Validation Helpers
// =============================================================================

/**
 * Check if string is a valid UUID v4 format
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Check if string could be a valid property ID (UUID or numeric)
 */
export function isValidPropertyId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  
  // Check for UUID format
  if (isValidUUID(id)) return true
  
  // Check for numeric ID (Lodgify property IDs are numeric)
  const numericIdRegex = /^\d+$/
  if (numericIdRegex.test(id)) {
    const numericId = parseInt(id, 10)
    return numericId > 0 && numericId < 10000000 // Reasonable range
  }
  
  return false
}

// =============================================================================
// Business Rule Validation Helpers
// =============================================================================

/**
 * Check if seasonal rate adjustment is reasonable
 */
export function isValidRateAdjustment(adjustment: number): boolean {
  return typeof adjustment === 'number' && 
         !isNaN(adjustment) && 
         adjustment >= -1 && 
         adjustment <= 10 && 
         adjustment !== 0
}

/**
 * Check if guest count is reasonable for property booking
 */
export function isValidGuestCount(count: number): boolean {
  return typeof count === 'number' && 
         Number.isInteger(count) && 
         count >= 1 && 
         count <= 20
}

/**
 * Check if stay length is reasonable for booking
 */
export function isValidStayLength(days: number): boolean {
  return typeof days === 'number' && 
         Number.isInteger(days) && 
         days >= 1 && 
         days <= 365
}

// =============================================================================
// Export Collections
// =============================================================================

export const priceValidationHelpers = {
  isValidPriceString,
  normalizePriceString,
  formatPriceForDisplay,
  calculatePercentageChange
} as const

export const dateValidationHelpers = {
  isValidDateFormat,
  isValidCalendarDate,
  isDateInBusinessRange,
  daysBetweenDates,
  isValidDateRange,
  getTodayDateString,
  addDaysToDateString
} as const

export const textValidationHelpers = {
  containsPotentialXSS,
  isTextLengthValid,
  isValidPropertyName
} as const

export const formValidationHelpers = {
  debounce,
  createValidationSummary,
  hasValidationErrors,
  getFirstValidationError
} as const

export const idValidationHelpers = {
  isValidUUID,
  isValidPropertyId
} as const

export const businessValidationHelpers = {
  isValidRateAdjustment,
  isValidGuestCount,
  isValidStayLength
} as const