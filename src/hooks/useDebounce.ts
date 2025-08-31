/**
 * useDebounce - Custom hook for debouncing values
 * Implements debouncing pattern for API call optimization
 * Delays updates until user stops changing value for specified duration
 */

import { useState, useEffect } from 'react'

/**
 * Debounce a value with specified delay
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up timer to update debounced value after delay
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clear timer if value changes or component unmounts
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Debounce a callback function
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds (default 300ms)
 * @returns A debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const debouncedCallback = ((...args: Parameters<T>) => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // Set new timer
    const newTimer = setTimeout(() => {
      callback(...args)
    }, delay)

    setDebounceTimer(newTimer)
  }) as T

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  return debouncedCallback
}

/**
 * Debounce with loading state
 * Useful for showing loading indicators during debounced operations
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void, boolean] {
  const [value, setValue] = useState<T>(initialValue)
  const [isPending, setIsPending] = useState(false)
  const debouncedValue = useDebounce(value, delay)

  useEffect(() => {
    setIsPending(value !== debouncedValue)
  }, [value, debouncedValue])

  return [value, debouncedValue, setValue, isPending]
}