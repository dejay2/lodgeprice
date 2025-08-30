import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import { wrapSupabaseClient } from './logging/DatabaseLogger'
import { getLogger } from './logging/LoggingService'

// Enhanced environment variable validation interface
interface ValidationResult {
  success: boolean
  error?: string
  missing?: string[]
}

// Validate Supabase URL format
const isValidSupabaseUrl = (url: string): boolean => {
  return /^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url)
}

// Enhanced environment variable validation function
function validateSupabaseEnvironment(): ValidationResult {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  // Check for missing variables
  const missing: string[] = []
  if (!url || url.trim() === '') missing.push('VITE_SUPABASE_URL')
  if (!key || key.trim() === '') missing.push('VITE_SUPABASE_ANON_KEY')
  
  if (missing.length > 0) {
    return {
      success: false,
      missing,
      error: `Missing required environment variables: ${missing.join(', ')}\n\n` +
             'Please copy .env.example to .env and add your Supabase credentials:\n' +
             '1. Go to https://supabase.com/dashboard\n' +
             '2. Select your project (vehonbnvzcgcticpfsox)\n' +
             '3. Go to Settings > API\n' +
             '4. Copy URL and anon key to your .env file\n\n' +
             'For more help, see .env.example'
    }
  }
  
  // Validate URL format
  if (!isValidSupabaseUrl(url)) {
    return {
      success: false, 
      error: `VITE_SUPABASE_URL must be a valid Supabase URL\n` +
             `Expected format: https://your-project-id.supabase.co\n` +
             `Received: ${url}\n\n` +
             `For the Lodgeprice project, it should be:\n` +
             `https://vehonbnvzcgcticpfsox.supabase.co`
    }
  }
  
  return { success: true }
}

// Validate environment variables on module load
const validation = validateSupabaseEnvironment()
if (!validation.success) {
  console.error('Environment variable validation failed:', validation.error)
  throw new Error(validation.error)
}

// Initialize logger for Supabase operations
const logger = getLogger('Supabase')

// Development-only logging for diagnostics
if (import.meta.env.DEV) {
  logger.debug('Supabase environment variables validated successfully', {
    project: import.meta.env.VITE_SUPABASE_URL?.split('.')[0]?.replace('https://', '')
  })
}

// Environment variable access
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create Supabase client with anonymous key and RLS enabled
// This is secure for client-side usage when RLS policies are properly configured
const baseSupabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'x-client-info': 'lodgeprice-frontend'
    }
  }
})

// Wrap with logging capabilities
export const supabase = wrapSupabaseClient(baseSupabaseClient)

// For operations that require bypassing RLS (if needed), use service role key
// This should only be used for specific admin operations
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const baseAdminClient = supabaseServiceRoleKey ? createClient<Database>(
  supabaseUrl, 
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-client-info': 'lodgeprice-admin'
      }
    }
  }
) : baseSupabaseClient // Fallback to anon client if service role key not provided

// Wrap admin client with logging
export const supabaseAdmin = wrapSupabaseClient(baseAdminClient)

// Enhanced error handling function
export const handleSupabaseError = (error: unknown): string => {
  const errorMessage = error && typeof error === 'object' && 'message' in error 
    ? (error as { message: string }).message 
    : String(error)

  if (errorMessage?.includes('Invalid API key')) {
    return 'Database configuration error. Please check your connection settings.'
  }
  if (errorMessage?.includes('timeout')) {
    return 'Database connection timed out. Please try again.'
  }
  if (errorMessage?.includes('Network Error')) {
    return 'Network connection unavailable. Please check your internet connection.'
  }
  if (errorMessage?.includes('new row violates row-level security policy')) {
    return 'Authorization error. Please ensure you have proper access permissions.'
  }
  return 'An unexpected database error occurred. Please try again or contact support.'
}

// Retry logic with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry authentication errors
      if (lastError.message.includes('Invalid API key')) {
        throw lastError
      }

      // If this is the last attempt, throw the error
      if (attempt === maxAttempts) {
        throw lastError
      }

      // Exponential backoff delay
      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Enhanced connection validation function with comprehensive testing
