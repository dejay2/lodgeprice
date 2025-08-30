/**
 * React hook for performance monitoring
 * Provides performance measurement capabilities to React components
 */

import React, { useCallback, useEffect, useRef, useState, Profiler } from 'react';
import { performanceMonitor } from '@/lib/logging/PerformanceMonitor';
import type { IPerformanceMetrics } from '@/lib/logging/types';

/**
 * Hook options
 */
interface UsePerformanceMonitorOptions {
  componentName: string;
  autoMeasureRender?: boolean;
  threshold?: number;
}

/**
 * Hook return type
 */
interface UsePerformanceMonitorReturn {
  startMeasurement: (name: string, metadata?: Record<string, unknown>) => string;
  endMeasurement: (measurementId: string) => IPerformanceMetrics | null;
  measureAsync: <T>(name: string, operation: () => Promise<T>) => Promise<T>;
  measureSync: <T>(name: string, operation: () => T) => T;
  metrics: IPerformanceMetrics[];
  clearMetrics: () => void;
  ProfilerWrapper: React.FC<{ children: React.ReactNode; id?: string }>;
}

/**
 * usePerformanceMonitor hook for component performance tracking
 */
export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions
): UsePerformanceMonitorReturn {
  const { componentName, autoMeasureRender = false, threshold } = options;
  const [metrics, setMetrics] = useState<IPerformanceMetrics[]>([]);
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(performance.now());
  
  // Track component mount time
  useEffect(() => {
    mountTimeRef.current = performance.now();
    
    if (autoMeasureRender) {
      const mountDuration = performance.now() - mountTimeRef.current;
      performanceMonitor.measureComponentRender(componentName, 'mount', mountDuration);
    }
  }, [componentName, autoMeasureRender]);
  
  // Start a performance measurement
  const startMeasurement = useCallback((name: string, metadata?: Record<string, unknown>) => {
    const fullName = `${componentName}_${name}`;
    return performanceMonitor.startMeasurement(fullName, {
      ...metadata,
      component: componentName,
      threshold
    });
  }, [componentName, threshold]);
  
  // End a performance measurement
  const endMeasurement = useCallback((measurementId: string) => {
    const result = performanceMonitor.endMeasurement(measurementId);
    if (result) {
      setMetrics(prev => [...prev, result]);
    }
    return result;
  }, []);
  
  // Measure an async operation
  const measureAsync = useCallback(async <T,>(
    name: string, 
    operation: () => Promise<T>
  ): Promise<T> => {
    const fullName = `${componentName}_${name}`;
    const result = await performanceMonitor.measureAsync(fullName, operation, {
      threshold,
      autoLog: true
    });
    
    // Update local metrics
    const allMetrics = performanceMonitor.getMetrics();
    const componentMetrics = allMetrics.filter(m => 
      m.operation.includes(componentName)
    );
    setMetrics(componentMetrics);
    
    return result;
  }, [componentName, threshold]);
  
  // Measure a sync operation
  const measureSync = useCallback(<T,>(
    name: string, 
    operation: () => T
  ): T => {
    const fullName = `${componentName}_${name}`;
    const result = performanceMonitor.measureSync(fullName, operation, {
      threshold,
      autoLog: true
    });
    
    // Update local metrics
    const allMetrics = performanceMonitor.getMetrics();
    const componentMetrics = allMetrics.filter(m => 
      m.operation.includes(componentName)
    );
    setMetrics(componentMetrics);
    
    return result;
  }, [componentName, threshold]);
  
  // Clear metrics
  const clearMetrics = useCallback(() => {
    setMetrics([]);
    // Note: This doesn't clear global metrics, only local component metrics
  }, []);
  
  // React Profiler wrapper component
  const ProfilerWrapper = useCallback(({ 
    children, 
    id 
  }: { 
    children: React.ReactNode; 
    id?: string;
  }) => {
    const profilerId = id || componentName;
    
    const onRenderCallback = (
      id: string,
      phase: 'mount' | 'update',
      actualDuration: number,
      baseDuration: number,
      startTime: number,
      commitTime: number
    ) => {
      renderCountRef.current++;
      
      // Log render performance
      performanceMonitor.measureComponentRender(profilerId, phase, actualDuration);
      
      // Update local metrics
      const metric: IPerformanceMetrics = {
        operation: `render_${phase}_${profilerId}`,
        startTime,
        endTime: commitTime,
        duration: actualDuration,
        metadata: {
          phase,
          baseDuration,
          renderCount: renderCountRef.current
        }
      };
      
      setMetrics(prev => [...prev, metric]);
    };
    
    return React.createElement(
      Profiler,
      { id: profilerId, onRender: onRenderCallback },
      children
    );
  }, [componentName]);
  
  return {
    startMeasurement,
    endMeasurement,
    measureAsync,
    measureSync,
    metrics,
    clearMetrics,
    ProfilerWrapper
  };
}

/**
 * Hook for measuring specific operations
 */
export function useOperationTiming(operationName: string) {
  const measurementRef = useRef<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  const start = useCallback(() => {
    if (measurementRef.current) {
      // End previous measurement if exists
      performanceMonitor.endMeasurement(measurementRef.current);
    }
    
    measurementRef.current = performanceMonitor.startMeasurement(operationName);
    setIsRunning(true);
    setDuration(null);
  }, [operationName]);
  
  const end = useCallback(() => {
    if (measurementRef.current) {
      const result = performanceMonitor.endMeasurement(measurementRef.current);
      if (result) {
        setDuration(result.duration);
      }
      measurementRef.current = null;
      setIsRunning(false);
    }
  }, []);
  
  const reset = useCallback(() => {
    if (measurementRef.current) {
      performanceMonitor.endMeasurement(measurementRef.current);
      measurementRef.current = null;
    }
    setDuration(null);
    setIsRunning(false);
  }, []);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (measurementRef.current) {
        performanceMonitor.endMeasurement(measurementRef.current);
      }
    };
  }, []);
  
  return {
    start,
    end,
    reset,
    duration,
    isRunning
  };
}

export default usePerformanceMonitor;