/**
 * Core logging service implementation using tslog
 * Provides centralized logging with hierarchical sub-loggers
 */

import { Logger as TSLogger, ILogObj } from 'tslog';
import type {
  ILogger,
  ILogContext,
  ILoggingConfig,
  IUserAction,
  IDatabaseLogEntry,
  IPerformanceMetrics,
  IErrorContext,
  IStoredLogEntry,
  LogLevel,
  IMonitoringStats
} from './types';
import {
  getLoggingConfig,
  shouldLog,
  getConsoleMethod,
  formatTimestamp,
  generateSessionId,
  generateCorrelationId,
  LOG_LEVEL_VALUES
} from './config';

/**
 * Data sanitization helper
 */
function sanitizeData(data: any, sensitiveKeys: string[], maskValue = '[MASKED]'): any {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // Check if the string contains sensitive patterns
    const sensitivePatterns = [
      /Bearer\s+[\w-]+/gi,
      /apikey[:=]\s*[\w-]+/gi,
      /password[:=]\s*[\w-]+/gi
    ];
    
    let sanitized = data;
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, maskValue);
    }
    return sanitized;
  }
  
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, sensitiveKeys, maskValue));
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sensitiveKey => 
      lowerKey.includes(sensitiveKey.toLowerCase())
    );
    
    if (isSensitive) {
      sanitized[key] = maskValue;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value, sensitiveKeys, maskValue);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Store log entry in localStorage for development debugging
 */
function storeLogEntry(entry: IStoredLogEntry, maxLogs: number): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  
  try {
    const existingLogs = JSON.parse(
      localStorage.getItem('lodgeprice_logs') || '[]'
    ) as IStoredLogEntry[];
    
    const updatedLogs = [entry, ...existingLogs].slice(0, maxLogs);
    localStorage.setItem('lodgeprice_logs', JSON.stringify(updatedLogs));
  } catch (error) {
    // Fail silently if localStorage is not available or full
    console.debug('Failed to store log entry:', error);
  }
}

/**
 * Logger implementation wrapping tslog
 */
class LoggerImpl implements ILogger {
  private tsLogger: TSLogger<ILogObj>;
  private config: ILoggingConfig;
  private context: ILogContext;
  private sessionId: string;
  
  constructor(
    name: string,
    config: ILoggingConfig,
    parentLogger?: TSLogger<ILogObj>,
    additionalContext?: Partial<ILogContext>
  ) {
    this.config = config;
    this.sessionId = generateSessionId();
    
    // Initialize context
    this.context = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      ...additionalContext
    };
    
    // Configure tslog
    const tsLogConfig = {
      name,
      type: config.isDevelopment ? 'pretty' : 'json',
      minLevel: this.mapLogLevel(config.level),
      prettyLogTemplate: '{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}:{{ms}}\t{{logLevelName}}\t[{{name}}]\t',
      stylePrettyLogs: true,
      prettyLogTimeZone: 'local' as const,
      overwrite: {
        transportJSON: this.transportJSON.bind(this)
      }
    };
    
