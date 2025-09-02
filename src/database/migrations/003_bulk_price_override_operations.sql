-- Migration: Add bulk price override operations function
-- Purpose: Enable atomic bulk operations for setting/removing price overrides
-- Author: System
-- Date: 2025-09-01

-- Drop function if exists for clean migration
DROP FUNCTION IF EXISTS bulk_price_override_operations(JSONB);

-- Core bulk operation function with automatic transaction atomicity
-- Implements PRP-010 requirements for atomic bulk operations
CREATE OR REPLACE FUNCTION bulk_price_override_operations(
  operations JSONB -- Array of {action, property_id, override_date, override_price?, reason?}
) RETURNS TABLE (
  operation_index INTEGER,
  action TEXT,
  property_id TEXT,  -- Using TEXT to match lodgify_property_id type
  override_date DATE,
  success BOOLEAN,
  error_code TEXT,
  error_message TEXT,
  override_price NUMERIC(10,2)
) LANGUAGE plpgsql
SECURITY DEFINER  -- Run with owner privileges for RLS bypass in controlled manner
AS $$
DECLARE
  operation_record RECORD;
  op_index INTEGER := 0;
  current_operation JSONB;
  operation_property_id TEXT;
  operation_date DATE;
  operation_price NUMERIC(10,2);
  operation_reason TEXT;
  valid_property_count INTEGER;
BEGIN
  -- Process each operation in the array
  FOR current_operation IN SELECT jsonb_array_elements(operations)
  LOOP
    op_index := op_index + 1;
    
    BEGIN
      -- Extract operation parameters with safe casting
      operation_property_id := current_operation->>'property_id';
      operation_date := (current_operation->>'override_date')::DATE;
      
      -- Validate property exists first
      SELECT COUNT(*) INTO valid_property_count
      FROM properties 
      WHERE lodgify_property_id = operation_property_id;
      
      IF valid_property_count = 0 THEN
        RETURN QUERY SELECT 
          op_index, 
          current_operation->>'action',
          operation_property_id,
          operation_date,
          FALSE,
          'PROPERTY_NOT_FOUND'::TEXT,
          format('Property %s does not exist', operation_property_id)::TEXT,
          NULL::NUMERIC(10,2);
        CONTINUE;
      END IF;
      
      -- Handle different operation types
      IF current_operation->>'action' = 'set' THEN
        -- Extract price and reason for set operations
        operation_price := (current_operation->>'override_price')::NUMERIC(10,2);
        operation_reason := current_operation->>'reason';
        
        -- Validate price constraint
        IF operation_price IS NULL OR operation_price <= 0 THEN
          RETURN QUERY SELECT 
            op_index, 
            'set'::TEXT,
            operation_property_id,
            operation_date,
            FALSE,
            'INVALID_PRICE'::TEXT,
            'Override price must be a positive number'::TEXT,
            NULL::NUMERIC(10,2);
          CONTINUE;
        END IF;
        
        -- Validate price maximum (10000 as per service validation)
        IF operation_price > 10000 THEN
          RETURN QUERY SELECT 
            op_index, 
            'set'::TEXT,
            operation_property_id,
            operation_date,
            FALSE,
            'PRICE_TOO_HIGH'::TEXT,
            'Override price exceeds maximum allowed (10000)'::TEXT,
            operation_price;
          CONTINUE;
        END IF;
        
        -- Upsert override record using INSERT ON CONFLICT
        INSERT INTO price_overrides (
          property_id, 
          override_date, 
          override_price, 
          reason,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          operation_property_id, 
          operation_date, 
          operation_price, 
          operation_reason,
          TRUE,
          NOW(),
          NOW()
        )
        ON CONFLICT (property_id, override_date)
        DO UPDATE SET
          override_price = EXCLUDED.override_price,
          reason = EXCLUDED.reason,
          is_active = TRUE,
          updated_at = NOW();
        
        RETURN QUERY SELECT 
          op_index, 
          'set'::TEXT,
          operation_property_id,
          operation_date,
          TRUE,
          NULL::TEXT,
          NULL::TEXT,
          operation_price;
          
      ELSIF current_operation->>'action' = 'remove' THEN
        -- Delete override record (actual deletion, not soft delete)
        DELETE FROM price_overrides 
        WHERE property_id = operation_property_id 
          AND override_date = operation_date;
        
        RETURN QUERY SELECT 
          op_index, 
          'remove'::TEXT,
          operation_property_id,
          operation_date,
          TRUE,
          NULL::TEXT,
          NULL::TEXT,
          NULL::NUMERIC(10,2);
          
      ELSE
        -- Invalid action type
        RETURN QUERY SELECT 
          op_index, 
          current_operation->>'action',
          operation_property_id,
          operation_date,
          FALSE,
          'INVALID_ACTION'::TEXT,
          format('Action must be "set" or "remove", got: %s', current_operation->>'action')::TEXT,
          NULL::NUMERIC(10,2);
      END IF;
      
    EXCEPTION
      WHEN invalid_text_representation THEN
        -- Handle invalid UUID, date, or price format
        RETURN QUERY SELECT 
          op_index, 
          current_operation->>'action',
          operation_property_id,
          NULL::DATE,
          FALSE,
          'INVALID_FORMAT'::TEXT,
          format('Invalid date or price format in operation %s', op_index)::TEXT,
          NULL::NUMERIC(10,2);
          
      WHEN check_violation THEN
        -- Handle check constraint violations
        RETURN QUERY SELECT 
          op_index, 
          current_operation->>'action',
          operation_property_id,
          operation_date,
          FALSE,
          'CHECK_VIOLATION'::TEXT,
          format('Check constraint violation: %s', SQLERRM)::TEXT,
          NULL::NUMERIC(10,2);
          
      WHEN foreign_key_violation THEN
        -- Handle foreign key violations
        RETURN QUERY SELECT 
          op_index, 
          current_operation->>'action',
          operation_property_id,
          operation_date,
          FALSE,
          'FOREIGN_KEY_VIOLATION'::TEXT,
          'Property reference is invalid'::TEXT,
          NULL::NUMERIC(10,2);
          
      WHEN OTHERS THEN
        -- Handle any other unexpected errors
        RETURN QUERY SELECT 
          op_index, 
          current_operation->>'action',
          operation_property_id,
          operation_date,
          FALSE,
          'UNKNOWN_ERROR'::TEXT,
          SQLERRM::TEXT,
          NULL::NUMERIC(10,2);
    END;
  END LOOP;
  
  -- If no operations were provided, return empty result set
  IF op_index = 0 THEN
    RETURN QUERY SELECT 
      0::INTEGER,
      'none'::TEXT,
      NULL::TEXT,
      NULL::DATE,
      FALSE,
      'NO_OPERATIONS'::TEXT,
      'No operations provided in request'::TEXT,
      NULL::NUMERIC(10,2);
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION bulk_price_override_operations(JSONB) TO authenticated;

