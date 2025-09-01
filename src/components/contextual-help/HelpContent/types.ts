/**
 * TypeScript interfaces for contextual help system
 * 
 * Defines the contract for help content configuration,
 * tooltip integration, and accessibility requirements
 */

import { ReactNode } from 'react'
import { TooltipPlacement } from '../Tooltip/Tooltip'

/**
 * Context types for help content categorization
 * Aligns with PRP requirements and UI sections
 */
export type HelpContext = 
  | 'inline-editing'      // Inline price editor functionality
  | 'navigation'          // Quick management buttons and navigation
  | 'pricing-toggles'     // Seasonal rates and discount toggles  
  | 'management-buttons'  // Manage buttons for seasonal rates/discounts
  | 'property-controls'   // Unified property selection and controls
  | 'calendar-pricing'    // Calendar price display and calculations

/**
 * Help content priority levels
 * Determines when help should be shown based on user interaction
 */
export type HelpPriority = 
  | 'critical'    // Always show on hover/focus (validation errors, constraints)
  | 'helpful'     // Show on extended hover/focus (feature explanations)
  | 'optional'    // Show only when explicitly requested (advanced features)

/**
 * Configuration for individual help content items
 */
export interface HelpContentConfig {
  /** Unique identifier for this help content */
  id: string
  
  /** Help content - string or React component */
  content: string | ReactNode
  
  /** Preferred tooltip placement */
  placement: TooltipPlacement
  
  /** UI context this help content applies to */
  context: HelpContext
  
  /** Priority level determining display behavior */
  priority: HelpPriority
  
  /** Maximum tooltip width in pixels */
  maxWidth?: number
  
  /** Delay before showing tooltip in milliseconds */
  delay?: number
  
  /** Additional CSS classes for custom styling */
  className?: string
  
  /** ARIA label override for complex content */
  ariaLabel?: string
  
  /** Keywords for help content searching/filtering */
  keywords?: string[]
}

/**
 * Integration points mapping UI elements to help content
 * Maps data-testid attributes to help content configurations
 */
export interface HelpIntegrationPoint {
  /** Test ID of the element to attach help to */
  testId: string
  
  /** Help content configuration */
  config: HelpContentConfig
  
  /** Whether help is enabled for this element */
  enabled: boolean
  
  /** Conditional display based on application state */
  showWhen?: (context: any) => boolean
}

/**
 * Help content registry for managing all help items
 */
export interface HelpContentRegistry {
  /** All available help content configurations */
  content: Record<string, HelpContentConfig>
  
  /** Integration mappings for UI elements */
  integrations: Record<string, HelpIntegrationPoint>
  
  /** Context-based content groupings */
  contexts: Record<HelpContext, string[]>
}

/**
 * Props for components that integrate with help system
 */
export interface WithHelpProps {
  /** Help content ID to display */
  helpId?: string
  
  /** Override help content temporarily */
  helpContent?: string | ReactNode
  
  /** Disable help for this specific element */
  helpDisabled?: boolean
  
  /** Custom help placement */
  helpPlacement?: TooltipPlacement
  
  /** Help priority override */
  helpPriority?: HelpPriority
}

/**
 * Validation schema for help content
 */
export interface HelpContentValidation {
  /** Maximum content length in characters */
  maxContentLength: number
  
  /** Required fields for content configuration */
  requiredFields: (keyof HelpContentConfig)[]
  
  /** Allowed HTML tags in content (for security) */
  allowedTags: string[]
  
  /** Validation rules for content quality */
  contentRules: {
    /** Must be actionable (contain verbs) */
    mustBeActionable: boolean
    
    /** Should be concise (under word limit) */
    maxWords: number
    
    /** Should avoid jargon */
    avoidJargon: boolean
  }
}

/**
 * Performance metrics for help system monitoring
 */
export interface HelpPerformanceMetrics {
  /** Total help content items loaded */
  totalContentItems: number
  
  /** Average tooltip render time in milliseconds */
  averageRenderTime: number
  
  /** Content loading errors */
  contentErrors: number
  
  /** User interaction statistics */
  interactions: {
    totalShows: number
    totalDismissals: number
    averageDisplayTime: number
  }
}

export default HelpContentConfig