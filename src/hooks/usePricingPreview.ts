import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { handleDatabaseError } from '../utils/discountErrorHandling';
import type { DiscountRule } from '../types/database.types';

export interface PricePreview {
  originalPrice: number;
  seasonalAdjustment: number;
  discountAmount: number;
  discountPercentage: number;
  finalPrice: number;
  totalPrice: number;
  daysBeforeCheckin: number;
  applicableRule: DiscountRule | null;
  calculationDate: Date;
  nightCount: number;
  minPriceEnforced: boolean;
}

interface UsePricingPreviewReturn {
  previewData: PricePreview | null;
  loading: boolean;
  error: string | null;
  calculatePreview: (
    propertyId: string,
    checkDate: Date,
    nights: number,
    discountRules: DiscountRule[]
  ) => void;
  clearPreview: () => void;
}

// Debounce function
const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

export const usePricingPreview = (): UsePricingPreviewReturn => {
  const [previewData, setPreviewData] = useState<PricePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearPreview = useCallback(() => {
    setPreviewData(null);
    setError(null);
  }, []);

  const performCalculation = useCallback(async (
    propertyId: string,
    checkDate: Date,
    nights: number,
    discountRules: DiscountRule[]
  ) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      // Calculate days before checkin from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkDate.setHours(0, 0, 0, 0);
      
      const daysBeforeCheckin = Math.floor(
        (checkDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Format date for database function
      const formattedDate = checkDate.toISOString().split('T')[0];
      
      // Get base price calculation using database function
      const { data: baseCalc, error: baseError } = await supabase.rpc(
        'calculate_final_price',
        {
          p_property_id: propertyId,
          p_check_date: formattedDate,
          p_nights: nights
        }
      );
      
      if (baseError) {
        throw handleDatabaseError(baseError, 'Preview calculation');
      }

      if (!baseCalc) {
        throw new Error('No pricing data returned');
      }
      
      // Find applicable rule from the provided rules
      let applicableRule: DiscountRule | null = null;
      let simulatedDiscount = 0;
      
      if (discountRules && discountRules.length > 0) {
        // Find the rule that applies for the days before checkin
        const sortedRules = [...discountRules].sort(
          (a, b) => a.days_before_checkin - b.days_before_checkin
        );
        
        for (const rule of sortedRules) {
          if (daysBeforeCheckin <= rule.days_before_checkin) {
            applicableRule = rule;
            
            // Check if nights requirement is met
            if (rule.min_nights && nights < rule.min_nights) {
              applicableRule = null;
              continue;
            }
            
            // Check if day of week is applicable (if specified)
            if (rule.applicable_days && Array.isArray(rule.applicable_days)) {
              const dayOfWeek = checkDate.getDay();
              if (!rule.applicable_days.includes(dayOfWeek)) {
                applicableRule = null;
                continue;
              }
            }
            
            if (applicableRule) {
              simulatedDiscount = baseCalc.base_price * applicableRule.discount_percentage;
              break;
            }
          }
        }
      }
      
      // Calculate final price with simulated discount
      // Note: The database function doesn't return min_price directly, but we know it enforces it
      const finalPriceWithDiscount = Math.max(
        baseCalc.base_price + baseCalc.seasonal_adjustment - simulatedDiscount,
        0 // Will be enforced by database function
      );
      
      const minPriceEnforced = baseCalc.min_price_enforced;
      
      setPreviewData({
        originalPrice: baseCalc.base_price,
        seasonalAdjustment: baseCalc.seasonal_adjustment,
        discountAmount: simulatedDiscount,
        discountPercentage: applicableRule?.discount_percentage || 0,
        finalPrice: finalPriceWithDiscount,
        totalPrice: finalPriceWithDiscount * nights,
        daysBeforeCheckin,
        applicableRule,
        calculationDate: checkDate,
        nightCount: nights,
        minPriceEnforced
      });
      
    } catch (err) {
      // Don't set error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      setError(err instanceof Error ? err.message : 'Preview calculation failed');
      setPreviewData(null);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  // Create debounced version of the calculation function
  const debouncedCalculation = useMemo(
    () => debounce(performCalculation, 500),
    [performCalculation]
  );

  const calculatePreview = useCallback((
    propertyId: string,
    checkDate: Date,
    nights: number,
    discountRules: DiscountRule[]
  ) => {
    // Validate inputs
    if (!propertyId || !checkDate || nights < 1) {
      setError('Invalid preview parameters');
      return;
    }
    
    // Call debounced function
    debouncedCalculation(propertyId, checkDate, nights, discountRules);
  }, [debouncedCalculation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    previewData,
    loading,
    error,
    calculatePreview,
    clearPreview
  };
};

// Hook for comparing multiple pricing scenarios
export const usePricingComparison = () => {
  const [comparisons, setComparisons] = useState<PricePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compareScenarios = useCallback(async (
    propertyId: string,
    checkDates: Date[],
    nights: number,
    discountRules: DiscountRule[]
  ) => {
    setLoading(true);
    setError(null);
    setComparisons([]);
    
    try {
      const results: PricePreview[] = [];
      
      for (const checkDate of checkDates) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        checkDate.setHours(0, 0, 0, 0);
        
        const daysBeforeCheckin = Math.floor(
          (checkDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const formattedDate = checkDate.toISOString().split('T')[0];
        
        const { data: baseCalc, error: baseError } = await supabase.rpc(
          'calculate_final_price',
          {
            p_property_id: propertyId,
            p_check_date: formattedDate,
            p_nights: nights
          }
        );
        
        if (baseError) {
          console.error('Preview calculation error for date', formattedDate, baseError);
          continue;
        }

        if (!baseCalc) {
          continue;
        }
        
        // Find applicable rule
        let applicableRule: DiscountRule | null = null;
        let simulatedDiscount = 0;
        
        if (discountRules && discountRules.length > 0) {
          const sortedRules = [...discountRules].sort(
            (a, b) => a.days_before_checkin - b.days_before_checkin
          );
          
          for (const rule of sortedRules) {
            if (daysBeforeCheckin <= rule.days_before_checkin) {
              if (!rule.min_nights || nights >= rule.min_nights) {
                applicableRule = rule;
                simulatedDiscount = baseCalc.base_price * rule.discount_percentage;
                break;
              }
            }
          }
        }
        
        const finalPriceWithDiscount = Math.max(
          baseCalc.base_price + baseCalc.seasonal_adjustment - simulatedDiscount,
          0 // Will be enforced by database function
        );
        
        results.push({
          originalPrice: baseCalc.base_price,
          seasonalAdjustment: baseCalc.seasonal_adjustment,
          discountAmount: simulatedDiscount,
          discountPercentage: applicableRule?.discount_percentage || 0,
          finalPrice: finalPriceWithDiscount,
          totalPrice: finalPriceWithDiscount * nights,
          daysBeforeCheckin,
          applicableRule,
          calculationDate: checkDate,
          nightCount: nights,
          minPriceEnforced: baseCalc.min_price_enforced
        });
      }
      
      setComparisons(results);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison calculation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    comparisons,
    loading,
    error,
    compareScenarios
  };
};