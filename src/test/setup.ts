// Enhanced test setup for comprehensive real property data testing
import '@testing-library/jest-dom'
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { HttpResponse, http } from 'msw'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test.local') })

// Create Supabase test client with service role key for bypassing RLS
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vehonbnvzcgcticpfsox.supabase.co'
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Export test client for use in tests
export const supabaseTest = serviceRoleKey ? createClient<Database>(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-client-info': 'lodgeprice-test'
      }
    }
  }
) : null

// Mock Service Worker server for API mocking (for component tests)
const server = setupServer()

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ 
    onUnhandledRequest: 'warn' // Warn on unhandled requests instead of error
  })
})

// Reset handlers and cleanup after each test
afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

// Clean up after all tests
afterAll(() => {
  server.close()
})

// Global test utilities for real data testing
global.testUtils = {
  // Helper to compare decimal values with precision (for pricing validation)
  expectCloseTo: (actual: number, expected: number, precision: number = 2) => {
    const multiplier = Math.pow(10, precision)
    const actualRounded = Math.round(actual * multiplier) / multiplier
    const expectedRounded = Math.round(expected * multiplier) / multiplier
    expect(actualRounded).toBe(expectedRounded)
  },
  
  // Helper for 0.01 precision validation (as required by PRP)
  expectPriceMatch: (actual: number, expected: number) => {
    expect(Math.abs(actual - expected)).toBeLessThan(0.01)
  },
  
  // Helper to format dates consistently for tests
  formatTestDate: (date: Date): string => {
    return date.toISOString().split('T')[0]
  },
  
  // Helper to create date from string
  parseTestDate: (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  },
  
  // Performance timing helper
  measurePerformance: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const startTime = performance.now()
    const result = await fn()
    const endTime = performance.now()
    return {
      result,
      duration: (endTime - startTime) / 1000 // Convert to seconds
    }
  },
  
  // Real property IDs from production
  REAL_PROPERTY_IDS: [
    '327020', '327021', '327022', '327023',
    '327024', '327025', '327026', '327027'
  ] as const,
  
  // Test date ranges for comprehensive testing
  TEST_DATES: {
    summer: '2024-07-15',
    christmas: '2024-12-25',
    newYear: '2025-01-15',
    spring: '2025-06-15'
  },
  
  // Test night options
  TEST_NIGHTS: [3, 7, 14] as const
}

// MSW handlers for Supabase API mocking (to be configured per test)
export const mockSupabaseHandlers = {
  // Mock successful RPC call
  mockRpcSuccess: (functionName: string, responseData: any) => {
    server.use(
      http.post(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/${functionName}`, () => {
        return HttpResponse.json(responseData)
      })
    )
  },
  
  // Mock RPC error
  mockRpcError: (functionName: string, errorMessage: string) => {
    server.use(
      http.post(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/${functionName}`, () => {
        return HttpResponse.json(
          { error: errorMessage },
          { status: 400 }
        )
      })
    )
  },
  
  // Mock table query
  mockTableQuery: (tableName: string, data: any[]) => {
    server.use(
      http.get(`${process.env.VITE_SUPABASE_URL}/rest/v1/${tableName}`, () => {
        return HttpResponse.json(data)
      })
    )
  }
}

// Extend global type definitions
declare global {
  var testUtils: {
    expectCloseTo: (actual: number, expected: number, precision?: number) => void
    expectPriceMatch: (actual: number, expected: number) => void
    formatTestDate: (date: Date) => string
    parseTestDate: (dateStr: string) => Date
    measurePerformance: <T>(fn: () => Promise<T>) => Promise<{ result: T; duration: number }>
    REAL_PROPERTY_IDS: readonly ['327020', '327021', '327022', '327023', '327024', '327025', '327026', '327027']
    TEST_DATES: {
      summer: string
      christmas: string
      newYear: string
      spring: string
    }
    TEST_NIGHTS: readonly [3, 7, 14]
  }
}

// Export server as default to avoid conflict
export default server