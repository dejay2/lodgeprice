// Mock Service Worker server configuration
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Define handlers for Supabase API endpoints
export const handlers = [
  // Mock Supabase auth endpoint
  http.get('*/auth/v1/user', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    })
  }),

  // Mock properties table
  http.get('*/rest/v1/properties', () => {
    return HttpResponse.json([
      {
        id: 'uuid-1',
        property_id: '327020',
        property_name: 'Villa Marina',
        base_price_per_day: 150,
        min_price_per_day: 100
      },
      {
        id: 'uuid-2',
        property_id: '327021',
        property_name: 'Casa Bella',
        base_price_per_day: 200,
        min_price_per_day: 120
      },
      {
        id: 'uuid-3',
        property_id: '327022',
        property_name: 'Beach House',
        base_price_per_day: 180,
        min_price_per_day: 110
      },
      {
        id: 'uuid-4',
        property_id: '327023',
        property_name: 'Mountain Retreat',
        base_price_per_day: 160,
        min_price_per_day: 90
      },
      {
        id: 'uuid-5',
        property_id: '327024',
        property_name: 'City Apartment',
        base_price_per_day: 140,
        min_price_per_day: 80
      },
      {
        id: 'uuid-6',
        property_id: '327025',
        property_name: 'Lakeside Cottage',
        base_price_per_day: 170,
        min_price_per_day: 95
      },
      {
        id: 'uuid-7',
        property_id: '327026',
        property_name: 'Desert Oasis',
        base_price_per_day: 190,
        min_price_per_day: 115
      },
      {
        id: 'uuid-8',
        property_id: '327027',
        property_name: 'Forest Lodge',
        base_price_per_day: 165,
        min_price_per_day: 105
      }
    ])
  }),

  // Default handler for unmatched requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`)
    return new HttpResponse(null, { status: 404 })
  })
]

// Create and export the server
export const server = setupServer(...handlers)