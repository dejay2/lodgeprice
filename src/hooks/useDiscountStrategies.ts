/**
 * useDiscountStrategies - Hook for managing discount strategies
 * Handles discount strategy CRUD and application to properties
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { DiscountStrategy, DiscountRule } from '@/types/database-aliases'
import { usePricingContext } from '@/context/PricingContext'

/**
 * New discount strategy input
 */
export interface NewDiscountStrategy {
  strategy_name: string
  activation_window: number
  min_discount: number
  max_discount: number
  curve_type: string
  is_active: boolean
}

/**
 * Discount strategy update parameters
 */
export interface DiscountStrategyUpdate {
  strategy_name?: string
  activation_window?: number
  min_discount?: number
  max_discount?: number
  curve_type?: string
  is_active?: boolean
}

/**
 * Discount rule for a strategy
 */
export interface NewDiscountRule {
  strategy_id: string
  days_before_checkin: number
  discount_percentage: number
  min_nights?: number
  max_nights?: number
}

/**
 * Hook return type for discount strategy management
 */
export interface UseDiscountStrategies {
  strategies: DiscountStrategy[]
  rules: Map<string, DiscountRule[]>
  createStrategy: (strategy: NewDiscountStrategy) => Promise<DiscountStrategy>
  updateStrategy: (id: string, updates: DiscountStrategyUpdate) => Promise<void>
  deleteStrategy: (id: string) => Promise<void>
  applyToProperty: (strategyId: string, propertyId: string) => Promise<void>
  applyToAllProperties: (strategyId: string) => Promise<void>
  removeFromProperty: (propertyId: string) => Promise<void>
  addRule: (rule: NewDiscountRule) => Promise<void>
  deleteRule: (ruleId: string) => Promise<void>
  refreshStrategies: () => Promise<void>
  loading: boolean
  error: string | null
  clearError: () => void
}

/**
 * Custom hook for discount strategy management
 */
