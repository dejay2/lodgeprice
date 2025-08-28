-- Function: execute_hourly_sync
-- Purpose: Orchestrate hourly Lodgify sync with advisory locking and Edge Function invocation
-- Author: System
-- Created: 2025-08-28

CREATE OR REPLACE FUNCTION public.execute_hourly_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lock_acquired boolean;
    v_sync_operation_id uuid;
    v_properties_to_sync jsonb;
    v_edge_function_response jsonb;
    v_project_url text;
    v_service_key text;
    v_http_response jsonb;
    v_sync_start timestamp with time zone;
    v_error_message text;
    v_error_detail text;
BEGIN
    -- Start timing
    v_sync_start := NOW();
    
    -- Attempt to acquire advisory lock (non-blocking)
    -- Using lock ID 12345 for Lodgify sync operations
    v_lock_acquired := pg_try_advisory_lock(12345);
    
    IF NOT v_lock_acquired THEN
        -- Another sync is already running
        INSERT INTO sync_operations (
            operation_type,
            status,
            error_message,
            started_at,
            completed_at,
            duration_ms
        ) VALUES (
            'scheduled',
            'cancelled',
            'Concurrent execution prevented by advisory lock',
            v_sync_start,
            NOW(),
            EXTRACT(MILLISECONDS FROM (NOW() - v_sync_start))::integer
        );
        
        RETURN jsonb_build_object(
            'success', false,
            'error', 'CONCURRENT_EXECUTION',
            'message', 'Another sync process is already running'
        );
    END IF;
    
    -- Lock acquired, proceed with sync
    BEGIN
        -- Query properties with sync enabled
        SELECT jsonb_agg(
            jsonb_build_object(
                'property_id', p.id,
                'lodgify_property_id', p.lodgify_property_id,
                'name', p.name,
                'integration_id', li.integration_id
            )
        )
        INTO v_properties_to_sync
        FROM properties p
        INNER JOIN lodgify_integrations li ON li.property_id = p.id
        WHERE li.sync_enabled = true
        AND li.sync_status NOT IN ('error', 'disabled')
        AND li.api_key_encrypted IS NOT NULL;
        
        -- Check if there are properties to sync
        IF v_properties_to_sync IS NULL OR jsonb_array_length(v_properties_to_sync) = 0 THEN
            -- No properties to sync
            INSERT INTO sync_operations (
                operation_type,
                status,
                error_message,
                started_at,
                completed_at,
                duration_ms
            ) VALUES (
                'scheduled',
                'completed',
                'No properties configured for sync',
                v_sync_start,
                NOW(),
                EXTRACT(MILLISECONDS FROM (NOW() - v_sync_start))::integer
            );
            
            -- Release lock before returning
            PERFORM pg_advisory_unlock(12345);
            
            RETURN jsonb_build_object(
                'success', true,
                'message', 'No properties to sync',
                'properties_count', 0
            );
        END IF;
        
        -- Create master sync operation record
        INSERT INTO sync_operations (
            operation_type,
            status,
            started_at,
            error_details
        ) VALUES (
            'scheduled',
            'processing',
            v_sync_start,
            jsonb_build_object(
                'properties_count', jsonb_array_length(v_properties_to_sync),
                'trigger_source', 'pg_cron'
            )
        )
        RETURNING id INTO v_sync_operation_id;
        
        -- Get credentials from vault
        SELECT decrypted_secret INTO v_project_url 
        FROM vault.decrypted_secrets 
        WHERE name = 'project_url';
        
        SELECT decrypted_secret INTO v_service_key 
        FROM vault.decrypted_secrets 
        WHERE name = 'service_role_key';
        
        -- Invoke Edge Function via pg_net
        SELECT net.http_post(
            url := v_project_url || '/functions/v1/lodgify-sync-automation',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_service_key
            ),
            body := jsonb_build_object(
                'trigger_source', 'scheduled',
                'execution_time', v_sync_start,
                'sync_operation_id', v_sync_operation_id,
                'properties', v_properties_to_sync
            )
        ) INTO v_http_response;
        
        -- Update sync operation with Edge Function invocation details
        UPDATE sync_operations
        SET 
            error_details = jsonb_build_object(
                'properties_count', jsonb_array_length(v_properties_to_sync),
                'trigger_source', 'pg_cron',
                'edge_function_invoked', true,
                'http_request_id', v_http_response->>'id'
            )
        WHERE id = v_sync_operation_id;
        
        -- Note: The Edge Function will update the sync_operations record with final status
        -- We don't wait for the response here to avoid blocking
        
        -- Release advisory lock
        PERFORM pg_advisory_unlock(12345);
        
        RETURN jsonb_build_object(
            'success', true,
            'sync_operation_id', v_sync_operation_id,
            'properties_count', jsonb_array_length(v_properties_to_sync),
            'edge_function_request_id', v_http_response->>'id',
            'message', 'Sync initiated successfully'
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Capture error details
        GET STACKED DIAGNOSTICS 
            v_error_message = MESSAGE_TEXT,
            v_error_detail = PG_EXCEPTION_DETAIL;
        
        -- Update sync operation with error
        IF v_sync_operation_id IS NOT NULL THEN
            UPDATE sync_operations
            SET 
                status = 'failed',
                error_message = v_error_message,
                error_details = jsonb_build_object(
                    'error_detail', v_error_detail,
                    'sqlstate', SQLSTATE,
                    'properties_count', COALESCE(jsonb_array_length(v_properties_to_sync), 0)
                ),
                completed_at = NOW(),
                duration_ms = EXTRACT(MILLISECONDS FROM (NOW() - v_sync_start))::integer
            WHERE id = v_sync_operation_id;
        ELSE
            -- Create error record if sync operation wasn't created
            INSERT INTO sync_operations (
                operation_type,
                status,
                error_message,
                error_details,
                started_at,
                completed_at,
                duration_ms
            ) VALUES (
                'scheduled',
                'failed',
                v_error_message,
                jsonb_build_object(
                    'error_detail', v_error_detail,
                    'sqlstate', SQLSTATE
                ),
                v_sync_start,
                NOW(),
                EXTRACT(MILLISECONDS FROM (NOW() - v_sync_start))::integer
            );
        END IF;
        
        -- Always release lock on error
        PERFORM pg_advisory_unlock(12345);
        
        -- Re-raise the error
        RAISE;
    END;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.execute_hourly_sync() TO service_role;

-- Add comment
COMMENT ON FUNCTION public.execute_hourly_sync() IS 'Orchestrates hourly Lodgify sync with advisory locking and Edge Function invocation';