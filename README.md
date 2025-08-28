# Lodgeprice 2.0 - Holiday Let Management System

A comprehensive property management and dynamic pricing system built on Supabase for managing holiday let properties with advanced pricing strategies.

## Project Overview

**Project Name:** Lodgeprice2.0  
**Project ID:** `vehonbnvzcgcticpfsox`  
**Region:** EU West (eu-west-1)  
**Database:** PostgreSQL (Supabase)

## Database Schema

### 1. Properties Table (`properties`)

Stores information about holiday let properties.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `property_id` | TEXT | Custom property ID for imports (unique, required) |
| `property_name` | TEXT | Property name (required, non-empty) |
| `min_price_per_day` | NUMERIC(10,2) | Minimum daily rate (must be positive) |
| `base_price_per_day` | NUMERIC(10,2) | Standard daily rate (must be ≥ min_price) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp (auto-updated) |

**Features:**
- Auto-generated UUID `id` for internal relationships
- Custom `property_id` field accepts any text value (e.g., "327020", "VILLA-001")
- Price validation (base_price ≥ min_price)
- Indexes on property_id, property_name and price ranges
- Row Level Security enabled

### 2. Date Ranges Table (`date_ranges`)

Manages seasonal pricing adjustments and special periods.

| Column | Type | Description |
|--------|------|-------------|
| `rate_id` | UUID | Primary key (auto-generated) |
| `rate_name` | TEXT | Period name (e.g., "Peak Season") |
| `start_date` | DATE | Start of the rate period |
| `end_date` | DATE | End of the rate period |
| `discount_rate` | NUMERIC(5,4) | Adjustment rate (-1 to 10, negative = discount) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Features:**
- Exclusion constraint prevents overlapping date ranges
- Date validation (end_date ≥ start_date)
- GIST index for efficient overlap queries
- Sample seasonal rates pre-loaded

**Sample Rates:**
- Spring Discount (Mar 1-24): -15%
- Easter Week (Mar 25 - Apr 1): +25%
- Peak Season (Jul 1 - Aug 31): +30%
- Off Season (Nov 1-30): -20%
- Christmas Period (Dec 20 - Jan 5): +50%

### 3. Bookings Table (`bookings`)

Tracks all property bookings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `booking_id` | TEXT | Custom booking ID for imports (unique, required) |
| `property_id` | TEXT | Property ID (auto-populated from property_internal_id) |
| `property_internal_id` | UUID | Foreign key to properties.id (auto-populated from property_id) |
| `arrival_date` | DATE | Guest check-in date |
| `departure_date` | DATE | Guest check-out date |
| `guest_name` | TEXT | Primary guest name |
| `total_price` | NUMERIC(10,2) | Total booking price (allows NULL, zero, or negative) |
| `booking_status` | TEXT | Booking status from source system (defaults to 'pending') |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Features:**
- Automatic property lookup: Use either `property_id` (TEXT) or `property_internal_id` (UUID)
- Prevents double bookings (unique constraint on overlapping dates)
- Date validation (departure > arrival)
- Flexible booking_status: accepts any value from source system
- Flexible total_price: allows NULL, zero, or negative values
- Foreign key relationship with properties
- Indexes on booking_id, property_id, dates, and status
- Trigger automatically populates UUID from property_id and vice versa

### 4. Discount Strategies Table (`discount_strategies`)

Defines last-minute booking discount strategies.

| Column | Type | Description |
|--------|------|-------------|
| `strategy_id` | UUID | Primary key |
| `strategy_name` | TEXT | Strategy name |
| `property_internal_id` | UUID | Specific property (null = all properties) |
| `activation_window` | INTEGER | Days before checkin when discounts start (1-365) |
| `min_discount` | NUMERIC(5,4) | Minimum discount (0-1) |
| `max_discount` | NUMERIC(5,4) | Maximum discount (0-1) |
| `curve_type` | TEXT | Discount progression (aggressive/moderate/gentle) |
| `is_active` | BOOLEAN | Strategy active flag |
| `valid_from` | DATE | Optional start date |
| `valid_until` | DATE | Optional end date |

### 5. Discount Rules Table (`discount_rules`)

Specific day-by-day discount rules for each strategy.

| Column | Type | Description |
|--------|------|-------------|
| `rule_id` | UUID | Primary key |
| `strategy_id` | UUID | Foreign key to discount_strategies |
| `days_before_checkin` | INTEGER | Specific day count |
| `discount_percentage` | NUMERIC(5,4) | Discount for that day (0-1) |
| `min_nights` | INTEGER | Minimum stay requirement |
| `applicable_days` | JSONB | Weekday restrictions (e.g., ['monday','friday']) |

## Core Functions

### 1. `calculate_final_price(property_id, check_date, nights)`

Master pricing function that combines all pricing logic. Note: property_id parameter is TEXT (e.g., "327020").

