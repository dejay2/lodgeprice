/**
 * useTooltip Hook
 * 
 * Custom hook for tooltip interactions with accessibility support
 * Integrates with help content system and provides consistent behavior
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTooltipContext } from '../TooltipProvider'
import { HelpContentUtils } from '../HelpContent/helpContent'
import { HelpContentConfig } from '../HelpContent/types'

export interface UseTooltipOptions {
  /** Help content ID to display */
  helpId?: string
  
  /** Override help content */
  content?: string
  
  /** Test ID for element integration */
  testId?: string
  
  /** Disable tooltip for this instance */
  disabled?: boolean
  
  /** Dynamic variables for content formatting */
  variables?: Record<string, unknown>
  
  /** Custom delay override */
  delay?: number
  
  /** Callback when tooltip is shown */
  onShow?: () => void
  
  /** Callback when tooltip is hidden */
  onHide?: () => void
}

export interface UseTooltipReturn {
  /** Whether tooltip is currently visible */
  isVisible: boolean
  
  /** Show tooltip manually */
  show: () => void
  
  /** Hide tooltip manually */
  hide: () => void
  
  /** Toggle tooltip visibility */
  toggle: () => void
  
  /** Resolved help content configuration */
  helpConfig: HelpContentConfig | null
  
  /** Formatted content with variables */
  formattedContent: string
  
  /** Whether tooltip is available/enabled */
  isEnabled: boolean
  
  /** Props to spread on trigger element */
  triggerProps: {
    'data-tooltip-trigger': boolean
    'aria-describedby': string | undefined
    onMouseEnter: () => void
    onMouseLeave: () => void
    onFocus: () => void
    onBlur: () => void
  }
}

/**
 * useTooltip Hook
 * 
 * Manages tooltip state and integrates with help content system
 * Provides accessibility-compliant event handlers and ARIA attributes
 */
export const useTooltip = (options: UseTooltipOptions = {}): UseTooltipReturn => {
  const {
    helpId,
    content: overrideContent,
    testId,
    disabled = false,
    variables = {},
    delay = 200,
    onShow,
    onHide
  } = options

  const tooltipContext = useTooltipContext()
  const [isVisible, setIsVisible] = useState(false)

  // Resolve help content configuration
  const helpConfig = useMemo(() => {
    if (helpId) {
      return HelpContentUtils.getContent(helpId)
    } else if (testId) {
      return HelpContentUtils.getContentByTestId(testId)
    }
    return null
  }, [helpId, testId])

  // Determine if tooltip should be enabled
  const isEnabled = useMemo(() => {
    if (disabled || tooltipContext.disabled) return false
    if (overrideContent) return true
    if (testId && !HelpContentUtils.isEnabled(testId)) return false
    return Boolean(helpConfig?.content)
  }, [disabled, tooltipContext.disabled, overrideContent, testId, helpConfig])

  // Format content with variables
  const formattedContent = useMemo(() => {
    const content = overrideContent || (helpConfig?.content as string) || ''
    if (typeof content === 'string' && Object.keys(variables).length > 0) {
      return HelpContentUtils.formatContent(content, variables)
    }
    return content
  }, [overrideContent, helpConfig, variables])

  // Show tooltip with context coordination
  const show = useCallback(() => {
    if (!isEnabled) return
    
    // Coordinate with global tooltip context
    const tooltipId = helpConfig?.id || testId || 'anonymous-tooltip'
    tooltipContext.setActiveTooltip(tooltipId)
    
    setIsVisible(true)
    onShow?.()
  }, [isEnabled, helpConfig, testId, tooltipContext, onShow])

  // Hide tooltip
  const hide = useCallback(() => {
    if (isVisible) {
      tooltipContext.setActiveTooltip(null)
      setIsVisible(false)
      onHide?.()
    }
  }, [isVisible, tooltipContext, onHide])

  // Toggle tooltip visibility
  const toggle = useCallback(() => {
    if (isVisible) {
      hide()
    } else {
      show()
    }
  }, [isVisible, show, hide])

  // Handle global tooltip context changes
  useEffect(() => {
    const currentTooltipId = helpConfig?.id || testId
    
    // Hide if another tooltip becomes active
    if (tooltipContext.activeTooltipId && 
        tooltipContext.activeTooltipId !== currentTooltipId && 
        isVisible) {
      setIsVisible(false)
      onHide?.()
    }
  }, [tooltipContext.activeTooltipId, helpConfig, testId, isVisible, onHide])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isVisible) {
        tooltipContext.setActiveTooltip(null)
      }
    }
  }, [isVisible, tooltipContext])

  // Mouse event handlers with delay support
  const handleMouseEnter = useCallback(() => {
    if (!isEnabled) return
    
    const actualDelay = helpConfig?.delay || delay
    
    const timeoutId = setTimeout(() => {
      show()
    }, actualDelay)
    
    // Store timeout ID for cleanup
    return timeoutId
  }, [isEnabled, helpConfig, delay, show])

  const handleMouseLeave = useCallback(() => {
    // Add small delay before hiding to allow hovering over tooltip
    setTimeout(() => {
      hide()
    }, 150)
  }, [hide])

  // Focus event handlers for keyboard users
  const handleFocus = useCallback(() => {
    if (!isEnabled) return
    show()
  }, [isEnabled, show])

  const handleBlur = useCallback(() => {
    hide()
  }, [hide])

  // Generate unique ID for ARIA attributes
  const ariaDescribedBy = isVisible && helpConfig 
    ? `tooltip-${helpConfig.id}`
    : undefined

  // Props to spread on trigger element
  const triggerProps = {
    'data-tooltip-trigger': true,
    'aria-describedby': ariaDescribedBy,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur
  }

  return {
    isVisible,
    show,
    hide,
    toggle,
    helpConfig,
    formattedContent,
    isEnabled,
    triggerProps
  }
}

/**
 * Hook specifically for inline editing tooltips with validation support
 */
export const useInlineEditTooltip = (
  minPrice: number,
  options: Omit<UseTooltipOptions, 'variables'> = {}
) => {
  return useTooltip({
    ...options,
    variables: { minPrice: minPrice.toFixed(2) }
  })
}

/**
 * Hook for management button tooltips with navigation context
 */
export const useManagementButtonTooltip = (
  destination: string,
  options: Omit<UseTooltipOptions, 'variables'> = {}
) => {
  return useTooltip({
    ...options,
    variables: { destination }
  })
}

export default useTooltip