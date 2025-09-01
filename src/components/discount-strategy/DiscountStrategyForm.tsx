import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { discountStrategySchema, DiscountStrategyFormData } from '../../schemas/discountStrategySchema';
import { useDiscountStrategy } from '../../hooks/useDiscountStrategy';
import { usePricingPreview } from '../../hooks/usePricingPreview';
import { useProperties } from '../../hooks/useProperties';
import { formatErrorMessage } from '../../utils/discountErrorHandling';
import PropertySelection from '../PropertySelection/PropertySelection';
import DiscountRulesEditor from './DiscountRulesEditor';
import PricingPreview from './PricingPreview';
import type { DiscountStrategy, DiscountRule, Property } from '../../types/database.types';
import './DiscountStrategyForm.css';

interface DiscountStrategyFormProps {
  existingStrategy?: DiscountStrategy;
  existingRules?: DiscountRule[];
  onSave: (strategyId: string) => void;
  onCancel: () => void;
  selectedProperty?: Property;
  loading?: boolean;
  error?: string | null;
}

const DiscountStrategyForm: React.FC<DiscountStrategyFormProps> = ({
  existingStrategy,
  existingRules,
  onSave,
  onCancel,
  selectedProperty,
  loading: externalLoading = false,
  error: externalError = null
}) => {
  const { properties, loading: propertiesLoading } = useProperties();
  const { createStrategy, updateStrategy, loading: strategyLoading, error: strategyError } = useDiscountStrategy();
  const { previewData, loading: previewLoading, error: previewError, calculatePreview } = usePricingPreview();
  
  const [previewDate, setPreviewDate] = useState(new Date());
  const [previewNights, setPreviewNights] = useState(3);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  
  const form = useForm<DiscountStrategyFormData>({
    resolver: yupResolver(discountStrategySchema) as any,
    defaultValues: existingStrategy ? {
      strategy_name: existingStrategy.strategy_name,
      property_internal_id: existingStrategy.property_internal_id,
      activation_window: existingStrategy.activation_window,
      min_discount: existingStrategy.min_discount,
      max_discount: existingStrategy.max_discount,
      curve_type: existingStrategy.curve_type as 'aggressive' | 'moderate' | 'gentle',
      is_active: existingStrategy.is_active,
      valid_from: existingStrategy.valid_from,
      valid_until: existingStrategy.valid_until,
      discount_rules: existingRules || []
    } : {
      strategy_name: '',
      property_internal_id: selectedProperty?.id || null,
      activation_window: 14,
      min_discount: 0.05,
      max_discount: 0.30,
      curve_type: 'moderate',
      is_active: true,
      valid_from: null,
      valid_until: null,
      discount_rules: []
    },
    mode: 'onChange'
  });

  const { 
    control, 
    handleSubmit, 
    watch, 
    formState: { errors, isValid, isDirty }, 
    reset
  } = form;

  const watchedPropertyId = watch('property_internal_id');
  const watchedRules = watch('discount_rules');

  // Update preview when form changes
  useEffect(() => {
    const propertyId = watchedPropertyId || selectedProperty?.lodgify_property_id;
    if (propertyId && watchedRules) {
      // Map form rules to DiscountRule format for preview
      const mappedRules = watchedRules.map(rule => ({
        rule_id: '',
        strategy_id: '',
        days_before_checkin: rule.days_before_checkin,
        discount_percentage: rule.discount_percentage,
        min_nights: rule.min_nights,
        applicable_days: rule.applicable_days,
        created_at: null,
        updated_at: null
      } as DiscountRule));
      
      // Use lodgify_property_id for the database function
      const targetPropertyId = properties.find(p => p.id === propertyId)?.lodgify_property_id;
      if (targetPropertyId) {
        calculatePreview(targetPropertyId, previewDate, previewNights, mappedRules);
      }
    }
  }, [watchedPropertyId, watchedRules, previewDate, previewNights, properties, selectedProperty]);

  const onSubmit = async (data: DiscountStrategyFormData) => {
    try {
      let strategyId: string;
      
      if (existingStrategy) {
        const updated = await updateStrategy(existingStrategy.strategy_id, data);
        strategyId = updated.strategy_id;
      } else {
        const created = await createStrategy(data);
        strategyId = created.strategy_id;
      }
      
      onSave(strategyId);
    } catch (error) {
      console.error('Failed to save strategy:', error);
    }
  };

  const handleReset = () => {
    if (existingStrategy) {
      reset({
        strategy_name: existingStrategy.strategy_name,
        property_internal_id: existingStrategy.property_internal_id,
        activation_window: existingStrategy.activation_window,
        min_discount: existingStrategy.min_discount,
        max_discount: existingStrategy.max_discount,
        curve_type: existingStrategy.curve_type as 'aggressive' | 'moderate' | 'gentle',
        is_active: existingStrategy.is_active,
        valid_from: existingStrategy.valid_from,
        valid_until: existingStrategy.valid_until,
        discount_rules: existingRules || []
      });
    } else {
      reset();
    }
  };

  const handlePreviewDateChange = useCallback((date: Date) => {
    setPreviewDate(date);
  }, []);

  const handlePreviewNightsChange = useCallback((nights: number) => {
    setPreviewNights(nights);
  }, []);

  const handleRulesChange = useCallback(() => {
    // Preview will update automatically via watch
  }, []);

  const handlePreviewUpdate = useCallback(() => {
    // Force preview recalculation
    const propertyId = watchedPropertyId || selectedProperty?.lodgify_property_id;
    if (propertyId && watchedRules) {
      const mappedRules = watchedRules.map(rule => ({
        rule_id: '',
        strategy_id: '',
        days_before_checkin: rule.days_before_checkin,
        discount_percentage: rule.discount_percentage,
        min_nights: rule.min_nights,
        applicable_days: rule.applicable_days,
        created_at: null,
        updated_at: null
      } as DiscountRule));
      
      const targetPropertyId = properties.find(p => p.id === propertyId)?.lodgify_property_id;
      if (targetPropertyId) {
        calculatePreview(targetPropertyId, previewDate, previewNights, mappedRules);
      }
    }
  }, [watchedPropertyId, watchedRules, previewDate, previewNights, properties, selectedProperty, calculatePreview]);

  const isLoading = externalLoading || strategyLoading || propertiesLoading;
  const errorMessage = externalError || strategyError;

  return (
    <div className="discount-strategy-form">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-header">
          <h2>{existingStrategy ? 'Edit Discount Strategy' : 'Create Discount Strategy'}</h2>
          <div className="form-actions">
            {isDirty && (
              <span className="form-dirty-indicator">Unsaved changes</span>
            )}
            <label className="auto-save-toggle">
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              />
              Auto-save
            </label>
          </div>
        </div>

        <div className="form-content">
          <div className="form-main">
            {/* Basic Configuration Section */}
            <div className="form-section">
              <h3>Basic Configuration</h3>
              
              <div className="form-group">
                <label htmlFor="strategy_name">Strategy Name *</label>
                <Controller
                  name="strategy_name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <input
                        {...field}
                        type="text"
                        className={`form-input ${fieldState.error ? 'form-input-error' : ''}`}
                        placeholder="e.g., Summer Last Minute Discounts"
                      />
                      {fieldState.error && (
                        <span className="form-error">{fieldState.error.message}</span>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="form-group">
                <label htmlFor="property_internal_id">Property Selection</label>
                <Controller
                  name="property_internal_id"
                  control={control}
                  render={({ field }) => (
                    <PropertySelection
                      value={field.value ?? null}
                      onChange={(propertyId) => field.onChange(propertyId)}
                      placeholder="Select property or create global template..."
                      disabled={propertiesLoading}
                      error={errors.property_internal_id?.message}
                      variant="enhanced"
                      showGlobalTemplate={true}
                    />
                  )}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="activation_window">Activation Window (days) *</label>
                  <Controller
                    name="activation_window"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <input
                          {...field}
                          type="number"
                          min="1"
                          max="365"
                          className={`form-input ${fieldState.error ? 'form-input-error' : ''}`}
                          placeholder="e.g., 14"
                        />
                        {fieldState.error && (
                          <span className="form-error">{fieldState.error.message}</span>
                        )}
                        <span className="form-hint">
                          Discounts apply within {field.value || 0} days of check-in
                        </span>
                      </>
                    )}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="curve_type">Curve Type *</label>
                  <Controller
                    name="curve_type"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <select
                          {...field}
                          className={`form-input ${fieldState.error ? 'form-input-error' : ''}`}
                        >
                          <option value="aggressive">Aggressive (Steeper discounts)</option>
                          <option value="moderate">Moderate (Balanced)</option>
                          <option value="gentle">Gentle (Conservative)</option>
                        </select>
                        {fieldState.error && (
                          <span className="form-error">{fieldState.error.message}</span>
                        )}
                      </>
                    )}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="min_discount">Minimum Discount *</label>
                  <Controller
                    name="min_discount"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <div className="percentage-input-group">
                          <input
                            {...field}
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            className={`form-input ${fieldState.error ? 'form-input-error' : ''}`}
                            placeholder="e.g., 0.05"
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              field.onChange(isNaN(value) ? '' : value);
                            }}
                          />
                          <span className="percentage-display">
                            {field.value ? `${(field.value * 100).toFixed(0)}%` : '0%'}
                          </span>
                        </div>
                        {fieldState.error && (
                          <span className="form-error">{fieldState.error.message}</span>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="max_discount">Maximum Discount *</label>
                  <Controller
                    name="max_discount"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <div className="percentage-input-group">
                          <input
                            {...field}
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            className={`form-input ${fieldState.error ? 'form-input-error' : ''}`}
                            placeholder="e.g., 0.30"
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              field.onChange(isNaN(value) ? '' : value);
                            }}
                          />
                          <span className="percentage-display">
                            {field.value ? `${(field.value * 100).toFixed(0)}%` : '0%'}
                          </span>
                        </div>
                        {fieldState.error && (
                          <span className="form-error">{fieldState.error.message}</span>
                        )}
                      </>
                    )}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <Controller
                    name="is_active"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <span>Strategy is Active</span>
                </label>
              </div>
            </div>

            {/* Discount Rules Section */}
            <DiscountRulesEditor
              control={control}
              errors={errors}
              watch={watch}
              onRulesChange={handleRulesChange}
              onPreviewUpdate={handlePreviewUpdate}
            />
          </div>

          {/* Preview Section */}
          <div className="form-sidebar">
            <PricingPreview
              previewData={previewData}
              loading={previewLoading}
              error={previewError}
              onDateChange={handlePreviewDateChange}
              onNightsChange={handlePreviewNightsChange}
              initialDate={previewDate}
              initialNights={previewNights}
            />
          </div>
        </div>

        {errorMessage && (
          <div className="form-error-message">
            {formatErrorMessage(errorMessage)}
          </div>
        )}

        <div className="form-footer">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-outline"
              disabled={isLoading}
            >
              Reset
            </button>
          )}
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading || !isValid}
          >
            {isLoading ? 'Saving...' : existingStrategy ? 'Update Strategy' : 'Create Strategy'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DiscountStrategyForm;