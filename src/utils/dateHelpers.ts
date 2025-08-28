// Date utility functions for the pricing calendar

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

export function parseDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00')
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function getDaysBetween(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? new Date(start) : start
  const endDate = typeof end === 'string' ? new Date(end) : end
  
  const diffTime = endDate.getTime() - startDate.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function isDateInRange(
  date: Date | string,
  startDate: Date | string,
  endDate: Date | string
): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  return checkDate >= start && checkDate <= end
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return start <= end && !isNaN(start.getTime()) && !isNaN(end.getTime())
}