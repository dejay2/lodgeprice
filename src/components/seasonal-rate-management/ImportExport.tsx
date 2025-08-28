/**
 * ImportExport - Component for importing and exporting seasonal rates
 * Handles JSON file operations with validation
 */

import React, { useState, useRef } from 'react'
import { format } from 'date-fns'
import { useSeasonalRates } from './hooks/useSeasonalRates'
import type { SeasonalRate, ImportExportData } from './types/SeasonalRate'
import './ImportExport.css'

interface ImportExportProps {
  isOpen: boolean
  onClose: () => void
  rates: SeasonalRate[]
  onImportSuccess?: () => void
}

export default function ImportExport({
  isOpen,
  onClose,
  rates,
  onImportSuccess
}: ImportExportProps) {
  const { createSeasonalRate } = useSeasonalRates()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('export')
  const [importData, setImportData] = useState<ImportExportData | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null)

  // Handle export
  const handleExport = () => {
    const exportData: ImportExportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      seasonalRates: rates,
      metadata: {
        totalCount: rates.length,
        dateRange: rates.length > 0 ? {
          earliest: rates.reduce((min, r) => r.start_date < min ? r.start_date : min, rates[0].start_date),
          latest: rates.reduce((max, r) => r.end_date > max ? r.end_date : max, rates[0].end_date)
        } : {
          earliest: '',
          latest: ''
        }
      }
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `seasonal-rates-${format(new Date(), 'yyyy-MM-dd')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content) as ImportExportData
        
        // Validate structure
        if (!data.version || !data.seasonalRates || !Array.isArray(data.seasonalRates)) {
          throw new Error('Invalid file format')
        }

        setImportData(data)
        setImportError(null)
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Failed to parse file')
        setImportData(null)
      }
    }
    reader.readAsText(file)
  }

  // Handle import
  const handleImport = async () => {
    if (!importData) return

    setIsProcessing(true)
    let successCount = 0
    let failedCount = 0

    for (const rate of importData.seasonalRates) {
      try {
        await createSeasonalRate({
          name: rate.rate_name,
          startDate: new Date(rate.start_date),
          endDate: new Date(rate.end_date),
          rateAdjustment: rate.discount_rate
        })
        successCount++
      } catch (error) {
        console.error(`Failed to import rate "${rate.rate_name}":`, error)
        failedCount++
      }
    }

    setImportResults({ success: successCount, failed: failedCount })
    setIsProcessing(false)

    if (successCount > 0) {
      onImportSuccess?.()
      if (failedCount === 0) {
        setTimeout(() => onClose(), 2000)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="import-export-overlay">
      <div className="import-export-modal">
        <div className="import-export-header">
          <h2>Import/Export Seasonal Rates</h2>
          <button
            onClick={onClose}
            className="close-button"
            aria-label="Close"
            disabled={isProcessing}
          >
            ×
          </button>
        </div>

        <div className="import-export-tabs">
          <button
            className={`tab ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
            disabled={isProcessing}
          >
            Export
          </button>
          <button
            className={`tab ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
            disabled={isProcessing}
          >
            Import
          </button>
        </div>

        <div className="import-export-content">
          {activeTab === 'export' && (
            <div className="export-section">
              <h3>Export Current Seasonal Rates</h3>
              <p>Download all seasonal rates as a JSON file for backup or transfer.</p>
              
              <div className="export-info">
                <div className="info-item">
                  <span className="info-label">Total Rates:</span>
                  <span className="info-value">{rates.length}</span>
                </div>
                {rates.length > 0 && (
                  <>
                    <div className="info-item">
                      <span className="info-label">Date Range:</span>
                      <span className="info-value">
                        {format(new Date(Math.min(...rates.map(r => new Date(r.start_date).getTime()))), 'MMM yyyy')} - 
                        {format(new Date(Math.max(...rates.map(r => new Date(r.end_date).getTime()))), 'MMM yyyy')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleExport}
                className="btn btn-primary"
                disabled={rates.length === 0}
              >
                Download JSON File
              </button>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="import-section">
              {!isProcessing && !importResults && (
                <>
                  <h3>Import Seasonal Rates from File</h3>
                  <p>Upload a JSON file containing seasonal rate configurations.</p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary file-select-btn"
                  >
                    Choose File
                  </button>

                  {importError && (
                    <div className="import-error">
                      <strong>Error:</strong> {importError}
                    </div>
                  )}

                  {importData && (
                    <div className="import-preview">
                      <h4>File Preview</h4>
                      <div className="preview-info">
                        <div className="info-item">
                          <span className="info-label">Version:</span>
                          <span className="info-value">{importData.version}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Export Date:</span>
                          <span className="info-value">
                            {format(new Date(importData.exportDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Rates to Import:</span>
                          <span className="info-value">{importData.seasonalRates.length}</span>
                        </div>
                      </div>

                      <div className="import-rates-preview">
                        <h5>Rates to Import:</h5>
                        <div className="rates-list">
                          {importData.seasonalRates.slice(0, 5).map((rate, index) => (
                            <div key={index} className="rate-preview">
                              <span>{rate.rate_name}</span>
                              <span className="rate-dates">
                                {format(new Date(rate.start_date), 'MMM dd')} - 
                                {format(new Date(rate.end_date), 'MMM dd')}
                              </span>
                              <span className={rate.discount_rate > 0 ? 'text-success' : 'text-danger'}>
                                {rate.discount_rate > 0 ? '+' : ''}{(rate.discount_rate * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                          {importData.seasonalRates.length > 5 && (
                            <p className="more-rates">
                              ...and {importData.seasonalRates.length - 5} more
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleImport}
                        className="btn btn-primary"
                      >
                        Import {importData.seasonalRates.length} Rates
                      </button>
                    </div>
                  )}
                </>
              )}

              {isProcessing && (
                <div className="import-progress">
                  <h3>Importing Seasonal Rates...</h3>
                  <div className="spinner"></div>
                </div>
              )}

              {importResults && (
                <div className="import-results">
                  <h3>Import Complete</h3>
                  <div className="results-summary">
                    <div className="result-stat success">
                      <span className="result-count">{importResults.success}</span>
                      <span className="result-label">Imported Successfully</span>
                    </div>
                    {importResults.failed > 0 && (
                      <div className="result-stat failed">
                        <span className="result-count">{importResults.failed}</span>
                        <span className="result-label">Failed</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="import-export-footer">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isProcessing}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}