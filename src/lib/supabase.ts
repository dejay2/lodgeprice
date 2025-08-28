import { createClient } from '@supabase/supabase-js'
// Temporarily comment out the Database type until we fix the type generation
// import { Database } from '../types/database.types'

// Environment variable validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  )
}

// Create Supabase client with enhanced configuration
// TODO: Add Database type back once type generation is working properly
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-client-info': 'lodgeprice-frontend'
    }
  }
})

// Enhanced error handling function
export const handleSupabaseError = (error: any): string => {
  if (error?.message?.includes('Invalid API key')) {
    return 'Database configuration error. Please check your connection settings.'
  }
  if (error?.message?.includes('timeout')) {
    return 'Database connection timed out. Please try again.'
  }
  if (error?.message?.includes('Network Error')) {
    return 'Network connection unavailable. Please check your internet connection.'
  }
  if (error?.message?.includes('new row violates row-level security policy')) {
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

    // Test calculate_final_price function (using a generic call that may return empty results)
    try {
      const result = await supabase.rpc('calculate_final_price', {
        property_id: 'test',
        check_in_date: '2024-07-15',
        stay_length: 3
      })
      functionTests.calculate_final_price = !result.error
    } catch {
      functionTests.calculate_final_price = false
    }

    // Test get_last_minute_discount function
    try {
      const result = await supabase.rpc('get_last_minute_discount', {
        property_id: 'test',
        check_in_date: '2024-07-15'
      })
      functionTests.get_last_minute_discount = !result.error
    } catch {
      functionTests.get_last_minute_discount = false
    }

    // Test check_booking_conflict function
    try {
      const result = await supabase.rpc('check_booking_conflict', {
        property_id: 'test',
        start_date: '2024-07-15',
        end_date: '2024-07-18',
        booking_id: null
      })
      functionTests.check_booking_conflict = !result.error
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

// Logging function for database operations
export const logDatabaseOperation = (
  operation: string, 
  success: boolean, 
  duration: number, 
  error?: string
) => {
  console.log({
    type: 'database_operation',
    operation,
    success,
    duration,
    error,
    timestamp: new Date().toISOString()
  })
}