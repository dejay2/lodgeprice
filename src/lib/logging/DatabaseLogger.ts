/**
 * Database operation logging wrapper for Supabase client
 * Automatically logs all database function calls with performance metrics
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IDatabaseLogger, IDatabaseLogEntry } from './types';
import { getLogger } from './LoggingService';
import { performanceMonitor } from './PerformanceMonitor';
import { generateCorrelationId } from './config';

/**
 * Database logger implementation
 */
export class DatabaseLogger implements IDatabaseLogger {
  private static instance: DatabaseLogger;
  private logger = getLogger('Database');
  private stats = {
    totalQueries: 0,
    totalTime: 0,
    slowQueries: [] as IDatabaseLogEntry[]
  };
  
  private constructor() {
    this.logger.info('Database logger initialized');
  }
  
  static getInstance(): DatabaseLogger {
    if (!DatabaseLogger.instance) {
      DatabaseLogger.instance = new DatabaseLogger();
    }
    return DatabaseLogger.instance;
  }
  
  logQuery(query: string, params?: unknown[], duration?: number): void {
    this.stats.totalQueries++;
    
    if (duration) {
      this.stats.totalTime += duration;
    }
    
    const entry: IDatabaseLogEntry = {
      functionName: 'query',
      parameters: { query, params } as any,
      executionTime: duration || 0,
      query
    };
    
    this.logger.logDatabaseOperation(entry);
    
    // Track slow queries (>100ms)
    if (duration && duration > 100) {
      this.stats.slowQueries.push(entry);
      this.logger.warn('Slow query detected', {
        query,
        duration,
        params
      });
    }
  }
  
  logFunction(
    functionName: string,
    params: Record<string, unknown>,
    result?: unknown,
    error?: Error
  ): void {
    const entry: IDatabaseLogEntry = {
      functionName,
      parameters: params,
      executionTime: 0,
      result: result ? { success: true, rowCount: Array.isArray(result) ? result.length : 1 } : undefined,
      error: error?.message
    };
    
    this.logger.logDatabaseOperation(entry);
    
    if (error) {
      this.logger.error(`Database function error: ${functionName}`, error, {
        functionName,
        parameters: params
      } as any);
    }
  }
  
  logTransaction(transactionId: string, operations: IDatabaseLogEntry[]): void {
    const totalTime = operations.reduce((sum, op) => sum + op.executionTime, 0);
    const hasErrors = operations.some(op => op.error);
    
    this.logger.info(`Database transaction ${hasErrors ? 'failed' : 'completed'}`, {
      transactionId,
      operationCount: operations.length,
      totalTime,
      hasErrors,
      operations: operations.map(op => ({
        function: op.functionName,
        time: op.executionTime,
        error: op.error
      }))
    });
  }
  
  getStats(): { totalQueries: number; averageTime: number; slowQueries: IDatabaseLogEntry[] } {
    return {
      totalQueries: this.stats.totalQueries,
      averageTime: this.stats.totalQueries > 0 ? this.stats.totalTime / this.stats.totalQueries : 0,
      slowQueries: [...this.stats.slowQueries]
    };
  }
  
