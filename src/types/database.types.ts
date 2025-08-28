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
          property_id: string
          property_name: string
          base_price_per_day: number
          min_price_per_day: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          property_id: string
          property_name: string
          base_price_per_day: number
          min_price_per_day: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          property_id?: string
          property_name?: string
          base_price_per_day?: number
          min_price_per_day?: number
          created_at?: string | null
          updated_at?: string | null
        }
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
      }
      discount_rule_details: {
        Row: {
          strategy_name: string
          days_before_checkin: number
          discount_percentage: number
          min_nights: number | null
          applicable_days: Json | null
        }
      }
    }
    Functions: {
      calculate_final_price: {
        Args: {
          property_id: string
          check_in_date: string
          stay_length: number
        }
        Returns: {
          property_id: string
          property_name: string
          check_date: string
          nights: number
          base_price_per_night: number
          seasonal_adjustment: number
          seasonal_rate: number
          adjusted_price_per_night: number
          last_minute_discount: number
          discounted_price_per_night: number
          final_price_per_night: number
          total_price: number
          min_price_per_night: number
          savings_amount: number
          savings_percentage: number
          has_seasonal_rate: boolean
          has_last_minute_discount: boolean
          at_minimum_price: boolean
        }[]
      }
      get_last_minute_discount: {
        Args: {
          property_id: string
          check_in_date: string
        }
        Returns: {
          discount_percentage: number
          strategy_name: string | null
          days_until_checkin: number
        }[]
      }
      check_booking_conflict: {
        Args: {
          property_id: string
          start_date: string
          end_date: string
          booking_id: string | null
        }
        Returns: {
          has_conflict: boolean
          conflicting_booking_id: string | null
          conflicting_dates: string | null
        }[]
      }
      preview_pricing_calendar: {
        Args: {
          property_id: string
          start_date: string
          end_date: string
          stay_length: number
        }
        Returns: {
          date: string
          base_price: number
          seasonal_rate: number | null
          final_price: number
          discount_applied: number | null
          is_available: boolean
        }[]
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