**Returns:**
```sql
{
  property_id: UUID,
  property_name: TEXT,
  check_date: DATE,
  nights: INTEGER,
  base_price_per_night: NUMERIC,
  seasonal_adjustment: NUMERIC,
  seasonal_rate: NUMERIC,
  adjusted_price_per_night: NUMERIC,
  last_minute_discount: NUMERIC,
  discounted_price_per_night: NUMERIC,
  final_price_per_night: NUMERIC,
  total_price: NUMERIC,
  min_price_per_night: NUMERIC,
  savings_amount: NUMERIC,
  savings_percentage: NUMERIC,
  has_seasonal_rate: BOOLEAN,
  has_last_minute_discount: BOOLEAN,
  at_minimum_price: BOOLEAN
}
```

**Example Usage:**
```sql
SELECT * FROM calculate_final_price(
  '327020',  -- Your custom property_id
  '2024-07-15',
  3
);
```

### 2. `get_last_minute_discount(property_id, days_before_checkin, nights, check_date)`

Calculates applicable last-minute discount.

### 3. `preview_pricing_calendar(property_id, start_date, end_date, nights)`

Shows pricing across a date range for display in calendars.

### 4. `check_booking_conflict(property_id, arrival_date, departure_date, booking_id)`

Validates if a booking would conflict with existing bookings.

## Views

### 1. `booking_summary`
Enriched booking view with calculated fields (nights count, price per night).

### 2. `property_pricing`
Shows all property-rate combinations with calculated prices.

### 3. `active_discount_strategies`
Overview of all active discount strategies.

### 4. `discount_rule_details`
Detailed view of all discount rules with readable formatting.

## Security

- **Row Level Security (RLS)** enabled on all tables
- **Authentication Required** for all operations
- **Policies** for SELECT, INSERT, UPDATE, DELETE operations
- **Data Validation** at database level
- **Foreign Key Constraints** maintain referential integrity

## Price Calculation Flow

1. **Base Price**: Retrieved from `properties.base_price_per_day`
2. **Seasonal Adjustment**: Applied from `date_ranges` table if applicable
3. **Last-Minute Discount**: Applied from discount system if within activation window
4. **Minimum Price Check**: Final price never goes below `properties.min_price_per_day`

### Example Calculation:
```
Base Price: €100
+ Peak Season (30%): €130
- Last-Minute (20%, 5 days before): €104
Final Check against Min Price (€50): €104
Total for 3 nights: €312
```

## API Access

**Project URL**: Available via Supabase dashboard  
**Anon Key**: Available via Supabase dashboard

### TypeScript Types

Generate TypeScript types for your application:
```bash
npx supabase gen types typescript --project-id vehonbnvzcgcticpfsox
```

## Sample Queries

### Add a Property
```sql
-- With custom property_id from your system:
INSERT INTO properties (property_id, property_name, min_price_per_day, base_price_per_day)
VALUES ('327020', 'Seaside Apartment A', 75.00, 120.00);

-- Or any other format:
INSERT INTO properties (property_id, property_name, min_price_per_day, base_price_per_day)
VALUES ('VILLA-001', 'Mountain Villa', 75.00, 120.00);
```

### Check Pricing for Specific Date
```sql
SELECT * FROM calculate_final_price(
  '327020',  -- Your property_id
  '2024-07-15',
  7
);
```

### View Available Properties
```sql
SELECT * FROM properties ORDER BY property_name;
```

### Check for Booking Conflicts
```sql
SELECT check_booking_conflict(
  '327020',  -- Your property_id
  '2024-07-10',
  '2024-07-17',
  null
);
```

### Get Pricing Calendar
```sql
SELECT * FROM preview_pricing_calendar(
  '327020',  -- Your property_id
  '2024-07-01',
  '2024-07-31',
  3
);
```

## Performance Optimizations

1. **Indexes** on all foreign keys and commonly queried fields
2. **GIST indexes** for date range overlap queries
3. **GIN indexes** for JSONB fields
4. **Exclusion constraints** prevent data conflicts at database level
5. **Materialized views** can be added for frequently accessed aggregations

## Maintenance

### Update Triggers
All tables have automatic `updated_at` triggers that update on any row modification.

### Data Validation
- Price constraints ensure logical pricing
- Date constraints prevent invalid date ranges
- Status enums prevent invalid booking states
- Unique constraints prevent double bookings

## Future Enhancements

Potential additions to consider:
- Guest information table
- Payment tracking
- Review/rating system
- Occupancy analytics
- Automated pricing optimization
- Channel manager integration
- Email notification system
- Reporting dashboard views

## Support

For database-related queries, refer to the Supabase dashboard for:
- Real-time logs
- Query performance metrics
- Database backups
- Connection details

---

*Built with Supabase - Project ID: vehonbnvzcgcticpfsox*