  /**
   * Wrap Supabase client to add automatic logging
   */
  wrapSupabaseClient<T extends SupabaseClient>(client: T): T {
    const logger = this.logger;
    const logQuery = this.logQuery.bind(this);
    const logFunction = this.logFunction.bind(this);
    
    // Create a proxy for the RPC method
    const originalRpc = client.rpc.bind(client);
    
    // Override the rpc method
    (client as any).rpc = function(functionName: string, params?: any, options?: any) {
      const correlationId = generateCorrelationId();
      const measurementId = performanceMonitor.startMeasurement(`db_function_${functionName}`, {
        functionName,
        params,
        correlationId
      });
      
      logger.debug(`Calling database function: ${functionName}`, {
        functionName,
        params,
        correlationId
      });
      
      // Call the original RPC method
      const result = originalRpc(functionName, params, options);
      
      // Wrap the promise chain to log results
      const wrappedResult = {
        ...result,
        then: function(onFulfilled?: any, onRejected?: any) {
          return result.then(
            (response: any) => {
              const metrics = performanceMonitor.endMeasurement(measurementId);
              
              if (response.error) {
                logFunction(functionName, params || {}, undefined, response.error);
                logger.error(`Database function error: ${functionName}`, response.error, {
                  functionName,
                  params,
                  correlationId,
                  duration: metrics?.duration
                } as any);
              } else {
                logFunction(functionName, params || {}, response.data, undefined);
                logger.debug(`Database function success: ${functionName}`, {
                  functionName,
                  params,
                  correlationId,
                  duration: metrics?.duration,
                  rowCount: Array.isArray(response.data) ? response.data.length : 1
                });
              }
              
              // Call the original onFulfilled
              return onFulfilled ? onFulfilled(response) : response;
            },
            (error: any) => {
              const metrics = performanceMonitor.endMeasurement(measurementId);
              
              logFunction(functionName, params || {}, undefined, error);
              logger.error(`Database function failed: ${functionName}`, error, {
                functionName,
                params,
                correlationId,
                duration: metrics?.duration
              } as any);
              
              // Call the original onRejected
              return onRejected ? onRejected(error) : Promise.reject(error);
            }
          );
        }
      };
      
      // Copy other methods from the original result
      const methodsToCopy = ['catch', 'finally', 'select', 'single', 'maybeSingle'];
      for (const method of methodsToCopy) {
        if (method in result) {
          (wrappedResult as any)[method] = (result as any)[method].bind(result);
        }
      }
      
      return wrappedResult;
    };
    
    // Wrap the from method for table operations
    const originalFrom = client.from.bind(client);
    
    (client as any).from = function(table: string) {
      const correlationId = generateCorrelationId();
      const query = originalFrom(table);
      
      // List of methods to wrap
      const methodsToWrap = ['select', 'insert', 'update', 'delete', 'upsert'];
      
      for (const method of methodsToWrap) {
        if (method in query) {
          const originalMethod = (query as any)[method].bind(query);
          
          (query as any)[method] = function(...args: any[]) {
            const measurementId = performanceMonitor.startMeasurement(`db_${method}_${table}`, {
              table,
              method,
              args,
              correlationId
            });
            
            logger.debug(`Database ${method} on ${table}`, {
              table,
              method,
              args,
              correlationId
            });
            
            const result = originalMethod(...args);
            
            // Wrap the promise chain
            const originalThen = result.then?.bind(result);
            if (originalThen) {
              result.then = function(onFulfilled?: any, onRejected?: any) {
                return originalThen(
                  (response: any) => {
                    const metrics = performanceMonitor.endMeasurement(measurementId);
                    
                    if (response.error) {
                      logger.error(`Database ${method} error on ${table}`, response.error, {
                        table,
                        method,
                        correlationId,
                        duration: metrics?.duration
                      } as any);
                    } else {
                      logger.debug(`Database ${method} success on ${table}`, {
                        table,
                        method,
                        correlationId,
                        duration: metrics?.duration,
                        rowCount: Array.isArray(response.data) ? response.data.length : 1
                      });
                    }
                    
                    return onFulfilled ? onFulfilled(response) : response;
                  },
                  (error: any) => {
                    const metrics = performanceMonitor.endMeasurement(measurementId);
                    
                    logger.error(`Database ${method} failed on ${table}`, error, {
                      table,
                      method,
                      correlationId,
                      duration: metrics?.duration
                    } as any);
                    
                    return onRejected ? onRejected(error) : Promise.reject(error);
                  }
                );
              };
            }
            
            return result;
          };
        }
      }
      
      return query;
    };
    
    return client;
  }
}

// Export singleton instance
export const databaseLogger = DatabaseLogger.getInstance();

/**
 * Helper function to wrap existing Supabase client
 */
export function wrapSupabaseClient<T extends SupabaseClient>(client: T): T {
  return databaseLogger.wrapSupabaseClient(client);
}

export default databaseLogger;