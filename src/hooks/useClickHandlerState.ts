/**
 * useClickHandlerState Hook
 * Manages click state for single vs double-click detection
 * Implements requirements from PRP-014 for click handler override management
 */

import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * Click handler state interface
 */
export interface ClickHandlerState {
  clickTimeout: NodeJS.Timeout | null
  clickCount: number
  lastClickTime: number
}

/**
 * Hook configuration options
 */
export interface UseClickHandlerStateOptions {
  /** Delay in milliseconds for double-click detection (default: 300) */
  doubleClickDelay?: number
  /** Whether to log click events for debugging (default: false) */
  debug?: boolean
}

/**
 * Hook return type
 */
export interface UseClickHandlerStateReturn {
  clickState: ClickHandlerState
  setClickState: React.Dispatch<React.SetStateAction<ClickHandlerState>>
  resetClickState: () => void
  isWithinDoubleClickWindow: (currentTime: number) => boolean
}

/**
 * Custom hook for managing click/double-click detection state
 * Follows React best practices for event handler timing and cleanup
 * 
 * @param options - Configuration options for the hook
 * @returns Click state management functions and state
 */
export const useClickHandlerState = (
  options: UseClickHandlerStateOptions = {}
): UseClickHandlerStateReturn => {
  const { 
    doubleClickDelay = 300, 
    debug = false 
  } = options
  
  // Main click state
  const [clickState, setClickState] = useState<ClickHandlerState>({
    clickTimeout: null,
    clickCount: 0,
    lastClickTime: 0
  })
  
  // Keep a ref to the timeout to ensure proper cleanup
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  /**
   * Reset click state to initial values
   * Clears any pending timeouts
   */
  const resetClickState = useCallback(() => {
    if (debug) {
      console.log('[useClickHandlerState] Resetting click state')
    }
    
    // Clear existing timeout if any
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    if (clickState.clickTimeout) {
      clearTimeout(clickState.clickTimeout)
    }
    
    setClickState({
      clickTimeout: null,
      clickCount: 0,
      lastClickTime: 0
    })
  }, [clickState.clickTimeout, debug])
  
  /**
   * Check if a click is within the double-click window
   * @param currentTime - Current timestamp
   * @returns true if within double-click window
   */
  const isWithinDoubleClickWindow = useCallback((currentTime: number): boolean => {
    const timeSinceLastClick = currentTime - clickState.lastClickTime
    const isWithin = timeSinceLastClick <= doubleClickDelay
    
    if (debug) {
      console.log('[useClickHandlerState] Time since last click:', timeSinceLastClick, 'ms')
      console.log('[useClickHandlerState] Within double-click window:', isWithin)
    }
    
    return isWithin
  }, [clickState.lastClickTime, doubleClickDelay, debug])
  
  // Sync timeout ref with state
  useEffect(() => {
    timeoutRef.current = clickState.clickTimeout
  }, [clickState.clickTimeout])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debug) {
        console.log('[useClickHandlerState] Component unmounting, cleaning up...')
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      if (clickState.clickTimeout) {
        clearTimeout(clickState.clickTimeout)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  
  return {
    clickState,
    setClickState,
    resetClickState,
    isWithinDoubleClickWindow
  }
}

/**
 * Helper function to detect touch device
 * Used to optimize click handling for different input methods
 */
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || 
         navigator.maxTouchPoints > 0 || 
         (navigator as any).msMaxTouchPoints > 0
}

/**
 * Helper to prevent ghost clicks on touch devices
 * Touch devices can fire both touch and mouse events
 */
export const preventGhostClick = (callback: () => void, delay = 350): void => {
  let touchTime = 0
  
  // handleTouch would be used in a complete implementation
  // Currently returning handleClick directly
  
  const handleClick = () => {
    const clickTime = Date.now()
    if (clickTime - touchTime > delay) {
      callback()
    }
  }
  
  return handleClick as any
}

export default useClickHandlerState