/**
 * Error Logging System
 * 
 * Provides comprehensive error logging for development and production
 * environments with proper sanitization and storage management.
 */

import type { ErrorState, ErrorContext, ErrorSeverity } from './errorTypes'
import { sanitizeErrorForLogging, getErrorSeverity } from './errorHandling'

// =============================================================================
// Logger Configuration
// =============================================================================

interface LoggerConfig {
  maxLogs: number
  storageKey: string
  enableConsole: boolean
  enableLocalStorage: boolean
  enableRemoteLogging: boolean
  remoteEndpoint?: string
}

const DEFAULT_CONFIG: LoggerConfig = {
  maxLogs: 50,
  storageKey: 'errorLogs',
  enableConsole: process.env.NODE_ENV === 'development',
  enableLocalStorage: true,
  enableRemoteLogging: false,
  remoteEndpoint: undefined
}

// =============================================================================
// Error Log Entry
// =============================================================================

interface ErrorLogEntry {
  id: string
  timestamp: string
  error: Record<string, unknown>
  context?: ErrorContext
  severity: ErrorSeverity
  userAgent: string
  url: string
  stackTrace?: string
}

// =============================================================================
// Error Logger Class
// =============================================================================

class ErrorLogger {
  private config: LoggerConfig
  private logBuffer: ErrorLogEntry[] = []
  private flushTimer: NodeJS.Timeout | null = null
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }
  
  /**
   * Log an error with context
   */
  log(error: ErrorState, context?: Partial<ErrorContext>): void {
    const entry = this.createLogEntry(error, context)
    
    // Log to console if enabled
    if (this.config.enableConsole) {
      this.logToConsole(entry)
    }
    
    // Add to buffer
    this.logBuffer.push(entry)
    
    // Store locally if enabled
    if (this.config.enableLocalStorage) {
      this.storeLocally(entry)
    }
    
    // Schedule remote logging if enabled
    if (this.config.enableRemoteLogging) {
      this.scheduleRemoteFlush()
    }
  }
  
  /**
   * Create a log entry from an error
   */
  private createLogEntry(
    error: ErrorState, 
    context?: Partial<ErrorContext>
  ): ErrorLogEntry {
    const sanitizedError = sanitizeErrorForLogging(error)
    const severity = getErrorSeverity(error)
    
    return {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      error: sanitizedError,
      context: context ? this.sanitizeContext(context) : undefined,
      severity,
      userAgent: navigator.userAgent,
      url: window.location.href,
      stackTrace: this.extractStackTrace(error)
    }
  }
  
  /**
   * Generate unique ID for log entry
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Extract stack trace from error if available
   */
  private extractStackTrace(error: ErrorState): string | undefined {
    if (error.details && typeof error.details === 'object' && 'stack' in error.details) {
      return String(error.details.stack)
    }
    
    // Try to get stack trace from Error object
    if (error.message) {
      const tempError = new Error(error.message)
      return tempError.stack
    }
    
    return undefined
  }
  
  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context: Partial<ErrorContext>): ErrorContext {
    const sanitized = { ...context } as ErrorContext
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret']
    
    if (sanitized.additionalData) {
      const cleanData = { ...sanitized.additionalData }
      
      for (const key of Object.keys(cleanData)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          cleanData[key] = '[REDACTED]'
        }
      }
      
      sanitized.additionalData = cleanData
    }
    
    // Ensure environment is set
    sanitized.environment = sanitized.environment || 
      (process.env.NODE_ENV as 'development' | 'production') || 
      'development'
    
    sanitized.timestamp = sanitized.timestamp || new Date()
    
    return sanitized
  }
  
  /**
   * Log to console with formatting
   */
  private logToConsole(entry: ErrorLogEntry): void {
    const style = this.getConsoleStyle(entry.severity)
    
    console.group(
      `%c[${entry.severity.toUpperCase()}] Error Log`,
      style
    )
    
    console.log('Timestamp:', entry.timestamp)
    console.log('Error:', entry.error)
    
    if (entry.context) {
      console.log('Context:', entry.context)
    }
    
    if (entry.stackTrace) {
      console.log('Stack Trace:', entry.stackTrace)
    }
    
    console.groupEnd()
  }
  
  /**
   * Get console style based on severity
   */
  private getConsoleStyle(severity: ErrorSeverity): string {
    const styles = {
      critical: 'color: white; background: red; padding: 2px 4px; border-radius: 2px;',
      high: 'color: white; background: orange; padding: 2px 4px; border-radius: 2px;',
      medium: 'color: black; background: yellow; padding: 2px 4px; border-radius: 2px;',
      low: 'color: white; background: blue; padding: 2px 4px; border-radius: 2px;'
    }
    
    return styles[severity]
  }
  
  /**
   * Store error log locally
   */
  private storeLocally(entry: ErrorLogEntry): void {
    try {
      // Get existing logs
      const existingLogs = this.getStoredLogs()
      
      // Add new entry
      existingLogs.push(entry)
      
      // Trim to max logs
      const trimmedLogs = existingLogs.slice(-this.config.maxLogs)
      
      // Store back
      localStorage.setItem(
        this.config.storageKey,
        JSON.stringify(trimmedLogs)
      )
    } catch (error) {
      console.warn('Failed to store error log locally:', error)
    }
  }
  
  /**
   * Get stored error logs
   */
  getStoredLogs(): ErrorLogEntry[] {
    try {
      const stored = localStorage.getItem(this.config.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
  
  /**
   * Clear stored error logs
   */
  clearStoredLogs(): void {
    try {
      localStorage.removeItem(this.config.storageKey)
    } catch (error) {
      console.warn('Failed to clear stored logs:', error)
    }
  }
  
  /**
   * Get logs filtered by severity
   */
  getLogsBySeverity(severity: ErrorSeverity): ErrorLogEntry[] {
    return this.getStoredLogs().filter(log => log.severity === severity)
  }
  
  /**
   * Get logs within time range
   */
  getLogsInTimeRange(startTime: Date, endTime: Date): ErrorLogEntry[] {
    return this.getStoredLogs().filter(log => {
      const logTime = new Date(log.timestamp)
      return logTime >= startTime && logTime <= endTime
    })
  }
  
  /**
   * Schedule remote logging flush
   */
  private scheduleRemoteFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
    }
    
    // Flush after 5 seconds of inactivity or when buffer is large
    if (this.logBuffer.length >= 10) {
      this.flushToRemote()
    } else {
      this.flushTimer = setTimeout(() => {
        this.flushToRemote()
      }, 5000)
    }
  }
  
  /**
   * Send logs to remote endpoint
   */
  private async flushToRemote(): Promise<void> {
    if (this.logBuffer.length === 0 || !this.config.remoteEndpoint) {
      return
    }
    
    const logsToSend = [...this.logBuffer]
    this.logBuffer = []
    
    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          logs: logsToSend,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      // Re-add logs to buffer if send failed
      this.logBuffer.unshift(...logsToSend)
      console.warn('Failed to send logs to remote endpoint:', error)
    }
  }
  
  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    const logs = this.getStoredLogs()
    return JSON.stringify(logs, null, 2)
  }
  
  /**
   * Export logs as CSV
   */
  exportLogsAsCSV(): string {
    const logs = this.getStoredLogs()
    
    if (logs.length === 0) return ''
    
    // CSV headers
    const headers = ['ID', 'Timestamp', 'Severity', 'Type', 'Message', 'URL']
    
    // CSV rows
    const rows = logs.map(log => {
      const error = log.error as any
      return [
        log.id,
        log.timestamp,
        log.severity,
        error.type || 'unknown',
        error.userMessage || error.message || '',
        log.url
      ].map(value => `"${String(value).replace(/"/g, '""')}"`)
    })
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

const errorLogger = new ErrorLogger()

// =============================================================================
// Public API
// =============================================================================

export function logError(error: ErrorState, context?: Partial<ErrorContext>): void {
  errorLogger.log(error, context)
}

export function getErrorLogs(): ErrorLogEntry[] {
  return errorLogger.getStoredLogs()
}

export function clearErrorLogs(): void {
  errorLogger.clearStoredLogs()
}

export function getErrorLogsBySeverity(severity: ErrorSeverity): ErrorLogEntry[] {
  return errorLogger.getLogsBySeverity(severity)
}

export function getErrorLogsInTimeRange(startTime: Date, endTime: Date): ErrorLogEntry[] {
  return errorLogger.getLogsInTimeRange(startTime, endTime)
}

export function exportErrorLogs(format: 'json' | 'csv' = 'json'): string {
  return format === 'csv' ? errorLogger.exportLogsAsCSV() : errorLogger.exportLogs()
}

// Export logger instance for advanced usage
export { errorLogger }