export function useDiscountStrategies(): UseDiscountStrategies {
  const [strategies, setStrategies] = useState<DiscountStrategy[]>([])
  const [rules, setRules] = useState<Map<string, DiscountRule[]>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { refreshCalendarData } = usePricingContext()
  
  /**
   * Fetch all discount strategies and their rules
   */
  const refreshStrategies = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch strategies
      const { data: strategiesData, error: strategiesError } = await supabase
        .from('discount_strategies')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (strategiesError) {
        throw new Error(strategiesError.message)
      }
      
      setStrategies(strategiesData || [])
      
      // Fetch rules for all strategies
      if (strategiesData && strategiesData.length > 0) {
        const strategyIds = strategiesData.map(s => s.strategy_id)
        
        const { data: rulesData, error: rulesError } = await supabase
          .from('discount_rules')
          .select('*')
          .in('strategy_id', strategyIds)
          .order('days_before_checkin', { ascending: false })
        
        if (rulesError) {
          throw new Error(rulesError.message)
        }
        
        // Group rules by strategy
        const rulesMap = new Map<string, DiscountRule[]>()
        if (rulesData) {
          for (const rule of rulesData) {
            const strategyRules = rulesMap.get(rule.strategy_id) || []
            strategyRules.push(rule)
            rulesMap.set(rule.strategy_id, strategyRules)
          }
        }
        setRules(rulesMap)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load discount strategies'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  /**
   * Create a new discount strategy
   */
  const createStrategy = useCallback(async (strategy: NewDiscountStrategy): Promise<DiscountStrategy> => {
    setLoading(true)
    setError(null)
    
    try {
      // Validate discount percentages
      if (strategy.min_discount < 0 || strategy.min_discount > 100) {
        throw new Error('Minimum discount must be between 0% and 100%')
      }
      if (strategy.max_discount < 0 || strategy.max_discount > 100) {
        throw new Error('Maximum discount must be between 0% and 100%')
      }
      if (strategy.min_discount > strategy.max_discount) {
        throw new Error('Minimum discount cannot be greater than maximum discount')
      }
      
      // Insert new strategy
      const { data, error: dbError } = await supabase
        .from('discount_strategies')
        .insert([strategy])
        .select()
        .single()
      
      if (dbError) {
        throw new Error(dbError.message)
      }
      
      // Update local state
      setStrategies(prev => [data, ...prev])
      
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create discount strategy'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])
  
  /**
   * Update an existing discount strategy
   */
  const updateStrategy = useCallback(async (id: string, updates: DiscountStrategyUpdate) => {
    setLoading(true)
    setError(null)
    
    try {
      // Validate discount percentages if provided
      if (updates.min_discount !== undefined) {
        if (updates.min_discount < 0 || updates.min_discount > 100) {
          throw new Error('Minimum discount must be between 0% and 100%')
        }
      }
      if (updates.max_discount !== undefined) {
        if (updates.max_discount < 0 || updates.max_discount > 100) {
          throw new Error('Maximum discount must be between 0% and 100%')
        }
      }
      
      // Update strategy in database
      const { data, error: dbError } = await supabase
        .from('discount_strategies')
        .update(updates)
        .eq('strategy_id', id)
        .select()
        .single()
      
      if (dbError) {
        throw new Error(dbError.message)
      }
      
      // Update local state
      setStrategies(prev => prev.map(s => s.strategy_id === id ? data : s))
      
      // Refresh calendar if strategy is active
      if (data.is_active) {
        await refreshCalendarData()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update discount strategy'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [refreshCalendarData])
  
  /**
   * Delete a discount strategy
   */
  const deleteStrategy = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Delete strategy (rules will cascade delete)
      const { error: dbError } = await supabase
        .from('discount_strategies')
        .delete()
        .eq('strategy_id', id)
      
      if (dbError) {
        throw new Error(dbError.message)
      }
      
      // Update local state
      setStrategies(prev => prev.filter(s => s.strategy_id !== id))
      setRules(prev => {
        const newRules = new Map(prev)
        newRules.delete(id)
        return newRules
      })
      
      // Refresh calendar to remove discounts
      await refreshCalendarData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete discount strategy'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [refreshCalendarData])
  
  /**
   * Apply discount strategy to a specific property
   */
  const applyToProperty = useCallback(async (strategyId: string, propertyId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Update property with discount strategy
      const { error: dbError } = await supabase
        .from('properties')
        .update({ active_discount_strategy_id: strategyId })
        .eq('lodgify_property_id', propertyId)
      
      if (dbError) {
        throw new Error(dbError.message)
      }
      
      // Refresh calendar to show new discounts
      await refreshCalendarData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply discount strategy'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [refreshCalendarData])
  
  /**
   * Apply discount strategy to all properties
   */
  const applyToAllProperties = useCallback(async (strategyId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Call database function to apply to all properties
      const { error: dbError } = await supabase.rpc('apply_discount_to_all_properties', {
        p_strategy_id: strategyId
      })
      
      if (dbError) {
        throw new Error(dbError.message)
      }
      
      // Refresh calendar to show new discounts
      await refreshCalendarData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply discount to all properties'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [refreshCalendarData])
  
  /**
   * Remove discount strategy from a property
   */
  const removeFromProperty = useCallback(async (propertyId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Clear discount strategy from property
      const { error: dbError } = await supabase
        .from('properties')
        .update({ active_discount_strategy_id: null })
        .eq('lodgify_property_id', propertyId)
      
      if (dbError) {
        throw new Error(dbError.message)
      }
      
      // Refresh calendar to remove discounts
      await refreshCalendarData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove discount strategy'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [refreshCalendarData])
  
  /**
   * Add a rule to a discount strategy
   */
  const addRule = useCallback(async (rule: NewDiscountRule) => {
    setLoading(true)
    setError(null)
    
    try {
      // Validate rule
      if (rule.discount_percentage < 0 || rule.discount_percentage > 100) {
        throw new Error('Discount percentage must be between 0% and 100%')
      }
      
      // Insert new rule
      const { data, error: dbError } = await supabase
        .from('discount_rules')
        .insert([rule])
        .select()
        .single()
      
      if (dbError) {
        throw new Error(dbError.message)
      }
      
      // Update local state
      setRules(prev => {
        const newRules = new Map(prev)
        const strategyRules = newRules.get(rule.strategy_id) || []
        strategyRules.push(data)
        strategyRules.sort((a, b) => b.days_before_checkin - a.days_before_checkin)
        newRules.set(rule.strategy_id, strategyRules)
        return newRules
      })
      
      // Refresh calendar if strategy is active
      const strategy = strategies.find(s => s.strategy_id === rule.strategy_id)
      if (strategy?.is_active) {
        await refreshCalendarData()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add discount rule'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [strategies, refreshCalendarData])
  
  /**
   * Delete a discount rule
   */
  const deleteRule = useCallback(async (ruleId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Get rule to find strategy ID
      const allRules = Array.from(rules.values()).flat()
      const rule = allRules.find(r => r.rule_id === ruleId)
      
      if (!rule) {
        throw new Error('Rule not found')
      }
      
      // Delete rule from database
      const { error: dbError } = await supabase
        .from('discount_rules')
        .delete()
        .eq('rule_id', ruleId)
      
      if (dbError) {
        throw new Error(dbError.message)
      }
      
      // Update local state
      setRules(prev => {
        const newRules = new Map(prev)
        const strategyRules = newRules.get(rule.strategy_id) || []
        newRules.set(rule.strategy_id, strategyRules.filter(r => r.rule_id !== ruleId))
        return newRules
      })
      
      // Refresh calendar if strategy is active
      const strategy = strategies.find(s => s.strategy_id === rule.strategy_id)
      if (strategy?.is_active) {
        await refreshCalendarData()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete discount rule'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [rules, strategies, refreshCalendarData])
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  /**
   * Load strategies on mount
   */
  useEffect(() => {
    refreshStrategies()
  }, [refreshStrategies])
  
  return {
    strategies,
    rules,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    applyToProperty,
    applyToAllProperties,
    removeFromProperty,
    addRule,
    deleteRule,
    refreshStrategies,
    loading,
    error,
    clearError
  }
}