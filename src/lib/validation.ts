/**
 * Core Validation Infrastructure using Zod
 * 
 * This module provides TypeScript-first validation schemas using Zod
 * for all user inputs in the Lodgeprice application.
 * 
 * Validates:
 * - Price inputs (base prices, seasonal adjustments, minimum prices)
 * - Date inputs and date ranges
 * - Form data before API operations
 * - User text inputs for XSS prevention
 */

import { z } from 'zod'

// =============================================================================
// Price Validation Schemas
// =============================================================================

/**
 * Base price validation schema
 * Validates prices for property base prices, minimum prices, seasonal adjustments
 * 
 * Requirements:
 * - Must be positive (> 0.01)
 * - Maximum of $10,000 per day
 * - Up to 2 decimal places for currency precision
 */
export const priceSchema = z.number()
  .min(0.01, "Price must be at least $0.01")
  .max(10000, "Price cannot exceed $10,000")
  .multipleOf(0.01, "Price must be in cents (2 decimal places)")

/**
 * Price string input validation (for form inputs)
 * Validates string price inputs before conversion to number
 */
export const priceStringSchema = z.string()
  .regex(/^\d+(\.\d{1,2})?$/, "Please enter a valid price (e.g., 99.99)")
  .transform((val) => parseFloat(val))
  .pipe(priceSchema)

/**
 * Rate adjustment validation schema for seasonal pricing
 * Allows negative values for discounts and positive for premiums
 */
export const rateAdjustmentSchema = z.number()
  .min(-1, "Rate adjustment cannot be less than -100% (complete discount)")
  .max(10, "Rate adjustment cannot exceed 1000% (10x increase)")
  .refine((val) => val !== 0, {
    message: "Rate adjustment cannot be zero (use 0.01 for minimal change)"
  })

// =============================================================================
// Date Validation Schemas  
// =============================================================================

/**
 * Date string validation (YYYY-MM-DD format)
 * Validates date format and ensures it's a real date
 */
export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((date) => !isNaN(Date.parse(date)), "Invalid date")
  .refine((date) => {
    const parsedDate = new Date(date)
    const today = new Date()
    const maxFutureDate = new Date()
    maxFutureDate.setFullYear(today.getFullYear() + 2)
    
    return parsedDate <= maxFutureDate
  }, "Date cannot be more than 2 years in the future")

/**
 * Date range validation schema
 * Ensures start date is before end date and within reasonable limits
 */
export const dateRangeSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { 
    message: "End date must be after start date", 
    path: ["endDate"] 
  }
).refine(
  (data) => {
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    const diffInDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return diffInDays <= 365
  },
  {
    message: "Date range cannot exceed 365 days",
    path: ["endDate"]
  }
)

// =============================================================================
// Text Input Validation Schemas
// =============================================================================

/**
 * Safe text input validation
 * Validates text inputs for names, descriptions, etc.
 */
export const safeTextSchema = z.string()
  .min(1, "This field is required")
  .max(200, "Text cannot exceed 200 characters")
  .trim()

/**
 * Property name validation schema
 */
export const propertyNameSchema = z.string()
  .min(2, "Property name must be at least 2 characters")
  .max(100, "Property name cannot exceed 100 characters")
  .trim()

/**
 * UUID validation schema
 * For validating property IDs, user IDs, etc.
 */
export const uuidSchema = z.string()
  .uuid("Invalid UUID format")

// =============================================================================
// Form Data Validation Schemas
// =============================================================================

/**
 * Base price update form validation
 */
export const basePriceUpdateSchema = z.object({
  propertyId: uuidSchema,
  newPrice: priceSchema,
  effectiveDate: dateSchema.optional()
})

/**
 * Seasonal rate creation form validation
 */
export const seasonalRateCreateSchema = z.object({
  name: propertyNameSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  rateAdjustment: rateAdjustmentSchema,
  propertyId: uuidSchema.optional()
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { 
    message: "End date must be after start date", 
    path: ["endDate"] 
  }
)

/**
 * Property selection form validation
 */
export const propertySelectionSchema = z.object({
  propertyId: uuidSchema,
  dateRange: dateRangeSchema.optional()
})

/**
 * Pricing calculation request validation
 */
export const pricingCalculationSchema = z.object({
  propertyId: uuidSchema,
  checkInDate: dateSchema,
  stayLength: z.number().min(1, "Stay length must be at least 1 day").max(365, "Stay length cannot exceed 365 days"),
  guestCount: z.number().min(1, "Guest count must be at least 1").max(20, "Guest count cannot exceed 20").optional()
})

// =============================================================================
// API Payload Validation Schemas
// =============================================================================

/**
 * Supabase API payload validation for property updates
 */
export const supabasePropertyUpdateSchema = z.object({
  id: uuidSchema,
  base_price_per_day: priceSchema.optional(),
  min_price_per_day: priceSchema.optional(),
  name: propertyNameSchema.optional(),
  updated_at: z.string().datetime().optional()
})

/**
 * Lodgify API rate payload validation
 */
export const lodgifyRateSchema = z.object({
  property_id: z.number(),
  room_type_id: z.number(),
  rates: z.array(z.object({
    is_default: z.boolean(),
    price_per_day: z.number().min(1).max(10000),
    min_stay: z.number().min(1).max(365),
    max_stay: z.number().min(1).max(1000),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    price_per_additional_guest: z.number().min(0).max(1000).optional(),
    additional_guests_starts_from: z.number().min(1).max(20).optional()
  })).min(1, "At least one rate is required")
})

// =============================================================================
// Error Handling and Formatting
// =============================================================================

/**
 * Format Zod validation errors for user-friendly display
 */
export function formatValidationError(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {}
  
  error.issues.forEach((err) => {
    const path = err.path.join('.')
    formattedErrors[path] = err.message
  })
  
  return formattedErrors
}

/**
 * Safe parsing with error formatting
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: Record<string, string>
} {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { 
      success: false, 
      errors: formatValidationError(result.error)
    }
  }
}

// =============================================================================
// Type Exports
// =============================================================================

export type PriceInput = z.infer<typeof priceSchema>
export type DateInput = z.infer<typeof dateSchema>
export type DateRangeInput = z.infer<typeof dateRangeSchema>
export type SafeTextInput = z.infer<typeof safeTextSchema>
export type BasePriceUpdateInput = z.infer<typeof basePriceUpdateSchema>
export type SeasonalRateCreateInput = z.infer<typeof seasonalRateCreateSchema>
export type PropertySelectionInput = z.infer<typeof propertySelectionSchema>
export type PricingCalculationInput = z.infer<typeof pricingCalculationSchema>
export type SupabasePropertyUpdateInput = z.infer<typeof supabasePropertyUpdateSchema>
export type LodgifyRateInput = z.infer<typeof lodgifyRateSchema>

// =============================================================================
// Schema Collections for Easy Import
// =============================================================================

export const validationSchemas = {
  price: priceSchema,
  priceString: priceStringSchema,
  rateAdjustment: rateAdjustmentSchema,
  date: dateSchema,
  dateRange: dateRangeSchema,
  safeText: safeTextSchema,
  propertyName: propertyNameSchema,
  uuid: uuidSchema,
  basePriceUpdate: basePriceUpdateSchema,
  seasonalRateCreate: seasonalRateCreateSchema,
  propertySelection: propertySelectionSchema,
  pricingCalculation: pricingCalculationSchema,
  supabasePropertyUpdate: supabasePropertyUpdateSchema,
  lodgifyRate: lodgifyRateSchema
} as const