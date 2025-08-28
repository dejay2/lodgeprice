/**
 * Seasonal Rate Management - TypeScript Types and Interfaces
 * Comprehensive type definitions for seasonal rate management interface
 */

import type { SeasonalRate as DBSeasonalRate } from '@/types/database-aliases'

// Enhanced seasonal rate interface extending database type
export interface SeasonalRate extends DBSeasonalRate {
  // Additional runtime properties
  isOverlapping?: boolean
  conflictsWith?: string[]
}

// Create seasonal rate data
export interface CreateSeasonalRateData {
  name: string
  startDate: Date
  endDate: Date
  rateAdjustment: number
}

// Update seasonal rate data
export interface UpdateSeasonalRateData {
  name?: string
  startDate?: Date
  endDate?: Date
  rateAdjustment?: number
}

// Filter options for seasonal rates
export interface FilterOptions {
  dateRange?: {
    start: string
    end: string
  }
  rateAdjustmentRange?: {
    min: number
    max: number
  }
  searchTerm?: string
  activeOnly?: boolean
}

// Sort configuration
export interface SortConfig {
  field: keyof SeasonalRate
  direction: 'asc' | 'desc'
}

// Validation errors structure
export interface ValidationErrors {
  [key: string]: string[]
}

// Pricing preview data
export interface PricingPreviewData {
  averageChange: number
  minPrice: number
  maxPrice: number
  sampleDates: Array<{
    date: string
    basePrice: number
    adjustedPrice: number
    change: number
    percentageChange: number
  }>
}

// Bulk operation result
export interface BulkOperationResult {
  success: string[]
  failed: Array<{
    id: string
    error: string
  }>
}

// Seasonal rate template for bulk operations
export interface SeasonalRateTemplate {
  id: string
  name: string
  description: string
  periods: Array<{
    name: string
    startMonth: number // 0-11
    startDay: number
    endMonth: number // 0-11
    endDay: number
    rateAdjustment: number
  }>
  isCustom?: boolean
}

// Import/Export data structure
export interface ImportExportData {
  version: string
  exportDate: string
  seasonalRates: SeasonalRate[]
  metadata: {
    totalCount: number
    dateRange: {
      earliest: string
      latest: string
    }
    propertyCount?: number
  }
}

// Database function response types
export interface OverlapCheckResult {
  id: string
  name: string
  start_date: string
  end_date: string
  rate_adjustment: number
}

export interface PricingImpactResult {
  date: string
  base_price: number
  adjusted_price: number
  price_change: number
  percentage_change: number
}

// Calendar view types
export interface CalendarPeriod {
  id: string
  name: string
  startDate: Date
  endDate: Date
  rateAdjustment: number
  color?: string
  isOverlapping?: boolean
}

// Form state management
export interface SeasonalRateFormState {
  isOpen: boolean
  mode: 'create' | 'edit'
  editingRate?: SeasonalRate
  validationErrors: ValidationErrors
}

// Pagination configuration
export interface PaginationConfig {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}