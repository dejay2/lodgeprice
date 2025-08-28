// Edge Function: lodgify-sync-automation
// Purpose: Batch process Lodgify sync for all enabled properties
// Called by: pg_cron hourly schedule via execute_hourly_sync()

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

interface SyncRequest {
  trigger_source: 'scheduled' | 'manual'
  execution_time: string
  sync_operation_id?: string
  properties: PropertyIntegration[]
}

interface PropertyIntegration {
  property_id: string
  lodgify_property_id: string
  name: string
  integration_id: string
}

interface SyncResult {
  execution_id: string
  total_properties: number
  successful_syncs: number
  failed_syncs: number
  execution_time_ms: number
  errors: SyncError[]
}

interface SyncError {
  property_id: string
  error_code: string
  error_message: string
  retry_scheduled: boolean
}

interface LodgifyPayload {
  property_id: number
  room_type_id: number
  rates: LodgifyRate[]
}

interface LodgifyRate {
  is_default: boolean
  start_date?: string
  end_date?: string
  price_per_day: number
  min_stay: number
  max_stay: number
  price_per_additional_guest: number
  additional_guests_starts_from: number
}

// Lodgify API configuration
const LODGIFY_API_URL = 'https://api.lodgify.com/v1/rates/savewithoutavailability'
const RETRY_DELAYS = [5000, 10000, 20000] // 5s, 10s, 20s delays for retry

serve(async (req) => {
  const startTime = Date.now()
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const requestData = await req.json() as SyncRequest
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment configuration')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Process sync for each property
    const results: SyncResult = {
      execution_id: requestData.sync_operation_id || crypto.randomUUID(),
      total_properties: requestData.properties.length,
      successful_syncs: 0,
      failed_syncs: 0,
      execution_time_ms: 0,
      errors: []
    }
    
    // Process properties in parallel batches to avoid overwhelming the API
    const batchSize = 2 // Process 2 properties at a time
    const propertyBatches = []
    
    for (let i = 0; i < requestData.properties.length; i += batchSize) {
      propertyBatches.push(requestData.properties.slice(i, i + batchSize))
    }
    
    for (const batch of propertyBatches) {
      const batchPromises = batch.map(property => 
        syncProperty(property, supabase, requestData.sync_operation_id)
      )
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, index) => {
        const property = batch[index]
        
        if (result.status === 'fulfilled' && result.value.success) {
          results.successful_syncs++
        } else {
          results.failed_syncs++
          const error = result.status === 'rejected' 
            ? result.reason 
            : result.value.error
            
          results.errors.push({
            property_id: property.property_id,
            error_code: error.code || 'SYNC_FAILED',
            error_message: error.message || 'Unknown error',
            retry_scheduled: error.code === 'RATE_LIMIT'
          })
        }
      })
    }
    
    // Update sync operation record with results
    if (requestData.sync_operation_id) {
      await updateSyncOperation(
        supabase,
        requestData.sync_operation_id,
        results.successful_syncs === results.total_properties ? 'completed' : 'partial',
        results
      )
    }
    
    results.execution_time_ms = Date.now() - startTime
    
    return new Response(
      JSON.stringify(results),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('Sync automation error:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Sync a single property to Lodgify
 */
async function syncProperty(
  property: PropertyIntegration,
  supabase: SupabaseClient,
  syncOperationId?: string
): Promise<{ success: boolean; error?: any }> {
  try {
    // Create property-specific sync operation record
    const { data: syncOp, error: syncOpError } = await supabase
      .from('sync_operations')
      .insert({
        property_id: property.property_id,
        operation_type: 'scheduled',
        status: 'processing',
        started_at: new Date().toISOString(),
        error_details: {
          parent_sync_id: syncOperationId,
          lodgify_property_id: property.lodgify_property_id
        }
      })
      .select('id')
      .single()
    
    if (syncOpError) {
      console.error('Failed to create sync operation record:', syncOpError)
    }
    
    const propertyOpId = syncOp?.id
    
    try {
      // Get API key for this property
      const { data: integration, error: integrationError } = await supabase
        .from('lodgify_integrations')
        .select('api_key_encrypted')
        .eq('integration_id', property.integration_id)
        .single()
      
      if (integrationError || !integration?.api_key_encrypted) {
        throw new Error(`No API key found for property ${property.lodgify_property_id}`)
      }
      
      // Generate payload for this property
      const payload = await generatePayloadForProperty(property, supabase)
      
      // Send to Lodgify API with retry logic
      let lastError: any = null
      let success = false
      
      for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
        try {
          const response = await fetch(LODGIFY_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-ApiKey': integration.api_key_encrypted
            },
            body: JSON.stringify(payload)
          })
          
          if (response.ok) {
            success = true
            
            // Update property sync status
            await supabase
              .from('lodgify_integrations')
              .update({
                last_sync_at: new Date().toISOString(),
                success_count: supabase.sql`success_count + 1`,
                error_count: 0, // Reset error count on success
                sync_status: 'active'
              })
              .eq('integration_id', property.integration_id)
            
            // Update sync operation
            if (propertyOpId) {
              await supabase
                .from('sync_operations')
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                  duration_ms: Date.now() - new Date(syncOp.started_at).getTime()
                })
                .eq('id', propertyOpId)
            }
            
            break
          } else if (response.status === 429) {
            // Rate limited - schedule retry
            lastError = { 
              code: 'RATE_LIMIT', 
              message: 'Too many requests',
              status: 429 
            }
            
            if (attempt < RETRY_DELAYS.length - 1) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]))
              continue
            }
          } else {
            // Other error
            const errorText = await response.text()
            lastError = { 
              code: 'API_ERROR', 
              message: errorText || response.statusText,
              status: response.status 
            }
            break
          }
        } catch (fetchError) {
          lastError = { 
            code: 'NETWORK_ERROR', 
            message: fetchError.message 
          }
          
          if (attempt < RETRY_DELAYS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]))
            continue
          }
        }
      }
      
      if (!success) {
        throw lastError
      }
      
      return { success: true }
      
    } catch (error) {
      // Update sync operation with error
      if (propertyOpId) {
        await supabase
          .from('sync_operations')
          .update({
            status: 'failed',
            error_message: error.message,
            error_details: {
              parent_sync_id: syncOperationId,
              lodgify_property_id: property.lodgify_property_id,
              error_code: error.code,
              error_status: error.status
            },
            completed_at: new Date().toISOString(),
            retry_count: supabase.sql`COALESCE(retry_count, 0) + 1`,
            next_retry_at: new Date(Date.now() + RETRY_DELAYS[0]).toISOString()
          })
          .eq('id', propertyOpId)
      }
      
      // Update integration error count
      await supabase
        .from('lodgify_integrations')
        .update({
          error_count: supabase.sql`COALESCE(error_count, 0) + 1`,
          sync_status: error.code === 'RATE_LIMIT' ? 'paused' : 'error'
        })
        .eq('integration_id', property.integration_id)
      
      throw error
    }
    
  } catch (error) {
    console.error(`Sync failed for property ${property.lodgify_property_id}:`, error)
    return { success: false, error }
  }
}

