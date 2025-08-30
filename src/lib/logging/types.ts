/**
 * Type definitions for the logging and monitoring system
 */

/**
 * Core logging context that can be attached to any log entry
 */
export interface ILogContext {
  component?: string;
  userId?: string;
  propertyId?: string;
  action?: string;
  timestamp: number;
  sessionId?: string;
  correlationId?: string;
}

/**
 * Performance metrics captured during operations
 */
export interface IPerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, unknown>;
  threshold?: number;
  exceededThreshold?: boolean;
}

/**
 * Database operation logging structure
 */
export interface IDatabaseLogEntry {
  functionName: string;
  parameters: Record<string, unknown>;
  executionTime: number;
  result?: unknown;
  error?: string;
  rowCount?: number;
  query?: string;
}

/**
 * User action tracking structure
 */
export interface IUserAction {
  type: 'property_selection' | 'price_change' | 'discount_update' | 'calendar_navigation' | 'booking_modification' | 'date_range_selection';
  context: Record<string, unknown>;
  timestamp: number;
  userId?: string;
  propertyId?: string;
  previousValue?: unknown;
  newValue?: unknown;
}

/**
 * Error logging context with enhanced information
 */
export interface IErrorContext {
  errorCode?: string;
  errorType?: string;
  componentStack?: string;
  userAction?: IUserAction;
  metadata?: Record<string, unknown>;
  recovery?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Log levels supported by the logging service
 */
export type LogLevel = 'SILLY' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'OFF';

/**
 * Configuration for the logging service
 */
export interface ILoggingConfig {
  level: LogLevel;
  isDevelopment: boolean;
  enablePerformanceMonitoring: boolean;
  enableLocalStorage: boolean;
  maxStoredLogs: number;
  sensitiveKeys: string[];
  enableDataSanitization: boolean;
}

/**
 * Performance measurement options
 */
export interface IPerformanceOptions {
  threshold?: number;
  includeMemory?: boolean;
  includeTiming?: boolean;
  autoLog?: boolean;
}

/**
 * Sanitization options for sensitive data
 */
export interface ISanitizationOptions {
  maskValue?: string;
  excludeKeys?: string[];
  includeKeys?: string[];
  maxDepth?: number;
}

/**
 * Log entry structure for storage
 */
export interface IStoredLogEntry {
  level: LogLevel;
  message: string;
  context?: ILogContext;
  timestamp: string;
  data?: unknown;
  error?: IErrorContext;
  performance?: IPerformanceMetrics;
}

/**
 * Monitoring statistics
 */
export interface IMonitoringStats {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  averageResponseTime: number;
  slowOperations: IPerformanceMetrics[];
  recentErrors: IStoredLogEntry[];
  databaseOperations: number;
  userActions: number;
}

/**
 * Logger instance interface
 */
export interface ILogger {
  silly(message: string, data?: unknown): void;
  trace(message: string, data?: unknown): void;
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: Error | unknown, context?: IErrorContext): void;
  fatal(message: string, error?: Error | unknown, context?: IErrorContext): void;
  
  // Specialized logging methods
  logUserAction(action: IUserAction): void;
  logDatabaseOperation(operation: IDatabaseLogEntry): void;
  logPerformance(metrics: IPerformanceMetrics): void;
  
  // Sub-logger creation
  getSubLogger(name: string, context?: Partial<ILogContext>): ILogger;
}

/**
 * Performance monitor interface
 */
export interface IPerformanceMonitor {
  startMeasurement(name: string, metadata?: Record<string, unknown>): string;
  endMeasurement(measurementId: string): IPerformanceMetrics | null;
  measureAsync<T>(name: string, operation: () => Promise<T>, options?: IPerformanceOptions): Promise<T>;
  measureSync<T>(name: string, operation: () => T, options?: IPerformanceOptions): T;
  getMetrics(): IPerformanceMetrics[];
  clearMetrics(): void;
}

/**
 * Database logger interface
 */
export interface IDatabaseLogger {
  logQuery(query: string, params?: unknown[], duration?: number): void;
  logFunction(functionName: string, params: Record<string, unknown>, result?: unknown, error?: Error): void;
  logTransaction(transactionId: string, operations: IDatabaseLogEntry[]): void;
  getStats(): { totalQueries: number; averageTime: number; slowQueries: IDatabaseLogEntry[] };
}