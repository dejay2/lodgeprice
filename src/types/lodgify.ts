// TypeScript interfaces for Lodgify API payload generation
export interface LodgifyRate {
  is_default: boolean
  start_date?: string        // ISO date format (YYYY-MM-DD) - omit for default
  end_date?: string          // ISO date format (YYYY-MM-DD) - omit for default
  price_per_day: number      // EUR amount with 2 decimal places
  min_stay: number           // Minimum nights required
  max_stay: number           // Maximum nights allowed
  price_per_additional_guest: number    // Additional guest fee
  additional_guests_starts_from: number // Guest count threshold
}

export interface LodgifyPayload {
  property_id: number        // lodgify_property_id converted to number
  room_type_id: number       // lodgify_room_type_id
  rates: LodgifyRate[]       // Array of rate configurations
}

// Internal processing types
export interface DatePriceData {
  date: string
  price: number
  minStay: number
  maxStay: number
  stayLength: number
  basePrice: number
  seasonalAdjustment: number
  lastMinuteDiscount: number
  minPriceEnforced: boolean
}

export interface OptimizedRange {
  startDate: string
  endDate: string
  price: number
  minStay: number
  maxStay: number
  stayLength: number
}

export interface PayloadGenerationOptions {
  properties: string[]       // Array of lodgify_property_ids
  startDate: Date
  endDate: Date
  stayLengthCategories: StayLengthCategory[]
  includeDefaultRate: boolean
  optimizeRanges: boolean
}

export interface StayLengthCategory {
  name: string              // "1-7 nights", "8-14 nights", "15+ nights"
  minStay: number
  maxStay: number
  stayLength: number        // Representative stay length for pricing calculation
}

export interface PayloadValidationResult {
  valid: boolean
  errors?: string[]
  warnings?: string[]
}

export interface GenerationStatistics {
  totalProperties: number
  totalDates: number
  totalRatesGenerated: number
  optimizationApplied: boolean
  entriesBeforeOptimization: number
  entriesAfterOptimization: number
  optimizationReduction: number  // Percentage
  generationTimeMs: number
  memoryUsedMB?: number
}

export interface PayloadExportOptions {
  filename?: string
  format: 'json' | 'pretty-json'
  includeStatistics: boolean
  chunkSize?: number        // For large payloads
}

// Error types
export interface PayloadGenerationError {
  type: 'database' | 'optimization' | 'validation' | 'memory' | 'timeout'
  message: string
  propertyId?: string
  date?: string
  details?: any
}

// Progress tracking
export interface GenerationProgress {
  phase: 'loading' | 'calculating' | 'optimizing' | 'validating' | 'complete' | 'error'
  propertyId?: string
  currentProperty: number
  totalProperties: number
  currentDate?: string
  percentage: number
  timeElapsedMs: number
  estimatedRemainingMs?: number
}