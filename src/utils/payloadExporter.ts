import type { 
  LodgifyPayload, 
  PayloadExportOptions, 
  GenerationStatistics 
} from '@/types/lodgify'

/**
 * Export generated payload as downloadable JSON file
 */
export function exportPayloadAsJSON(
  payloads: LodgifyPayload[],
  statistics: GenerationStatistics,
  options: PayloadExportOptions = { format: 'json', includeStatistics: false }
): void {
  try {
    let content: any = payloads
    
    // Include statistics if requested
    if (options.includeStatistics) {
      content = {
        meta: {
          generatedAt: new Date().toISOString(),
          statistics,
          totalPayloads: payloads.length
        },
        payloads
      }
    }
    
    // Format JSON based on options
    const jsonString = options.format === 'pretty-json' 
      ? JSON.stringify(content, null, 2)
      : JSON.stringify(content)
    
    // Generate filename if not provided
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = options.filename || `lodgify-payload-${timestamp}.json`
    
    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up object URL
    setTimeout(() => URL.revokeObjectURL(url), 100)
    
  } catch (error) {
    console.error('Failed to export payload:', error)
    throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Export payload in chunks for large datasets
 */
export function exportPayloadInChunks(
  payloads: LodgifyPayload[],
  statistics: GenerationStatistics,
  chunkSize: number = 2
): void {
  const chunks: LodgifyPayload[][] = []
  
  for (let i = 0; i < payloads.length; i += chunkSize) {
    chunks.push(payloads.slice(i, i + chunkSize))
  }
  
  chunks.forEach((chunk, index) => {
    const chunkFilename = `lodgify-payload-chunk-${index + 1}-of-${chunks.length}.json`
    exportPayloadAsJSON(chunk, statistics, {
      filename: chunkFilename,
      format: 'pretty-json',
      includeStatistics: index === 0 // Only include statistics in first chunk
    })
  })
}

/**
 * Generate payload preview for display (truncated)
 */
export function generatePayloadPreview(
  payloads: LodgifyPayload[],
  maxRatesPerProperty: number = 3
): string {
  const previewPayloads = payloads.map(payload => ({
    ...payload,
    rates: payload.rates.slice(0, maxRatesPerProperty).concat(
      payload.rates.length > maxRatesPerProperty 
        ? [{ '...': `${payload.rates.length - maxRatesPerProperty} more rates` }] as any
        : []
    )
  }))
  
  return JSON.stringify(previewPayloads, null, 2)
}

/**
 * Calculate estimated file size
 */
export function estimatePayloadSize(payloads: LodgifyPayload[]): {
  sizeBytes: number
  sizeKB: number
  sizeMB: number
  estimated: boolean
} {
  try {
    // Try to calculate actual size
    const jsonString = JSON.stringify(payloads)
    const sizeBytes = new Blob([jsonString]).size
    
    return {
      sizeBytes,
      sizeKB: Math.round(sizeBytes / 1024 * 100) / 100,
      sizeMB: Math.round(sizeBytes / (1024 * 1024) * 100) / 100,
      estimated: false
    }
  } catch (error) {
    // Fallback to estimation
    const averageRateSize = 150 // bytes per rate entry
    const totalRates = payloads.reduce((sum, p) => sum + p.rates.length, 0)
    const overheadPerPayload = 100 // bytes for property metadata
    
    const estimatedBytes = (totalRates * averageRateSize) + (payloads.length * overheadPerPayload)
    
    return {
      sizeBytes: estimatedBytes,
      sizeKB: Math.round(estimatedBytes / 1024 * 100) / 100,
      sizeMB: Math.round(estimatedBytes / (1024 * 1024) * 100) / 100,
      estimated: true
    }
  }
}

/**
 * Validate payload size against limits
 */
export function validatePayloadSize(
  payloads: LodgifyPayload[],
  maxSizeMB: number = 50
): { valid: boolean, size: ReturnType<typeof estimatePayloadSize>, message?: string } {
  const size = estimatePayloadSize(payloads)
  const valid = size.sizeMB <= maxSizeMB
  
  return {
    valid,
    size,
    message: valid ? undefined : `Payload size (${size.sizeMB}MB) exceeds limit (${maxSizeMB}MB)`
  }
}

/**
 * Create statistics summary for export logs
 */
export function generateStatisticsSummary(statistics: GenerationStatistics): string {
  const lines = [
    `Lodgify Payload Generation Statistics`,
    `=====================================`,
    `Generated: ${new Date().toLocaleString()}`,
    ``,
    `Properties: ${statistics.totalProperties}`,
    `Date Range: ${statistics.totalDates} days`,
    `Total Rates: ${statistics.totalRatesGenerated}`,
    ``,
    `Optimization: ${statistics.optimizationApplied ? 'Applied' : 'Disabled'}`,
    statistics.optimizationApplied ? `  Before: ${statistics.entriesBeforeOptimization} entries` : '',
    statistics.optimizationApplied ? `  After: ${statistics.entriesAfterOptimization} entries` : '',
    statistics.optimizationApplied ? `  Reduction: ${statistics.optimizationReduction.toFixed(1)}%` : '',
    ``,
    `Performance:`,
    `  Generation Time: ${(statistics.generationTimeMs / 1000).toFixed(1)}s`,
    statistics.memoryUsedMB ? `  Memory Used: ${statistics.memoryUsedMB.toFixed(1)}MB` : '',
    ``,
  ].filter(line => line !== '') // Remove empty strings from disabled features
  
  return lines.join('\n')
}

/**
 * Export statistics as separate log file
 */
export function exportStatistics(statistics: GenerationStatistics): void {
  const content = generateStatisticsSummary(statistics)
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `lodgify-generation-stats-${timestamp}.txt`
  
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  setTimeout(() => URL.revokeObjectURL(url), 100)
}