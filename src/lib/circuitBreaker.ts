/**
 * Circuit Breaker Pattern Implementation for Lodgeprice 2.0
 * Prevents cascading failures in external API calls
 */

import { Result, ErrorState, CircuitBreakerState } from './errorTypes'

// =============================================================================
// Circuit Breaker Configuration
// =============================================================================

/**
 * Configuration options for circuit breaker
 */
export interface CircuitBreakerConfig {
  failureThreshold: number      // Number of failures before opening circuit
  timeoutWindow: number         // Time in ms to wait before half-open state
  monitoringWindow: number      // Time window for counting failures
  volumeThreshold?: number      // Minimum requests before opening circuit
  errorThresholdPercentage?: number // Error percentage to open circuit
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  timeoutWindow: 30000,        // 30 seconds
  monitoringWindow: 60000,     // 60 seconds
  volumeThreshold: 10,
  errorThresholdPercentage: 50
}

// =============================================================================
// Circuit Breaker Statistics
// =============================================================================

/**
 * Statistics for circuit breaker monitoring
 */
interface CircuitBreakerStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  lastFailureTime?: Date
  lastSuccessTime?: Date
  requestTimestamps: Date[]
}

// =============================================================================
// Circuit Breaker Implementation
// =============================================================================

/**
 * Circuit breaker for managing external API failures
 */
export class CircuitBreaker {
  private state: CircuitBreakerState
  private stats: CircuitBreakerStats
  private config: CircuitBreakerConfig
  private halfOpenTestInProgress: boolean = false
  
  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config }
    this.state = {
      state: 'closed',
      failureCount: 0
    }
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      requestTimestamps: []
    }
  }
  
  /**
   * Execute operation through circuit breaker
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<Result<T>> {
    // Clean up old timestamps
    this.cleanupOldTimestamps()
    
    // Check circuit state
    if (this.state.state === 'open') {
      if (this.shouldTransitionToHalfOpen()) {
        this.transitionToHalfOpen()
      } else {
        return this.createCircuitOpenError(context)
      }
    }
    
    // Handle half-open state
    if (this.state.state === 'half-open' && this.halfOpenTestInProgress) {
      return this.createCircuitOpenError(context)
    }
    
    // Mark half-open test in progress
    if (this.state.state === 'half-open') {
      this.halfOpenTestInProgress = true
    }
    
    try {
      // Execute the operation
      const result = await operation()
      this.onSuccess()
      return { success: true, data: result }
      
    } catch (error) {
      this.onFailure()
      return {
        success: false,
        error: this.classifyError(error, context)
      }
    } finally {
      if (this.state.state === 'half-open') {
        this.halfOpenTestInProgress = false
      }
    }
  }
  
  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.stats.totalRequests++
    this.stats.successfulRequests++
    this.stats.lastSuccessTime = new Date()
    this.stats.requestTimestamps.push(new Date())
    
    // Reset circuit on success in half-open state
    if (this.state.state === 'half-open') {
      this.transitionToClosed()
    }
    
    // Reset failure count on success in closed state
    if (this.state.state === 'closed') {
      this.state.failureCount = 0
    }
  }
  
  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.stats.totalRequests++
    this.stats.failedRequests++
    this.stats.lastFailureTime = new Date()
    this.stats.requestTimestamps.push(new Date())
    
    this.state.failureCount++
    this.state.lastFailureTime = new Date()
    
    // Transition to open if threshold reached
    if (this.shouldOpen()) {
      this.transitionToOpen()
    }
    
    // Reopen circuit if test fails in half-open state
    if (this.state.state === 'half-open') {
      this.transitionToOpen()
    }
  }
  
  /**
   * Check if circuit should open
   */
  private shouldOpen(): boolean {
    // Check volume threshold
    const recentRequests = this.getRecentRequestCount()
    if (this.config.volumeThreshold && recentRequests < this.config.volumeThreshold) {
      return false
    }
    
    // Check failure threshold
    if (this.state.failureCount >= this.config.failureThreshold) {
      return true
    }
    
    // Check error percentage threshold
    if (this.config.errorThresholdPercentage && recentRequests > 0) {
      const recentFailures = this.getRecentFailureCount()
      const errorPercentage = (recentFailures / recentRequests) * 100
      if (errorPercentage >= this.config.errorThresholdPercentage) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * Check if circuit should transition to half-open
   */
  private shouldTransitionToHalfOpen(): boolean {
    if (!this.state.lastFailureTime) {
      return true
    }
    
    const timeSinceLastFailure = Date.now() - this.state.lastFailureTime.getTime()
    return timeSinceLastFailure >= this.config.timeoutWindow
  }
  
  /**
   * Transition to closed state
   */
  private transitionToClosed(): void {
    this.state = {
      state: 'closed',
      failureCount: 0
    }
  }
  
  /**
   * Transition to open state
   */
  private transitionToOpen(): void {
    this.state.state = 'open'
    this.state.nextAttemptTime = new Date(Date.now() + this.config.timeoutWindow)
  }
  
  /**
   * Transition to half-open state
   */
  private transitionToHalfOpen(): void {
    this.state.state = 'half-open'
    this.state.failureCount = 0
  }
  
  /**
   * Create circuit open error response
   */
  private createCircuitOpenError<T>(context: string): Result<T> {
    const error: ErrorState = {
      type: 'network',
      message: 'Circuit breaker is open',
      userMessage: 'Service temporarily unavailable. Please try again later.',
      code: 'CIRCUIT_OPEN',
      retryable: true,
      timestamp: new Date(),
      context,
      details: {
        nextAttemptTime: this.state.nextAttemptTime,
        failureCount: this.state.failureCount
      }
    }
    
    return { success: false, error }
  }
  
  /**
   * Classify error for circuit breaker context
   */
  private classifyError(error: unknown, context: string): ErrorState {
    const err = error instanceof Error ? error : new Error(String(error))
    
    return {
      type: 'network',
      message: err.message,
      userMessage: 'Service request failed. Please try again.',
      code: (error as any).code || 'CIRCUIT_ERROR',
      retryable: false, // Circuit breaker already handles retries
      timestamp: new Date(),
      context,
      details: {
        originalError: err.message
      }
    }
  }
  
  /**
   * Clean up old timestamps outside monitoring window
   */
  private cleanupOldTimestamps(): void {
    const cutoffTime = Date.now() - this.config.monitoringWindow
    this.stats.requestTimestamps = this.stats.requestTimestamps.filter(
      timestamp => timestamp.getTime() > cutoffTime
    )
  }
  
  /**
   * Get count of recent requests within monitoring window
   */
  private getRecentRequestCount(): number {
    return this.stats.requestTimestamps.length
  }
  
  /**
   * Get count of recent failures within monitoring window
   */
  private getRecentFailureCount(): number {
    const cutoffTime = Date.now() - this.config.monitoringWindow
    
    // Count failures in recent timestamps
    // This is simplified - in production, you'd track success/failure per timestamp
    const recentRequests = this.getRecentRequestCount()
    const successRate = this.stats.totalRequests > 0
      ? this.stats.successfulRequests / this.stats.totalRequests
      : 0
    
    return Math.round(recentRequests * (1 - successRate))
  }
  
  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return { ...this.state }
  }
  
  /**
   * Get circuit breaker statistics
   */
  getStats(): Readonly<CircuitBreakerStats> {
    return { ...this.stats }
  }
  
  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.transitionToClosed()
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      requestTimestamps: []
    }
  }
  
  /**
   * Force circuit to open state (for testing or manual intervention)
   */
  forceOpen(): void {
    this.transitionToOpen()
  }
  
  /**
   * Force circuit to closed state (for testing or manual recovery)
   */
  forceClosed(): void {
    this.transitionToClosed()
  }
}

