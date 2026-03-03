import Joi from 'joi';
import { ValidationError } from '@/types';

/**
 * Validate request body against schema
 */
export const validateBody = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      throw new ValidationError(errorMessage);
    }

    req.body = value;
    next();
  };
};

/**
 * Validate request query against schema
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      throw new ValidationError(errorMessage);
    }

    req.query = value;
    next();
  };
};

/**
 * Validate request params against schema
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      throw new ValidationError(errorMessage);
    }

    req.params = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  // User schemas
  createUser: Joi.object({
    email: Joi.string().email().required(),
    displayName: Joi.string().min(1).max(100).optional(),
    photoURL: Joi.string().uri().optional(),
    role: Joi.string().valid('admin', 'user').optional(),
  }),

  updateUser: Joi.object({
    displayName: Joi.string().min(1).max(100).optional(),
    photoURL: Joi.string().uri().optional(),
    bio: Joi.string().max(500).optional(),
    location: Joi.string().max(100).optional(),
    website: Joi.string().uri().optional(),
    socialLinks: Joi.object({
      twitter: Joi.string().uri().optional(),
      linkedin: Joi.string().uri().optional(),
      github: Joi.string().uri().optional(),
      instagram: Joi.string().uri().optional(),
    }).optional(),
    preferences: Joi.object({
      theme: Joi.string().valid('light', 'dark', 'auto').optional(),
      language: Joi.string().length(2).optional(),
      timezone: Joi.string().optional(),
      dateFormat: Joi.string().optional(),
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        push: Joi.boolean().optional(),
        marketing: Joi.boolean().optional(),
        updates: Joi.boolean().optional(),
        security: Joi.boolean().optional(),
      }).optional(),
      privacy: Joi.object({
        profilePublic: Joi.boolean().optional(),
        analyticsOptIn: Joi.boolean().optional(),
        dataSharing: Joi.boolean().optional(),
      }).optional(),
    }).optional(),
  }),

  // Website schemas
  createWebsite: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).optional(),
    templateId: Joi.string().required(),
    customDomain: Joi.string().domain().optional(),
  }),

  updateWebsite: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).optional(),
    content: Joi.object().optional(),
    settings: Joi.object().optional(),
    seo: Joi.object({
      title: Joi.string().max(60).optional(),
      description: Joi.string().max(160).optional(),
      keywords: Joi.array().items(Joi.string()).max(10).optional(),
      ogImage: Joi.string().uri().optional(),
      ogTitle: Joi.string().max(60).optional(),
      ogDescription: Joi.string().max(160).optional(),
      canonicalUrl: Joi.string().uri().optional(),
      robots: Joi.object({
        index: Joi.boolean().optional(),
        follow: Joi.boolean().optional(),
      }).optional(),
    }).optional(),
  }),

  publishWebsite: Joi.object({
    websiteId: Joi.string().required(),
    customDomain: Joi.string().domain().optional(),
    sslEnabled: Joi.boolean().optional(),
  }),

  // Subscription schemas
  createCheckoutSession: Joi.object({
    priceId: Joi.string().required(),
    successUrl: Joi.string().uri().required(),
    cancelUrl: Joi.string().uri().required(),
    customerId: Joi.string().optional(),
    trialPeriodDays: Joi.number().min(1).max(30).optional(),
  }),

  updateSubscription: Joi.object({
    subscriptionId: Joi.string().required(),
    priceId: Joi.string().required(),
    prorationBehavior: Joi.string().valid('create_prorations', 'none', 'always_invoice').optional(),
  }),

  cancelSubscription: Joi.object({
    subscriptionId: Joi.string().required(),
    cancelAtPeriodEnd: Joi.boolean().optional(),
    cancellationReason: Joi.string().max(500).optional(),
  }),

  // Analytics schemas
  trackEvent: Joi.object({
    event: Joi.string().required(),
    category: Joi.string().valid('page_view', 'user_action', 'system_event', 'error').required(),
    properties: Joi.object().optional(),
    sessionId: Joi.string().optional(),
    url: Joi.string().uri().optional(),
  }),

  // Pagination schemas
  pagination: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // Search schemas
  search: Joi.object({
    query: Joi.string().min(1).max(100).optional(),
    filters: Joi.object().optional(),
    dateRange: Joi.object({
      start: Joi.date().required(),
      end: Joi.date().required(),
    }).optional(),
  }),

  // ID parameter schema
  idParam: Joi.object({
    id: Joi.string().required(),
  }),

  // Email schema
  email: Joi.string().email().required(),

  // URL schema
  url: Joi.string().uri().required(),

  // Domain schema
  domain: Joi.string().domain().required(),
};

/**
 * Custom validation for file uploads
 */
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
}) => {
  return (req: any, res: any, next: any) => {
    if (!req.file && options.required) {
      throw new ValidationError('File is required');
    }

    if (req.file) {
      // Check file size
      if (options.maxSize && req.file.size > options.maxSize) {
        throw new ValidationError(`File size must be less than ${options.maxSize} bytes`);
      }

      // Check file type
      if (options.allowedTypes && !options.allowedTypes.includes(req.file.mimetype)) {
        throw new ValidationError(`File type must be one of: ${options.allowedTypes.join(', ')}`);
      }
    }

    next();
  };
};

/**
 * Sanitize HTML content
 */
export const sanitizeHtml = (html: string): string => {
  // Basic HTML sanitization - in production, use a proper library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
};

/**
 * Validate and sanitize user input
 */
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return sanitizeHtml(input.trim());
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};
