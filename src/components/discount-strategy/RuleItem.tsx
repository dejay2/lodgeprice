import React from 'react';
import { Controller, Control, FieldError } from 'react-hook-form';
import { DiscountStrategyFormData } from '../../schemas/discountStrategySchema';
import './RuleItem.css';

interface RuleItemProps {
  index: number;
  control: Control<DiscountStrategyFormData>;
  onRemove: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  error?: FieldError;
  activationWindow: number;
  isFirst: boolean;
  isLast: boolean;
}

const RuleItem: React.FC<RuleItemProps> = ({
  index,
  control,
  onRemove,
  onMoveUp,
  onMoveDown,
  error,
  activationWindow,
  isFirst,
  isLast
}) => {
  return (
    <div className="rule-item">
      <div className="rule-item-header">
        <span className="rule-item-number">Rule #{index + 1}</span>
        <div className="rule-item-actions">
          {!isFirst && onMoveUp && (
            <button
              type="button"
              onClick={() => onMoveUp(index)}
              className="rule-action-button"
              title="Move up"
            >
              ↑
            </button>
          )}
          {!isLast && onMoveDown && (
            <button
              type="button"
              onClick={() => onMoveDown(index)}
              className="rule-action-button"
              title="Move down"
            >
              ↓
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="rule-action-button rule-action-remove"
            title="Remove rule"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="rule-item-fields">
        <div className="rule-field">
          <label htmlFor={`discount_rules.${index}.days_before_checkin`}>
            Days Before Check-in
          </label>
          <Controller
            control={control}
            name={`discount_rules.${index}.days_before_checkin`}
            render={({ field, fieldState }) => (
              <>
                <input
                  {...field}
                  type="number"
                  min="0"
                  max={activationWindow}
                  className={`rule-input ${fieldState.error ? 'rule-input-error' : ''}`}
                  placeholder="e.g., 7"
                />
                {fieldState.error && (
                  <span className="rule-error-message">{fieldState.error.message}</span>
                )}
              </>
            )}
          />
        </div>
        
        <div className="rule-field">
          <label htmlFor={`discount_rules.${index}.discount_percentage`}>
            Discount Percentage
          </label>
          <Controller
            control={control}
            name={`discount_rules.${index}.discount_percentage`}
            render={({ field, fieldState }) => (
              <>
                <div className="rule-percentage-input">
                  <input
                    {...field}
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    className={`rule-input ${fieldState.error ? 'rule-input-error' : ''}`}
                    placeholder="e.g., 0.15"
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      field.onChange(isNaN(value) ? '' : value);
                    }}
                  />
                  <span className="rule-percentage-display">
                    {field.value ? `${(field.value * 100).toFixed(0)}%` : '0%'}
                  </span>
                </div>
                {fieldState.error && (
                  <span className="rule-error-message">{fieldState.error.message}</span>
                )}
              </>
            )}
          />
        </div>
        
        <div className="rule-field">
          <label htmlFor={`discount_rules.${index}.min_nights`}>
            Minimum Nights (Optional)
          </label>
          <Controller
            control={control}
            name={`discount_rules.${index}.min_nights`}
            render={({ field, fieldState }) => (
              <>
                <input
                  {...field}
                  type="number"
                  min="1"
                  className={`rule-input ${fieldState.error ? 'rule-input-error' : ''}`}
                  placeholder="No minimum"
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    field.onChange(value);
                  }}
                />
                {fieldState.error && (
                  <span className="rule-error-message">{fieldState.error.message}</span>
                )}
              </>
            )}
          />
        </div>
      </div>
      
      {error && (
        <div className="rule-item-error">
          {error.message}
        </div>
      )}
    </div>
  );
};

export default RuleItem;