export async function validateSupabaseConnection(): Promise<{ 
  success: boolean; 
  error?: string;
  propertiesCount?: number;
  functionTests?: { [key: string]: boolean }
}> {
  try {
    // Test 1: Basic table query
    const result = await withRetry(
      async () => {
        const queryResult = await supabase
          .from('properties')
          .select('id, property_name, property_id, base_price_per_day, min_price_per_day')
          .limit(10)
        return queryResult
      }
    )
    
    const { data: properties, error: propertiesError } = result

    if (propertiesError) {
      return { success: false, error: handleSupabaseError(propertiesError) }
    }

    const propertiesCount = properties?.length || 0

    // Test 2: Function calls (basic validation without requiring specific property IDs)
    const functionTests: { [key: string]: boolean } = {}

    // Test calculate_final_price function (using proper parameter names)
    try {
      const result = await supabase.rpc('calculate_final_price', {
        p_property_id: 'test',
        p_check_date: '2024-07-15',
        p_nights: 3
      })
      functionTests.calculate_final_price = !result.error || result.error.message.includes('not found')
    } catch {
      functionTests.calculate_final_price = false
    }

    // Test get_last_minute_discount function with proper parameters
    try {
      const result = await supabase.rpc('get_last_minute_discount', {
        p_property_id: 'test',
        p_days_before_checkin: 7,
        p_nights: 3,
        p_check_date: '2024-07-15'
      })
      functionTests.get_last_minute_discount = !result.error || result.error.message.includes('not found')
    } catch {
      functionTests.get_last_minute_discount = false
    }

    // Test check_booking_conflict function with proper parameters
    try {
      const result = await supabase.rpc('check_booking_conflict', {
        p_property_id: 'test',
        p_arrival_date: '2024-07-15',
        p_departure_date: '2024-07-18',
        p_exclude_booking_id: null
      })
      functionTests.check_booking_conflict = !result.error || result.error.message.includes('not found')
    } catch {
      functionTests.check_booking_conflict = false
    }

    return { 
      success: true,
      propertiesCount,
      functionTests
    }
  } catch (error) {
    return { 
      success: false, 
      error: handleSupabaseError(error)
    }
  }
}

// Type exports for easier usage throughout the application
export type Property = Database['public']['Tables']['properties']['Row']
export type PropertyInsert = Database['public']['Tables']['properties']['Insert']
export type PropertyUpdate = Database['public']['Tables']['properties']['Update']

export type DateRange = Database['public']['Tables']['date_ranges']['Row']
export type DateRangeInsert = Database['public']['Tables']['date_ranges']['Insert']
export type DateRangeUpdate = Database['public']['Tables']['date_ranges']['Update']

export type Booking = Database['public']['Tables']['bookings']['Row']
export type BookingInsert = Database['public']['Tables']['bookings']['Insert']
export type BookingUpdate = Database['public']['Tables']['bookings']['Update']

export type DiscountStrategy = Database['public']['Tables']['discount_strategies']['Row']
export type DiscountStrategyInsert = Database['public']['Tables']['discount_strategies']['Insert']
export type DiscountStrategyUpdate = Database['public']['Tables']['discount_strategies']['Update']

export type DiscountRule = Database['public']['Tables']['discount_rules']['Row']
export type DiscountRuleInsert = Database['public']['Tables']['discount_rules']['Insert']
export type DiscountRuleUpdate = Database['public']['Tables']['discount_rules']['Update']

export type SyncOperation = Database['public']['Tables']['sync_operations']['Row']
export type PriceCache = Database['public']['Tables']['price_cache']['Row']
export type LodgifyIntegration = Database['public']['Tables']['lodgify_integrations']['Row']

// View types
export type BookingSummary = Database['public']['Views']['booking_summary']['Row']
export type PropertyPricing = Database['public']['Views']['property_pricing']['Row']
export type ActiveDiscountStrategy = Database['public']['Views']['active_discount_strategies']['Row']
export type DiscountRuleDetails = Database['public']['Views']['discount_rule_details']['Row']

// Export logger for database operations
export { logger as databaseOperationLogger }