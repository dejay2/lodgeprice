/**
 * SeasonalRatePanel - Manage seasonal rate adjustments
 * CRUD operations for date ranges with pricing adjustments
 */

import React, { useState } from 'react'
import { useSeasonalRates } from '@/hooks/useSeasonalRates'
import { PricingFormatters } from '@/types/pricing'
import type { SeasonalRate } from '@/types/database-aliases'
import type { NewSeasonalRate, SeasonalRateUpdate } from '@/hooks/useSeasonalRates'

interface SeasonalRatePanelProps {
  onRateChange?: () => void
}

/**
 * Rate form for adding/editing seasonal rates
 */
interface RateFormProps {
  initialRate?: SeasonalRate
  onSubmit: (rate: NewSeasonalRate | SeasonalRateUpdate, id?: string) => Promise<void>
  onCancel: () => void
}

const RateForm: React.FC<RateFormProps> = ({ initialRate, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    rate_name: initialRate?.rate_name || '',
    start_date: initialRate?.start_date || '',
    end_date: initialRate?.end_date || '',
    discount_rate: initialRate?.discount_rate || 0
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    
    try {
      // Validate dates
      if (formData.start_date > formData.end_date) {
        throw new Error('Start date must be before end date')
      }
      
      // Validate discount rate
      const discountPercentage = formData.discount_rate
      if (discountPercentage < -1 || discountPercentage > 1) {
        throw new Error('Discount rate must be between -100% and 100%')
      }
      
      await onSubmit(formData, initialRate?.rate_id)
      onCancel() // Close form on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rate')
    } finally {
      setSubmitting(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="p-3 border rounded mb-3">
      <h5 className="mb-3">{initialRate ? 'Edit' : 'Add'} Seasonal Rate</h5>
      
      {error && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} />
        </div>
      )}
      
      <div className="mb-3">
        <label htmlFor="rate-name" className="form-label">Rate Name</label>
        <input
          type="text"
          className="form-control"
          id="rate-name"
          value={formData.rate_name}
          onChange={(e) => setFormData({ ...formData, rate_name: e.target.value })}
          required
          placeholder="e.g., Summer Peak, Christmas Holiday"
        />
      </div>
      
      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="start-date" className="form-label">Start Date</label>
          <input
            type="date"
            className="form-control"
            id="start-date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>
        
        <div className="col-md-6 mb-3">
          <label htmlFor="end-date" className="form-label">End Date</label>
          <input
            type="date"
            className="form-control"
            id="end-date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            required
          />
        </div>
      </div>
      
      <div className="mb-3">
        <label htmlFor="discount-rate" className="form-label">
          Adjustment Rate (negative for discount, positive for increase)
        </label>
        <div className="input-group">
          <input
            type="number"
            className="form-control"
            id="discount-rate"
            value={formData.discount_rate * 100}
            onChange={(e) => setFormData({ ...formData, discount_rate: parseFloat(e.target.value) / 100 })}
            step="1"
            min="-100"
            max="100"
            required
          />
          <span className="input-group-text">%</span>
        </div>
        <div className="form-text">
          Examples: -20% for discount, 30% for peak season increase
        </div>
      </div>
      
      <div className="d-flex gap-2">
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : 'Save Rate'}
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
 * Rate list item component
 */
interface RateListItemProps {
  rate: SeasonalRate
  onEdit: () => void
  onDelete: () => void
}

const RateListItem: React.FC<RateListItemProps> = ({ rate, onEdit, onDelete }) => {
  const [deleting, setDeleting] = useState(false)
  
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this seasonal rate?')) {
      return
    }
    
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }
  
  const isDiscount = rate.discount_rate < 0
  const percentageText = PricingFormatters.percentage(Math.abs(rate.discount_rate))
  
  return (
    <div className="list-group-item">
      <div className="d-flex justify-content-between align-items-start">
        <div className="flex-grow-1">
          <h6 className="mb-1">{rate.rate_name}</h6>
          <p className="mb-1 text-muted">
            {new Date(rate.start_date).toLocaleDateString()} - {new Date(rate.end_date).toLocaleDateString()}
          </p>
          <span className={`badge ${isDiscount ? 'bg-danger' : 'bg-success'}`}>
            {isDiscount ? '-' : '+'}{percentageText}
          </span>
        </div>
        <div className="btn-group btn-group-sm">
          <button 
            className="btn btn-outline-secondary"
            onClick={onEdit}
            disabled={deleting}
          >
            Edit
          </button>
          <button 
            className="btn btn-outline-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Main SeasonalRatePanel component
 */
const SeasonalRatePanel: React.FC<SeasonalRatePanelProps> = ({ onRateChange }) => {
  const {
    rates,
    addRate,
    updateRate,
    deleteRate,
    loading,
    error,
    clearError
  } = useSeasonalRates()
  
  const [showForm, setShowForm] = useState(false)
  const [editingRate, setEditingRate] = useState<SeasonalRate | null>(null)
  
  const handleSubmit = async (rate: NewSeasonalRate | SeasonalRateUpdate, id?: string) => {
    if (id) {
      await updateRate(id, rate as SeasonalRateUpdate)
    } else {
      await addRate(rate as NewSeasonalRate)
    }
    
    setShowForm(false)
    setEditingRate(null)
    
    if (onRateChange) {
      onRateChange()
    }
  }
  
  const handleEdit = (rate: SeasonalRate) => {
    setEditingRate(rate)
    setShowForm(true)
  }
  
  const handleDelete = async (rate_id: string) => {
    await deleteRate(rate_id)
    if (onRateChange) {
      onRateChange()
    }
  }
  
  const handleCancel = () => {
    setShowForm(false)
    setEditingRate(null)
  }
  
  return (
    <div className="seasonal-rate-panel">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Seasonal Rate Adjustments</h4>
        {!showForm && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            Add Rate
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
        <RateForm
          initialRate={editingRate || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}
      
      {loading ? (
        <div className="text-center p-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading rates...</span>
          </div>
        </div>
      ) : rates.length === 0 ? (
        <div className="alert alert-info">
          <h5 className="alert-heading">No Seasonal Rates</h5>
          <p className="mb-0">
            Add seasonal rate adjustments to automatically modify pricing during specific date ranges.
          </p>
        </div>
      ) : (
        <div className="list-group">
          {rates.map(rate => (
            <RateListItem
              key={rate.rate_id}
              rate={rate}
              onEdit={() => handleEdit(rate)}
              onDelete={() => handleDelete(rate.rate_id)}
            />
          ))}
        </div>
      )}
      
      <div className="mt-3 text-muted small">
        <p className="mb-1">
          <strong>Note:</strong> Seasonal rates are applied on top of base prices.
        </p>
        <ul className="mb-0">
          <li>Negative percentages create discounts (e.g., -20% for off-season)</li>
          <li>Positive percentages increase prices (e.g., +30% for peak season)</li>
          <li>Date ranges cannot overlap - the system will prevent conflicts</li>
        </ul>
      </div>
    </div>
  )
}

export default SeasonalRatePanel