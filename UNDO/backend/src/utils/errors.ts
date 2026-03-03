import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError } from '@/types';
import { logSystemEvent } from './logger';

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logSystemEvent(
    'error',
    error.message || 'Unknown error',
    'system',
    {
      stack: error.stack,
      url: req.url,
      method: req.method,
      userId: (req as any).uid,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
    (req as any).uid
  );

  // Set default error
  let err = error;
  if (!(err instanceof AppError)) {
    err = new AppError(err.message || 'Internal server error', 500);
  }

  // Send error response
  res.status(err.statusCode).json({
    success: false,
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err,
    }),
  });
};

/**
 * Handle async errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle validation errors
 */
export const handleValidationError = (error: any): ValidationError => {
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors).map((err: any) => err.message).join(', ');
    return new ValidationError(message);
  }
  return error;
};

/**
 * Handle database errors
 */
export const handleDatabaseError = (error: any): AppError => {
  if (error.code === 'P2002') {
    return new ConflictError('Resource already exists');
  }
  if (error.code === 'P2025') {
    return new NotFoundError('Resource not found');
  }
  return error;
};

/**
 * Handle Firebase errors
 */
export const handleFirebaseError = (error: any): AppError => {
  if (error.code === 'auth/user-not-found') {
    return new NotFoundError('User not found');
  }
  if (error.code === 'auth/wrong-password') {
    return new AuthenticationError('Invalid credentials');
  }
  if (error.code === 'auth/email-already-exists') {
    return new ConflictError('Email already exists');
  }
  if (error.code === 'auth/weak-password') {
    return new ValidationError('Password is too weak');
  }
  if (error.code === 'auth/invalid-email') {
    return new ValidationError('Invalid email address');
  }
  if (error.code === 'auth/user-disabled') {
    return new AuthenticationError('User account is disabled');
  }
  if (error.code === 'auth/too-many-requests') {
    return new AppError('Too many requests. Please try again later.', 429);
  }
  return error;
};

/**
 * Handle Stripe errors
 */
export const handleStripeError = (error: any): AppError => {
  if (error.type === 'StripeCardError') {
    return new AppError('Card was declined', 400);
  }
  if (error.type === 'StripeRateLimitError') {
    return new AppError('Too many requests. Please try again later.', 429);
  }
  if (error.type === 'StripeInvalidRequestError') {
    return new ValidationError('Invalid request');
  }
  if (error.type === 'StripeAPIError') {
    return new AppError('Payment service error', 502);
  }
  if (error.type === 'StripeConnectionError') {
    return new AppError('Payment service unavailable', 503);
  }
  if (error.type === 'StripeAuthenticationError') {
    return new AppError('Payment service authentication failed', 502);
  }
  return error;
};

/**
 * Handle file upload errors
 */
export const handleFileUploadError = (error: any): AppError => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new ValidationError('File too large');
  }
  if (error.code === 'LIMIT_FILE_COUNT') {
    return new ValidationError('Too many files');
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ValidationError('Unexpected file field');
  }
  return error;
};

/**
 * Handle rate limit errors
 */
export const handleRateLimitError = (error: any): AppError => {
  return new AppError('Too many requests. Please try again later.', 429);
};

/**
 * Handle CORS errors
 */
export const handleCorsError = (error: any): AppError => {
  return new AppError('CORS policy violation', 403);
};

/**
 * Handle timeout errors
 */
export const handleTimeoutError = (error: any): AppError => {
  return new AppError('Request timeout', 408);
};

/**
 * Handle network errors
 */
export const handleNetworkError = (error: any): AppError => {
  if (error.code === 'ECONNREFUSED') {
    return new AppError('Service unavailable', 503);
  }
  if (error.code === 'ENOTFOUND') {
    return new AppError('Service not found', 502);
  }
  if (error.code === 'ETIMEDOUT') {
    return new AppError('Request timeout', 408);
  }
  return error;
};

