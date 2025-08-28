/**
 * Pricing-specific type definitions and interfaces
 * Maps database functions to UI component requirements
 */

import type {
  CalculateFinalPriceReturn,
  DateRange,
} from './helpers'

/**
 * Component prop types for pricing UI integration
 */

/**
 * PricingCalendarGrid component props
 * Displays a month view of pricing with interactive cells
 */
export interface PricingCalendarGridProps {
  propertyId: string
  dateRange: DateRange
  nights: number
  onPriceClick?: (date: Date, priceData: CalculateFinalPriceReturn) => void
  onPriceEdit?: (date: Date, newPrice: number) => Promise<void>
  highlightDiscounts?: boolean
  showSeasonalAdjustments?: boolean
  editable?: boolean
}

/**
 * BookingForm component props
 * Handles date selection and booking validation
 */
export interface BookingFormProps {
  propertyId: string
  onDateChange?: (dates: { arrival: Date; departure: Date }) => void
  onValidationError?: (error: string) => void
  onSubmit?: (bookingData: BookingFormData) => Promise<void>
  initialDates?: { arrival?: Date; departure?: Date }
  guestName?: string
}

export interface BookingFormData {
  propertyId: string
  arrivalDate: Date
  departureDate: Date
  guestName: string
  nights: number
  totalPrice: number
}

/**
 * PropertyPricingDashboard component props
 * Overview of pricing for a single property
 */
export interface PropertyPricingDashboardProps {
  propertyId: string
  showAnalytics?: boolean
  showDiscountStatus?: boolean
  dateRange?: DateRange
}

/**
 * PricePreviewModal component props
 * Detailed price breakdown for a specific date
 */
export interface PricePreviewModalProps {
  propertyId: string
  checkDate: Date
  nights: number
  isOpen: boolean
  onClose: () => void
  onConfirm?: (priceData: CalculateFinalPriceReturn) => void
}

/**
 * DiscountStrategyManager component props
 * Configure and manage discount strategies
 */
export interface DiscountStrategyManagerProps {
  propertyId?: string  // If null, manages global strategies
  onStrategyChange?: (strategyId: string) => void
  onApplyToAll?: (strategyId: string) => Promise<void>
  showPreview?: boolean
}

/**
 * SeasonalRateManager component props
 * Manage seasonal pricing adjustments
 */
export interface SeasonalRateManagerProps {
  onRateChange?: (rateId: string, changes: SeasonalRateUpdate) => Promise<void>
  onRateAdd?: (rate: NewSeasonalRate) => Promise<void>
  onRateDelete?: (rateId: string) => Promise<void>
  validateOverlap?: boolean
}

export interface SeasonalRateUpdate {
  rate_name?: string
  start_date?: string
  end_date?: string
  discount_rate?: number
}

export interface NewSeasonalRate {
  rate_name: string
  start_date: string
  end_date: string
  discount_rate: number
}

/**
 * Data structures for UI state management
 */

/**
 * Calendar cell data structure
 */
export interface CalendarCell {
  date: Date
  price: number
  basePrice: number
  hasDiscount: boolean
  discountAmount: number
  discountPercentage: number
  hasSeasonalAdjustment: boolean
  seasonalAdjustmentAmount: number
  isAtMinimum: boolean
  isAvailable: boolean
  isToday: boolean
  isPastDate: boolean
  dayOfWeek: number
  isWeekend: boolean
}

/**
 * Pricing analytics data
 */
export interface PricingAnalytics {
  propertyId: string
  dateRange: DateRange
  averagePrice: number
  minPrice: number
  maxPrice: number
  totalRevenuePotential: number
  discountImpact: number
  occupancyRate: number
  priceVariance: number
}

/**
 * Bulk operation request/response types
 */
export interface BulkPriceUpdate {
  propertyId: string
  dates: Date[]
  newPrice: number
  preserveDiscounts?: boolean
}

export interface BulkPriceUpdateResult {
  updated: number
  failed: number
  errors: Array<{
    date: Date
    reason: string
  }>
}

/**
 * Service method return types
 */
export interface PricingCalendarData {
  month: number
  year: number
  cells: CalendarCell[][]
  summary: {
    totalDays: number
    averagePrice: number
    discountedDays: number
    bookedDays: number
  }
}

/**
 * Hook return types
 */
export interface UsePricingCalendarReturn {
  calendarData: PricingCalendarData | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  updatePrice: (date: Date, price: number) => Promise<void>
}

export interface UseBookingValidationReturn {
  isValid: boolean
  conflictDetails: string | null
  validating: boolean
  validate: (arrival: Date, departure: Date) => Promise<boolean>
}

export interface UseDiscountPreviewReturn {
  preview: DiscountPreviewData | null
  loading: boolean
  error: Error | null
  generatePreview: (strategyId: string, dateRange: DateRange) => Promise<void>
}

export interface DiscountPreviewData {
  strategyId: string
  affectedDates: Date[]
  averageDiscount: number
  maxDiscount: number
  minDiscount: number
  revenueImpact: number
}

/**
 * Cache key generators for performance optimization
 */
export const CacheKeys = {
  pricing: (propertyId: string, date: string, nights: number) =>
    `pricing:${propertyId}:${date}:${nights}`,
  
  calendar: (propertyId: string, year: number, month: number) =>
    `calendar:${propertyId}:${year}:${month}`,
  
  conflict: (propertyId: string, arrival: string, departure: string) =>
    `conflict:${propertyId}:${arrival}:${departure}`,
  
  discount: (propertyId: string, daysOut: number) =>
    `discount:${propertyId}:${daysOut}`,
} as const

/**
 * Event types for UI interactions
 */
export interface PricingEvent {
  type: 'price_updated' | 'discount_applied' | 'season_added' | 'booking_created'
  propertyId: string
  timestamp: Date
  details: Record<string, unknown>
}

/**
 * Validation schemas for user inputs
 */
export const PricingValidation = {
  price: {
    min: 0,
    max: 10000,
    validate: (value: number) => value >= 0 && value <= 10000,
    message: 'Price must be between 0 and 10,000',
  },
  
  nights: {
    min: 1,
    max: 365,
    validate: (value: number) => value >= 1 && value <= 365,
    message: 'Nights must be between 1 and 365',
  },
  
  discount: {
    min: 0,
    max: 100,
    validate: (value: number) => value >= 0 && value <= 100,
    message: 'Discount must be between 0% and 100%',
  },
} as const

/**
 * Format helpers for displaying pricing data
 */
export const PricingFormatters = {
  currency: (value: number) => 
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value),
  
  percentage: (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value),
  
  dateRange: (start: Date, end: Date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return `${formatter.format(start)} - ${formatter.format(end)}`
  },
} as const