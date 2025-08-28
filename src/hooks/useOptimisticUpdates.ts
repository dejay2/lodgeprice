import { useState, useCallback, useRef } from 'react';
import type { DiscountStrategy } from '../types/database.types';
import { DiscountStrategyFormData } from '../schemas/discountStrategySchema';
import { supabase } from '../lib/supabase';
import { handleDatabaseError } from '../utils/discountErrorHandling';

interface OptimisticState<T> {
  data: T | null;
  previousData: T | null;
  isOptimistic: boolean;
}

export const useOptimisticStrategyUpdate = () => {
  const [optimisticState, setOptimisticState] = useState<OptimisticState<DiscountStrategy>>({
    data: null,
    previousData: null,
    isOptimistic: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reference to track if we should rollback
  const shouldRollbackRef = useRef(false);

  const applyOptimisticUpdate = useCallback((updates: Partial<DiscountStrategy>) => {
    setOptimisticState(prev => ({
      data: prev.data ? { ...prev.data, ...updates } : null,
      previousData: prev.data,
      isOptimistic: true
    }));
  }, []);

  const rollbackOptimisticUpdate = useCallback(() => {
    setOptimisticState(prev => ({
      data: prev.previousData,
      previousData: null,
      isOptimistic: false
    }));
  }, []);

  const confirmOptimisticUpdate = useCallback((realData: DiscountStrategy) => {
    setOptimisticState({
      data: realData,
      previousData: null,
      isOptimistic: false
    });
  }, []);

  const updateWithOptimism = useCallback(async (
    strategyId: string,
    updates: Partial<DiscountStrategyFormData>,
    onSuccess?: (strategy: DiscountStrategy) => void,
    onError?: (error: Error) => void
  ) => {
    // Store original state for rollback
    shouldRollbackRef.current = false;
    setLoading(true);
    setError(null);
    
    // Apply optimistic update immediately
    const optimisticData = {
      strategy_id: strategyId,
      ...updates
    } as Partial<DiscountStrategy>;
    
    applyOptimisticUpdate(optimisticData);
    
    try {
      // Perform actual database update
      const { data: updatedStrategy, error: updateError } = await supabase
        .from('discount_strategies')
        .update({
          strategy_name: updates.strategy_name,
          property_internal_id: updates.property_internal_id,
          activation_window: updates.activation_window,
          min_discount: updates.min_discount,
          max_discount: updates.max_discount,
          curve_type: updates.curve_type,
          is_active: updates.is_active,
          valid_from: updates.valid_from,
          valid_until: updates.valid_until
        })
        .eq('strategy_id', strategyId)
        .select()
        .single();
        
      if (updateError) {
        shouldRollbackRef.current = true;
        throw handleDatabaseError(updateError, 'Strategy update');
      }

      if (!updatedStrategy) {
        shouldRollbackRef.current = true;
        throw new Error('Strategy update returned no data');
      }
      
      // Confirm with real data from database
      confirmOptimisticUpdate(updatedStrategy);
      onSuccess?.(updatedStrategy);
      
      return updatedStrategy;
      
    } catch (err) {
      // Rollback optimistic update on failure
      if (shouldRollbackRef.current) {
        rollbackOptimisticUpdate();
      }
      
      const errorObj = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(errorObj.message);
      onError?.(errorObj);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [applyOptimisticUpdate, confirmOptimisticUpdate, rollbackOptimisticUpdate]);

  const clearError = useCallback(() => setError(null), []);

  return {
    optimisticData: optimisticState.data,
    isOptimistic: optimisticState.isOptimistic,
    loading,
    error,
    updateWithOptimism,
    applyOptimisticUpdate,
    rollbackOptimisticUpdate,
    confirmOptimisticUpdate,
    clearError
  };
};

// Generic optimistic update hook
export const useOptimisticUpdate = <T extends { [key: string]: any }>() => {
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  const [previousData, setPreviousData] = useState<T | null>(null);
  const [isOptimistic, setIsOptimistic] = useState(false);

  const applyOptimistic = useCallback((data: T) => {
    setPreviousData(optimisticData);
    setOptimisticData(data);
    setIsOptimistic(true);
  }, [optimisticData]);

  const updateOptimistic = useCallback((updates: Partial<T>) => {
    setOptimisticData(prev => prev ? { ...prev, ...updates } : null);
    setIsOptimistic(true);
  }, []);

  const rollback = useCallback(() => {
    setOptimisticData(previousData);
    setPreviousData(null);
    setIsOptimistic(false);
  }, [previousData]);

  const confirm = useCallback((realData: T) => {
    setOptimisticData(realData);
    setPreviousData(null);
    setIsOptimistic(false);
  }, []);

  const reset = useCallback(() => {
    setOptimisticData(null);
    setPreviousData(null);
    setIsOptimistic(false);
  }, []);

  return {
    optimisticData,
    isOptimistic,
    applyOptimistic,
    updateOptimistic,
    rollback,
    confirm,
    reset
  };
};

// Hook for optimistic list updates (add, remove, update items)
export const useOptimisticList = <T extends { id: string | number }>() => {
  const [items, setItems] = useState<T[]>([]);
  const [previousItems, setPreviousItems] = useState<T[]>([]);
  const [isOptimistic, setIsOptimistic] = useState(false);

  const addOptimistic = useCallback((item: T) => {
    setPreviousItems(items);
    setItems(prev => [...prev, item]);
    setIsOptimistic(true);
  }, [items]);

  const removeOptimistic = useCallback((id: string | number) => {
    setPreviousItems(items);
    setItems(prev => prev.filter(item => item.id !== id));
    setIsOptimistic(true);
  }, [items]);

  const updateOptimistic = useCallback((id: string | number, updates: Partial<T>) => {
    setPreviousItems(items);
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
    setIsOptimistic(true);
  }, [items]);

  const rollback = useCallback(() => {
    setItems(previousItems);
    setPreviousItems([]);
    setIsOptimistic(false);
  }, [previousItems]);

  const confirm = useCallback((realItems: T[]) => {
    setItems(realItems);
    setPreviousItems([]);
    setIsOptimistic(false);
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setPreviousItems([]);
    setIsOptimistic(false);
  }, []);

  return {
    items,
    isOptimistic,
    addOptimistic,
    removeOptimistic,
    updateOptimistic,
    rollback,
    confirm,
    reset
  };
};