    if (parentLogger) {
      this.tsLogger = parentLogger.getSubLogger({ name });
    } else {
      this.tsLogger = new TSLogger(tsLogConfig as any);
    }
  }
  
  private mapLogLevel(level: LogLevel): number {
    const mapping: Record<LogLevel, number> = {
      'SILLY': 0,
      'TRACE': 1,
      'DEBUG': 2,
      'INFO': 3,
      'WARN': 4,
      'ERROR': 5,
      'FATAL': 6,
      'OFF': 7
    };
    return mapping[level] || 3;
  }
  
  private transportJSON(log: ILogObj): void {
    // Custom transport for browser console
    const level = this.getLogLevelName(log._meta?.logLevelId || 3);
    const method = getConsoleMethod(level);
    
    // Sanitize data if needed
    let logData = log;
    if (this.config.enableDataSanitization) {
      logData = sanitizeData(log, this.config.sensitiveKeys);
    }
    
    // Output to console
    if (this.config.isDevelopment) {
      console[method](`[${level}] [${log._meta?.name}]`, log['0'], logData);
    } else {
      console[method](JSON.stringify(logData));
    }
    
    // Store in localStorage if enabled
    if (this.config.enableLocalStorage) {
      const entry: IStoredLogEntry = {
        level,
        message: log['0'] || '',
        context: this.context,
        timestamp: formatTimestamp(),
        data: logData
      };
      storeLogEntry(entry, this.config.maxStoredLogs);
    }
  }
  
  private getLogLevelName(levelId: number): LogLevel {
    const levels: LogLevel[] = ['SILLY', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    return levels[levelId] || 'INFO';
  }
  
  silly(message: string, data?: unknown): void {
    if (!shouldLog('SILLY', this.config.level)) return;
    this.tsLogger.silly(message, this.prepareData(data));
  }
  
  trace(message: string, data?: unknown): void {
    if (!shouldLog('TRACE', this.config.level)) return;
    this.tsLogger.trace(message, this.prepareData(data));
  }
  
  debug(message: string, data?: unknown): void {
    if (!shouldLog('DEBUG', this.config.level)) return;
    this.tsLogger.debug(message, this.prepareData(data));
  }
  
  info(message: string, data?: unknown): void {
    if (!shouldLog('INFO', this.config.level)) return;
    this.tsLogger.info(message, this.prepareData(data));
  }
  
  warn(message: string, data?: unknown): void {
    if (!shouldLog('WARN', this.config.level)) return;
    this.tsLogger.warn(message, this.prepareData(data));
  }
  
  error(message: string, error?: Error | unknown, context?: IErrorContext): void {
    if (!shouldLog('ERROR', this.config.level)) return;
    
    const errorData = {
      message,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: this.config.isDevelopment ? error.stack : undefined
      } : error,
      context,
      ...this.context
    };
    
    this.tsLogger.error(message, this.prepareData(errorData));
  }
  
  fatal(message: string, error?: Error | unknown, context?: IErrorContext): void {
    if (!shouldLog('FATAL', this.config.level)) return;
    
    const errorData = {
      message,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error,
      context,
      ...this.context
    };
    
    this.tsLogger.fatal(message, this.prepareData(errorData));
  }
  
  logUserAction(action: IUserAction): void {
    if (!shouldLog('INFO', this.config.level)) return;
    
    const actionData = {
      ...action,
      ...this.context,
      correlationId: generateCorrelationId()
    };
    
    this.tsLogger.info(`User Action: ${action.type}`, this.prepareData(actionData));
  }
  
  logDatabaseOperation(operation: IDatabaseLogEntry): void {
    const level = operation.error ? 'ERROR' : 'DEBUG';
    if (!shouldLog(level, this.config.level)) return;
    
    const operationData = {
      ...operation,
      ...this.context
    };
    
    if (operation.error) {
      this.tsLogger.error(`Database Error: ${operation.functionName}`, this.prepareData(operationData));
    } else {
      this.tsLogger.debug(`Database Operation: ${operation.functionName}`, this.prepareData(operationData));
    }
  }
  
  logPerformance(metrics: IPerformanceMetrics): void {
    const level = metrics.exceededThreshold ? 'WARN' : 'DEBUG';
    if (!shouldLog(level, this.config.level)) return;
    
    const perfData = {
      ...metrics,
      ...this.context
    };
    
    if (metrics.exceededThreshold) {
      this.tsLogger.warn(`Performance threshold exceeded: ${metrics.operation}`, this.prepareData(perfData));
    } else {
      this.tsLogger.debug(`Performance: ${metrics.operation}`, this.prepareData(perfData));
    }
  }
  
  getSubLogger(name: string, context?: Partial<ILogContext>): ILogger {
    const subContext = {
      ...this.context,
      ...context
    };
    
    return new LoggerImpl(
      `${this.tsLogger.settings.name}.${name}`,
      this.config,
      this.tsLogger,
      subContext
    );
  }
  
  private prepareData(data: unknown): any {
    if (this.config.enableDataSanitization) {
      return sanitizeData(data, this.config.sensitiveKeys);
    }
    return data;
  }
}

/**
 * Main logging service singleton
 */
export class LoggingService {
  private static instance: LoggingService;
  private mainLogger: ILogger;
  private subLoggers: Map<string, ILogger>;
  private config: ILoggingConfig;
  private stats: IMonitoringStats;
  
  private constructor() {
    this.config = getLoggingConfig();
    this.subLoggers = new Map();
    this.mainLogger = new LoggerImpl('LodgepriceApp', this.config);
    
    // Initialize stats
    this.stats = {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      averageResponseTime: 0,
      slowOperations: [],
      recentErrors: [],
      databaseOperations: 0,
      userActions: 0
    };
    
    // Log initialization
    this.mainLogger.info('Logging service initialized', {
      config: {
        level: this.config.level,
        isDevelopment: this.config.isDevelopment,
        performanceMonitoring: this.config.enablePerformanceMonitoring
      }
    });
  }
  
  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }
  
  getLogger(name?: string): ILogger {
    if (!name) return this.mainLogger;
    
    if (!this.subLoggers.has(name)) {
      const logger = this.mainLogger.getSubLogger(name);
      this.subLoggers.set(name, logger);
    }
    
    return this.subLoggers.get(name)!;
  }
  
  updateStats(type: 'log' | 'error' | 'warning' | 'database' | 'userAction'): void {
    this.stats.totalLogs++;
    
    switch (type) {
      case 'error':
        this.stats.errorCount++;
        break;
      case 'warning':
        this.stats.warningCount++;
        break;
      case 'database':
        this.stats.databaseOperations++;
        break;
      case 'userAction':
        this.stats.userActions++;
        break;
    }
  }
  
  getStats(): IMonitoringStats {
    return { ...this.stats };
  }
  
  clearStoredLogs(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('lodgeprice_logs');
    }
  }
  
  getStoredLogs(): IStoredLogEntry[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    
    try {
      return JSON.parse(localStorage.getItem('lodgeprice_logs') || '[]');
    } catch {
      return [];
    }
  }
  
  setLogLevel(level: LogLevel): void {
    this.config.level = level;
    this.mainLogger.info(`Log level changed to ${level}`);
  }
  
  isEnabled(): boolean {
    return this.config.level !== 'OFF';
  }
}

// Export singleton instance getter
export const getLogger = (name?: string): ILogger => {
  return LoggingService.getInstance().getLogger(name);
};

export default LoggingService;