/**
 * Generate Lodgify payload for a property
 */
async function generatePayloadForProperty(
  property: PropertyIntegration,
  supabase: SupabaseClient
): Promise<LodgifyPayload> {
  // Get property details
  const { data: propertyData, error: propertyError } = await supabase
    .from('properties')
    .select('base_price_per_day, min_price_per_day, lodgify_room_type_id')
    .eq('id', property.property_id)
    .single()
  
  if (propertyError || !propertyData) {
    throw new Error(`Property not found: ${property.property_id}`)
  }
  
  // Generate 2 years of pricing data
  const startDate = new Date()
  const endDate = new Date()
  endDate.setFullYear(endDate.getFullYear() + 2)
  
  const rates: LodgifyRate[] = []
  
  // Add mandatory default rate
  rates.push({
    is_default: true,
    price_per_day: Math.round(propertyData.base_price_per_day * 100) / 100,
    min_stay: 2,
    max_stay: 6,
    price_per_additional_guest: 5,
    additional_guests_starts_from: 2
  })
  
  // Generate rates for different stay lengths (simplified for Edge Function)
  // In production, this would call the pricing calculation functions
  const stayLengths = [
    { minStay: 2, maxStay: 6, stayLength: 3 },
    { minStay: 7, maxStay: 1000, stayLength: 7 }
  ]
  
  for (const stayConfig of stayLengths) {
    // Get pricing for this stay length using preview_pricing_calendar
    const { data: pricing, error: pricingError } = await supabase
      .rpc('preview_pricing_calendar', {
        p_property_id: property.property_id,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0],
        p_stay_length: stayConfig.stayLength
      })
    
    if (!pricingError && pricing && pricing.length > 0) {
      // Group consecutive dates with same price
      let currentRange: any = null
      
      for (const dayPrice of pricing) {
        const roundedPrice = Math.round(dayPrice.final_price_per_night * 100) / 100
        
        if (!currentRange || currentRange.price !== roundedPrice) {
          if (currentRange) {
            rates.push({
              is_default: false,
              start_date: currentRange.startDate,
              end_date: currentRange.endDate,
              price_per_day: currentRange.price,
              min_stay: stayConfig.minStay,
              max_stay: stayConfig.maxStay,
              price_per_additional_guest: 5,
              additional_guests_starts_from: 2
            })
          }
          
          currentRange = {
            startDate: dayPrice.check_date,
            endDate: dayPrice.check_date,
            price: roundedPrice
          }
        } else {
          currentRange.endDate = dayPrice.check_date
        }
      }
      
      // Add last range
      if (currentRange) {
        rates.push({
          is_default: false,
          start_date: currentRange.startDate,
          end_date: currentRange.endDate,
          price_per_day: currentRange.price,
          min_stay: stayConfig.minStay,
          max_stay: stayConfig.maxStay,
          price_per_additional_guest: 5,
          additional_guests_starts_from: 2
        })
      }
    }
  }
  
  return {
    property_id: parseInt(property.lodgify_property_id),
    room_type_id: propertyData.lodgify_room_type_id || 0,
    rates
  }
}

/**
 * Update sync operation status
 */
async function updateSyncOperation(
  supabase: SupabaseClient,
  syncOperationId: string,
  status: 'completed' | 'partial' | 'failed',
  results: SyncResult
): Promise<void> {
  await supabase
    .from('sync_operations')
    .update({
      status: status === 'partial' ? 'completed' : status,
      completed_at: new Date().toISOString(),
      duration_ms: results.execution_time_ms,
      error_details: {
        total_properties: results.total_properties,
        successful_syncs: results.successful_syncs,
        failed_syncs: results.failed_syncs,
        errors: results.errors,
        partial_success: status === 'partial'
      }
    })
    .eq('id', syncOperationId)
}