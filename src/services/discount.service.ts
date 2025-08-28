/**
 * Discount Service
 * Manages discount strategies and rules
 */

import { supabase } from '@/lib/supabase'
import {
  DatabaseError,
  ValidationError,
  DISCOUNT_CURVES,
} from '@/types/helpers'
import type {
  GlobalStrategy,
} from '@/types/helpers'
import type { Database } from '@/types/database.generated'

type DiscountStrategyRow = Database['public']['Tables']['discount_strategies']['Row']
type DiscountStrategyInsert = Database['public']['Tables']['discount_strategies']['Insert']
type DiscountRuleRow = Database['public']['Tables']['discount_rules']['Row']

/**
 * Discount preview data
 */
export interface DiscountPreview {
  date: Date
  daysBeforeCheckin: number
  discountPercentage: number
  discountAmount: number
  finalPrice: number
}

/**
 * Main discount service class
 */
export class DiscountService {
  /**
   * Get all global discount strategies (templates)
   */
  async getGlobalStrategies(): Promise<GlobalStrategy[]> {
    try {
      const { data, error } = await supabase.rpc('get_global_strategies')
      
      if (error) {
        throw new DatabaseError(
          `Failed to fetch global strategies: ${error.message}`,
          'FETCH_GLOBAL_STRATEGIES',
          error
        )
      }
      
      return (data as GlobalStrategy[]) || []
    } catch (error) {
      return this.handleDiscountError(error, 'get-global-strategies')
    }
  }
  
  /**
   * Get discount strategies for a specific property
   */
  async getPropertyStrategies(propertyId: string): Promise<DiscountStrategyRow[]> {
    // Get property internal ID
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('lodgify_property_id', propertyId)
      .single()
    
    if (!property) {
      throw new ValidationError(`Property not found: ${propertyId}`)
    }
    
    try {
      const { data, error } = await supabase
        .from('discount_strategies')
        .select('*')
        .eq('property_internal_id', property.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new DatabaseError(
          `Failed to fetch property strategies: ${error.message}`,
          'FETCH_PROPERTY_STRATEGIES',
          error
        )
      }
      
      return (data as DiscountStrategyRow[]) || []
    } catch (error) {
      return this.handleDiscountError(error, 'get-property-strategies')
    }
  }
  
