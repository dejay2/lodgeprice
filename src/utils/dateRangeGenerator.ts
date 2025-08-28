import { addDays, format, startOfDay } from 'date-fns'

/**
 * Generate array of dates for 24-month period starting from current date
 * Handles leap years and timezone considerations
 */
export function generate24MonthRange(): Date[] {
  const startDate = startOfDay(new Date())
  const endDate = addDays(startDate, 730) // Exactly 2 years (730 days)
  const dates: Date[] = []
  
  let currentDate = startDate
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate))
    currentDate = addDays(currentDate, 1)
  }
  
  return dates
}

/**
 * Generate custom date range
 */
export function generateCustomDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  let currentDate = startOfDay(startDate)
  const finalDate = startOfDay(endDate)
  
  while (currentDate <= finalDate) {
    dates.push(new Date(currentDate))
    currentDate = addDays(currentDate, 1)
  }
  
  return dates
}

/**
 * Format date for database function compatibility
 */
export function formatDateForAPI(date: Date): string {
  return format(date, 'yyyy-MM-dd') // ISO format required by database functions
}

/**
 * Get stay length categories as defined in PRP
 */
export function getDefaultStayLengthCategories() {
  return [
    {
      name: '1-7 nights',
      minStay: 1,
      maxStay: 7,
      stayLength: 3 // Representative stay length for pricing calculation
    },
    {
      name: '8-14 nights',
      minStay: 8,
      maxStay: 14,
      stayLength: 10
    },
    {
      name: '15+ nights',
      minStay: 15,
      maxStay: 1000,
      stayLength: 21
    }
  ]
}

/**
 * Check if date ranges are consecutive (for optimization)
 */
export function isConsecutiveDay(endDate: string, nextDate: string): boolean {
  const end = new Date(endDate)
  const next = new Date(nextDate)
  const expectedNext = addDays(end, 1)
  
  return expectedNext.getTime() === next.getTime()
}

/**
 * Calculate days in date range
 */
export function getDaysInRange(startDate: Date, endDate: Date): number {
  const start = startOfDay(startDate)
  const end = startOfDay(endDate)
  const diffTime = end.getTime() - start.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // Include both start and end days
}

/**
 * Validate date range for 24-month generation
 */
export function validateDateRange(startDate: Date, endDate: Date): { valid: boolean, errors: string[] } {
  const errors: string[] = []
  
  if (isNaN(startDate.getTime())) {
    errors.push('Start date is invalid')
  }
  
  if (isNaN(endDate.getTime())) {
    errors.push('End date is invalid')
  }
  
  if (startDate > endDate) {
    errors.push('Start date must be before end date')
  }
  
  const daysDiff = getDaysInRange(startDate, endDate)
  if (daysDiff > 800) { // Allow some buffer beyond 730 days
    errors.push(`Date range too large: ${daysDiff} days (maximum 800)`)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}