-- Add helpful comment for documentation
COMMENT ON FUNCTION bulk_price_override_operations(JSONB) IS 
'Executes bulk price override operations atomically. Accepts a JSONB array of operations where each operation contains:
- action: "set" or "remove"
- property_id: lodgify_property_id of the property
- override_date: date in YYYY-MM-DD format
- override_price: required for "set" operations, must be positive
- reason: optional text description
Returns detailed results for each operation including success status and any error messages.
All operations run in a single transaction - if the function completes, all successful operations are committed.';

-- Create helper function for validating bulk operation parameters
CREATE OR REPLACE FUNCTION validate_bulk_operation_params(
  operations JSONB
) RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT
) LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  operation_count INTEGER;
  current_op JSONB;
  op_index INTEGER := 0;
BEGIN
  -- Check if operations is an array
  IF jsonb_typeof(operations) != 'array' THEN
    RETURN QUERY SELECT FALSE, 'Operations must be a JSON array';
    RETURN;
  END IF;
  
  -- Check operation count
  operation_count := jsonb_array_length(operations);
  
  IF operation_count = 0 THEN
    RETURN QUERY SELECT FALSE, 'At least one operation must be provided';
    RETURN;
  END IF;
  
  IF operation_count > 1000 THEN
    RETURN QUERY SELECT FALSE, format('Too many operations (%s). Maximum 1000 operations per batch.', operation_count);
    RETURN;
  END IF;
  
  -- Validate each operation structure
  FOR current_op IN SELECT jsonb_array_elements(operations)
  LOOP
    op_index := op_index + 1;
    
    -- Check required fields
    IF NOT (current_op ? 'action' AND current_op ? 'property_id' AND current_op ? 'override_date') THEN
      RETURN QUERY SELECT FALSE, format('Operation %s missing required fields (action, property_id, override_date)', op_index);
      RETURN;
    END IF;
    
    -- Validate action type
    IF current_op->>'action' NOT IN ('set', 'remove') THEN
      RETURN QUERY SELECT FALSE, format('Operation %s has invalid action: %s', op_index, current_op->>'action');
      RETURN;
    END IF;
    
    -- For set operations, price is required
    IF current_op->>'action' = 'set' AND NOT (current_op ? 'override_price') THEN
      RETURN QUERY SELECT FALSE, format('Operation %s (set) missing required override_price', op_index);
      RETURN;
    END IF;
  END LOOP;
  
  -- All validations passed
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- Grant execute permission for validation function
GRANT EXECUTE ON FUNCTION validate_bulk_operation_params(JSONB) TO authenticated;

-- Add comment for validation function
COMMENT ON FUNCTION validate_bulk_operation_params(JSONB) IS 
'Validates bulk operation parameters before execution. Returns is_valid=true if all operations are properly formatted, otherwise returns false with an error message.';

-- Create index to optimize bulk operations performance
-- This composite index helps with the UPSERT operations
CREATE INDEX IF NOT EXISTS idx_price_overrides_bulk_ops 
ON price_overrides(property_id, override_date, is_active)
WHERE is_active = TRUE;

-- Add index on updated_at for efficient cache invalidation queries
CREATE INDEX IF NOT EXISTS idx_price_overrides_updated 
ON price_overrides(updated_at DESC);