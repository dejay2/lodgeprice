/**
 * Contextual Help System - Public API
 * 
 * Exports all components, hooks, and utilities for the contextual help system
 * Implements PRP-55 requirements for accessible tooltip functionality
 */

// React import will be needed for future utility functions
// import React from 'react'

// Core Components
export { Tooltip, type TooltipProps, type TooltipPlacement, type TooltipTrigger } from './Tooltip/Tooltip'
export { TooltipProvider, useTooltipContext, withTooltipProvider, type TooltipContextValue } from './TooltipProvider'

// Hooks
export { 
  useTooltip, 
  useInlineEditTooltip, 
  useManagementButtonTooltip,
  type UseTooltipOptions,
  type UseTooltipReturn
} from './hooks/useTooltip'

// Content Management
export { 
  HELP_CONTENT, 
  HELP_INTEGRATIONS, 
  HELP_CONTEXTS, 
  HELP_REGISTRY,
  HelpContentUtils
} from './HelpContent/helpContent'

export {
  type HelpContentConfig,
  type HelpContext,
  type HelpPriority,
  type HelpIntegrationPoint,
  type HelpContentRegistry,
  type WithHelpProps,
  type HelpPerformanceMetrics
} from './HelpContent/types'

// CSS Styles (import in your main CSS file)
import './Tooltip/Tooltip.css'

// Utility functions will be added later once base system is stable

// Development utilities and additional exports will be added later

export default {
  // Core exports available immediately
  Tooltip: () => null,
  TooltipProvider: () => null,
  useTooltip: () => null,
  HELP_CONTENT: {},
  HelpContentUtils: {}
}