import React, { useState, useCallback, useEffect } from 'react'
import { useProperties } from '@/hooks/useProperties'
import { lodgifyPayloadService } from '@/services/lodgifyPayloadService'
import { validateCompletePayload } from '@/utils/lodgifyValidator'
import { 
  exportPayloadAsJSON, 
  exportPayloadInChunks,
  generatePayloadPreview,
  estimatePayloadSize,
  exportStatistics
} from '@/utils/payloadExporter'
import { getDefaultStayLengthCategories } from '@/utils/dateRangeGenerator'
import { lodgifyApi } from '@/services/api'
import type { 
  LodgifyPayload, 
  PayloadGenerationOptions,
  GenerationProgress,
  GenerationStatistics,
  StayLengthCategory
} from '@/types/lodgify'
import type { BatchSyncResult } from '@/services/lodgify/lodgifyTypes'

interface LodgifyPayloadGeneratorProps {
  className?: string
}

type GenerationState = 'idle' | 'generating' | 'completed' | 'error'
type SyncState = 'idle' | 'syncing' | 'completed' | 'error'

const LodgifyPayloadGenerator: React.FC<LodgifyPayloadGeneratorProps> = ({ 
  className = '' 
}) => {
  // State management
  const [state, setState] = useState<GenerationState>('idle')
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [selectedProperties, setSelectedProperties] = useState<string[]>([])
  const [dateRangeOption, setDateRangeOption] = useState<'24-months' | '12-months' | '6-months' | 'custom'>('24-months')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [stayLengthCategories] = useState<StayLengthCategory[]>(getDefaultStayLengthCategories())
  const [includeDefaultRate, setIncludeDefaultRate] = useState(true)
  const [optimizeRanges, setOptimizeRanges] = useState(true)
  
  // Results state
  const [payloads, setPayloads] = useState<LodgifyPayload[]>([])
  const [statistics, setStatistics] = useState<GenerationStatistics | null>(null)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [validationResults, setValidationResults] = useState<any>(null)
  
  // Sync state
  const [syncResults, setSyncResults] = useState<BatchSyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncProgress, setSyncProgress] = useState<number>(0)

  // Load properties
  const { properties, loading: propertiesLoading, error: propertiesError } = useProperties()

  // Initialize with all properties selected
  useEffect(() => {
    if (properties.length > 0 && selectedProperties.length === 0) {
      setSelectedProperties(properties.map(p => p.lodgify_property_id))
    }
  }, [properties, selectedProperties.length])

  // Generate date range based on selection
  const getDateRange = useCallback(() => {
    const now = new Date()
    let startDate: Date, endDate: Date
    
    switch (dateRangeOption) {
      case '6-months':
        startDate = now
        endDate = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())
        break
      case '12-months':
        startDate = now
        endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        break
      case '24-months':
        startDate = now
        endDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate())
        break
      case 'custom':
        if (!customStartDate || !customEndDate) {
          throw new Error('Custom date range requires both start and end dates')
        }
        startDate = new Date(customStartDate)
        endDate = new Date(customEndDate)
        break
      default:
        startDate = now
        endDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate())
    }
    
    return { startDate, endDate }
  }, [dateRangeOption, customStartDate, customEndDate])

  // Generate payload
  const handleGenerate = useCallback(async () => {
    if (selectedProperties.length === 0) {
      setError('Please select at least one property')
      return
    }
    
    try {
      setState('generating')
      setError(null)
      setProgress(null)
      setPayloads([])
      setStatistics(null)
      setValidationResults(null)
      
      const { startDate, endDate } = getDateRange()
      
      const options: PayloadGenerationOptions = {
        properties: selectedProperties,
        startDate,
        endDate,
        stayLengthCategories,
        includeDefaultRate,
        optimizeRanges
      }
      
      const result = await lodgifyPayloadService.generatePayload(
        options,
        (progressUpdate) => setProgress(progressUpdate)
      )
      
      setPayloads(result.payloads)
      setStatistics(result.statistics)
      
      // Validate generated payloads
      const validation = validateCompletePayload(result.payloads)
      setValidationResults(validation)
      
      setState('completed')
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(message)
      setState('error')
    }
  }, [selectedProperties, getDateRange, stayLengthCategories, includeDefaultRate, optimizeRanges])

  // Cancel generation
  const handleCancel = useCallback(() => {
    lodgifyPayloadService.cancelGeneration()
    setState('idle')
    setProgress(null)
  }, [])

  // Export handlers
  const handleExportJSON = useCallback(() => {
    if (payloads.length === 0 || !statistics) return
    
    exportPayloadAsJSON(payloads, statistics, {
      format: 'pretty-json',
      includeStatistics: true
    })
  }, [payloads, statistics])

  const handleExportChunks = useCallback(() => {
    if (payloads.length === 0 || !statistics) return
    
    exportPayloadInChunks(payloads, statistics, 2) // 2 properties per chunk
  }, [payloads, statistics])

  const handleExportStats = useCallback(() => {
    if (!statistics) return
    exportStatistics(statistics)
  }, [statistics])

  // Sync to Lodgify API
  const handleSyncToLodgify = useCallback(async () => {
    if (payloads.length === 0) {
      setSyncError('No payloads to sync. Please generate payloads first.')
      return
    }

    setSyncState('syncing')
    setSyncError(null)
    setSyncResults(null)
    setSyncProgress(0)

    try {
      // Map payloads to property IDs (need to get the UUID from property)
      const propertyPayloads = payloads.map(payload => {
        const property = properties.find(p => 
          parseInt(p.lodgify_property_id) === payload.property_id
        )
        
        if (!property) {
          throw new Error(`Property not found for Lodgify ID ${payload.property_id}`)
        }
        
        return {
          propertyId: property.id, // UUID
          payload
        }
      })

      // Track progress
      let processed = 0
      const progressInterval = setInterval(() => {
        setSyncProgress((processed / propertyPayloads.length) * 100)
      }, 100)

      // Perform batch sync
      const result = await lodgifyApi.syncMultipleProperties(
        propertyPayloads,
        {
          validatePayload: true,
          maxRetries: 3,
          timeout: 30000
        }
      )

      clearInterval(progressInterval)
      setSyncProgress(100)
      setSyncResults(result)
      setSyncState('completed')

      // Show summary
      if (result.failed > 0) {
        setSyncError(`Sync completed with ${result.failed} failures. See details below.`)
      }
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown sync error occurred'
      setSyncError(message)
      setSyncState('error')
    }
  }, [payloads, properties])

  // Test connection for selected properties
  const handleTestConnection = useCallback(async () => {
    if (selectedProperties.length === 0) {
      setSyncError('Please select at least one property to test')
      return
    }

    setSyncState('syncing')
    setSyncError(null)
    
    try {
      const property = properties.find(p => 
        selectedProperties.includes(p.lodgify_property_id)
      )
      
      if (!property) {
        throw new Error('Selected property not found')
      }

      const result = await lodgifyApi.testConnection(property.id)
      
      if (result.success) {
        setSyncError(null)
        alert('Connection test successful! API key is valid and Lodgify API is accessible.')
      } else {
        setSyncError(`Connection test failed: ${result.message}`)
      }
      
      setSyncState('idle')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection test failed'
      setSyncError(message)
      setSyncState('error')
    }
  }, [selectedProperties, properties])

  // Property selection handlers
  const handleSelectAll = useCallback(() => {
    setSelectedProperties(properties.map(p => p.lodgify_property_id))
  }, [properties])

  const handleSelectNone = useCallback(() => {
    setSelectedProperties([])
  }, [])

  const handlePropertyToggle = useCallback((propertyId: string) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    )
  }, [])

  // Get progress percentage for display
  const progressPercentage = progress?.percentage || 0
  const estimatedPayloadSize = payloads.length > 0 ? estimatePayloadSize(payloads) : null

  if (propertiesLoading) {
    return (
      <div className={`lodgify-payload-generator ${className}`}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading properties...</p>
        </div>
      </div>
    )
  }

  if (propertiesError) {
    return (
      <div className={`lodgify-payload-generator ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load properties: {propertiesError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`lodgify-payload-generator ${className}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Lodgify Payload Generator
          </h1>
          <p className="text-gray-600">
            Generate complete 2-year pricing payloads for Lodgify API integration with optimization and validation.
          </p>
        </div>

        {/* Generation Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Generation Configuration
          </h2>
          
          {/* Property Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Properties ({selectedProperties.length} of {properties.length} selected)
            </label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                data-testid="select-all-properties"
              >
                Select All
              </button>
              <button
                onClick={handleSelectNone}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Select None
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded p-3">
              {properties.map(property => (
                <label key={property.id} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedProperties.includes(property.lodgify_property_id)}
                    onChange={() => handlePropertyToggle(property.lodgify_property_id)}
                    className="rounded"
                  />
                  <span className="truncate" title={property.property_name}>
                    {property.property_name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={dateRangeOption}
              onChange={(e) => setDateRangeOption(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="date-range-selector"
            >
              <option value="6-months">Next 6 Months</option>
              <option value="12-months">Next 12 Months</option>
              <option value="24-months">Next 24 Months (Recommended)</option>
              <option value="custom">Custom Range</option>
            </select>
            
            {dateRangeOption === 'custom' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeDefaultRate}
                  onChange={(e) => setIncludeDefaultRate(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Include mandatory default rate (required by Lodgify API)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={optimizeRanges}
                  onChange={(e) => setOptimizeRanges(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Optimize consecutive days into ranges (reduces payload size)</span>
              </label>
            </div>
          </div>

          {/* Stay Length Categories Info */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stay Length Categories
            </label>
            <div className="bg-gray-50 p-3 rounded text-sm">
              {stayLengthCategories.map((category, index) => (
                <div key={index} className="flex justify-between">
                  <span>{category.name}</span>
                  <span>Calculated using {category.stayLength} nights</span>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={state === 'generating' || selectedProperties.length === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              data-testid="generate-payload-button"
            >
              {state === 'generating' ? 'Generating...' : 'Generate Payload'}
            </button>
            
            {state === 'generating' && (
              <button
                onClick={handleCancel}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Progress Display */}
        {progress && state === 'generating' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Progress</h3>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>
                  {progress.phase === 'loading' && 'Loading properties...'}
                  {progress.phase === 'calculating' && `Calculating prices for ${progress.propertyId}...`}
                  {progress.phase === 'optimizing' && 'Optimizing date ranges...'}
                  {progress.phase === 'validating' && 'Validating payloads...'}
                </span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>Property: {progress.currentProperty} of {progress.totalProperties}</p>
              <p>Time Elapsed: {Math.round(progress.timeElapsedMs / 1000)}s</p>
              {progress.estimatedRemainingMs && (
                <p>Estimated Remaining: {Math.round(progress.estimatedRemainingMs / 1000)}s</p>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && state === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold mb-2">Generation Failed</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {state === 'completed' && payloads.length > 0 && statistics && (
          <>
            {/* Success Message */}
            <div 
              className="bg-green-50 border border-green-200 rounded-lg p-4"
              data-testid="generation-complete"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-green-800 font-semibold" data-testid="generation-success">
                    Payload Generation Complete!
                  </p>
                  <p className="text-green-700" data-testid="payload-count">
                    {payloads.length} payloads generated successfully
                  </p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Statistics</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="optimization-stats">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{statistics.totalProperties}</div>
                  <div className="text-sm text-gray-600">Properties</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{statistics.totalDates}</div>
                  <div className="text-sm text-gray-600">Days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{statistics.totalRatesGenerated}</div>
                  <div className="text-sm text-gray-600">Total Rates</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(statistics.generationTimeMs / 1000).toFixed(1)}s
                  </div>
                  <div className="text-sm text-gray-600">Generation Time</div>
                </div>
              </div>
              
              {statistics.optimizationApplied && (
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <p className="text-sm font-medium text-blue-900">Optimization Results:</p>
                  <p className="text-sm text-blue-800">
                    {statistics.optimizationReduction.toFixed(1)}% reduction 
                    ({statistics.entriesBeforeOptimization} → {statistics.entriesAfterOptimization} entries)
                  </p>
                </div>
              )}

              {estimatedPayloadSize && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium text-gray-900">Payload Size:</p>
                  <p className="text-sm text-gray-700">
                    {estimatedPayloadSize.sizeMB.toFixed(2)} MB 
                    ({estimatedPayloadSize.sizeKB.toFixed(1)} KB)
                    {estimatedPayloadSize.estimated && ' (estimated)'}
                  </p>
                </div>
              )}
            </div>

            {/* Validation Results */}
            {validationResults && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation Results</h3>
                
                {validationResults.valid ? (
                  <div className="text-green-800">
                    ✅ All payloads passed validation ({validationResults.validPayloads} valid)
                  </div>
                ) : (
                  <div className="text-red-800">
                    ❌ {validationResults.invalidPayloads} payloads failed validation
                  </div>
                )}
                
                {validationResults.warnings.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium text-yellow-800">Warnings:</p>
                    <ul className="mt-1 text-sm text-yellow-700">
                      {validationResults.warnings.map((warning: string, index: number) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {validationResults.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium text-red-800">Errors:</p>
                    <ul className="mt-1 text-sm text-red-700">
                      {validationResults.errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Export Controls */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleExportJSON}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  data-testid="export-json-button"
                >
                  Export JSON
                </button>
                
                {payloads.length > 4 && (
                  <button
                    onClick={handleExportChunks}
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Export in Chunks
                  </button>
                )}
                
                <button
                  onClick={handleExportStats}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Export Statistics
                </button>
              </div>
            </div>

            {/* Lodgify API Sync Controls */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lodgify API Sync</h3>
              
              {/* Test Connection Button */}
              <div className="mb-4">
                <button
                  onClick={handleTestConnection}
                  disabled={syncState === 'syncing' || selectedProperties.length === 0}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  data-testid="test-connection-button"
                >
                  {syncState === 'syncing' ? 'Testing...' : 'Test Connection'}
                </button>
                <span className="ml-3 text-sm text-gray-600">
                  Test API key and connection for selected properties
                </span>
              </div>

              {/* Sync Button */}
              <div className="mb-4">
                <button
                  onClick={handleSyncToLodgify}
                  disabled={syncState === 'syncing' || payloads.length === 0 || !validationResults?.valid}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                  data-testid="sync-to-lodgify-button"
                >
                  {syncState === 'syncing' ? 'Syncing...' : 'Sync to Lodgify API'}
                </button>
                {!validationResults?.valid && payloads.length > 0 && (
                  <span className="ml-3 text-sm text-red-600">
                    Fix validation errors before syncing
                  </span>
                )}
              </div>

              {/* Sync Progress */}
              {syncState === 'syncing' && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Syncing payloads to Lodgify...</span>
                    <span>{Math.round(syncProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Sync Error */}
              {syncError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800">{syncError}</p>
                </div>
              )}

              {/* Sync Results */}
              {syncResults && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className={`rounded-lg p-4 ${syncResults.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <h4 className={`font-semibold mb-2 ${syncResults.failed === 0 ? 'text-green-800' : 'text-yellow-800'}`}>
                      Sync Results
                    </h4>
                    <p className={syncResults.failed === 0 ? 'text-green-700' : 'text-yellow-700'}>
                      {syncResults.summary}
                    </p>
                    <div className="mt-2 text-sm">
                      <span className="text-green-700">✅ Successful: {syncResults.successful}</span>
                      {syncResults.failed > 0 && (
                        <span className="ml-4 text-red-700">❌ Failed: {syncResults.failed}</span>
                      )}
                      <span className="ml-4 text-gray-600">Duration: {(syncResults.duration / 1000).toFixed(1)}s</span>
                    </div>
                  </div>

                  {/* Individual Results */}
                  {syncResults.results.length > 0 && (
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      <h5 className="font-medium text-gray-900 mb-2">Individual Property Results:</h5>
                      {syncResults.results.map((result, index) => (
                        <div 
                          key={index}
                          className={`mb-2 p-2 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <span className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                Property {index + 1}
                              </span>
                              <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                              {result.error && (
                                <p className="text-sm text-red-600 mt-1">
                                  Error: {result.error.details}
                                  {result.error.recoverable && ' (recoverable)'}
                                </p>
                              )}
                            </div>
                            <span className={`ml-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                              {result.success ? '✅' : '❌'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Duration: {result.duration}ms | Retries: {result.retryCount}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payload Preview */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payload Preview</h3>
              <div className="bg-gray-50 rounded p-4 max-h-96 overflow-auto">
                <pre className="text-sm text-gray-800">
                  {generatePayloadPreview(payloads, 2)}
                </pre>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default LodgifyPayloadGenerator