  /**
   * Apply a global strategy to all properties
   */
  async applyToAllProperties(strategyId: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('apply_discount_to_all_properties', {
        p_strategy_id: strategyId,
      })
      
      if (error) {
        throw new DatabaseError(
          `Failed to apply strategy to all properties: ${error.message}`,
          'APPLY_TO_ALL',
          error
        )
      }
      
      return data as number
    } catch (error) {
      return this.handleDiscountError(error, 'apply-to-all')
    }
  }
  
  /**
   * Copy an existing discount strategy
   */
  async copyStrategy(strategyId: string, newName: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('copy_discount_strategy', {
        p_strategy_id: strategyId,
        p_new_name: newName,
      })
      
      if (error) {
        throw new DatabaseError(
          `Failed to copy strategy: ${error.message}`,
          'COPY_STRATEGY',
          error
        )
      }
      
      return data as string
    } catch (error) {
      return this.handleDiscountError(error, 'copy-strategy')
    }
  }
  
  /**
   * Remove all active discounts
   */
  async removeAllDiscounts(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('remove_all_discounts')
      
      if (error) {
        throw new DatabaseError(
          `Failed to remove all discounts: ${error.message}`,
          'REMOVE_ALL_DISCOUNTS',
          error
        )
      }
      
      return data as number
    } catch (error) {
      return this.handleDiscountError(error, 'remove-all-discounts')
    }
  }
  
  /**
   * Create a new discount strategy
   */
  async createStrategy(
    strategy: Omit<DiscountStrategyInsert, 'strategy_id'>
  ): Promise<DiscountStrategyRow> {
    // Validate strategy parameters
    this.validateStrategy(strategy)
    
    try {
      const { data, error } = await supabase
        .from('discount_strategies')
        .insert(strategy)
        .select()
        .single()
      
      if (error) {
        throw new DatabaseError(
          `Failed to create strategy: ${error.message}`,
          'CREATE_STRATEGY',
          error
        )
      }
      
      return data as DiscountStrategyRow
    } catch (error) {
      return this.handleDiscountError(error, 'create-strategy')
    }
  }
  
  /**
   * Update a discount strategy
   */
  async updateStrategy(
    strategyId: string,
    updates: Partial<DiscountStrategyInsert>
  ): Promise<DiscountStrategyRow> {
    // Validate updates if discount ranges are being changed
    if (updates.min_discount !== undefined || updates.max_discount !== undefined) {
      const { data: current } = await supabase
        .from('discount_strategies')
        .select('min_discount, max_discount')
        .eq('strategy_id', strategyId)
        .single()
      
      const minDiscount = updates.min_discount ?? current?.min_discount ?? 0
      const maxDiscount = updates.max_discount ?? current?.max_discount ?? 0
      
      if (maxDiscount < minDiscount) {
        throw new ValidationError('Maximum discount must be greater than or equal to minimum discount')
      }
    }
    
    try {
      const { data, error } = await supabase
        .from('discount_strategies')
        .update(updates)
        .eq('strategy_id', strategyId)
        .select()
        .single()
      
      if (error) {
        throw new DatabaseError(
          `Failed to update strategy: ${error.message}`,
          'UPDATE_STRATEGY',
          error
        )
      }
      
      return data as DiscountStrategyRow
    } catch (error) {
      return this.handleDiscountError(error, 'update-strategy')
    }
  }
  
  /**
   * Delete a discount strategy
   */
  async deleteStrategy(strategyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('discount_strategies')
        .delete()
        .eq('strategy_id', strategyId)
      
      if (error) {
        throw new DatabaseError(
          `Failed to delete strategy: ${error.message}`,
          'DELETE_STRATEGY',
          error
        )
      }
    } catch (error) {
      return this.handleDiscountError(error, 'delete-strategy')
    }
  }
  
  /**
   * Get discount rules for a strategy
   */
  async getStrategyRules(strategyId: string): Promise<DiscountRuleRow[]> {
    try {
      const { data, error } = await supabase
        .from('discount_rules')
        .select('*')
        .eq('strategy_id', strategyId)
        .order('days_before_checkin', { ascending: false })
      
      if (error) {
        throw new DatabaseError(
          `Failed to fetch strategy rules: ${error.message}`,
          'FETCH_RULES',
          error
        )
      }
      
      return (data as DiscountRuleRow[]) || []
    } catch (error) {
      return this.handleDiscountError(error, 'get-rules')
    }
  }
  
  /**
   * Generate discount preview for a date range
   */
  async generatePreview(
    propertyId: string,
    strategyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DiscountPreview[]> {
    // Get strategy details
    const { data: strategy } = await supabase
      .from('discount_strategies')
      .select('*')
      .eq('strategy_id', strategyId)
      .single()
    
    if (!strategy) {
      throw new ValidationError('Strategy not found')
    }
    
    // Get base price for the property
    const { data: property } = await supabase
      .from('properties')
      .select('base_price_per_day')
      .eq('lodgify_property_id', propertyId)
      .single()
    
    if (!property) {
      throw new ValidationError('Property not found')
    }
    
    const basePrice = property.base_price_per_day
    const previews: DiscountPreview[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Generate preview for each date
    for (
      let date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const currentDate = new Date(date)
      const daysBeforeCheckin = Math.ceil(
        (currentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
      
      // Calculate discount based on curve type
      let discountPercentage = 0
      
      if (daysBeforeCheckin <= strategy.activation_window && daysBeforeCheckin >= 0) {
        const curveFunction = DISCOUNT_CURVES[strategy.curve_type as keyof typeof DISCOUNT_CURVES]
        
        if (curveFunction) {
          discountPercentage = curveFunction(
            daysBeforeCheckin,
            strategy.activation_window,
            strategy.min_discount,
            strategy.max_discount
          ) * 100
        }
      }
      
      const discountAmount = basePrice * (discountPercentage / 100)
      const finalPrice = Math.max(basePrice - discountAmount, 0)
      
      previews.push({
        date: currentDate,
        daysBeforeCheckin,
        discountPercentage,
        discountAmount,
        finalPrice,
      })
    }
    
    return previews
  }
  
  /**
   * Activate or deactivate a strategy
   */
  async toggleStrategy(strategyId: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('discount_strategies')
        .update({ is_active: isActive })
        .eq('strategy_id', strategyId)
      
      if (error) {
        throw new DatabaseError(
          `Failed to ${isActive ? 'activate' : 'deactivate'} strategy: ${error.message}`,
          'TOGGLE_STRATEGY',
          error
        )
      }
    } catch (error) {
      return this.handleDiscountError(error, 'toggle-strategy')
    }
  }
  
  /**
   * Private helper methods
   */
  
  private validateStrategy(strategy: Partial<DiscountStrategyInsert>): void {
    if (strategy.activation_window !== undefined) {
      if (strategy.activation_window < 1 || strategy.activation_window > 365) {
        throw new ValidationError('Activation window must be between 1 and 365 days')
      }
    }
    
    if (strategy.min_discount !== undefined) {
      if (strategy.min_discount < 0 || strategy.min_discount > 1) {
        throw new ValidationError('Minimum discount must be between 0% and 100%')
      }
    }
    
    if (strategy.max_discount !== undefined) {
      if (strategy.max_discount < 0 || strategy.max_discount > 1) {
        throw new ValidationError('Maximum discount must be between 0% and 100%')
      }
    }
    
    if (strategy.min_discount !== undefined && strategy.max_discount !== undefined) {
      if (strategy.max_discount < strategy.min_discount) {
        throw new ValidationError('Maximum discount must be greater than or equal to minimum discount')
      }
    }
    
    if (strategy.curve_type !== undefined) {
      if (!['aggressive', 'moderate', 'gentle'].includes(strategy.curve_type)) {
        throw new ValidationError('Invalid curve type')
      }
    }
    
    if (strategy.valid_from !== undefined && strategy.valid_until !== undefined) {
      if (strategy.valid_from && strategy.valid_until) {
        const from = new Date(strategy.valid_from)
        const until = new Date(strategy.valid_until)
        
        if (until < from) {
          throw new ValidationError('Valid until date must be after valid from date')
        }
      }
    }
  }
  
  private handleDiscountError(error: unknown, operation: string): never {
    if (error instanceof ValidationError || error instanceof DatabaseError) {
      throw error
    }
    
    if (error instanceof Error) {
      throw new DatabaseError(
        `Discount operation failed during ${operation}: ${error.message}`,
        'DISCOUNT_ERROR',
        error
      )
    }
    
    throw new DatabaseError(
      `Unknown error during ${operation}`,
      'UNKNOWN_ERROR',
      error
    )
  }
}

// Export singleton instance
export const discountService = new DiscountService()