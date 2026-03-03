// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API Request types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, any>;
}

// Common API endpoints
export interface CreateWebsiteRequest {
  name: string;
  description?: string;
  template?: string;
}

export interface UpdateWebsiteRequest {
  name?: string;
  description?: string;
  settings?: any;
  content?: any;
  seo?: any;
}

export interface PublishWebsiteRequest {
  websiteId: string;
  customDomain?: string;
}

export interface CreateSubscriptionRequest {
  plan: string;
  paymentMethodId: string;
  billingInfo?: any;
}

export interface UpdateSubscriptionRequest {
  plan?: string;
  paymentMethodId?: string;
  billingInfo?: any;
}

// Webhook types
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export interface WebhookHandler {
  eventType: string;
  handler: (data: any) => Promise<void>;
}
