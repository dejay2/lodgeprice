export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          arrival_date: string
          booking_id: string
          booking_status: string
          created_at: string
          departure_date: string
          guest_name: string
          id: string
          property_id: string | null
          property_internal_id: string | null
          total_price: number | null
          updated_at: string
        }
        Insert: {
          arrival_date: string
          booking_id: string
          booking_status?: string
          created_at?: string
          departure_date: string
          guest_name: string
          id?: string
          property_id?: string | null
          property_internal_id?: string | null
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          arrival_date?: string
          booking_id?: string
          booking_status?: string
          created_at?: string
          departure_date?: string
          guest_name?: string
          id?: string
          property_id?: string | null
          property_internal_id?: string | null
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_internal_id_fkey"
            columns: ["property_internal_id"]
            isOneToOne: false
            referencedRelation: "current_discount_status"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "bookings_property_internal_id_fkey"
            columns: ["property_internal_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      date_ranges: {
        Row: {
          created_at: string | null
          discount_rate: number
          end_date: string
          rate_id: string
          rate_name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          discount_rate: number
          end_date: string
          rate_id?: string
          rate_name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          discount_rate?: number
          end_date?: string
          rate_id?: string
          rate_name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      discount_rules: {
        Row: {
          applicable_days: Json | null
          created_at: string
          days_before_checkin: number
          discount_percentage: number
          min_nights: number | null
          rule_id: string
          strategy_id: string
          updated_at: string
        }
        Insert: {
          applicable_days?: Json | null
          created_at?: string
          days_before_checkin: number
          discount_percentage: number
          min_nights?: number | null
          rule_id?: string
          strategy_id: string
          updated_at?: string
        }
        Update: {
          applicable_days?: Json | null
          created_at?: string
          days_before_checkin?: number
          discount_percentage?: number
          min_nights?: number | null
          rule_id?: string
          strategy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_rules_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "active_discount_strategies"
            referencedColumns: ["strategy_id"]
          },
          {
            foreignKeyName: "discount_rules_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "discount_strategies"
            referencedColumns: ["strategy_id"]
          },
        ]
      }
      discount_strategies: {
        Row: {
          activation_window: number
          created_at: string
          curve_type: string
          is_active: boolean
          max_discount: number
          min_discount: number
          property_internal_id: string | null
          strategy_id: string
          strategy_name: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          activation_window: number
          created_at?: string
          curve_type: string
          is_active?: boolean
          max_discount: number
          min_discount: number
          property_internal_id?: string | null
          strategy_id?: string
          strategy_name: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          activation_window?: number
          created_at?: string
          curve_type?: string
          is_active?: boolean
          max_discount?: number
          min_discount?: number
          property_internal_id?: string | null
          strategy_id?: string
          strategy_name?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_strategies_property_internal_id_fkey"
            columns: ["property_internal_id"]
            isOneToOne: false
            referencedRelation: "current_discount_status"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "discount_strategies_property_internal_id_fkey"
            columns: ["property_internal_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lodgify_integrations: {
        Row: {
          api_key_created_at: string | null
          api_key_expires_at: string | null
          api_key_hash: string | null
          api_key_last_used_at: string | null
          api_key_usage_count: number | null
          created_at: string
          created_by: string | null
          encrypted_api_key: string | null
          encryption_version: number
          integration_id: string
          integration_name: string
          is_active: boolean
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          lodgify_config: Json | null
          property_id: string
          security_notes: string | null
          sync_config: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key_created_at?: string | null
          api_key_expires_at?: string | null
          api_key_hash?: string | null
          api_key_last_used_at?: string | null
          api_key_usage_count?: number | null
          created_at?: string
          created_by?: string | null
          encrypted_api_key?: string | null
          encryption_version?: number
          integration_id?: string
          integration_name: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          lodgify_config?: Json | null
          property_id: string
          security_notes?: string | null
          sync_config?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key_created_at?: string | null
          api_key_expires_at?: string | null
          api_key_hash?: string | null
          api_key_last_used_at?: string | null
          api_key_usage_count?: number | null
          created_at?: string
          created_by?: string | null
          encrypted_api_key?: string | null
          encryption_version?: number
          integration_id?: string
          integration_name?: string
          is_active?: boolean
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          lodgify_config?: Json | null
          property_id?: string
          security_notes?: string | null
          sync_config?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lodgify_integrations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "current_discount_status"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "lodgify_integrations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      price_cache: {
        Row: {
          base_price: number
          cache_id: string
          calculated_at: string
          calculated_for_checkin: string | null
          calculation_date: string
          calculation_inputs_hash: string
          created_at: string
          expires_at: string
          final_price: number
          is_valid: boolean
          last_minute_discount: number | null
          lodgify_property_id: number | null
          lodgify_room_type_id: number | null
          nights_duration: number | null
          property_internal_id: string
          seasonal_rate: number | null
          updated_at: string
        }
        Insert: {
          base_price: number
          cache_id?: string
          calculated_at?: string
          calculated_for_checkin?: string | null
          calculation_date: string
          calculation_inputs_hash: string
          created_at?: string
          expires_at: string
          final_price: number
          is_valid?: boolean
          last_minute_discount?: number | null
          lodgify_property_id?: number | null
          lodgify_room_type_id?: number | null
          nights_duration?: number | null
          property_internal_id: string
          seasonal_rate?: number | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          cache_id?: string
          calculated_at?: string
          calculated_for_checkin?: string | null
          calculation_date?: string
          calculation_inputs_hash?: string
          created_at?: string
          expires_at?: string
          final_price?: number
          is_valid?: boolean
          last_minute_discount?: number | null
          lodgify_property_id?: number | null
          lodgify_room_type_id?: number | null
          nights_duration?: number | null
          property_internal_id?: string
          seasonal_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_cache_property_internal_id_fkey"
            columns: ["property_internal_id"]
            isOneToOne: false
            referencedRelation: "current_discount_status"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "price_cache_property_internal_id_fkey"
            columns: ["property_internal_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          base_price_per_day: number
          created_at: string | null
          id: string
          lodgify_property_id: string
          lodgify_room_type_id: number | null
          min_price_per_day: number
          property_name: string
          updated_at: string | null
        }
        Insert: {
          base_price_per_day: number
          created_at?: string | null
          id?: string
          lodgify_property_id: string
          lodgify_room_type_id?: number | null
          min_price_per_day: number
          property_name: string
          updated_at?: string | null
        }
        Update: {
          base_price_per_day?: number
          created_at?: string | null
          id?: string
          lodgify_property_id?: string
          lodgify_room_type_id?: number | null
          min_price_per_day?: number
          property_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_operations: {
        Row: {
          api_error_message: string | null
          api_request_id: string | null
          api_response_body: Json | null
          api_response_status: number | null
          attempt_number: number
          completed_at: string | null
          created_at: string
          date_range_end: string
          date_range_start: string
          duration_ms: number | null
          lodgify_property_id: number | null
          lodgify_room_type_id: number | null
          max_attempts: number
          next_retry_at: string | null
          operation_id: string
          operation_status: string
          operation_type: string
          payload_size_bytes: number | null
          price_records_count: number | null
          property_internal_id: string
          started_at: string | null
          total_days: number
          updated_at: string
        }
        Insert: {
          api_error_message?: string | null
          api_request_id?: string | null
          api_response_body?: Json | null
          api_response_status?: number | null
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          date_range_end: string
          date_range_start: string
          duration_ms?: number | null
          lodgify_property_id?: number | null
          lodgify_room_type_id?: number | null
          max_attempts?: number
          next_retry_at?: string | null
          operation_id?: string
          operation_status?: string
          operation_type: string
          payload_size_bytes?: number | null
          price_records_count?: number | null
          property_internal_id: string
          started_at?: string | null
          total_days: number
          updated_at?: string
        }
        Update: {
          api_error_message?: string | null
          api_request_id?: string | null
          api_response_body?: Json | null
          api_response_status?: number | null
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          date_range_end?: string
          date_range_start?: string
          duration_ms?: number | null
          lodgify_property_id?: number | null
          lodgify_room_type_id?: number | null
          max_attempts?: number
          next_retry_at?: string | null
          operation_id?: string
          operation_status?: string
          operation_type?: string
          payload_size_bytes?: number | null
          price_records_count?: number | null
          property_internal_id?: string
          started_at?: string | null
          total_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_operations_property_internal_id_fkey"
            columns: ["property_internal_id"]
            isOneToOne: false
            referencedRelation: "current_discount_status"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "sync_operations_property_internal_id_fkey"
            columns: ["property_internal_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_discount_strategies: {
        Row: {
          activation_window: number | null
          created_at: string | null
          curve_type: string | null
          max_discount_percent: number | null
          min_discount_percent: number | null
          property_id: string | null
          property_name: string | null
          rule_count: number | null
          strategy_id: string | null
          strategy_name: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Relationships: []
      }
      active_lodgify_integrations: {
        Row: {
          api_key_created_at: string | null
          api_key_expires_at: string | null
          api_key_hash: string | null
          api_key_last_used_at: string | null
          api_key_usage_count: number | null
          base_price_per_day: number | null
          created_at: string | null
          created_by: string | null
          encrypted_api_key: string | null
          encryption_version: number | null
          integration_id: string | null
          integration_name: string | null
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          lodgify_config: Json | null
          lodgify_property_id: string | null
          min_price_per_day: number | null
          property_id: string | null
          property_name: string | null
          security_notes: string | null
          sync_config: Json | null
          updated_at: string | null
          updated_by: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lodgify_integrations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "current_discount_status"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "lodgify_integrations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_summary: {
        Row: {
          arrival_date: string | null
          booking_id: string | null
          booking_status: string | null
          created_at: string | null
          departure_date: string | null
          guest_name: string | null
          internal_booking_id: string | null
          nights: number | null
          price_per_night: number | null
          property_id: string | null
          property_name: string | null
          total_price: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      current_discount_status: {
        Row: {
          active_strategies: number | null
          active_strategy_names: string | null
          discount_status: string | null
          max_discount_available: number | null
          property_code: string | null
          property_id: string | null
          property_name: string | null
          total_strategies: number | null
        }
        Relationships: []
      }
      discount_rule_details: {
        Row: {
          applicable_days: Json | null
          applicable_days_text: string | null
          created_at: string | null
          days_before_checkin: number | null
          discount_percent: number | null
          min_nights: number | null
          property_name: string | null
          rule_id: string | null
          strategy_name: string | null
        }
        Relationships: []
      }
      lodgify_integration_summary: {
        Row: {
          api_key_expiry_status: string | null
          api_key_status: string | null
          auto_sync_enabled: string | null
          created_at: string | null
          integration_id: string | null
          integration_name: string | null
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_status: string | null
          lodgify_property_id: string | null
          property_id: string | null
          property_name: string | null
          sync_frequency: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lodgify_integrations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "current_discount_status"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "lodgify_integrations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_pricing: {
        Row: {
          adjusted_price: number | null
          base_price_per_day: number | null
          discount_rate: number | null
          end_date: string | null
          final_price: number | null
          min_price_per_day: number | null
          property_id: string | null
          property_name: string | null
          rate_id: string | null
          rate_name: string | null
          start_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_discount_to_all_properties: {
        Args: { p_strategy_id: string }
        Returns: number
      }
      calculate_daily_price: {
        Args: { p_date: string; p_property_id: string }
        Returns: number
      }
      calculate_final_price: {
        Args: { p_check_date: string; p_nights: number; p_property_id: string }
        Returns: {
          base_price: number
          final_price_per_night: number
          last_minute_discount: number
          min_price_enforced: boolean
          seasonal_adjustment: number
          total_price: number
        }[]
      }
      check_booking_conflict: {
        Args: {
          p_arrival_date: string
          p_departure_date: string
          p_exclude_booking_id?: string
          p_property_id: string
        }
        Returns: boolean
      }
      copy_discount_strategy: {
        Args: { p_new_name: string; p_strategy_id: string }
        Returns: string
      }
      create_lodgify_integration: {
        Args: {
          p_api_key?: string
          p_integration_name?: string
          p_lodgify_config?: Json
          p_property_id: string
          p_sync_config?: Json
        }
        Returns: string
      }
      decrypt_api_key: {
        Args: { p_encrypted_data: string; p_master_key?: string }
        Returns: string
      }
      encrypt_api_key: {
        Args: { p_api_key: string; p_master_key?: string }
        Returns: string
      }
      generate_all_lodgify_curl_commands: {
        Args: { p_api_key?: string }
        Returns: {
          curl_command: string
          lodgify_property_id: string
          property_name: string
        }[]
      }
      generate_encryption_key: {
        Args: { master_key: string }
        Returns: string
      }
      generate_lodgify_curl_command: {
        Args: {
          p_additional_guests_starts_from?: number
          p_api_key?: string
          p_max_stay?: number
          p_min_stay?: number
          p_price_per_additional_guest?: number
          p_property_id: string
        }
        Returns: string
      }
      generate_lodgify_pricing_data: {
        Args: {
          p_additional_guests_starts_from?: number
          p_max_stay?: number
          p_min_stay?: number
          p_price_per_additional_guest?: number
          p_property_id: string
        }
        Returns: {
          additional_guests_starts_from: number
          end_date: string
          is_default: boolean
          max_stay: number
          min_stay: number
          price_per_additional_guest: number
          price_per_day: number
          property_id: string
          room_type_id: number
          start_date: string
        }[]
      }
      get_api_key: {
        Args: { p_integration_id: string; p_master_key?: string }
        Returns: string
      }
      get_global_strategies: {
        Args: Record<PropertyKey, never>
        Returns: {
          activation_window: number
          curve_type: string
          is_active: boolean
          max_discount: number
          min_discount: number
          rule_count: number
          strategy_id: string
          strategy_name: string
        }[]
      }
      get_last_minute_discount: {
        Args:
          | {
              p_check_date: string
              p_days_before_checkin: number
              p_nights: number
              p_property_id: string
            }
          | {
              p_check_date: string
              p_days_before_checkin: number
              p_nights: number
              p_property_id: string
            }
          | {
              p_check_date?: string
              p_days_before_checkin: number
              p_nights?: number
              p_property_id: string
            }
        Returns: number
      }
      hash_api_key: {
        Args: { p_api_key: string }
        Returns: string
      }
      preview_pricing_calendar: {
        Args: {
          p_end_date: string
          p_nights: number
          p_property_id: string
          p_start_date: string
        }
        Returns: {
          base_price: number
          check_date: string
          days_from_today: number
          final_price_per_night: number
          last_minute_discount_percent: number
          min_price_enforced: boolean
          savings_amount: number
          savings_percent: number
          seasonal_adjustment_percent: number
          total_price: number
        }[]
      }
      remove_all_discounts: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      store_api_key: {
        Args: {
          p_api_key: string
          p_expires_at?: string
          p_integration_id: string
          p_master_key?: string
        }
        Returns: boolean
      }
      update_sync_status: {
        Args: { p_error?: string; p_integration_id: string; p_status: string }
        Returns: boolean
      }
      validate_discount_rules: {
        Args: { p_strategy_id: string }
        Returns: {
          conflict_day: number
          conflict_details: string
          rule_count: number
        }[]
      }
      verify_api_key: {
        Args: { p_api_key: string; p_integration_id: string }
        Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const