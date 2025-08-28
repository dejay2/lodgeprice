-- Migration: Add seasonal rate validation and preview functions
-- Purpose: Support enhanced seasonal rate management interface

-- Function to check for overlapping date ranges
-- This function is used for client-side validation before attempting to insert/update
CREATE OR REPLACE FUNCTION check_date_range_overlap(
  p_start_date DATE,
  p_end_date DATE,
  p_exclude_id UUID DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  name TEXT,
  start_date DATE,
  end_date DATE,
  rate_adjustment NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dr.rate_id as id,
    dr.rate_name as name,
    dr.start_date::DATE,
    dr.end_date::DATE,
    dr.discount_rate as rate_adjustment
  FROM date_ranges dr
  WHERE daterange(dr.start_date::DATE, dr.end_date::DATE, '[]') && daterange(p_start_date, p_end_date, '[]')
    AND (p_exclude_id IS NULL OR dr.rate_id != p_exclude_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to preview the pricing impact of a seasonal rate
CREATE OR REPLACE FUNCTION preview_seasonal_rate_impact(
  p_property_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_rate_adjustment NUMERIC,
  p_guest_count INTEGER DEFAULT 2
) RETURNS TABLE(
  date DATE,
  base_price NUMERIC,
  adjusted_price NUMERIC,
  price_change NUMERIC,
  percentage_change NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE as calc_date
  )
  SELECT 
    ds.calc_date as date,
    COALESCE((SELECT price FROM calculate_final_price(p_property_id::TEXT, ds.calc_date::TEXT, p_guest_count)), 0) as base_price,
    COALESCE((SELECT price FROM calculate_final_price(p_property_id::TEXT, ds.calc_date::TEXT, p_guest_count)), 0) * (1 + p_rate_adjustment) as adjusted_price,
    (COALESCE((SELECT price FROM calculate_final_price(p_property_id::TEXT, ds.calc_date::TEXT, p_guest_count)), 0) * (1 + p_rate_adjustment)) - 
      COALESCE((SELECT price FROM calculate_final_price(p_property_id::TEXT, ds.calc_date::TEXT, p_guest_count)), 0) as price_change,
    (p_rate_adjustment * 100) as percentage_change
  FROM date_series ds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_date_range_overlap TO authenticated;
GRANT EXECUTE ON FUNCTION preview_seasonal_rate_impact TO authenticated;

-- Add comment documentation
COMMENT ON FUNCTION check_date_range_overlap IS 'Checks if a date range overlaps with existing seasonal rates, optionally excluding a specific rate by ID';
COMMENT ON FUNCTION preview_seasonal_rate_impact IS 'Previews the pricing impact of applying a seasonal rate adjustment to a property for a date range';