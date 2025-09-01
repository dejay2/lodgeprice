/**
 * Static help content definitions
 * 
 * Centralized help text for all UI elements as specified in PRP-55
 * Content is concise, action-oriented, and accessibility-compliant
 */

import { HelpContentConfig, HelpContentRegistry, HelpIntegrationPoint } from './types'

/**
 * Individual help content configurations
 * Each item maps to specific FR requirements from PRP-55
 */
export const HELP_CONTENT: Record<string, HelpContentConfig> = {
  // FR-1: Inline editing elements help
  'inline-base-rate-edit': {
    id: 'inline-base-rate-edit',
    content: 'Click to edit base rate (minimum €{minPrice} enforced)',
    placement: 'top',
    context: 'inline-editing',
    priority: 'helpful',
    maxWidth: 280,
    delay: 200,
    keywords: ['edit', 'base', 'rate', 'price', 'minimum', 'click']
  },

  'inline-min-rate-edit': {
    id: 'inline-min-rate-edit', 
    content: 'Click to edit minimum price floor for this property',
    placement: 'top',
    context: 'inline-editing',
    priority: 'helpful',
    maxWidth: 260,
    delay: 200,
    keywords: ['edit', 'minimum', 'price', 'floor', 'click']
  },

  // FR-2: Property controls unified interface help
  'property-selection-dropdown': {
    id: 'property-selection-dropdown',
    content: 'Controls all pricing functionality for selected property. Selection persists across pages.',
    placement: 'bottom',
    context: 'property-controls',
    priority: 'helpful',
    maxWidth: 320,
    delay: 300,
    keywords: ['property', 'selection', 'controls', 'pricing', 'functionality', 'persists']
  },

  'unified-property-controls': {
    id: 'unified-property-controls',
    content: 'Consolidated property management interface. Edit rates, toggle pricing features, and access quick management actions.',
    placement: 'bottom',
    context: 'property-controls',
    priority: 'helpful',
    maxWidth: 350,
    delay: 250,
    keywords: ['unified', 'consolidated', 'management', 'interface', 'edit', 'rates', 'toggle', 'quick', 'actions']
  },

  // FR-3: Pricing toggles help
  'seasonal-rates-toggle': {
    id: 'seasonal-rates-toggle',
    content: 'Enable/disable seasonal rate adjustments in calendar pricing calculations',
    placement: 'top',
    context: 'pricing-toggles',
    priority: 'helpful',
    maxWidth: 300,
    delay: 200,
    keywords: ['seasonal', 'rates', 'toggle', 'enable', 'disable', 'adjustments', 'calendar', 'pricing']
  },

  'discount-strategies-toggle': {
    id: 'discount-strategies-toggle',
    content: 'Enable/disable last-minute discounts in final price calculations',
    placement: 'top',
    context: 'pricing-toggles',
    priority: 'helpful',
    maxWidth: 280,
    delay: 200,
    keywords: ['discount', 'strategies', 'toggle', 'last-minute', 'discounts', 'final', 'price']
  },

  // FR-4: Quick management buttons help
  'manage-seasonal-rates-button': {
    id: 'manage-seasonal-rates-button',
    content: 'Navigate to Seasonal Rates management (property context preserved)',
    placement: 'top',
    context: 'management-buttons',
    priority: 'helpful',
    maxWidth: 280,
    delay: 200,
    keywords: ['navigate', 'seasonal', 'rates', 'management', 'property', 'context', 'preserved']
  },

  'manage-discounts-button': {
    id: 'manage-discounts-button',
    content: 'Navigate to Discount Strategy management (property context preserved)',
    placement: 'top',
    context: 'management-buttons',
    priority: 'helpful',
    maxWidth: 300,
    delay: 200,
    keywords: ['navigate', 'discount', 'strategy', 'management', 'property', 'context', 'preserved']
  },

  // FR-5: Calendar pricing display help
  'calendar-pricing-display': {
    id: 'calendar-pricing-display',
    content: 'Shows final calculated price including all adjustments (base + seasonal + discounts)',
    placement: 'top',
    context: 'calendar-pricing',
    priority: 'helpful',
    maxWidth: 320,
    delay: 300,
    keywords: ['final', 'calculated', 'price', 'adjustments', 'base', 'seasonal', 'discounts']
  },

  'calendar-base-price': {
    id: 'calendar-base-price',
    content: 'Base daily rate before seasonal adjustments and discounts',
    placement: 'top',
    context: 'calendar-pricing',
    priority: 'optional',
    maxWidth: 240,
    delay: 200,
    keywords: ['base', 'daily', 'rate', 'before', 'seasonal', 'adjustments', 'discounts']
  },

  // Additional contextual help for complex interactions
  'price-validation-error': {
    id: 'price-validation-error',
    content: 'Price must be above minimum rate and valid number',
    placement: 'bottom',
    context: 'inline-editing',
    priority: 'critical',
    maxWidth: 250,
    delay: 100,
    className: 'error',
    keywords: ['price', 'validation', 'minimum', 'rate', 'valid', 'number', 'error']
  },

  'keyboard-navigation-hint': {
    id: 'keyboard-navigation-hint',
    content: 'Press Tab to navigate, Enter to confirm, Escape to cancel',
    placement: 'bottom',
    context: 'navigation',
    priority: 'helpful',
    maxWidth: 280,
    delay: 500,
    keywords: ['tab', 'navigate', 'enter', 'confirm', 'escape', 'cancel', 'keyboard']
  }
}

