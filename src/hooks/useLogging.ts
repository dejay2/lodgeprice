/**
 * React hook for component-level logging
 * Provides logging functionality to React components
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { getLogger } from '@/lib/logging/LoggingService';
import type { ILogger, IUserAction, IErrorContext } from '@/lib/logging/types';

/**
 * Hook options
 */
interface UseLoggingOptions {
  componentName: string;
  userId?: string;
  propertyId?: string;
  enableAutoMount?: boolean;
}

/**
 * Hook return type
 */
interface UseLoggingReturn {
  logger: ILogger;
  logUserAction: (action: Omit<IUserAction, 'timestamp'>) => void;
  logError: (message: string, error: Error | unknown, context?: Partial<IErrorContext>) => void;
  logInfo: (message: string, data?: unknown) => void;
  logDebug: (message: string, data?: unknown) => void;
  logWarning: (message: string, data?: unknown) => void;
}

/**
 * useLogging hook for component-level logging
 */
export function useLogging(options: UseLoggingOptions): UseLoggingReturn {
  const { componentName, userId, propertyId, enableAutoMount = true } = options;
  const mountedRef = useRef(false);
  
  // Create a logger instance for this component
  const logger = useMemo(() => {
    return getLogger(`Component.${componentName}`).getSubLogger(componentName, {
      userId,
      propertyId
    });
  }, [componentName, userId, propertyId]);
  
  // Log component mount/unmount if enabled
  useEffect(() => {
    if (enableAutoMount) {
      if (!mountedRef.current) {
        mountedRef.current = true;
        logger.debug(`Component mounted: ${componentName}`, {
          userId,
          propertyId
        });
      }
      
      return () => {
        logger.debug(`Component unmounted: ${componentName}`, {
          userId,
          propertyId
        });
      };
    }
  }, [logger, componentName, userId, propertyId, enableAutoMount]);
  
  // Log user actions with component context
  const logUserAction = useCallback((action: Omit<IUserAction, 'timestamp'>) => {
    const fullAction: IUserAction = {
      ...action,
      timestamp: Date.now(),
      userId: action.userId || userId,
      propertyId: action.propertyId || propertyId
    };
    
    logger.logUserAction(fullAction);
  }, [logger, userId, propertyId]);
  
  // Log errors with component context
  const logError = useCallback((
    message: string, 
    error: Error | unknown, 
    context?: Partial<IErrorContext>
  ) => {
    const errorContext: IErrorContext = {
      componentStack: componentName,
      severity: 'medium',
      ...context
    };
    
    logger.error(message, error, errorContext);
  }, [logger, componentName]);
  
  // Convenience logging methods
  const logInfo = useCallback((message: string, data?: unknown) => {
    logger.info(message, data);
  }, [logger]);
  
  const logDebug = useCallback((message: string, data?: unknown) => {
    logger.debug(message, data);
  }, [logger]);
  
  const logWarning = useCallback((message: string, data?: unknown) => {
    logger.warn(message, data);
  }, [logger]);
  
  return {
    logger,
    logUserAction,
    logError,
    logInfo,
    logDebug,
    logWarning
  };
}

/**
 * Hook for tracking user interactions
 */
export function useActionLogging(componentName: string) {
  const { logUserAction } = useLogging({ componentName });
  
  const logClick = useCallback((elementId: string, metadata?: Record<string, unknown>) => {
    logUserAction({
      type: 'property_selection',
      context: {
        action: 'click',
        elementId,
        ...metadata
      }
    });
  }, [logUserAction]);
  
  const logChange = useCallback((
    fieldName: string, 
    previousValue: unknown, 
    newValue: unknown, 
    metadata?: Record<string, unknown>
  ) => {
    logUserAction({
      type: 'price_change',
      context: {
        fieldName,
        ...metadata
      },
      previousValue,
      newValue
    });
  }, [logUserAction]);
  
  const logNavigation = useCallback((
    from: string, 
    to: string, 
    metadata?: Record<string, unknown>
  ) => {
    logUserAction({
      type: 'calendar_navigation',
      context: {
        from,
        to,
        ...metadata
      }
    });
  }, [logUserAction]);
  
  return {
    logClick,
    logChange,
    logNavigation
  };
}

export default useLogging;