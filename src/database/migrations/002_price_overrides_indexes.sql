-- Migration: Create price_overrides table and performance indexes
-- Purpose: Support price override functionality with <10ms lookup performance
-- Performance Target: <10ms execution time for override lookups
-- Created: 2025-09-01 as part of PRP 004-indexes-performance

-- Step 1: Create the price_overrides table
CREATE TABLE IF NOT EXISTS price_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id TEXT NOT NULL, -- References properties.lodgify_property_id
  override_date DATE NOT NULL,
  override_price NUMERIC(10,2) NOT NULL CHECK (override_price > 0),
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create unique constraint to prevent duplicate active overrides
-- Using partial unique index for optimal performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_overrides_unique_active 
ON price_overrides (property_id, override_date) 
WHERE is_active = true;

-- Step 3: Create composite B-tree index for optimal performance
-- Column order: property_id first (higher selectivity), override_date second (range queries)
-- This index supports both point lookups and date range queries efficiently
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_overrides_property_date 
ON price_overrides (property_id, override_date)
WHERE is_active = true;

-- Step 4: Create additional index for date range queries (calendar operations)
-- This supports queries that filter primarily on date ranges
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_overrides_date_range 
ON price_overrides (override_date)
WHERE is_active = true;

-- Step 5: Enable Row Level Security (following existing patterns)
ALTER TABLE price_overrides ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON price_overrides
  FOR ALL USING (auth.role() = 'authenticated');

-- Step 7: Update table statistics for optimal query planning
ANALYZE price_overrides;

-- Step 8: Add documentation comments
COMMENT ON TABLE price_overrides IS 'Stores price overrides for specific properties and dates with performance-optimized indexing for <10ms lookups';
COMMENT ON INDEX idx_price_overrides_property_date IS 'Composite B-tree index optimized for property_id + date queries, supports <10ms lookups';
COMMENT ON INDEX idx_price_overrides_date_range IS 'Date range index for calendar operations and date-based filtering';
COMMENT ON INDEX idx_price_overrides_unique_active IS 'Unique constraint preventing duplicate active overrides for same property/date';

-- Performance Validation Queries (for reference):
-- 
-- Test Case 1: Point Lookup Performance (should be <10ms)
-- EXPLAIN (ANALYZE, BUFFERS, VERBOSE, TIMING) 
-- SELECT override_price FROM price_overrides 
-- WHERE property_id = '327020' AND override_date = '2024-07-15';
--
-- Test Case 2: Range Query Performance (should be <10ms) 
-- EXPLAIN (ANALYZE, BUFFERS, VERBOSE, TIMING)
-- SELECT * FROM price_overrides 
-- WHERE property_id = '327020' 
-- AND override_date BETWEEN '2024-07-01' AND '2024-07-31';
--
-- Index Verification Query:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'price_overrides';

-- Integration Notes:
-- This table is designed to integrate with existing pricing functions:
-- - calculate_final_price() can be enhanced to check for price overrides
-- - preview_pricing_calendar() should incorporate override prices when available
--
-- Usage Patterns:
-- INSERT: price_overrides (property_id, override_date, override_price, reason)
-- SELECT: WHERE property_id = ? AND override_date = ? (point lookup)
-- SELECT: WHERE property_id = ? AND override_date BETWEEN ? AND ? (range query)
-- UPDATE: Override prices by setting is_active = false and inserting new records
-- DELETE: Logical deletion by setting is_active = false