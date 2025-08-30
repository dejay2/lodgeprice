/**
 * Logging configuration management
 * Handles environment-based configuration for the logging system
 */

import type { ILoggingConfig, LogLevel } from './types';

/**
 * List of keys that should be sanitized from logs
 */
const DEFAULT_SENSITIVE_KEYS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'apikey',
  'secret',
  'authorization',
  'auth',
  'cookie',
  'session',
  'credit_card',
  'creditCard',
  'ssn',
  'social_security',
  'private_key',
  'privateKey',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'bearer',
  'api-key',
  'x-api-key',
  'service_role_key',
  'anon_key',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_ANON_KEY'
];

/**
 * Parse log level from environment variable
 */
function parseLogLevel(level: string | undefined): LogLevel {
  const validLevels: LogLevel[] = ['SILLY', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF'];
  const upperLevel = (level || 'INFO').toUpperCase() as LogLevel;
  
  if (validLevels.includes(upperLevel)) {
    return upperLevel;
  }
  
  // Default to INFO if invalid level provided
  console.warn(`Invalid log level "${level}". Defaulting to INFO.`);
  return 'INFO';
}

/**
 * Get logging configuration from environment variables
 */
export function getLoggingConfig(): ILoggingConfig {
  const isDevelopment = import.meta.env.VITE_DEVELOPMENT_MODE === 'true' || 
                        import.meta.env.DEV === true ||
                        import.meta.env.MODE === 'development';
  
  // Determine log level based on environment
  const envLogLevel = import.meta.env.VITE_LOG_LEVEL;
  const defaultLevel = isDevelopment ? 'DEBUG' : 'WARN';
  const level = parseLogLevel(envLogLevel || defaultLevel);
  
  // Parse performance monitoring setting
  const enablePerformanceMonitoring = 
    import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false';
  
  return {
    level,
    isDevelopment,
    enablePerformanceMonitoring,
    enableLocalStorage: isDevelopment, // Only store logs in development
    maxStoredLogs: 100, // Maximum number of logs to store in localStorage
    sensitiveKeys: DEFAULT_SENSITIVE_KEYS,
    enableDataSanitization: !isDevelopment // Sanitize data in production
  };
}

/**
 * Map log levels to numeric values for comparison
 */
export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  'SILLY': 0,
  'TRACE': 1,
  'DEBUG': 2,
  'INFO': 3,
  'WARN': 4,
  'ERROR': 5,
  'FATAL': 6,
  'OFF': 7
};

/**
 * Check if a log level should be logged based on current configuration
 */
export function shouldLog(level: LogLevel, configLevel: LogLevel): boolean {
  if (configLevel === 'OFF') return false;
  return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[configLevel];
}

/**
 * Get console method for log level
 */
export function getConsoleMethod(level: LogLevel): keyof Console {
  switch (level) {
    case 'SILLY':
    case 'TRACE':
      return 'debug';
    case 'DEBUG':
      return 'debug';
    case 'INFO':
      return 'info';
    case 'WARN':
      return 'warn';
    case 'ERROR':
    case 'FATAL':
      return 'error';
    default:
      return 'log';
  }
}

/**
 * Format log timestamp
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Generate a unique session ID for tracking user sessions
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a correlation ID for tracking related operations
 */
export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Environment-specific configuration presets
 */
export const CONFIG_PRESETS = {
  development: {
    level: 'DEBUG' as LogLevel,
    isDevelopment: true,
    enablePerformanceMonitoring: true,
    enableLocalStorage: true,
    maxStoredLogs: 500,
    sensitiveKeys: DEFAULT_SENSITIVE_KEYS,
    enableDataSanitization: false
  },
  production: {
    level: 'WARN' as LogLevel,
    isDevelopment: false,
    enablePerformanceMonitoring: true,
    enableLocalStorage: false,
    maxStoredLogs: 0,
    sensitiveKeys: DEFAULT_SENSITIVE_KEYS,
    enableDataSanitization: true
  },
  testing: {
    level: 'ERROR' as LogLevel,
    isDevelopment: false,
    enablePerformanceMonitoring: false,
    enableLocalStorage: false,
    maxStoredLogs: 0,
    sensitiveKeys: DEFAULT_SENSITIVE_KEYS,
    enableDataSanitization: true
  }
} as const;

/**
 * Performance thresholds for different operations (in milliseconds)
 */
export const PERFORMANCE_THRESHOLDS = {
  DATABASE_QUERY: 100,
  DATABASE_FUNCTION: 200,
  API_CALL: 500,
  CALENDAR_RENDER: 2000,
  PRICING_CALCULATION: 50,
  PAGE_LOAD: 3000,
  COMPONENT_RENDER: 16 // ~60fps
} as const;

export default getLoggingConfig;