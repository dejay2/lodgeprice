/**
 * Performance monitoring using browser Performance API
 * Provides timing measurements for database operations and UI rendering
 */

import type { IPerformanceMonitor, IPerformanceMetrics, IPerformanceOptions } from './types';
import { getLogger } from './LoggingService';
import { PERFORMANCE_THRESHOLDS } from './config';

/**
 * Check if Performance API is available
 */
function isPerformanceAPIAvailable(): boolean {
  return typeof window !== 'undefined' && 
         'performance' in window && 
         'mark' in performance &&
         'measure' in performance;
}

/**
 * Fallback timing using Date.now()
 */
class BasicTiming {
  private marks: Map<string, number> = new Map();
  
  mark(name: string): void {
    this.marks.set(name, Date.now());
  }
  
  measure(name: string, startMark: string, endMark: string): number {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);
    
    if (start === undefined || end === undefined) {
      return 0;
    }
    
    return end - start;
  }
  
  clearMarks(): void {
    this.marks.clear();
  }
}

/**
 * Performance monitor implementation
 */
export class PerformanceMonitor implements IPerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Map<string, { startTime: number; metadata?: Record<string, unknown> }>;
  private metrics: IPerformanceMetrics[];
  private logger = getLogger('PerformanceMonitor');
  private usePerformanceAPI: boolean;
  private basicTiming: BasicTiming;
  private enabled: boolean;
  
  private constructor() {
    this.measurements = new Map();
    this.metrics = [];
    this.usePerformanceAPI = isPerformanceAPIAvailable();
    this.basicTiming = new BasicTiming();
    this.enabled = true;
    
    if (!this.usePerformanceAPI) {
      this.logger.info('Performance API not available, using Date.now() fallback');
    }
    
    // Set up performance observer if available
    if (this.usePerformanceAPI && 'PerformanceObserver' in window) {
      this.setupPerformanceObserver();
    }
  }
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  private setupPerformanceObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure') {
            this.logger.debug(`Performance measure: ${entry.name}`, {
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['measure'] });
    } catch (error) {
      this.logger.warn('Failed to setup PerformanceObserver', error);
    }
  }
  
  startMeasurement(name: string, metadata?: Record<string, unknown>): string {
    if (!this.enabled) return name;
    
    const measurementId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = this.usePerformanceAPI ? performance.now() : Date.now();
    
    this.measurements.set(measurementId, { startTime, metadata });
    
    if (this.usePerformanceAPI) {
      performance.mark(`${measurementId}_start`);
    } else {
      this.basicTiming.mark(`${measurementId}_start`);
    }
    
    this.logger.trace(`Started measurement: ${name}`, { measurementId, metadata });
    
    return measurementId;
  }
  
  endMeasurement(measurementId: string): IPerformanceMetrics | null {
    if (!this.enabled) return null;
    
    const measurement = this.measurements.get(measurementId);
    if (!measurement) {
      this.logger.warn(`Measurement not found: ${measurementId}`);
      return null;
    }
    
    const endTime = this.usePerformanceAPI ? performance.now() : Date.now();
    
    if (this.usePerformanceAPI) {
      performance.mark(`${measurementId}_end`);
      try {
        performance.measure(measurementId, `${measurementId}_start`, `${measurementId}_end`);
      } catch (error) {
        this.logger.debug('Performance.measure failed', error);
      }
    } else {
      this.basicTiming.mark(`${measurementId}_end`);
    }
    
    const duration = endTime - measurement.startTime;
    const operation = measurementId.split('_')[0];
    
    // Check against thresholds
    const threshold = this.getThreshold(operation);
    const exceededThreshold = threshold ? duration > threshold : false;
    
    const metrics: IPerformanceMetrics = {
      operation,
      startTime: measurement.startTime,
      endTime,
      duration,
      metadata: measurement.metadata,
      threshold,
      exceededThreshold
    };
    
    this.metrics.push(metrics);
    this.measurements.delete(measurementId);
    
    // Log performance metrics
    this.logger.logPerformance(metrics);
    
    // Track slow operations
    if (exceededThreshold) {
      this.trackSlowOperation(metrics);
    }
    
    // Clean up performance marks
    if (this.usePerformanceAPI) {
      try {
        performance.clearMarks(`${measurementId}_start`);
        performance.clearMarks(`${measurementId}_end`);
        performance.clearMeasures(measurementId);
      } catch (error) {
        // Fail silently
      }
    }
    
    return metrics;
  }
  
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    options?: IPerformanceOptions
  ): Promise<T> {
    if (!this.enabled) {
      return operation();
    }
    
    const measurementId = this.startMeasurement(name, options as any);
    
    try {
      const result = await operation();
      const metrics = this.endMeasurement(measurementId);
      
      if (options?.autoLog && metrics) {
        this.logger.info(`Operation completed: ${name}`, {
          duration: metrics.duration,
          threshold: metrics.threshold,
          exceededThreshold: metrics.exceededThreshold
        });
      }
      
      return result;
    } catch (error) {
      const metrics = this.endMeasurement(measurementId);
      
      this.logger.error(`Operation failed: ${name}`, error, {
        duration: metrics?.duration,
        metadata: options as any
      } as any);
      
      throw error;
    }
  }
  
  measureSync<T>(
    name: string,
    operation: () => T,
    options?: IPerformanceOptions
  ): T {
    if (!this.enabled) {
      return operation();
    }
    
    const measurementId = this.startMeasurement(name, options as any);
    
    try {
      const result = operation();
      const metrics = this.endMeasurement(measurementId);
      
      if (options?.autoLog && metrics) {
        this.logger.info(`Operation completed: ${name}`, {
          duration: metrics.duration,
          threshold: metrics.threshold,
          exceededThreshold: metrics.exceededThreshold
        });
      }
      
      return result;
    } catch (error) {
      const metrics = this.endMeasurement(measurementId);
      
      this.logger.error(`Operation failed: ${name}`, error, {
        duration: metrics?.duration,
        metadata: options as any
      } as any);
      
      throw error;
    }
  }
  
  getMetrics(): IPerformanceMetrics[] {
    return [...this.metrics];
  }
  
  clearMetrics(): void {
    this.metrics = [];
    this.measurements.clear();
    
    if (this.usePerformanceAPI) {
      performance.clearMarks();
      performance.clearMeasures();
    } else {
      this.basicTiming.clearMarks();
    }
    
    this.logger.debug('Performance metrics cleared');
  }
  
  private getThreshold(operation: string): number | undefined {
    // Check for specific operation thresholds
    const upperOperation = operation.toUpperCase();
    
    for (const [key, value] of Object.entries(PERFORMANCE_THRESHOLDS)) {
      if (upperOperation.includes(key.replace('_', ''))) {
        return value;
      }
    }
    
    // Default thresholds based on operation type
    if (operation.toLowerCase().includes('database')) {
      return PERFORMANCE_THRESHOLDS.DATABASE_QUERY;
    }
    if (operation.toLowerCase().includes('api')) {
      return PERFORMANCE_THRESHOLDS.API_CALL;
    }
    if (operation.toLowerCase().includes('render')) {
      return PERFORMANCE_THRESHOLDS.COMPONENT_RENDER;
    }
    if (operation.toLowerCase().includes('calendar')) {
      return PERFORMANCE_THRESHOLDS.CALENDAR_RENDER;
    }
    if (operation.toLowerCase().includes('pricing')) {
      return PERFORMANCE_THRESHOLDS.PRICING_CALCULATION;
    }
    
    return undefined;
  }
  
  private trackSlowOperation(metrics: IPerformanceMetrics): void {
    // Store slow operations for monitoring
    const slowOps = this.getSlowOperations();
    slowOps.push(metrics);
    
    // Keep only the last 100 slow operations
    if (slowOps.length > 100) {
      slowOps.shift();
    }
    
    // Store in localStorage for debugging
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('lodgeprice_slow_operations', JSON.stringify(slowOps));
      }
    } catch (error) {
      // Fail silently
    }
  }
  
  getSlowOperations(): IPerformanceMetrics[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem('lodgeprice_slow_operations');
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (error) {
      // Fail silently
    }
    
    return [];
  }
  
  getAverageMetrics(): Record<string, { count: number; avgDuration: number; maxDuration: number }> {
    const grouped: Record<string, number[]> = {};
    
    for (const metric of this.metrics) {
      if (!grouped[metric.operation]) {
        grouped[metric.operation] = [];
      }
      grouped[metric.operation].push(metric.duration);
    }
    
    const averages: Record<string, { count: number; avgDuration: number; maxDuration: number }> = {};
    
    for (const [operation, durations] of Object.entries(grouped)) {
      const sum = durations.reduce((a, b) => a + b, 0);
      averages[operation] = {
        count: durations.length,
        avgDuration: sum / durations.length,
        maxDuration: Math.max(...durations)
      };
    }
    
    return averages;
  }
  
  enable(): void {
    this.enabled = true;
    this.logger.info('Performance monitoring enabled');
  }
  
  disable(): void {
    this.enabled = false;
    this.logger.info('Performance monitoring disabled');
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Measure React component render performance
   */
  measureComponentRender(componentName: string, phase: 'mount' | 'update', actualDuration: number): void {
    if (!this.enabled) return;
    
    const metrics: IPerformanceMetrics = {
      operation: `component_${phase}_${componentName}`,
      startTime: performance.now() - actualDuration,
      endTime: performance.now(),
      duration: actualDuration,
      metadata: { componentName, phase },
      threshold: PERFORMANCE_THRESHOLDS.COMPONENT_RENDER,
      exceededThreshold: actualDuration > PERFORMANCE_THRESHOLDS.COMPONENT_RENDER
    };
    
    this.metrics.push(metrics);
    this.logger.logPerformance(metrics);
    
    if (metrics.exceededThreshold) {
      this.trackSlowOperation(metrics);
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

export default performanceMonitor;