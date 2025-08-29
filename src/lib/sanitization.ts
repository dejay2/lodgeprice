/**
 * Input Sanitization and XSS Prevention using DOMPurify
 * 
 * This module provides comprehensive input sanitization to prevent
 * XSS attacks and ensure safe display of user-generated content.
 * 
 * Key Features:
 * - HTML and script tag removal/sanitization
 * - URL validation and sanitization
 * - Safe innerHTML replacement patterns
 * - Configurable sanitization policies
 */

import DOMPurify from 'dompurify'

// =============================================================================
// Configuration and Policies
// =============================================================================

/**
 * Default DOMPurify configuration for text inputs
 * Strips all HTML tags and attributes by default
 */
const DEFAULT_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
}

/**
 * Strict configuration - removes everything, returns plain text only
 */
const STRICT_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  WHOLE_DOCUMENT: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  SANITIZE_DOM: true,
}

/**
 * Safe HTML configuration - allows basic formatting tags
 * Used for rich text fields where some formatting is acceptable
 */
const SAFE_HTML_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
}

// =============================================================================
// Core Sanitization Functions
// =============================================================================

/**
 * Sanitized text input interface
 */
export interface SanitizedTextInput {
  raw: string
  sanitized: string
  hasXSS: boolean
  modificationsMade: boolean
  removedContent?: string[]
}

/**
 * Basic text sanitization - removes all HTML
 * Use for text inputs, names, descriptions, etc.
 */
export function sanitizeText(input: string): SanitizedTextInput {
  if (!input || typeof input !== 'string') {
    return {
      raw: input || '',
      sanitized: '',
      hasXSS: false,
      modificationsMade: false
    }
  }

  const trimmedInput = input.trim()
  const sanitized = DOMPurify.sanitize(trimmedInput, DEFAULT_CONFIG)
  
  // Detect if XSS content was found and removed
  const hasXSS = sanitized !== trimmedInput
  const modificationsMade = hasXSS || sanitized.length !== trimmedInput.length
  
  // Identify what content was removed for logging
  const removedContent: string[] = []
  if (hasXSS) {
    // Check for common XSS patterns that were removed
    const xssPatterns = [
      /<script.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe.*?>/gi,
      /<object.*?>/gi,
      /<embed.*?>/gi
    ]
    
    xssPatterns.forEach(pattern => {
      const matches = trimmedInput.match(pattern)
      if (matches) {
        removedContent.push(...matches)
      }
    })
  }

  return {
    raw: trimmedInput,
    sanitized,
    hasXSS,
    modificationsMade,
    removedContent: removedContent.length > 0 ? removedContent : undefined
  }
}

/**
 * Strict text sanitization - ultra-safe, plain text only
 * Use for critical fields like property names, IDs, etc.
 */
export function sanitizeTextStrict(input: string): SanitizedTextInput {
  if (!input || typeof input !== 'string') {
    return {
      raw: input || '',
      sanitized: '',
      hasXSS: false,
      modificationsMade: false
    }
  }

  const trimmedInput = input.trim()
  const sanitized = DOMPurify.sanitize(trimmedInput, STRICT_CONFIG)
  
  // Remove any remaining non-printable characters
  const cleanedSanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  
  const hasXSS = cleanedSanitized !== trimmedInput
  const modificationsMade = hasXSS || cleanedSanitized.length !== trimmedInput.length

  return {
    raw: trimmedInput,
    sanitized: cleanedSanitized,
    hasXSS,
    modificationsMade
  }
}

/**
 * Safe HTML sanitization - allows basic formatting
 * Use for rich text fields where some HTML is acceptable
 */
export function sanitizeHTML(input: string): SanitizedTextInput {
  if (!input || typeof input !== 'string') {
    return {
      raw: input || '',
      sanitized: '',
      hasXSS: false,
      modificationsMade: false
    }
  }

  const trimmedInput = input.trim()
  const sanitized = DOMPurify.sanitize(trimmedInput, SAFE_HTML_CONFIG)
  
  const hasXSS = sanitized !== trimmedInput
  const modificationsMade = hasXSS

  return {
    raw: trimmedInput,
    sanitized,
    hasXSS,
    modificationsMade
  }
}

// =============================================================================
// Specialized Sanitization Functions
// =============================================================================

/**
 * URL sanitization and validation
 */
export function sanitizeURL(input: string): {
  original: string
  sanitized: string
  isValid: boolean
  isSafe: boolean
} {
  const trimmedInput = input.trim()
  
  try {
    const url = new URL(trimmedInput)
    
    // Check for safe protocols
    const safeProtocols = ['http:', 'https:', 'mailto:']
    const isSafe = safeProtocols.includes(url.protocol)
    
    // Sanitize the URL
    const sanitized = DOMPurify.sanitize(trimmedInput, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|:(?!\/\/)))/i
    })
    
    return {
      original: trimmedInput,
      sanitized,
      isValid: true,
      isSafe
    }
  } catch (error) {
    return {
      original: trimmedInput,
      sanitized: '',
      isValid: false,
      isSafe: false
    }
  }
}

/**
 * Email sanitization and basic validation
 */
