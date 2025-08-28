// Enhanced error handling for database constraints
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export const handleDatabaseError = (error: any, operation: string): never => {
  // Handle specific PostgreSQL constraint violations
  if (error.code === '23514') { // Check constraint violation
    if (error.message.includes('max_gte_min_discount')) {
      throw new ValidationError('Maximum discount must be greater than or equal to minimum discount');
    }
    if (error.message.includes('activation_window')) {
      throw new ValidationError('Activation window must be between 1 and 365 days');
    }
    if (error.message.includes('strategy_name')) {
      throw new ValidationError('Strategy name cannot be empty');
    }
    if (error.message.includes('min_discount') || error.message.includes('max_discount')) {
      throw new ValidationError('Discount percentages must be between 0% and 100%');
    }
    if (error.message.includes('curve_type')) {
      throw new ValidationError('Curve type must be aggressive, moderate, or gentle');
    }
  }
  
  if (error.code === '23505') { // Unique constraint violation
    if (error.message.includes('unique_strategy_day')) {
      throw new ValidationError('A rule for this number of days already exists. Please modify the existing rule or choose different days.');
    }
    if (error.message.includes('strategy_name')) {
      throw new ValidationError('A strategy with this name already exists');
    }
  }
  
  if (error.code === '23503') { // Foreign key constraint violation
    if (error.message.includes('property_internal_id')) {
      throw new ValidationError('Selected property no longer exists. Please refresh and try again.');
    }
    if (error.message.includes('strategy_id')) {
      throw new ValidationError('Strategy no longer exists. Please refresh and try again.');
    }
  }
  
  if (error.code === 'PGRST301') { // Timeout
    throw new TimeoutError(`${operation} took too long to complete. Please try again.`);
  }

  if (error.code === '42501') { // Insufficient privileges
    throw new ValidationError('You do not have permission to perform this action. Please check your authentication.');
  }

  if (error.code === 'PGRST204') { // No rows returned
    throw new ValidationError(`No data found for ${operation}. The item may have been deleted.`);
  }
  
  // Generic database error
  throw new DatabaseError(`${operation} failed: ${error.message || 'Unknown database error'}`, error.code);
};

// Helper to format error messages for UI display
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof ValidationError) {
    return error.message;
  }
  if (error instanceof DatabaseError) {
    return error.message;
  }
  if (error instanceof TimeoutError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
};

// Helper to determine if error is recoverable
export const isRecoverableError = (error: unknown): boolean => {
  if (error instanceof TimeoutError) {
    return true; // Timeouts can be retried
  }
  if (error instanceof DatabaseError) {
    return error.code === 'PGRST301' || (error.code?.startsWith('5') ?? false); // Server errors can be retried
  }
  return false;
};