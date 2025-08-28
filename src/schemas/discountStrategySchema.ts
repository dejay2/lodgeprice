import * as yup from 'yup';

// Comprehensive validation schema matching database constraints exactly
export const discountStrategySchema = yup.object().shape({
  strategy_name: yup
    .string()
    .required('Strategy name is required')
    .min(1, 'Strategy name cannot be empty')
    .max(100, 'Strategy name must be less than 100 characters'),
    
  property_internal_id: yup
    .string()
    .nullable()
    .optional(), // null means global template
    
  activation_window: yup
    .number()
    .required('Activation window is required')
    .integer('Must be a whole number')
    .min(1, 'Must be at least 1 day')
    .max(365, 'Cannot exceed 365 days'),
    
  min_discount: yup
    .number()
    .required('Minimum discount is required')
    .min(0, 'Cannot be negative')
    .max(1, 'Cannot exceed 100%'),
    
  max_discount: yup
    .number()
    .required('Maximum discount is required')  
    .min(0, 'Cannot be negative')
    .max(1, 'Cannot exceed 100%')
    .test('max-gte-min', 'Maximum must be greater than or equal to minimum', function(value) {
      const minDiscount = this.parent.min_discount;
      return value === undefined || minDiscount === undefined || value >= minDiscount;
    }),
    
  curve_type: yup
    .string()
    .required('Curve type is required')
    .oneOf(['aggressive', 'moderate', 'gentle'], 'Invalid curve type'),
    
  is_active: yup
    .boolean()
    .default(true),
    
  valid_from: yup
    .string()
    .nullable()
    .optional(),
    
  valid_until: yup
    .string()
    .nullable()
    .optional()
    .test('valid-until-after-from', 'Valid until must be after valid from', function(value) {
      const validFrom = this.parent.valid_from;
      if (!value || !validFrom) return true;
      return new Date(value) >= new Date(validFrom);
    }),
    
  discount_rules: yup.array().of(
    yup.object().shape({
      days_before_checkin: yup
        .number()
        .required('Days before check-in is required')
        .integer('Must be a whole number')
        .min(0, 'Cannot be negative'),
      discount_percentage: yup
        .number()
        .required('Discount percentage is required')
        .min(0, 'Cannot be negative')
        .max(1, 'Cannot exceed 100%'),
      min_nights: yup
        .number()
        .nullable()
        .positive('Must be positive if specified')
        .integer('Must be whole number'),
      applicable_days: yup
        .mixed()
        .nullable()
    })
  ).test('unique-days', 'Duplicate days are not allowed', function(rules) {
    if (!rules || rules.length === 0) return true;
    const days = rules.map(rule => rule.days_before_checkin);
    return days.length === new Set(days).size;
  }).test('within-activation-window', 'Days must be within activation window', function(rules) {
    if (!rules || rules.length === 0) return true;
    const activationWindow = this.parent.activation_window;
    if (!activationWindow) return true;
    return rules.every(rule => rule.days_before_checkin <= activationWindow);
  })
});

// Type for form data matching the validation schema
export type DiscountStrategyFormData = yup.InferType<typeof discountStrategySchema>;