/**
 * SeasonalRateManagementPage - Main page component for seasonal rate management
 * Coordinates all seasonal rate management components and state
 */

import { useState } from 'react'
import { useSeasonalRates } from './hooks/useSeasonalRates'
import SeasonalRateForm from './SeasonalRateForm'
import SeasonalRateList from './SeasonalRateList'
import SeasonalRateCalendar from './SeasonalRateCalendar'
import BulkOperations from './BulkOperations'
import ImportExport from './ImportExport'
import type { SeasonalRate } from './types/SeasonalRate'
import './SeasonalRateManagementPage.css'

type ViewMode = 'list' | 'calendar'

export default function SeasonalRateManagementPage() {
  const {
    seasonalRates,
    isLoading,
    error,
    refetch,
    deleteSeasonalRate,
    bulkDeleteSeasonalRates
  } = useSeasonalRates()

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<SeasonalRate | undefined>()
  const [showBulkOperations, setShowBulkOperations] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)

  // Handle create new rate
  const handleCreate = () => {
    setEditingRate(undefined)
    setIsFormOpen(true)
  }

  // Handle edit rate
  const handleEdit = (rate: SeasonalRate) => {
    setEditingRate(rate)
    setIsFormOpen(true)
  }

  // Handle delete rate
  const handleDelete = async (id: string) => {
    try {
      await deleteSeasonalRate(id)
    } catch (err) {
      console.error('Failed to delete seasonal rate:', err)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async (ids: string[]) => {
    try {
      const result = await bulkDeleteSeasonalRates(ids)
      if (result.failed.length > 0) {
        alert(`Failed to delete ${result.failed.length} rates. Please try again.`)
      }
    } catch (err) {
      console.error('Failed to bulk delete seasonal rates:', err)
    }
  }

  // Handle form success
  const handleFormSuccess = () => {
    refetch()
  }

  // Handle import success
  const handleImportSuccess = () => {
    refetch()
    setShowImportExport(false)
  }

  return (
    <div className="seasonal-rate-management-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1>Seasonal Rate Management</h1>
          <p className="page-subtitle">
            Create and manage seasonal pricing adjustments for your properties
          </p>
        </div>
        
        <div className="page-actions">
          <button
            onClick={handleCreate}
            className="btn btn-primary"
          >
            + Create Seasonal Rate
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={() => refetch()} className="btn-link">
            Retry
          </button>
        </div>
      )}

      {/* View Controls */}
      <div className="view-controls">
        <div className="view-tabs">
          <button
            className={`view-tab ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
          <button
            className={`view-tab ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            Calendar View
          </button>
        </div>
        
        <div className="view-actions">
          <button
            onClick={() => setShowBulkOperations(true)}
            className="btn btn-secondary"
          >
            Bulk Operations
          </button>
          <button
            onClick={() => setShowImportExport(true)}
            className="btn btn-secondary"
          >
            Import/Export
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="page-content">
        {viewMode === 'list' ? (
          <SeasonalRateList
            rates={seasonalRates}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            isLoading={isLoading}
          />
        ) : (
          <SeasonalRateCalendar
            rates={seasonalRates}
            onRateSelect={handleEdit}
          />
        )}
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <SeasonalRateForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          editingRate={editingRate}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Bulk Operations Modal */}
      {showBulkOperations && (
        <BulkOperations
          isOpen={showBulkOperations}
          onClose={() => setShowBulkOperations(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Import/Export Modal */}
      {showImportExport && (
        <ImportExport
          isOpen={showImportExport}
          onClose={() => setShowImportExport(false)}
          rates={seasonalRates}
          onImportSuccess={handleImportSuccess}
        />
      )}

      {/* Help Section */}
      <div className="help-section">
        <h3>Quick Help</h3>
        <div className="help-grid">
          <div className="help-item">
            <h4>📅 Seasonal Periods</h4>
            <p>Define date ranges with pricing adjustments to automatically modify rates during specific seasons.</p>
          </div>
          <div className="help-item">
            <h4>📊 Rate Adjustments</h4>
            <p>Use positive values for price increases (e.g., 1.5 = +50%) and negative for discounts (e.g., 0.8 = -20%).</p>
          </div>
          <div className="help-item">
            <h4>⚠️ Overlap Detection</h4>
            <p>The system prevents overlapping date ranges to ensure consistent pricing calculations.</p>
          </div>
          <div className="help-item">
            <h4>🔄 Bulk Operations</h4>
            <p>Use templates to quickly create common seasonal periods like summer, winter, and holiday seasons.</p>
          </div>
        </div>
      </div>
    </div>
  )
}