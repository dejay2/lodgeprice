/**
 * SeasonalRateList - Table/list view component for seasonal rates
 * Provides sorting, filtering, and bulk selection capabilities
 */

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import type { SeasonalRate, FilterOptions, SortConfig } from './types/SeasonalRate'
import './SeasonalRateList.css'

interface SeasonalRateListProps {
  rates: SeasonalRate[]
  onEdit: (rate: SeasonalRate) => void
  onDelete: (id: string) => void
  onBulkDelete: (ids: string[]) => void
  isLoading?: boolean
}

export default function SeasonalRateList({
  rates,
  onEdit,
  onDelete,
  onBulkDelete,
  isLoading = false
}: SeasonalRateListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'start_date',
    direction: 'asc'
  })
  const [filters] = useState<FilterOptions>({})

  // Filter and sort rates
  const processedRates = useMemo(() => {
    let filtered = [...rates]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(rate =>
        rate.rate_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply date range filter
    if (filters.dateRange) {
      filtered = filtered.filter(rate =>
        rate.start_date >= filters.dateRange!.start &&
        rate.end_date <= filters.dateRange!.end
      )
    }

    // Apply rate adjustment filter
    if (filters.rateAdjustmentRange) {
      filtered = filtered.filter(rate =>
        rate.discount_rate >= filters.rateAdjustmentRange!.min &&
        rate.discount_rate <= filters.rateAdjustmentRange!.max
      )
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.field]
      const bValue = b[sortConfig.field]
      
      if (aValue == null || bValue == null) return 0
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [rates, searchTerm, filters, sortConfig])

  // Handle column sort
  const handleSort = (field: keyof SeasonalRate) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.size === processedRates.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(processedRates.map(r => r.rate_id)))
    }
  }

  // Handle individual selection
  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    
    const confirmMessage = `Are you sure you want to delete ${selectedIds.size} seasonal rate${selectedIds.size > 1 ? 's' : ''}?`
    if (confirm(confirmMessage)) {
      onBulkDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }

  // Format rate adjustment for display
  const formatRateAdjustment = (rate: number) => {
    const percentage = (rate * 100).toFixed(0)
    const isIncrease = rate > 0
    const isDecrease = rate < 0
    
    return (
      <span className={`rate-badge ${isIncrease ? 'rate-badge--increase' : isDecrease ? 'rate-badge--decrease' : 'rate-badge--neutral'}`}>
        {isIncrease ? '+' : ''}{percentage}%
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="seasonal-rate-list-loading">
        <div className="spinner"></div>
        <span>Loading seasonal rates...</span>
      </div>
    )
  }

  return (
    <div className="seasonal-rate-list">
      {/* Search and filter bar */}
      <div className="list-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search seasonal rates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        {selectedIds.size > 0 && (
          <div className="bulk-actions">
            <span className="selection-count">
              {selectedIds.size} selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="btn btn-danger btn-sm"
            >
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="seasonal-rate-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={processedRates.length > 0 && selectedIds.size === processedRates.length}
                  onChange={handleSelectAll}
                  aria-label="Select all"
                />
              </th>
              <th 
                onClick={() => handleSort('rate_name')}
                className="sortable"
              >
                Name
                {sortConfig.field === 'rate_name' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th 
                onClick={() => handleSort('start_date')}
                className="sortable"
              >
                Start Date
                {sortConfig.field === 'start_date' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th 
                onClick={() => handleSort('end_date')}
                className="sortable"
              >
                End Date
                {sortConfig.field === 'end_date' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th 
                onClick={() => handleSort('discount_rate')}
                className="sortable"
              >
                Rate Adjustment
                {sortConfig.field === 'discount_rate' && (
                  <span className="sort-indicator">
                    {sortConfig.direction === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
              <th className="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {processedRates.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-message">
                  {searchTerm || Object.keys(filters).length > 0
                    ? 'No seasonal rates match your filters'
                    : 'No seasonal rates defined yet'}
                </td>
              </tr>
            ) : (
              processedRates.map(rate => (
                <tr 
                  key={rate.rate_id}
                  className={rate.isOverlapping ? 'has-overlap' : ''}
                >
                  <td className="checkbox-column">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(rate.rate_id)}
                      onChange={() => handleSelect(rate.rate_id)}
                      aria-label={`Select ${rate.rate_name}`}
                    />
                  </td>
                  <td className="name-column">
                    {rate.rate_name}
                    {rate.isOverlapping && (
                      <span className="overlap-indicator" title="This rate overlaps with another period">
                        ⚠️
                      </span>
                    )}
                  </td>
                  <td>{format(new Date(rate.start_date), 'MMM dd, yyyy')}</td>
                  <td>{format(new Date(rate.end_date), 'MMM dd, yyyy')}</td>
                  <td>{formatRateAdjustment(rate.discount_rate)}</td>
                  <td className="actions-column">
                    <button
                      onClick={() => onEdit(rate)}
                      className="btn btn-link btn-sm"
                      aria-label={`Edit ${rate.rate_name}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete seasonal rate "${rate.rate_name}"?`)) {
                          onDelete(rate.rate_id)
                        }
                      }}
                      className="btn btn-link btn-sm text-danger"
                      aria-label={`Delete ${rate.rate_name}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="list-summary">
        Showing {processedRates.length} of {rates.length} seasonal rates
      </div>
    </div>
  )
}