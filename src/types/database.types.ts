// Generated TypeScript interfaces for Supabase database schema
// Project: vehonbnvzcgcticpfsox (EU West region)
// This file provides the Database interface for full type safety with Supabase client

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          lodgify_property_id: string  // This is the TEXT field for Lodgify property ID
          property_id: string           // Alias for lodgify_property_id for backward compatibility
          lodgify_room_type_id: number | null
          property_name: string
          base_price_per_day: number
          min_price_per_day: number
          active_discount_strategy_id: string | null  // Reference to active discount strategy
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          lodgify_property_id: string
          property_id?: string
          lodgify_room_type_id?: number | null
          property_name: string
          base_price_per_day: number
          min_price_per_day: number
          active_discount_strategy_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          lodgify_property_id?: string
          property_id?: string
          lodgify_room_type_id?: number | null
          property_name?: string
          base_price_per_day?: number
          min_price_per_day?: number
          active_discount_strategy_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      date_ranges: {
        Row: {
          rate_id: string
          rate_name: string
          start_date: string
          end_date: string
          discount_rate: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          rate_id?: string
          rate_name: string
          start_date: string
          end_date: string
          discount_rate: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          rate_id?: string
          rate_name?: string
          start_date?: string
          end_date?: string
          discount_rate?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          booking_id: string
          property_id: string
          property_internal_id: string
          arrival_date: string
          departure_date: string
          guest_name: string
          total_price: number | null
          booking_status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          booking_id: string
          property_id: string
          property_internal_id: string
          arrival_date: string
          departure_date: string
          guest_name: string
          total_price?: number | null
          booking_status: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          booking_id?: string
          property_id?: string
          property_internal_id?: string
          arrival_date?: string
          departure_date?: string
          guest_name?: string
          total_price?: number | null
          booking_status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      discount_strategies: {
        Row: {
          strategy_id: string
          strategy_name: string
          property_internal_id: string | null
          activation_window: number
          min_discount: number
          max_discount: number
          curve_type: string
          is_active: boolean
          valid_from: string | null
          valid_until: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          strategy_id?: string
          strategy_name: string
          property_internal_id?: string | null
          activation_window: number
          min_discount: number
          max_discount: number
          curve_type: string
          is_active?: boolean
          valid_from?: string | null
          valid_until?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          strategy_id?: string
          strategy_name?: string
          property_internal_id?: string | null
          activation_window?: number
          min_discount?: number
          max_discount?: number
          curve_type?: string
          is_active?: boolean
          valid_from?: string | null
          valid_until?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      discount_rules: {
        Row: {
          rule_id: string
          strategy_id: string
          days_before_checkin: number
          discount_percentage: number
          min_nights: number | null
          applicable_days: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          rule_id?: string
          strategy_id: string
          days_before_checkin: number
          discount_percentage: number
          min_nights?: number | null
          applicable_days?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          rule_id?: string
          strategy_id?: string
          days_before_checkin?: number
          discount_percentage?: number
          min_nights?: number | null
          applicable_days?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lodgify_integrations: {
        Row: {
          integration_id: string
          property_internal_id: string
          lodgify_property_id: number
          lodgify_room_type_id: number
          encrypted_api_key: string
          is_active: boolean
          last_sync: string | null
          sync_status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          integration_id?: string
          property_internal_id: string
          lodgify_property_id: number
          lodgify_room_type_id: number
          encrypted_api_key: string
          is_active?: boolean
          last_sync?: string | null
          sync_status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          integration_id?: string
          property_internal_id?: string
          lodgify_property_id?: number
          lodgify_room_type_id?: number
          encrypted_api_key?: string
          is_active?: boolean
          last_sync?: string | null
          sync_status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_operations: {
        Row: {
          id: string
          property_id: string
          operation_type: string
          status: string
          trigger_source: string | null
          trigger_details: Json | null
          date_range_start: string | null
          date_range_end: string | null
          total_records: number | null
          processed_records: number
          payload_size_kb: number | null
          api_endpoint: string | null
          api_method: string | null
          api_status_code: number | null
          api_response: Json | null
          error_message: string | null
          error_details: Json | null
          retry_count: number
          max_retries: number
          next_retry_at: string | null
          duration_ms: number | null
          started_at: string | null
          completed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          property_id: string
          operation_type: string
          status?: string
          trigger_source?: string | null
          trigger_details?: Json | null
          date_range_start?: string | null
          date_range_end?: string | null
          total_records?: number | null
          processed_records?: number
          payload_size_kb?: number | null
          api_endpoint?: string | null
          api_method?: string | null
          api_status_code?: number | null
          api_response?: Json | null
          error_message?: string | null
          error_details?: Json | null
          retry_count?: number
          max_retries?: number
          next_retry_at?: string | null
          duration_ms?: number | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          property_id?: string
          operation_type?: string
          status?: string
          trigger_source?: string | null
          trigger_details?: Json | null
          date_range_start?: string | null
          date_range_end?: string | null
          total_records?: number | null
          processed_records?: number
          payload_size_kb?: number | null
          api_endpoint?: string | null
          api_method?: string | null
          api_status_code?: number | null
          api_response?: Json | null
          error_message?: string | null
          error_details?: Json | null
          retry_count?: number
          max_retries?: number
          next_retry_at?: string | null
          duration_ms?: number | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      price_cache: {
        Row: {
          id: string
          property_id: string
          cache_date: string
          base_price: number | null
          seasonal_adjustment: number | null
          seasonal_rate: number | null
          discount_percentage: number | null
          discount_amount: number | null
          final_price: number
          min_price: number | null
          has_seasonal_rate: boolean
          has_last_minute_discount: boolean
          at_minimum_price: boolean
          input_hash: string | null
          cache_created_at: string | null
          cache_expires_at: string | null
          last_accessed_at: string | null
          access_count: number
        }
        Insert: {
          id?: string
          property_id: string
          cache_date: string
          base_price?: number | null
          seasonal_adjustment?: number | null
          seasonal_rate?: number | null
          discount_percentage?: number | null
          discount_amount?: number | null
          final_price: number
          min_price?: number | null
          has_seasonal_rate?: boolean
          has_last_minute_discount?: boolean
          at_minimum_price?: boolean
          input_hash?: string | null
          cache_created_at?: string | null
          cache_expires_at?: string | null
          last_accessed_at?: string | null
          access_count?: number
        }
        Update: {
          id?: string
          property_id?: string
          cache_date?: string
          base_price?: number | null
          seasonal_adjustment?: number | null
          seasonal_rate?: number | null
          discount_percentage?: number | null
          discount_amount?: number | null
          final_price?: number
          min_price?: number | null
          has_seasonal_rate?: boolean
          has_last_minute_discount?: boolean
          at_minimum_price?: boolean
          input_hash?: string | null
          cache_created_at?: string | null
          cache_expires_at?: string | null
          last_accessed_at?: string | null
          access_count?: number
        }
        Relationships: []
      }
      price_overrides: {
        Row: {
          id: string
          property_id: string  // References properties.lodgify_property_id (TEXT)
          override_date: string  // DATE in ISO format
          override_price: number  // NUMERIC(10,2) 
          reason: string | null
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          property_id: string
          override_date: string
          override_price: number
          reason?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          property_id?: string
          override_date?: string
          override_price?: number
          reason?: string | null
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      booking_summary: {
        Row: {
          id: string
          booking_id: string
          property_name: string
          arrival_date: string
          departure_date: string
          guest_name: string
          total_price: number | null
          booking_status: string
          nights: number
        }
        Relationships: []
      }
      property_pricing: {
        Row: {
          property_id: string
          property_name: string
          base_price_per_day: number
          min_price_per_day: number
          rate_name: string | null
          seasonal_adjustment: number | null
        }
        Relationships: []
      }
      active_discount_strategies: {
        Row: {
          strategy_id: string
          strategy_name: string
          property_name: string | null
          activation_window: number
          min_discount: number
          max_discount: number
          is_active: boolean
        }
        Relationships: []
      }
      discount_rule_details: {
        Row: {
          strategy_name: string
          days_before_checkin: number
          discount_percentage: number
          min_nights: number | null
          applicable_days: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_final_price: {
        Args: {
          p_property_id: string  // lodgify_property_id TEXT
          p_check_date: string   // DATE in ISO format (can be date or text)
          p_nights: number       // INTEGER (no default value)
        }
        Returns: {
          base_price: number
          seasonal_adjustment: number
          last_minute_discount: number
          final_price_per_night: number
          total_price: number
          min_price_enforced: boolean
          is_overridden: boolean
          override_price: number | null
          reason: string | null
        }

      }
      get_last_minute_discount: {
        Args: {
          p_property_id: string          // TEXT property ID (lodgify_property_id)
          p_days_before_checkin: number   // INTEGER
          p_nights: number               // INTEGER, defaults to 1
          p_check_date: string           // DATE, defaults to CURRENT_DATE
        }
        Returns: number  // Returns NUMERIC discount value

      }
      check_booking_conflict: {
        Args: {
          p_property_id: string           // TEXT property ID (lodgify_property_id)
          p_arrival_date: string          // DATE in ISO format
          p_departure_date: string        // DATE in ISO format
          p_exclude_booking_id: string | null    // TEXT booking ID, optional
        }
        Returns: boolean  // Returns BOOLEAN indicating conflict

      }
      preview_pricing_calendar: {
        Args: {
          p_property_id: string   // lodgify_property_id TEXT
          p_start_date: string    // DATE in ISO format
          p_end_date: string      // DATE in ISO format
          p_nights: number        // INTEGER stay length
        }
        Returns: Array<{
          check_date: string
          days_from_today: number
          base_price: number
          seasonal_adjustment_percent: number
          last_minute_discount_percent: number
          final_price_per_night: number
          total_price: number
          savings_amount: number
          savings_percent: number
          min_price_enforced: boolean
          is_override: boolean           // NEW: renamed from is_overridden
          override_price: number | null   // NEW: the override price when applicable
          calculated_price: number | null // NEW: the calculated price before override
        }>

      }
      apply_discount_to_all_properties: {
        Args: {
          p_strategy_id: string  // UUID of global strategy
        }
        Returns: number  // Number of strategies created

      }
      remove_all_discounts: {
        Args: {}
        Returns: number  // Number of strategies deactivated

      }
      copy_discount_strategy: {
        Args: {
          p_strategy_id: string  // UUID of strategy to copy
          p_new_name: string     // Name for new strategy
        }
        Returns: string  // UUID of new strategy

      }
      get_global_strategies: {
        Args: {}
        Returns: Array<{
          strategy_id: string
          strategy_name: string
          activation_window: number
          min_discount: number
          max_discount: number
          curve_type: string
          is_active: boolean
          valid_from: string | null
          valid_until: string | null
          rule_count: number
        }>

      }
      store_api_key: {
        Args: {
          p_property_id: string           // UUID of property
          p_api_key: string               // Plain text API key
          p_expires_at?: string | null    // Optional expiration timestamp
        }
        Returns: string  // UUID of integration record

      }
      get_api_key: {
        Args: {
          p_property_id: string  // UUID of property
        }
        Returns: string  // Decrypted API key

      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type helpers for easier usage
export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

// Export commonly used types
export type Property = Tables<"properties">
export type DateRange = Tables<"date_ranges">
export type Booking = Tables<"bookings">
export type DiscountStrategy = Tables<"discount_strategies">
export type DiscountRule = Tables<"discount_rules">
export type LodgifyIntegration = Tables<"lodgify_integrations">
export type PriceOverride = Tables<"price_overrides">

// Price Override type variants for CRUD operations
export type PriceOverrideInsert = TablesInsert<"price_overrides">
export type PriceOverrideUpdate = TablesUpdate<"price_overrides">