export function sanitizeEmail(input: string): {
  original: string
  sanitized: string
  isValid: boolean
} {
  const trimmedInput = input.trim().toLowerCase()
  const sanitized = DOMPurify.sanitize(trimmedInput, STRICT_CONFIG)
  
  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  const isValid = emailRegex.test(sanitized)
  
  return {
    original: trimmedInput,
    sanitized,
    isValid
  }
}

// =============================================================================
// Form Field Sanitizers
// =============================================================================

/**
 * Sanitize form data object
 * Applies appropriate sanitization to each field based on field type
 */
export function sanitizeFormData(formData: Record<string, any>): {
  sanitized: Record<string, any>
  warnings: string[]
  hasXSS: boolean
} {
  const sanitized: Record<string, any> = {}
  const warnings: string[] = []
  let hasXSS = false

  Object.entries(formData).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const result = sanitizeText(value)
      sanitized[key] = result.sanitized
      
      if (result.hasXSS) {
        hasXSS = true
        warnings.push(`Field '${key}' contained potentially unsafe content that was removed`)
      }
      
      if (result.modificationsMade) {
        warnings.push(`Field '${key}' was modified during sanitization`)
      }
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      // Numbers and booleans are safe as-is
      sanitized[key] = value
    } else if (value === null || value === undefined) {
      sanitized[key] = value
    } else if (Array.isArray(value)) {
      // Recursively sanitize array elements
      sanitized[key] = value.map(item => {
        if (typeof item === 'string') {
          const result = sanitizeText(item)
          if (result.hasXSS) {
            hasXSS = true
            warnings.push(`Array item in field '${key}' contained unsafe content`)
          }
          return result.sanitized
        }
        return item
      })
    } else if (typeof value === 'object') {
      // For objects, apply recursion (be careful with depth)
      const nestedResult = sanitizeFormData(value)
      sanitized[key] = nestedResult.sanitized
      if (nestedResult.hasXSS) hasXSS = true
      warnings.push(...nestedResult.warnings)
    } else {
      // Unknown type, convert to string and sanitize
      const result = sanitizeText(String(value))
      sanitized[key] = result.sanitized
      warnings.push(`Field '${key}' had unknown type and was converted to string`)
    }
  })

  return {
    sanitized,
    warnings,
    hasXSS
  }
}

// =============================================================================
// React-Specific Utilities
// =============================================================================

/**
 * Create a sanitized dangerouslySetInnerHTML prop
 * ONLY use when you absolutely need to render HTML
 * Prefer using sanitizeText() for regular text content
 */
export function createSafeInnerHTML(htmlContent: string): { __html: string } {
  const result = sanitizeHTML(htmlContent)
  return { __html: result.sanitized }
}

/**
 * Safe event handler for input change events
 * Automatically sanitizes input values
 */
export function createSafeInputHandler(
  onChange: (sanitizedValue: string, warnings?: string[]) => void,
  options: {
    strict?: boolean
    logWarnings?: boolean
  } = {}
) {
  return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target
    const sanitizeFn = options.strict ? sanitizeTextStrict : sanitizeText
    const result = sanitizeFn(value)
    
    const warnings: string[] = []
    if (result.hasXSS) {
      warnings.push("Input contained potentially unsafe content and was cleaned")
    }
    if (result.modificationsMade) {
      warnings.push("Input was modified for safety")
    }
    
    if (options.logWarnings && warnings.length > 0) {
      console.warn('Input sanitization warnings:', warnings)
    }
    
    onChange(result.sanitized, warnings.length > 0 ? warnings : undefined)
  }
}

// =============================================================================
// Validation Integration
// =============================================================================

/**
 * Combined sanitization and validation result
 */
export interface SanitizedValidationResult<T> {
  success: boolean
  data?: T
  sanitized: Record<string, any>
  validationErrors?: Record<string, string>
  sanitizationWarnings?: string[]
  hasXSS: boolean
}

/**
 * Sanitize data before validation
 * Use this as a pre-processing step before Zod validation
 */
export function sanitizeBeforeValidation<T>(
  data: Record<string, any>,
  validator: (data: any) => { success: boolean; data?: T; errors?: Record<string, string> }
): SanitizedValidationResult<T> {
  // First sanitize the data
  const sanitizationResult = sanitizeFormData(data)
  
  // Then validate the sanitized data
  const validationResult = validator(sanitizationResult.sanitized)
  
  return {
    success: validationResult.success && !sanitizationResult.hasXSS,
    data: validationResult.data,
    sanitized: sanitizationResult.sanitized,
    validationErrors: validationResult.errors,
    sanitizationWarnings: sanitizationResult.warnings.length > 0 ? sanitizationResult.warnings : undefined,
    hasXSS: sanitizationResult.hasXSS
  }
}

// =============================================================================
// Type Exports
// =============================================================================

export type SanitizationConfig = DOMPurify.Config
export type SanitizationResult = SanitizedTextInput

// =============================================================================
// Configuration Exports
// =============================================================================

export const sanitizationConfigs = {
  default: DEFAULT_CONFIG,
  strict: STRICT_CONFIG,
  safeHTML: SAFE_HTML_CONFIG
} as const