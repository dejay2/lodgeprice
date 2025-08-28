/**
 * Lodgify API Logging Module
 * 
 * Provides comprehensive logging for API operations with credential masking,
 * request/response tracking, and error reporting.
 */

import { LogEntry } from './lodgifyTypes'

/**
 * Log levels for different types of messages
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Configuration for the logger
 */
interface LoggerConfig {
  enabled: boolean
  logLevel: LogLevel
  maskCredentials: boolean
  includeTimestamp: boolean
  maxPayloadSize: number // Max characters to log for payloads
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  enabled: true,
  logLevel: LogLevel.INFO,
  maskCredentials: true,
  includeTimestamp: true,
  maxPayloadSize: 1000
}

/**
 * Lodgify API Logger class
 * Handles all logging operations with security and formatting
 */
export class LodgifyLogger {
  private config: LoggerConfig
  private logs: LogEntry[] = []
  private maxLogs = 1000 // Keep last 1000 logs in memory

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Masks sensitive data in headers
   * 
   * @param headers - Headers object
   * @returns Headers with masked sensitive values
   */
  private maskApiKey(headers: Record<string, string>): Record<string, string> {
    if (!this.config.maskCredentials) {
      return headers
    }

    const masked = { ...headers }
    
    // Mask X-ApiKey header
    if (masked['X-ApiKey']) {
      const key = masked['X-ApiKey']
      if (key.length > 4) {
        masked['X-ApiKey'] = `***${key.slice(-4)}`
      } else {
        masked['X-ApiKey'] = '****'
      }
    }

    // Mask any authorization headers
    if (masked['Authorization']) {
      masked['Authorization'] = '***MASKED***'
    }

    return masked
  }

  /**
   * Truncates large payloads for logging
   * 
   * @param payload - Payload object
   * @returns Truncated payload string
   */
  private truncatePayload(payload: any): string {
    const str = JSON.stringify(payload, null, 2)
    if (str.length <= this.config.maxPayloadSize) {
      return str
    }
    return `${str.slice(0, this.config.maxPayloadSize)}... (truncated, total ${str.length} chars)`
  }

  /**
   * Creates a log entry
   * 
   * @param entry - Log entry data
   * @returns Complete log entry
   */
  private createLogEntry(entry: Omit<LogEntry, 'timestamp'>): LogEntry {
    return {
      ...entry,
      timestamp: this.config.includeTimestamp ? new Date().toISOString() : ''
    }
  }

