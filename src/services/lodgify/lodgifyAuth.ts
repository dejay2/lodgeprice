/**
 * Lodgify API Authentication Module
 * 
 * Handles secure retrieval of API keys from the database and
 * construction of authentication headers for Lodgify API requests.
 */

import { supabase } from '@/lib/supabase'
import { AuthHeaders, LodgifyApiError, LODGIFY_API_CONSTANTS } from './lodgifyTypes'

/**
 * Cache for API keys to minimize database calls
 * Keys are cached for a limited time to balance security and performance
 */
const apiKeyCache = new Map<string, { key: string; timestamp: number }>()
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Retrieves decrypted API key for a property from the database
 * Uses the get_api_key database function for secure decryption
 * 
 * @param propertyId - UUID of the property
 * @returns Decrypted API key
 * @throws LodgifyApiError if key cannot be retrieved
 */
export async function getDecryptedApiKey(propertyId: string): Promise<string> {
  // Check cache first
  const cached = apiKeyCache.get(propertyId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    console.log(`Using cached API key for property ${propertyId}`)
    return cached.key
  }

  try {
    // Call database function to get decrypted API key
    const { data, error } = await supabase.rpc('get_api_key', {
      p_property_id: propertyId
    })

    if (error) {
      console.error('Database error retrieving API key:', error)
      throw new LodgifyApiError(
        `Failed to retrieve API key: ${error.message}`,
        'auth',
        undefined,
        false,
        error
      )
    }

    if (!data) {
      throw new LodgifyApiError(
        `No API key found for property ${propertyId}. Please ensure Lodgify integration is configured.`,
        'auth',
        undefined,
        false
      )
    }

    // Cache the key for future use
    apiKeyCache.set(propertyId, {
      key: data,
      timestamp: Date.now()
    })

    console.log(`Retrieved API key for property ${propertyId} from database`)
    return data
  } catch (error) {
    // If it's already a LodgifyApiError, re-throw it
    if (error instanceof LodgifyApiError) {
      throw error
    }

    // Otherwise, wrap it in a LodgifyApiError
    throw new LodgifyApiError(
      `Unexpected error retrieving API key for property ${propertyId}`,
      'auth',
      undefined,
      false,
      error
    )
  }
}

/**
 * Builds authentication headers for Lodgify API requests
 * 
 * @param propertyId - UUID of the property
 * @returns Headers object with authentication and content type
 * @throws LodgifyApiError if headers cannot be built
 */
export async function buildAuthHeaders(propertyId: string): Promise<AuthHeaders> {
  try {
    const apiKey = await getDecryptedApiKey(propertyId)
    
    return {
      'X-ApiKey': apiKey,
      'Content-Type': 'application/json',
      'User-Agent': LODGIFY_API_CONSTANTS.USER_AGENT
    }
  } catch (error) {
    // Re-throw if already a LodgifyApiError
    if (error instanceof LodgifyApiError) {
      throw error
    }

    // Wrap other errors
    throw new LodgifyApiError(
      'Failed to build authentication headers',
      'auth',
      undefined,
      false,
      error
    )
  }
}

/**
 * Verifies that an API key exists for a property without decrypting it
 * Useful for quick validation before attempting sync operations
 * 
 * @param propertyId - UUID of the property
 * @returns True if API key exists, false otherwise
 */
export async function verifyApiKeyExists(propertyId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('lodgify_integrations')
      .select('integration_id, is_active')
      .eq('property_internal_id', propertyId)
      .single()

    if (error || !data) {
      return false
    }

    return data.is_active === true
  } catch (error) {
    console.error('Error verifying API key existence:', error)
    return false
  }
}

/**
 * Clears the API key cache
 * Should be called when API keys are updated or on security events
 */
export function clearApiKeyCache(): void {
  apiKeyCache.clear()
  console.log('API key cache cleared')
}

/**
 * Removes a specific property's API key from cache
 * 
 * @param propertyId - UUID of the property
 */
export function invalidateCachedKey(propertyId: string): void {
  if (apiKeyCache.delete(propertyId)) {
    console.log(`Invalidated cached API key for property ${propertyId}`)
  }
}

/**
 * Gets integration configuration for a property
 * Includes API endpoint and sync settings
 * 
 * @param propertyId - UUID of the property
 * @returns Integration configuration or null if not found
 */
export async function getIntegrationConfig(propertyId: string) {
  try {
    const { data, error } = await supabase
      .from('lodgify_integrations')
      .select('is_active, sync_status')
      .eq('property_internal_id', propertyId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      apiEndpoint: LODGIFY_API_CONSTANTS.ENDPOINT,
      syncEnabled: data.is_active,
      syncConfig: null
    }
  } catch (error) {
    console.error('Error getting integration config:', error)
    return null
  }
}