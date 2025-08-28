/**
 * DiscountStrategyPanel - Manage last-minute discount strategies
 * Configure discount strategies and apply to properties
 */

import React, { useState } from 'react'
import { useDiscountStrategies } from '@/hooks/useDiscountStrategies'
import type { DiscountStrategy, DiscountRule } from '@/types/database-aliases'
import type { 
  NewDiscountStrategy, 
  DiscountStrategyUpdate,
  NewDiscountRule 
} from '@/hooks/useDiscountStrategies'

interface DiscountStrategyPanelProps {
  propertyId?: string
  onStrategyChange?: () => void
}

/**
 * Strategy form for creating/editing discount strategies
 */
interface StrategyFormProps {
  initialStrategy?: DiscountStrategy
  onSubmit: (strategy: NewDiscountStrategy | DiscountStrategyUpdate, id?: string) => Promise<void>
  onCancel: () => void
}

const StrategyForm: React.FC<StrategyFormProps> = ({ initialStrategy, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    strategy_name: initialStrategy?.strategy_name || '',
    activation_window: initialStrategy?.activation_window || 30,
    min_discount: initialStrategy?.min_discount || 10,
    max_discount: initialStrategy?.max_discount || 50,
    curve_type: initialStrategy?.curve_type || 'moderate',
    is_active: initialStrategy?.is_active ?? true
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    
    try {
      // Validate discount range
      if (formData.min_discount > formData.max_discount) {
        throw new Error('Minimum discount cannot be greater than maximum discount')
      }
      
      await onSubmit(formData, initialStrategy?.strategy_id)
      onCancel() // Close form on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save strategy')
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="p-3 border rounded mb-3">
      <h5 className="mb-3">{initialStrategy ? 'Edit' : 'Create'} Discount Strategy</h5>
      
      {error && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} />
        </div>
      )}
      
      <div className="mb-3">
        <label htmlFor="strategy-name" className="form-label">Strategy Name</label>
        <input
          type="text"
          className="form-control"
          id="strategy-name"
          value={formData.strategy_name}
          onChange={(e) => setFormData({ ...formData, strategy_name: e.target.value })}
          required
          placeholder="e.g., Last Minute Summer, Early Bird Winter"
        />
      </div>
      
      
      
      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="min-discount" className="form-label">Minimum Discount</label>
          <div className="input-group">
            <input
              type="number"
              className="form-control"
              id="min-discount"
              value={formData.min_discount}
              onChange={(e) => setFormData({ ...formData, min_discount: parseInt(e.target.value) })}
              min="0"
              max="100"
              required
            />
            <span className="input-group-text">%</span>
          </div>
        </div>
        
        <div className="col-md-6 mb-3">
          <label htmlFor="max-discount" className="form-label">Maximum Discount</label>
          <div className="input-group">
            <input
              type="number"
              className="form-control"
              id="max-discount"
              value={formData.max_discount}
              onChange={(e) => setFormData({ ...formData, max_discount: parseInt(e.target.value) })}
              min="0"
              max="100"
              required
            />
            <span className="input-group-text">%</span>
          </div>
        </div>
      </div>
      
      <div className="mb-3">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="is-active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          />
          <label className="form-check-label" htmlFor="is-active">
            Active (strategy will be applied to properties)
          </label>
        </div>
      </div>
      
      <div className="d-flex gap-2">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Save Strategy'}
        </button>
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

/**
 * Rule list component for a strategy
 */
interface RuleListProps {
  strategyId: string
  rules: DiscountRule[]
  onAddRule: (rule: NewDiscountRule) => Promise<void>
  onDeleteRule: (ruleId: string) => Promise<void>
}

const RuleList: React.FC<RuleListProps> = ({ strategyId, rules, onAddRule, onDeleteRule }) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    days_before_checkin: 7,
    discount_percentage: 20,
    min_nights: undefined as number | undefined,
    max_nights: undefined as number | undefined
  })
  const [submitting, setSubmitting] = useState(false)
  
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      await onAddRule({
        strategy_id: strategyId,
        ...formData
      })
      setShowAddForm(false)
      setFormData({
        days_before_checkin: 7,
        discount_percentage: 20,
        min_nights: undefined,
        max_nights: undefined
      })
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <div className="ms-4 mt-2">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6>Discount Rules</h6>
        {!showAddForm && (
          <button 
            className="btn btn-sm btn-outline-primary"
            onClick={() => setShowAddForm(true)}
          >
            Add Rule
          </button>
        )}
      </div>
      
      {showAddForm && (
        <form onSubmit={handleAddRule} className="p-2 border rounded mb-2">
          <div className="row g-2">
            <div className="col-md-3">
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="Days before"
                value={formData.days_before_checkin}
                onChange={(e) => setFormData({ ...formData, days_before_checkin: parseInt(e.target.value) })}
                min="0"
                required
              />
            </div>
            <div className="col-md-3">
              <div className="input-group input-group-sm">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Discount"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) })}
                  min="0"
                  max="100"
                  required
                />
                <span className="input-group-text">%</span>
              </div>
            </div>
            <div className="col-md-2">
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="Min nights"
                value={formData.min_nights || ''}
                onChange={(e) => setFormData({ ...formData, min_nights: e.target.value ? parseInt(e.target.value) : undefined })}
                min="1"
              />
            </div>
            <div className="col-md-2">
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="Max nights"
                value={formData.max_nights || ''}
                onChange={(e) => setFormData({ ...formData, max_nights: e.target.value ? parseInt(e.target.value) : undefined })}
                min="1"
              />
            </div>
            <div className="col-md-2">
              <div className="btn-group btn-group-sm">
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  Save
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowAddForm(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
      
      {rules.length === 0 ? (
        <p className="text-muted small mb-0">No rules defined. Add rules to specify discounts.</p>
      ) : (
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Days Before</th>
              <th>Discount</th>
              <th>Nights</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(rule => (
              <tr key={rule.rule_id}>
                <td>{rule.days_before_checkin}</td>
                <td>{rule.discount_percentage}%</td>
                <td>
                  {rule.min_nights ? (
                    <>
                      {rule.min_nights}+ nights
                    </>
                  ) : (
                    'Any'
                  )}
                </td>
                <td>
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onDeleteRule(rule.rule_id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/**
 * Strategy list item component
 */
interface StrategyListItemProps {
  strategy: DiscountStrategy
  rules: DiscountRule[]
  currentPropertyId?: string
  onEdit: () => void
  onDelete: () => void
  onApply: () => void
  onApplyAll: () => void
  onAddRule: (rule: NewDiscountRule) => Promise<void>
  onDeleteRule: (ruleId: string) => Promise<void>
}

const StrategyListItem: React.FC<StrategyListItemProps> = ({ 
  strategy, 
  rules,
  currentPropertyId,
  onEdit, 
  onDelete,
  onApply,
  onApplyAll,
  onAddRule,
  onDeleteRule
}) => {
  const [expanded, setExpanded] = useState(false)
  const [applying, setApplying] = useState(false)
  
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this discount strategy?')) {
      return
    }
    onDelete()
  }
  
  const handleApply = async () => {
    setApplying(true)
    try {
      await onApply()
    } finally {
      setApplying(false)
    }
  }
  
  const handleApplyAll = async () => {
    if (!window.confirm('Apply this strategy to ALL properties?')) {
      return
    }
    setApplying(true)
    try {
      await onApplyAll()
    } finally {
      setApplying(false)
    }
  }
  
  return (
    <div className="list-group-item">
      <div className="d-flex justify-content-between align-items-start">
        <div className="flex-grow-1">
          <div className="d-flex align-items-center gap-2 mb-1">
            <h6 className="mb-0">{strategy.strategy_name}</h6>
            {strategy.is_active ? (
              <span className="badge bg-success">Active</span>
            ) : (
              <span className="badge bg-secondary">Inactive</span>
            )}
          </div>
          <div className="small">
            <span className="me-3">
              <strong>Window:</strong> {strategy.activation_window} days
            </span>
            <span>
              <strong>Range:</strong> {strategy.min_discount}-{strategy.max_discount}%
            </span>
          </div>
        </div>
        <div className="btn-group btn-group-sm">
          <button 
            className="btn btn-outline-secondary"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide' : 'Show'} Rules
          </button>
          <button 
            className="btn btn-outline-secondary"
            onClick={onEdit}
          >
            Edit
          </button>
          {currentPropertyId && (
            <button 
              className="btn btn-outline-primary"
              onClick={handleApply}
              disabled={applying || !strategy.is_active}
            >
              Apply
            </button>
          )}
          <button 
            className="btn btn-outline-warning"
            onClick={handleApplyAll}
            disabled={applying || !strategy.is_active}
          >
            Apply to All
          </button>
          <button 
            className="btn btn-outline-danger"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </div>
      
      {expanded && (
        <RuleList
          strategyId={strategy.strategy_id}
          rules={rules}
          onAddRule={onAddRule}
          onDeleteRule={onDeleteRule}
        />
      )}
    </div>
  )
}

/**
 * Main DiscountStrategyPanel component
 */
const DiscountStrategyPanel: React.FC<DiscountStrategyPanelProps> = ({ 
  propertyId,
  onStrategyChange 
}) => {
  const {
    strategies,
    rules,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    applyToProperty,
    applyToAllProperties,
    addRule,
    deleteRule,
    loading,
    error,
    clearError
  } = useDiscountStrategies()
  
  const [showForm, setShowForm] = useState(false)
  const [editingStrategy, setEditingStrategy] = useState<DiscountStrategy | null>(null)
  
  const handleSubmit = async (strategy: NewDiscountStrategy | DiscountStrategyUpdate, id?: string) => {
    if (id) {
      await updateStrategy(id, strategy as DiscountStrategyUpdate)
    } else {
      await createStrategy(strategy as NewDiscountStrategy)
    }
    
    setShowForm(false)
    setEditingStrategy(null)
    
    if (onStrategyChange) {
      onStrategyChange()
    }
  }
  
  const handleEdit = (strategy: DiscountStrategy) => {
    setEditingStrategy(strategy)
    setShowForm(true)
  }
  
  const handleDelete = async (id: string) => {
    await deleteStrategy(id)
    if (onStrategyChange) {
      onStrategyChange()
    }
  }
  
  const handleApply = async (strategyId: string) => {
    if (!propertyId) return
    await applyToProperty(strategyId, propertyId)
    if (onStrategyChange) {
      onStrategyChange()
    }
  }
  
  const handleApplyAll = async (strategyId: string) => {
    await applyToAllProperties(strategyId)
    if (onStrategyChange) {
      onStrategyChange()
    }
  }
  
  const handleCancel = () => {
    setShowForm(false)
    setEditingStrategy(null)
  }
  
  return (
    <div className="discount-strategy-panel">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Last-Minute Discount Strategies</h4>
        {!showForm && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            Create Strategy
          </button>
        )}
      </div>
      
      {error && (
        <div className="alert alert-danger alert-dismissible mb-3" role="alert">
          {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={clearError}
          />
        </div>
      )}
      
      {showForm && (
        <StrategyForm
          initialStrategy={editingStrategy || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
      
      {loading ? (
        <div className="text-center p-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading strategies...</span>
          </div>
        </div>
      ) : strategies.length === 0 ? (
        <div className="alert alert-info">
          <h5 className="alert-heading">No Discount Strategies</h5>
          <p className="mb-0">
            Create discount strategies to automatically apply last-minute discounts based on booking proximity.
          </p>
        </div>
      ) : (
        <div className="list-group">
          {strategies.map(strategy => (
            <StrategyListItem
              key={strategy.strategy_id}
              strategy={strategy}
              rules={rules.get(strategy.strategy_id) || []}
              currentPropertyId={propertyId}
              onEdit={() => handleEdit(strategy)}
              onDelete={() => handleDelete(strategy.strategy_id)}
              onApply={() => handleApply(strategy.strategy_id)}
              onApplyAll={() => handleApplyAll(strategy.strategy_id)}
              onAddRule={addRule}
              onDeleteRule={deleteRule}
            />
          ))}
        </div>
      )}
      
      <div className="mt-3 text-muted small">
        <p className="mb-1">
          <strong>How it works:</strong> Discount strategies apply automatically when bookings are made within the activation window.
        </p>
        <ul className="mb-0">
          <li>Define rules to specify discount percentages at different days before check-in</li>
          <li>Rules can be limited to specific stay lengths using min/max nights</li>
          <li>The most specific matching rule will be applied</li>
          <li>Discounts never reduce prices below the property's minimum price</li>
        </ul>
      </div>
    </div>
  )
}

export default DiscountStrategyPanel