  /**
   * Stores log entry in memory
   * 
   * @param entry - Log entry to store
   */
  private storeLog(entry: LogEntry): void {
    this.logs.push(entry)
    
    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  /**
   * Outputs log based on level
   * 
   * @param level - Log level
   * @param message - Log message
   * @param data - Additional data
   */
  private output(level: LogLevel, message: string, data?: any): void {
    if (!this.config.enabled) {
      return
    }

    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    const currentLevelIndex = levels.indexOf(this.config.logLevel)
    const messageLevelIndex = levels.indexOf(level)

    if (messageLevelIndex < currentLevelIndex) {
      return // Skip if message level is below configured level
    }

    const logData = data ? { message, ...data } : message

    switch (level) {
      case LogLevel.DEBUG:
        console.debug('🔍 Lodgify API:', logData)
        break
      case LogLevel.INFO:
        console.info('ℹ️ Lodgify API:', logData)
        break
      case LogLevel.WARN:
        console.warn('⚠️ Lodgify API:', logData)
        break
      case LogLevel.ERROR:
        console.error('❌ Lodgify API:', logData)
        break
    }
  }

  /**
   * Logs an API request
   * 
   * @param propertyId - Property ID
   * @param url - Request URL
   * @param headers - Request headers
   * @param payload - Request payload
   */
  logRequest(propertyId: string, url: string, headers: Record<string, string>, payload: any): void {
    const entry = this.createLogEntry({
      propertyId,
      action: 'request',
      message: `Sending pricing data to Lodgify`,
      metadata: {
        url,
        method: 'POST',
        headers: this.maskApiKey(headers),
        payloadPreview: this.truncatePayload(payload),
        payloadSize: JSON.stringify(payload).length,
        ratesCount: payload?.rates?.length || 0
      }
    })

    this.storeLog(entry)
    this.output(LogLevel.INFO, entry.message, entry.metadata)
  }

  /**
   * Logs an API response
   * 
   * @param propertyId - Property ID
   * @param statusCode - HTTP status code
   * @param duration - Request duration in ms
   * @param responseSize - Response size in bytes
   * @param responseBody - Optional response body
   */
  logResponse(
    propertyId: string, 
    statusCode: number, 
    duration: number, 
    responseSize: number,
    responseBody?: any
  ): void {
    const entry = this.createLogEntry({
      propertyId,
      action: 'response',
      statusCode,
      duration,
      message: `Received response from Lodgify (${statusCode})`,
      metadata: { 
        responseSize,
        responsePreview: responseBody ? this.truncatePayload(responseBody) : undefined
      }
    })

    this.storeLog(entry)
    
    const level = statusCode >= 200 && statusCode < 300 ? LogLevel.INFO : LogLevel.WARN
    this.output(level, entry.message, { 
      statusCode, 
      duration: `${duration}ms`, 
      size: `${responseSize} bytes` 
    })
  }

  /**
   * Logs an error
   * 
   * @param propertyId - Property ID
   * @param error - Error object
   * @param retryCount - Number of retries attempted
   * @param context - Additional context
   */
  logError(propertyId: string, error: Error, retryCount: number = 0, context?: any): void {
    const entry = this.createLogEntry({
      propertyId,
      action: 'error',
      retryCount,
      message: `Lodgify API error: ${error.message}`,
      metadata: {
        errorType: error.constructor.name,
        errorMessage: error.message,
        stack: error.stack?.split('\n').slice(0, 5), // First 5 lines of stack
        context
      }
    })

    this.storeLog(entry)
    this.output(LogLevel.ERROR, entry.message, entry.metadata)
  }

  /**
   * Logs a retry attempt
   * 
   * @param propertyId - Property ID
   * @param attempt - Current attempt number
   * @param maxAttempts - Maximum attempts
   * @param delay - Delay before retry in ms
   * @param reason - Reason for retry
   */
  logRetry(
    propertyId: string, 
    attempt: number, 
    maxAttempts: number, 
    delay: number, 
    reason: string
  ): void {
    const entry = this.createLogEntry({
      propertyId,
      action: 'retry',
      retryCount: attempt,
      message: `Retrying request (attempt ${attempt}/${maxAttempts})`,
      metadata: {
        delay: `${delay}ms`,
        reason
      }
    })

    this.storeLog(entry)
    this.output(LogLevel.WARN, entry.message, entry.metadata)
  }

  /**
   * Logs validation results
   * 
   * @param propertyId - Property ID
   * @param valid - Whether validation passed
   * @param errors - Validation errors
   * @param warnings - Validation warnings
   */
  logValidation(
    _propertyId: string,  // Property ID not logged for validation
    valid: boolean, 
    errors: string[], 
    warnings: string[]
  ): void {
    const level = valid ? (warnings.length > 0 ? LogLevel.WARN : LogLevel.DEBUG) : LogLevel.ERROR
    const message = valid 
      ? `Payload validation passed${warnings.length > 0 ? ' with warnings' : ''}`
      : `Payload validation failed with ${errors.length} error(s)`

    const metadata = {
      valid,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    }

    this.output(level, message, metadata)
  }

  /**
   * Logs batch operation summary
   * 
   * @param totalProperties - Total properties in batch
   * @param successful - Number of successful syncs
   * @param failed - Number of failed syncs
   * @param duration - Total duration in ms
   */
  logBatchSummary(
    totalProperties: number,
    successful: number,
    failed: number,
    duration: number
  ): void {
    // Note: This is a summary, not property-specific
    const message = `Batch sync completed: ${successful}/${totalProperties} successful`
    const metadata = {
      totalProperties,
      successful,
      failed,
      duration: `${duration}ms`,
      averageTime: `${Math.round(duration / totalProperties)}ms per property`
    }

    const level = failed === 0 ? LogLevel.INFO : LogLevel.WARN
    this.output(level, message, metadata)
  }

  /**
   * Gets recent logs
   * 
   * @param limit - Maximum number of logs to return
   * @param filter - Optional filter criteria
   * @returns Array of log entries
   */
  getRecentLogs(
    limit: number = 100,
    filter?: { propertyId?: string; action?: LogEntry['action'] }
  ): LogEntry[] {
    let filtered = [...this.logs]

    if (filter?.propertyId) {
      filtered = filtered.filter(log => log.propertyId === filter.propertyId)
    }

    if (filter?.action) {
      filtered = filtered.filter(log => log.action === filter.action)
    }

    return filtered.slice(-limit)
  }

  /**
   * Clears all stored logs
   */
  clearLogs(): void {
    this.logs = []
    this.output(LogLevel.DEBUG, 'Log history cleared')
  }

  /**
   * Exports logs to JSON
   * 
   * @returns JSON string of all logs
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * Updates logger configuration
   * 
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
    this.output(LogLevel.DEBUG, 'Logger configuration updated', this.config)
  }
}

/**
 * Default logger instance
 */
export const logger = new LodgifyLogger()