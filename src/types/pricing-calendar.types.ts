/**
 * Type definitions for the Pricing Calendar Grid component
 * Specifically for react-calendar integration as per PRP-10
 */

// React calendar value types
export type CalendarValue = Date | null

// Database function return types (from PRP specifications)
export interface CalculateFinalPriceResult {
  base_price: number
  seasonal_adjustment: number
  last_minute_discount: number
  final_price_per_night: number
  total_price: number
  min_price_enforced: boolean
}

export interface PreviewPricingCalendarResult {
  check_date: string
  days_from_today: number
  base_price: number
  seasonal_adjustment_percent: number
  last_minute_discount_percent: number
  final_price_per_night: number
  total_price: number
  savings_amount: number
  savings_percent: number
  min_price_enforced: boolean
}

// Props for the main PricingCalendarGrid component
export interface PricingCalendarGridProps {
  propertyId: string
  selectedStayLength: number
  onPropertyChange?: (propertyId: string) => void
  onStayLengthChange?: (nights: number) => void
  onDateClick?: (date: Date, priceData: CalculateFinalPriceResult | null) => void
  className?: string
  // Inline editing support (PRP-11)
  enableInlineEditing?: boolean
  onBasePriceChanged?: (propertyId: string, newPrice: number) => void
}

// Props for individual pricing tile content
export interface PricingTileProps {
  date: Date
  view: string
  priceData?: CalculateFinalPriceResult | null
  stayLength: number
  hasSeasonalAdjustment?: boolean
  hasDiscount?: boolean
  isMinPriceEnforced?: boolean
  // Inline editing support (PRP-11)
  isEditable?: boolean
  isEditing?: boolean
  minPrice?: number
  propertyId?: string
  onEditStart?: (date: Date) => void
  onEditCancel?: () => void
  onPriceSave?: (propertyId: string, newBasePrice: number) => Promise<void>
  onPriceChange?: () => void
}

// Props for stay length selector component
export interface StayLengthSelectorProps {
  selectedLength: number
  onLengthChange: (nights: number) => void
  availableLengths?: number[]
  className?: string
}

// Props for calendar controls
export interface CalendarControlsProps {
  propertyId: string
  selectedStayLength: number
  onPropertyChange: (propertyId: string) => void
  onStayLengthChange: (nights: number) => void
}

// Props for pricing legend
export interface PricingLegendProps {
  showSeasonalIndicator?: boolean
  showDiscountIndicator?: boolean
  showMinPriceIndicator?: boolean
  className?: string
}

// Data structure for calendar pricing cache
export interface CalendarPricingData {
  propertyId: string
  stayLength: number
  dateRange: {
    start: Date
    end: Date
  }
  prices: Map<string, CalculateFinalPriceResult>
  loadedAt: Date
}

// Loading state for different calendar operations
export interface CalendarLoadingState {
  isLoadingPrices: boolean
  isLoadingProperty: boolean
  isChangingStayLength: boolean
  error: string | null
}

// Error types specific to calendar operations
export interface CalendarError {
  type: 'database' | 'network' | 'validation' | 'timeout'
  message: string
  propertyId?: string
  dateRange?: { start: Date; end: Date }
  retryCount?: number
}

// Performance metrics for calendar operations
export interface CalendarPerformanceMetrics {
  loadStartTime: number
  loadEndTime?: number
  priceCount: number
  cacheHitRate?: number
  apiCalls: number
}

// React calendar tile functions
export type CalendarTileClassNameFunc = ({ date, view }: { date: Date; view: string }) => string | null
export type CalendarTileContentFunc = ({ date, view }: { date: Date; view: string }) => React.ReactNode | null