/**
 * Integration points mapping UI test IDs to help content
 * Based on existing component data-testid attributes
 */
export const HELP_INTEGRATIONS: Record<string, {
  testId: string
  helpId: string
  enabled: boolean
}> = {
  // Inline editing integrations
  'base-rate-edit': {
    testId: 'base-rate-edit-button',
    helpId: 'inline-base-rate-edit',
    enabled: true
  },
  
  'min-rate-edit': {
    testId: 'minimum-rate-edit-button', 
    helpId: 'inline-min-rate-edit',
    enabled: true
  },

  // Property controls integrations
  'property-selection': {
    testId: 'property-selection',
    helpId: 'property-selection-dropdown',
    enabled: true
  },

  'unified-controls': {
    testId: 'unified-property-controls',
    helpId: 'unified-property-controls',
    enabled: true
  },

  // Pricing toggles integrations
  'seasonal-toggle': {
    testId: 'pricing-toggle-seasonal',
    helpId: 'seasonal-rates-toggle',
    enabled: true
  },

  'discount-toggle': {
    testId: 'pricing-toggle-discounts',
    helpId: 'discount-strategies-toggle',
    enabled: true
  },

  // Management buttons integrations
  'manage-seasonal': {
    testId: 'manage-seasonal-rates-button',
    helpId: 'manage-seasonal-rates-button',
    enabled: true
  },

  'manage-discounts': {
    testId: 'manage-discounts-button',
    helpId: 'manage-discounts-button',
    enabled: true
  },

  // Calendar integrations
  'calendar-price': {
    testId: 'calendar-price-cell',
    helpId: 'calendar-pricing-display',
    enabled: true
  }
}

/**
 * Context-based content groupings for easy management
 */
export const HELP_CONTEXTS = {
  'inline-editing': [
    'inline-base-rate-edit',
    'inline-min-rate-edit', 
    'price-validation-error'
  ],
  'navigation': [
    'keyboard-navigation-hint'
  ],
  'pricing-toggles': [
    'seasonal-rates-toggle',
    'discount-strategies-toggle'
  ],
  'management-buttons': [
    'manage-seasonal-rates-button',
    'manage-discounts-button'
  ],
  'property-controls': [
    'property-selection-dropdown',
    'unified-property-controls'
  ],
  'calendar-pricing': [
    'calendar-pricing-display',
    'calendar-base-price'
  ]
}

/**
 * Complete help content registry
 */
export const HELP_REGISTRY: HelpContentRegistry = {
  content: HELP_CONTENT,
  integrations: Object.entries(HELP_INTEGRATIONS).reduce((acc, [_, integration]) => {
    acc[integration.testId] = {
      testId: integration.testId,
      config: HELP_CONTENT[integration.helpId],
      enabled: integration.enabled
    }
    return acc
  }, {} as Record<string, HelpIntegrationPoint>),
  contexts: HELP_CONTEXTS
}

/**
 * Utility functions for help content management
 */
export const HelpContentUtils = {
  /**
   * Get help content by ID with fallback
   */
  getContent: (id: string): HelpContentConfig | null => {
    return HELP_CONTENT[id] || null
  },

  /**
   * Get help content for a test ID
   */
  getContentByTestId: (testId: string): HelpContentConfig | null => {
    const integration = HELP_REGISTRY.integrations[testId]
    return integration?.config || null
  },

  /**
   * Check if help is enabled for a test ID
   */
  isEnabled: (testId: string): boolean => {
    const integration = HELP_REGISTRY.integrations[testId]
    return integration?.enabled || false
  },

  /**
   * Get all content for a specific context
   */
  getContentByContext: (context: string): HelpContentConfig[] => {
    const contentIds = HELP_CONTEXTS[context as keyof typeof HELP_CONTEXTS] || []
    return contentIds.map(id => HELP_CONTENT[id]).filter(Boolean)
  },

  /**
   * Format content with dynamic values (e.g., minPrice)
   */
  formatContent: (content: string, variables: Record<string, unknown>): string => {
    return content.replace(/\{(\w+)\}/g, (match, key) => {
      const value = variables[key]
      return value != null ? value.toString() : match
    })
  },

  /**
   * Validate content configuration
   */
  validateContent: (config: HelpContentConfig): string[] => {
    const errors: string[] = []
    
    if (!config.id) errors.push('ID is required')
    if (!config.content) errors.push('Content is required')
    if (!config.context) errors.push('Context is required')
    if (!config.priority) errors.push('Priority is required')
    
    if (typeof config.content === 'string' && config.content.length > 200) {
      errors.push('Content should be under 200 characters')
    }
    
    return errors
  }
}

export default HELP_CONTENT