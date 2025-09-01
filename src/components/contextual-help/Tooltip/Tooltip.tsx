/**
 * Tooltip Component
 * 
 * WCAG 2.1 AA compliant tooltip implementation using Floating UI
 * Features:
 * - Accessible keyboard navigation (Tab to focus, Escape to dismiss)
 * - Screen reader compatibility with aria-describedby
 * - Smart positioning with collision detection
 * - Hover/focus triggers with proper ARIA states
 * - Progressive disclosure pattern
 */

import React, { 
  useState, 
  useRef, 
  useId,
  cloneElement, 
  ReactElement,
  ReactNode
} from 'react'
import {
  useFloating,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  autoUpdate,
  offset,
  flip,
  shift,
  arrow,
  safePolygon,
  FloatingPortal,
  FloatingArrow
} from '@floating-ui/react'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'
export type TooltipTrigger = 'hover' | 'focus' | 'click'

export interface TooltipProps {
  /** Tooltip content - string or React node */
  content: string | ReactNode
  /** Preferred placement (will flip if not enough space) */
  placement?: TooltipPlacement
  /** Trigger method for showing tooltip */
  trigger?: TooltipTrigger
  /** Delay in milliseconds before showing tooltip */
  delay?: number
  /** Maximum width in pixels */
  maxWidth?: number
  /** Additional CSS classes */
  className?: string
  /** Disable tooltip completely */
  disabled?: boolean
  /** Child element to attach tooltip to */
  children: ReactElement
  /** Test ID for automated testing */
  'data-testid'?: string
}

/**
 * Main Tooltip Component
 * 
 * Implements WCAG 2.1.13 Content on Hover or Focus guidelines:
 * - Dismissible: Can be dismissed with Escape key
 * - Hoverable: Remains visible when hovering over tooltip content
 * - Persistent: Remains visible until hover/focus is removed or dismissed
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  placement = 'top',
  trigger = 'hover',
  delay = 200,
  maxWidth = 300,
  className = '',
  disabled = false,
  children,
  'data-testid': testId
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const arrowRef = useRef(null)
  
  // Generate stable IDs for accessibility
  const tooltipId = useId()
  const triggerId = useId()

  // Floating UI setup
  const {
    refs,
    floatingStyles,
    context,
    middlewareData: { arrow: arrowData }
  } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8), // 8px gap between trigger and tooltip
      flip({
        fallbackAxisSideDirection: 'start',
        padding: 8
      }),
      shift({ padding: 8 }),
      arrow({ element: arrowRef, padding: 8 })
    ]
  })

  // Configure interactions based on trigger type
  const hover = useHover(context, {
    enabled: trigger === 'hover',
    delay: { open: delay, close: 150 },
    handleClose: safePolygon({
      buffer: 1
    })
  })

  const focus = useFocus(context, {
    enabled: trigger === 'focus' || trigger === 'hover'
  })

  const dismiss = useDismiss(context, {
    escapeKey: true,
    referencePress: trigger === 'click'
  })

  const role = useRole(context, {
    role: 'tooltip'
  })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role
  ])

  // Don't render if disabled or no content
  if (disabled || !content) {
    return children
  }

  // Clone child element with tooltip props
  const trigger_element = cloneElement(children, {
    ...getReferenceProps({
      ref: refs.setReference,
      'aria-describedby': isOpen ? tooltipId : undefined,
      id: triggerId,
      // Preserve existing props
      ...children.props
    })
  })

  return (
    <>
      {trigger_element}
      
      {/* Tooltip portal for proper z-index layering */}
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            id={tooltipId}
            role="tooltip"
            style={{
              ...floatingStyles,
              maxWidth: `${maxWidth}px`,
              zIndex: 9999
            }}
            className={`tooltip ${className}`}
            data-testid={testId}
            {...getFloatingProps()}
          >
            {/* Tooltip content */}
            <div className="tooltip-content">
              {typeof content === 'string' ? (
                <span>{content}</span>
              ) : (
                content
              )}
            </div>
            
            {/* Arrow element */}
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className="tooltip-arrow"
              style={{
                ...(arrowData && {
                  left: arrowData.x,
                  top: arrowData.y
                })
              }}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  )
}

export default Tooltip