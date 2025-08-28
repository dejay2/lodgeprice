// Rule template generation utilities
export type CurveType = 'aggressive' | 'moderate' | 'gentle';

export interface RuleTemplate {
  days: number;
  discount: number;
}

export interface DiscountRuleData {
  days_before_checkin: number;
  discount_percentage: number;
  min_nights: number | null;
  applicable_days: any | null;
}

// Predefined templates for different curve types
const curveTemplates: Record<CurveType, RuleTemplate[]> = {
  aggressive: [
    { days: 1, discount: 0.30 },
    { days: 2, discount: 0.28 },
    { days: 3, discount: 0.25 },
    { days: 5, discount: 0.22 },
    { days: 7, discount: 0.20 },
    { days: 10, discount: 0.18 },
    { days: 14, discount: 0.15 },
    { days: 21, discount: 0.12 },
    { days: 30, discount: 0.10 }
  ],
  moderate: [
    { days: 1, discount: 0.20 },
    { days: 2, discount: 0.18 },
    { days: 3, discount: 0.15 },
    { days: 5, discount: 0.12 },
    { days: 7, discount: 0.10 },
    { days: 10, discount: 0.08 },
    { days: 14, discount: 0.05 },
    { days: 21, discount: 0.03 },
    { days: 30, discount: 0.02 }
  ],
  gentle: [
    { days: 1, discount: 0.10 },
    { days: 2, discount: 0.09 },
    { days: 3, discount: 0.08 },
    { days: 5, discount: 0.07 },
    { days: 7, discount: 0.05 },
    { days: 10, discount: 0.04 },
    { days: 14, discount: 0.03 },
    { days: 21, discount: 0.02 },
    { days: 30, discount: 0.01 }
  ]
};

/**
 * Generate discount rules based on curve type and activation window
 * @param curveType The type of discount curve (aggressive, moderate, gentle)
 * @param maxDays The maximum days before check-in (activation window)
 * @param minDiscount Optional minimum discount to enforce
 * @param maxDiscount Optional maximum discount to enforce
 * @returns Array of discount rule data
 */
export const generateRulesByCurveType = (
  curveType: CurveType,
  maxDays: number,
  minDiscount?: number,
  maxDiscount?: number
): DiscountRuleData[] => {
  const templates = curveTemplates[curveType];
  
  return templates
    .filter(rule => rule.days <= maxDays)
    .map(rule => {
      let discountPercentage = rule.discount;
      
      // Apply min/max constraints if provided
      if (minDiscount !== undefined && discountPercentage < minDiscount) {
        discountPercentage = minDiscount;
      }
      if (maxDiscount !== undefined && discountPercentage > maxDiscount) {
        discountPercentage = maxDiscount;
      }
      
      return {
        days_before_checkin: rule.days,
        discount_percentage: discountPercentage,
        min_nights: null,
        applicable_days: null
      };
    });
};

/**
 * Generate a linear discount curve
 * @param maxDays The maximum days before check-in
 * @param minDiscount The minimum discount percentage
 * @param maxDiscount The maximum discount percentage
 * @param steps Number of rule steps to generate
 * @returns Array of discount rule data
 */
export const generateLinearDiscountRules = (
  maxDays: number,
  minDiscount: number,
  maxDiscount: number,
  steps: number = 5
): DiscountRuleData[] => {
  if (steps < 2) steps = 2;
  
  const rules: DiscountRuleData[] = [];
  const dayInterval = Math.floor(maxDays / (steps - 1));
  const discountInterval = (minDiscount - maxDiscount) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    const days = i === 0 ? 1 : Math.min(i * dayInterval, maxDays);
    const discount = maxDiscount + (i * discountInterval);
    
    rules.push({
      days_before_checkin: days,
      discount_percentage: Math.round(discount * 10000) / 10000, // Round to 4 decimals
      min_nights: null,
      applicable_days: null
    });
  }
  
  return rules;
};

/**
 * Generate exponential discount curve (steeper at the end)
 * @param maxDays The maximum days before check-in
 * @param minDiscount The minimum discount percentage
 * @param maxDiscount The maximum discount percentage
 * @param steps Number of rule steps to generate
 * @returns Array of discount rule data
 */
export const generateExponentialDiscountRules = (
  maxDays: number,
  minDiscount: number,
  maxDiscount: number,
  steps: number = 5
): DiscountRuleData[] => {
  if (steps < 2) steps = 2;
  
  const rules: DiscountRuleData[] = [];
  
  for (let i = 0; i < steps; i++) {
    const dayRatio = i / (steps - 1);
    const days = i === 0 ? 1 : Math.floor(dayRatio * dayRatio * maxDays);
    
    // Exponential curve for discount
    const discountRatio = Math.pow(1 - dayRatio, 2);
    const discount = minDiscount + (maxDiscount - minDiscount) * discountRatio;
    
    rules.push({
      days_before_checkin: days,
      discount_percentage: Math.round(discount * 10000) / 10000,
      min_nights: null,
      applicable_days: null
    });
  }
  
  return rules;
};

/**
 * Validate that rules don't have duplicate days
 * @param rules Array of discount rules to validate
 * @returns True if all days are unique, false otherwise
 */
export const validateUniqueRuleDays = (rules: DiscountRuleData[]): boolean => {
  const days = rules.map(rule => rule.days_before_checkin);
  return days.length === new Set(days).size;
};

/**
 * Sort rules by days before check-in (ascending)
 * @param rules Array of discount rules to sort
 * @returns Sorted array of rules
 */
export const sortRulesByDays = (rules: DiscountRuleData[]): DiscountRuleData[] => {
  return [...rules].sort((a, b) => a.days_before_checkin - b.days_before_checkin);
};

/**
 * Merge new rules with existing ones, replacing duplicates
 * @param existingRules Current rules
 * @param newRules Rules to merge in
 * @returns Merged array with unique days
 */
export const mergeRules = (
  existingRules: DiscountRuleData[],
  newRules: DiscountRuleData[]
): DiscountRuleData[] => {
  const ruleMap = new Map<number, DiscountRuleData>();
  
  // Add existing rules first
  existingRules.forEach(rule => {
    ruleMap.set(rule.days_before_checkin, rule);
  });
  
  // Override with new rules
  newRules.forEach(rule => {
    ruleMap.set(rule.days_before_checkin, rule);
  });
  
  return sortRulesByDays(Array.from(ruleMap.values()));
};