import React, { useState } from 'react';
import { useFieldArray, Control, FieldErrors, UseFormWatch } from 'react-hook-form';
import { DiscountStrategyFormData } from '../../schemas/discountStrategySchema';
import RuleItem from './RuleItem';
import { 
  generateRulesByCurveType, 
  generateLinearDiscountRules,
  generateExponentialDiscountRules,
  mergeRules,
  CurveType 
} from '../../utils/ruleTemplates';
import './DiscountRulesEditor.css';

interface DiscountRulesEditorProps {
  control: Control<DiscountStrategyFormData>;
  errors: FieldErrors<DiscountStrategyFormData>;
  watch: UseFormWatch<DiscountStrategyFormData>;
  onRulesChange?: (rules: any[]) => void;
  onPreviewUpdate?: () => void;
}

const DiscountRulesEditor: React.FC<DiscountRulesEditorProps> = ({
  control,
  errors,
  watch,
  onRulesChange,
  onPreviewUpdate
}) => {
  const { fields, append, remove, move, replace } = useFieldArray({
    control,
    name: 'discount_rules'
  });
  
  const [templateType, setTemplateType] = useState<'curve' | 'linear' | 'exponential'>('curve');
  const [steps, setSteps] = useState(5);
  
  const activationWindow = watch('activation_window') || 7;
  const minDiscount = watch('min_discount') || 0.05;
  const maxDiscount = watch('max_discount') || 0.30;
  const curveType = watch('curve_type') || 'moderate';

  const handleAddRule = () => {
    const newRule = {
      days_before_checkin: Math.min(fields.length + 1, activationWindow),
      discount_percentage: Math.min(maxDiscount, Math.max(minDiscount, 0.10)),
      min_nights: null,
      applicable_days: null
    };
    
    append(newRule);
    // Note: fields will be updated after append, so we use the new rule directly
    onRulesChange?.([...fields, newRule]);
    onPreviewUpdate?.();
  };

  const handleRemoveRule = (index: number) => {
    remove(index);
    const newRules = fields.filter((_, i) => i !== index);
    onRulesChange?.(newRules);
    onPreviewUpdate?.();
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      move(index, index - 1);
      onPreviewUpdate?.();
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < fields.length - 1) {
      move(index, index + 1);
      onPreviewUpdate?.();
    }
  };

  const handleGenerateFromTemplate = () => {
    let newRules;
    
    switch (templateType) {
      case 'curve':
        newRules = generateRulesByCurveType(
          curveType as CurveType,
          activationWindow,
          minDiscount,
          maxDiscount
        );
        break;
      case 'linear':
        newRules = generateLinearDiscountRules(
          activationWindow,
          minDiscount,
          maxDiscount,
          steps
        );
        break;
      case 'exponential':
        newRules = generateExponentialDiscountRules(
          activationWindow,
          minDiscount,
          maxDiscount,
          steps
        );
        break;
      default:
        return;
    }
    
    // Merge with existing rules or replace entirely
    const shouldMerge = fields.length > 0 && 
      window.confirm('Merge with existing rules? (No will replace all rules)');
    
    if (shouldMerge) {
      // Convert fields to compatible format for merging
      const existingRules = fields.map(f => ({
        days_before_checkin: f.days_before_checkin,
        discount_percentage: f.discount_percentage,
        min_nights: f.min_nights ?? null,
        applicable_days: f.applicable_days ?? null
      }));
      const merged = mergeRules(existingRules, newRules);
      replace(merged);
      onRulesChange?.(merged);
    } else {
      replace(newRules);
      onRulesChange?.(newRules);
    }
    
    onPreviewUpdate?.();
  };

  const handleClearAll = () => {
    if (fields.length === 0) return;
    
    if (window.confirm('Are you sure you want to remove all rules?')) {
      replace([]);
      onRulesChange?.([]);
      onPreviewUpdate?.();
    }
  };

  return (
    <div className="discount-rules-editor">
      <div className="rules-editor-header">
        <h3>Discount Rules</h3>
        <div className="rules-editor-actions">
          <button
            type="button"
            onClick={handleAddRule}
            className="btn btn-primary"
            disabled={activationWindow <= 0}
          >
            + Add Rule
          </button>
          
          <div className="template-generator">
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as any)}
              className="template-select"
            >
              <option value="curve">Curve Template ({curveType})</option>
              <option value="linear">Linear Progression</option>
              <option value="exponential">Exponential Curve</option>
            </select>
            
            {(templateType === 'linear' || templateType === 'exponential') && (
              <input
                type="number"
                min="2"
                max="10"
                value={steps}
                onChange={(e) => setSteps(parseInt(e.target.value) || 5)}
                className="steps-input"
                placeholder="Steps"
              />
            )}
            
            <button
              type="button"
              onClick={handleGenerateFromTemplate}
              className="btn btn-secondary"
              disabled={activationWindow <= 0}
            >
              Generate from Template
            </button>
          </div>
          
          {fields.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="btn btn-danger"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
      
      {fields.length === 0 ? (
        <div className="rules-empty-state">
          <p>No discount rules defined yet.</p>
          <p className="rules-empty-hint">
            Add rules individually or generate them from a template to define 
            how discounts change based on days before check-in.
          </p>
        </div>
      ) : (
        <div className="rules-list">
          {fields.map((field, index) => (
            <RuleItem
              key={field.id}
              index={index}
              control={control}
              onRemove={handleRemoveRule}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              error={errors.discount_rules?.[index] as any}
              activationWindow={activationWindow}
              isFirst={index === 0}
              isLast={index === fields.length - 1}
            />
          ))}
        </div>
      )}
      
      {errors.discount_rules && typeof errors.discount_rules === 'object' && 'message' in errors.discount_rules && (
        <div className="rules-error">
          {errors.discount_rules.message}
        </div>
      )}
      
      {fields.length > 0 && (
        <div className="rules-summary">
          <p className="rules-count">
            {fields.length} rule{fields.length !== 1 ? 's' : ''} defined
          </p>
          {activationWindow && fields.some(f => f.days_before_checkin > activationWindow) && (
            <p className="rules-warning">
              Warning: Some rules exceed the activation window of {activationWindow} days
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DiscountRulesEditor;