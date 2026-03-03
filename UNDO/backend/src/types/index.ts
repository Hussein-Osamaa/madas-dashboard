import { Request } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';

// Re-export all types
export * from './auth';
export * from './stripe';
export * from './website';
export * from './user';
export * from './admin';
export * from './analytics';
export * from './common';

// Extended Request interface with Firebase Auth
export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
  uid?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Function context types
export interface FunctionContext {
  auth?: {
    uid: string;
    token: DecodedIdToken;
  };
  admin?: boolean;
}

// Webhook types
export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  created: number;
}

// Error types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}
