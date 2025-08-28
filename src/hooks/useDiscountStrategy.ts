import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DiscountStrategyFormData } from '../schemas/discountStrategySchema';
import { handleDatabaseError, DatabaseError } from '../utils/discountErrorHandling';
import type { DiscountStrategy, DiscountRule } from '../types/database.types';

interface UseDiscountStrategyReturn {
  createStrategy: (data: DiscountStrategyFormData) => Promise<DiscountStrategy>;
  updateStrategy: (id: string, data: Partial<DiscountStrategyFormData>) => Promise<DiscountStrategy>;
  deleteStrategy: (id: string) => Promise<void>;
  duplicateStrategy: (id: string, newName: string) => Promise<DiscountStrategy>;
  applyGlobalTemplate: (strategyId: string) => Promise<number>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useDiscountStrategy = (): UseDiscountStrategyReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const createStrategy = useCallback(async (strategyData: DiscountStrategyFormData): Promise<DiscountStrategy> => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Create discount strategy
      const { data: strategy, error: strategyError } = await supabase
        .from('discount_strategies')
        .insert({
          strategy_name: strategyData.strategy_name,
          property_internal_id: strategyData.property_internal_id || null,
          activation_window: strategyData.activation_window,
          min_discount: strategyData.min_discount,
          max_discount: strategyData.max_discount,
          curve_type: strategyData.curve_type,
          is_active: strategyData.is_active ?? true,
          valid_from: strategyData.valid_from || null,
          valid_until: strategyData.valid_until || null
        })
        .select()
        .single();
        
      if (strategyError) {
        throw handleDatabaseError(strategyError, 'Strategy creation');
      }

      if (!strategy) {
        throw new DatabaseError('Strategy creation returned no data');
      }
      
      // 2. Create discount rules if any exist
      if (strategyData.discount_rules && strategyData.discount_rules.length > 0) {
        const rulesData = strategyData.discount_rules.map(rule => ({
          strategy_id: strategy.strategy_id,
          days_before_checkin: rule.days_before_checkin,
          discount_percentage: rule.discount_percentage,
          min_nights: rule.min_nights || null,
          applicable_days: rule.applicable_days || null
        }));
        
        const { error: rulesError } = await supabase
          .from('discount_rules')
          .insert(rulesData);
          
        if (rulesError) {
          // Rollback strategy creation on rules failure
          await supabase
            .from('discount_strategies')
            .delete()
            .eq('strategy_id', strategy.strategy_id);
            
          throw handleDatabaseError(rulesError, 'Discount rules creation');
        }
      }
      
      return strategy;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStrategy = useCallback(async (
    strategyId: string,
    strategyData: Partial<DiscountStrategyFormData>
  ): Promise<DiscountStrategy> => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Update strategy basic info if provided
      const updateData: any = {};
      
      if (strategyData.strategy_name !== undefined) updateData.strategy_name = strategyData.strategy_name;
      if (strategyData.property_internal_id !== undefined) updateData.property_internal_id = strategyData.property_internal_id;
      if (strategyData.activation_window !== undefined) updateData.activation_window = strategyData.activation_window;
      if (strategyData.min_discount !== undefined) updateData.min_discount = strategyData.min_discount;
      if (strategyData.max_discount !== undefined) updateData.max_discount = strategyData.max_discount;
      if (strategyData.curve_type !== undefined) updateData.curve_type = strategyData.curve_type;
      if (strategyData.is_active !== undefined) updateData.is_active = strategyData.is_active;
      if (strategyData.valid_from !== undefined) updateData.valid_from = strategyData.valid_from;
      if (strategyData.valid_until !== undefined) updateData.valid_until = strategyData.valid_until;
      
      const { data: strategy, error: strategyError } = await supabase
        .from('discount_strategies')
        .update(updateData)
        .eq('strategy_id', strategyId)
        .select()
        .single();
        
      if (strategyError) {
        throw handleDatabaseError(strategyError, 'Strategy update');
      }

      if (!strategy) {
        throw new DatabaseError('Strategy update returned no data');
      }
      
      // 2. Update rules if provided
      if (strategyData.discount_rules !== undefined) {
        // Delete existing rules
        const { error: deleteError } = await supabase
          .from('discount_rules')
          .delete()
          .eq('strategy_id', strategyId);
          
        if (deleteError) {
          throw handleDatabaseError(deleteError, 'Removing existing rules');
        }
        
        // Insert new rules
        if (strategyData.discount_rules.length > 0) {
          const rulesData = strategyData.discount_rules.map(rule => ({
            strategy_id: strategyId,
            days_before_checkin: rule.days_before_checkin,
            discount_percentage: rule.discount_percentage,
            min_nights: rule.min_nights || null,
            applicable_days: rule.applicable_days || null
          }));
          
          const { error: rulesError } = await supabase
            .from('discount_rules')
            .insert(rulesData);
            
          if (rulesError) {
            throw handleDatabaseError(rulesError, 'Creating new rules');
          }
        }
      }
      
      return strategy;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteStrategy = useCallback(async (strategyId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      // Rules will be cascade deleted due to foreign key constraint
      const { error: deleteError } = await supabase
        .from('discount_strategies')
        .delete()
        .eq('strategy_id', strategyId);
        
      if (deleteError) {
        throw handleDatabaseError(deleteError, 'Strategy deletion');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const duplicateStrategy = useCallback(async (strategyId: string, newName: string): Promise<DiscountStrategy> => {
    setLoading(true);
    setError(null);
    
    try {
      // Use database function for duplication
      const { data, error: duplicateError } = await supabase
        .rpc('copy_discount_strategy', {
          p_strategy_id: strategyId,
          p_new_name: newName
        });
        
      if (duplicateError) {
        throw handleDatabaseError(duplicateError, 'Strategy duplication');
      }

      if (!data) {
        throw new DatabaseError('Strategy duplication returned no data');
      }
      
      // Fetch the full strategy data
      const { data: strategy, error: fetchError } = await supabase
        .from('discount_strategies')
        .select('*')
        .eq('strategy_id', data)
        .single();
        
      if (fetchError || !strategy) {
        throw handleDatabaseError(fetchError || new Error('Strategy not found'), 'Fetching duplicated strategy');
      }
      
      return strategy;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const applyGlobalTemplate = useCallback(async (strategyId: string): Promise<number> => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: applyError } = await supabase
        .rpc('apply_discount_to_all_properties', {
          p_strategy_id: strategyId
        });
        
      if (applyError) {
        throw handleDatabaseError(applyError, 'Applying global template');
      }
      
      return data || 0;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createStrategy,
    updateStrategy,
    deleteStrategy,
    duplicateStrategy,
    applyGlobalTemplate,
    loading,
    error,
    clearError
  };
};

// Hook for fetching discount strategies
export const useFetchDiscountStrategies = () => {
  const [strategies, setStrategies] = useState<DiscountStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStrategies = useCallback(async (propertyId?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('discount_strategies')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (propertyId) {
        // Get strategies for specific property or global templates
        query = query.or(`property_internal_id.eq.${propertyId},property_internal_id.is.null`);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) {
        throw handleDatabaseError(fetchError, 'Fetching strategies');
      }
      
      setStrategies(data || []);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGlobalStrategies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .rpc('get_global_strategies');
      
      if (fetchError) {
        throw handleDatabaseError(fetchError, 'Fetching global strategies');
      }
      
      setStrategies((data || []).map(strategy => ({
        ...strategy,
        property_internal_id: null, // RPC doesn't return this field
        created_at: '', // RPC doesn't return this field 
        updated_at: '' // RPC doesn't return this field
      })));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    strategies,
    loading,
    error,
    fetchStrategies,
    fetchGlobalStrategies
  };
};

// Hook for fetching discount rules for a strategy
export const useFetchDiscountRules = () => {
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async (strategyId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('discount_rules')
        .select('*')
        .eq('strategy_id', strategyId)
        .order('days_before_checkin', { ascending: true });
      
      if (fetchError) {
        throw handleDatabaseError(fetchError, 'Fetching discount rules');
      }
      
      setRules(data || []);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    rules,
    loading,
    error,
    fetchRules
  };
};