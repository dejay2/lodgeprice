/**
 * BulkOperations - Component for bulk seasonal rate operations
 * Provides templates and batch creation functionality
 */

import { useState } from 'react'
import { useSeasonalRates } from './hooks/useSeasonalRates'
import { getSeasonalTemplates } from './utils/seasonalRateTemplates'
import type { CreateSeasonalRateData } from './types/SeasonalRate'
import './BulkOperations.css'

interface BulkOperationsProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function BulkOperations({
  isOpen,
  onClose,
  onSuccess
}: BulkOperationsProps) {
  const { createSeasonalRate } = useSeasonalRates()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [customPeriods, setCustomPeriods] = useState<CreateSeasonalRateData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null)
  
  const templates = getSeasonalTemplates()

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find(t => t.id === templateId)
    
    if (template) {
      // Convert template periods to seasonal rate data
      const currentYear = new Date().getFullYear()
      const periods: CreateSeasonalRateData[] = template.periods.map(period => {
        const startDate = new Date(currentYear, period.startMonth, period.startDay)
        const endDate = new Date(currentYear, period.endMonth, period.endDay)
        
        // Handle year transition (e.g., Dec to Jan)
        if (endDate < startDate) {
          endDate.setFullYear(currentYear + 1)
        }
        
        return {
          name: period.name,
          startDate,
          endDate,
          rateAdjustment: period.rateAdjustment
        }
      })
      
      setCustomPeriods(periods)
    }
  }

  // Handle period update
  const handlePeriodUpdate = (index: number, field: keyof CreateSeasonalRateData, value: any) => {
    const updated = [...customPeriods]
    updated[index] = { ...updated[index], [field]: value }
    setCustomPeriods(updated)
  }

  // Handle period removal
  const handleRemovePeriod = (index: number) => {
    setCustomPeriods(customPeriods.filter((_, i) => i !== index))
  }

  // Add custom period
  const handleAddPeriod = () => {
    setCustomPeriods([
      ...customPeriods,
      {
        name: 'New Period',
        startDate: new Date(),
        endDate: new Date(),
        rateAdjustment: 1.0
      }
    ])
  }

  // Process bulk creation
  const handleBulkCreate = async () => {
    if (customPeriods.length === 0) {
      alert('No periods to create')
      return
    }
    
    setIsProcessing(true)
    setProgress({ current: 0, total: customPeriods.length })
    
    let successCount = 0
    let failedCount = 0
    
    for (let i = 0; i < customPeriods.length; i++) {
      const period = customPeriods[i]
      setProgress({ current: i + 1, total: customPeriods.length })
      
      try {
        await createSeasonalRate(period)
        successCount++
      } catch (error) {
        console.error(`Failed to create period "${period.name}":`, error)
        failedCount++
      }
    }
    
    setResults({ success: successCount, failed: failedCount })
    setIsProcessing(false)
    
    if (successCount > 0) {
      onSuccess?.()
      if (failedCount === 0) {
        setTimeout(() => onClose(), 2000)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="bulk-operations-overlay">
      <div className="bulk-operations-modal">
        <div className="bulk-operations-header">
          <h2>Bulk Operations</h2>
          <button
            onClick={onClose}
            className="close-button"
            aria-label="Close"
            disabled={isProcessing}
          >
            ×
          </button>
        </div>

        <div className="bulk-operations-content">
          {!isProcessing && !results && (
            <>
              {/* Template Selection */}
              <div className="templates-section">
                <h3>Select Template</h3>
                <div className="templates-grid">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      <h4>{template.name}</h4>
                      <p>{template.description}</p>
                      <span className="period-count">
                        {template.periods.length} periods
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Periods */}
              {customPeriods.length > 0 && (
                <div className="periods-section">
                  <h3>Customize Periods</h3>
                  <div className="periods-list">
                    {customPeriods.map((period, index) => (
                      <div key={index} className="period-item">
                        <div className="period-fields">
                          <input
                            type="text"
                            value={period.name}
                            onChange={(e) => handlePeriodUpdate(index, 'name', e.target.value)}
                            placeholder="Period name"
                            className="form-input"
                          />
                          <input
                            type="date"
                            value={period.startDate.toISOString().split('T')[0]}
                            onChange={(e) => handlePeriodUpdate(index, 'startDate', new Date(e.target.value))}
                            className="form-input"
                          />
                          <input
                            type="date"
                            value={period.endDate.toISOString().split('T')[0]}
                            onChange={(e) => handlePeriodUpdate(index, 'endDate', new Date(e.target.value))}
                            className="form-input"
                          />
                          <input
                            type="number"
                            value={period.rateAdjustment}
                            onChange={(e) => handlePeriodUpdate(index, 'rateAdjustment', parseFloat(e.target.value))}
                            step="0.1"
                            min="-1"
                            max="10"
                            className="form-input"
                          />
                          <button
                            onClick={() => handleRemovePeriod(index)}
                            className="btn btn-danger btn-sm"
                            aria-label="Remove period"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={handleAddPeriod}
                    className="btn btn-secondary"
                  >
                    + Add Period
                  </button>
                </div>
              )}
            </>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="progress-section">
              <h3>Creating Seasonal Rates...</h3>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p>{progress.current} of {progress.total} periods processed</p>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="results-section">
              <h3>Operation Complete</h3>
              <div className="results-summary">
                <div className="result-stat success">
                  <span className="result-count">{results.success}</span>
                  <span className="result-label">Created Successfully</span>
                </div>
                {results.failed > 0 && (
                  <div className="result-stat failed">
                    <span className="result-count">{results.failed}</span>
                    <span className="result-label">Failed</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bulk-operations-footer">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isProcessing}
          >
            {results ? 'Close' : 'Cancel'}
          </button>
          {!isProcessing && !results && customPeriods.length > 0 && (
            <button
              onClick={handleBulkCreate}
              className="btn btn-primary"
            >
              Create {customPeriods.length} Seasonal Rates
            </button>
          )}
        </div>
      </div>
    </div>
  )
}