/**
 * Handle JSON parsing errors
 */
export const handleJsonError = (error: any): AppError => {
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return new ValidationError('Invalid JSON format');
  }
  return error;
};

/**
 * Handle multer errors
 */
export const handleMulterError = (error: any): AppError => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new ValidationError('File size too large');
  }
  if (error.code === 'LIMIT_FILE_COUNT') {
    return new ValidationError('Too many files');
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ValidationError('Unexpected file field');
  }
  if (error.code === 'LIMIT_PART_COUNT') {
    return new ValidationError('Too many parts');
  }
  if (error.code === 'LIMIT_FIELD_KEY') {
    return new ValidationError('Field name too long');
  }
  if (error.code === 'LIMIT_FIELD_VALUE') {
    return new ValidationError('Field value too long');
  }
  if (error.code === 'LIMIT_FIELD_COUNT') {
    return new ValidationError('Too many fields');
  }
  return error;
};

/**
 * Handle JWT errors
 */
export const handleJWTError = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }
  if (error.name === 'NotBeforeError') {
    return new AuthenticationError('Token not active');
  }
  return error;
};

/**
 * Handle permission errors
 */
export const handlePermissionError = (error: any): AppError => {
  if (error.code === 'permission-denied') {
    return new AuthorizationError('Permission denied');
  }
  if (error.code === 'insufficient-permissions') {
    return new AuthorizationError('Insufficient permissions');
  }
  return error;
};

/**
 * Handle quota errors
 */
export const handleQuotaError = (error: any): AppError => {
  if (error.code === 'quota-exceeded') {
    return new AppError('Quota exceeded', 429);
  }
  if (error.code === 'resource-exhausted') {
    return new AppError('Resource exhausted', 429);
  }
  return error;
};

/**
 * Handle service errors
 */
export const handleServiceError = (error: any): AppError => {
  if (error.code === 'service-unavailable') {
    return new AppError('Service unavailable', 503);
  }
  if (error.code === 'service-overloaded') {
    return new AppError('Service overloaded', 503);
  }
  return error;
};

/**
 * Handle configuration errors
 */
export const handleConfigError = (error: any): AppError => {
  if (error.code === 'config-invalid') {
    return new AppError('Invalid configuration', 500);
  }
  if (error.code === 'config-missing') {
    return new AppError('Configuration missing', 500);
  }
  return error;
};

/**
 * Handle external API errors
 */
export const handleExternalAPIError = (error: any): AppError => {
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || 'External API error';
    
    if (status >= 400 && status < 500) {
      return new AppError(message, status);
    } else if (status >= 500) {
      return new AppError('External service error', 502);
    }
  }
  
  if (error.request) {
    return new AppError('External service unavailable', 503);
  }
  
  return new AppError('External service error', 502);
};

/**
 * Handle all errors
 */
export const handleError = (error: any): AppError => {
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return handleValidationError(error);
  }
  
  if (error.code && error.code.startsWith('P')) {
    return handleDatabaseError(error);
  }
  
  if (error.code && error.code.startsWith('auth/')) {
    return handleFirebaseError(error);
  }
  
  if (error.type && error.type.startsWith('Stripe')) {
    return handleStripeError(error);
  }
  
  if (error.code && error.code.startsWith('LIMIT_')) {
    return handleFileUploadError(error);
  }
  
  if (error.name && error.name.includes('JWT')) {
    return handleJWTError(error);
  }
  
  // Handle network errors
  if (error.code && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error.code)) {
    return handleNetworkError(error);
  }
  
  // Handle JSON errors
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return handleJsonError(error);
  }
  
  // Default to generic error
  return new AppError(error.message || 'Internal server error', 500);
};

/**
 * Error response formatter
 */
export const formatErrorResponse = (error: AppError) => {
  return {
    success: false,
    error: error.message,
    statusCode: error.statusCode,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      isOperational: error.isOperational,
    }),
  };
};