// =============================================================================
// Circuit Breaker Manager for Multiple Services
// =============================================================================

/**
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map()
  private defaultConfig: CircuitBreakerConfig
  
  constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = { ...DEFAULT_CIRCUIT_CONFIG, ...defaultConfig }
  }
  
  /**
   * Get or create circuit breaker for a service
   */
  getBreaker(service: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(service)) {
      const breakerConfig = config ? { ...this.defaultConfig, ...config } : this.defaultConfig
      this.breakers.set(service, new CircuitBreaker(breakerConfig))
    }
    
    return this.breakers.get(service)!
  }
  
  /**
   * Execute operation through service-specific circuit breaker
   */
  async execute<T>(
    service: string,
    operation: () => Promise<T>,
    context?: string
  ): Promise<Result<T>> {
    const breaker = this.getBreaker(service)
    return breaker.execute(operation, context || service)
  }
  
  /**
   * Get all circuit breaker states
   */
  getAllStates(): Map<string, CircuitBreakerState> {
    const states = new Map<string, CircuitBreakerState>()
    
    this.breakers.forEach((breaker, service) => {
      states.set(service, breaker.getState())
    })
    
    return states
  }
  
  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset())
  }
  
  /**
   * Reset specific service circuit breaker
   */
  resetService(service: string): void {
    const breaker = this.breakers.get(service)
    if (breaker) {
      breaker.reset()
    }
  }
}

// =============================================================================
// Global Circuit Breaker Instance
// =============================================================================

/**
 * Global circuit breaker manager instance
 */
export const circuitBreakerManager = new CircuitBreakerManager()