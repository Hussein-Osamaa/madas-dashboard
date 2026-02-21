/**
 * Plan-based Permission Mapping
 * Maps plan features to permission keys for business owners
 */

import { PLAN_FEATURES } from '../constants';

/**
 * Maps plan features to their corresponding permission keys
 */
export const PLAN_FEATURE_TO_PERMISSIONS: Record<string, string[]> = {
  // Dashboard
  basic_dashboard: ['dashboard_view'],
  
  // Products & Inventory
  product_management: [
    'product_view',
    'product_create',
    'product_edit',
    'product_delete',
    'inventory_view',
    'inventory_edit',
    'collection_view',
    'collection_create',
    'collection_edit',
    'low_stock_view',
    'reviews_view',
    'reviews_edit'
  ],
  
  // Orders
  order_management: [
    'order_view',
    'order_create',
    'order_edit',
    'order_delete',
    'scan_log',
    'pos_view',
    'pos_access'
  ],
  
  // Customers
  customer_management: [
    'customer_view',
    'customer_create',
    'customer_edit',
    'customer_delete',
    'loyalty_manage'
  ],
  
  // Finance
  basic_reports: [
    'finance_view',
    'finance_reports',
    'finance_expenses',
    'finance_deposit',
    'analytics_view'
  ],
  
  // Advanced Analytics
  advanced_analytics: [
    'analytics_view',
    'analytics_export',
    'finance_insights'
  ],
  
  // Website Builder
  website_builder: [
    'website_builder',
    'website_templates',
    'website_pages',
    'website_settings',
    'website_preview'
  ],
  
  // Staff Management
  staff_management: [
    'staff_view',
    'staff_create',
    'staff_edit',
    'staff_delete',
    'roles_view',
    'roles_create',
    'roles_edit',
    'roles_delete'
  ],
  
  // Settings
  email_support: ['settings_general'],
  priority_support: ['settings_general', 'settings_shipping', 'settings_payments'],
  dedicated_support: [
    'settings_general',
    'settings_shipping',
    'settings_payments',
    'settings_integrations',
    'settings_social',
    'settings_plans'
  ],
  
  // Enterprise Features
  api_access: ['api_access'],
  multi_location: ['multi_location_manage'],
  custom_integrations: ['settings_integrations', 'custom_integrations']
};

/**
 * Get all permissions granted by a plan
 */
export function getPlanPermissions(planType: string): string[] {
  // Normalize plan type (handle variations like 'basic', 'starter', etc.)
  const normalizedType = planType.toLowerCase();
  let mappedType = normalizedType;
  
  // Map common plan type variations
  if (normalizedType === 'basic') {
    mappedType = 'starter';
  }
  
  const features = PLAN_FEATURES[mappedType as keyof typeof PLAN_FEATURES] || [];
  const permissions: string[] = [];
  
  features.forEach((feature) => {
    const featurePermissions = PLAN_FEATURE_TO_PERMISSIONS[feature] || [];
    permissions.push(...featurePermissions);
  });
  
  // Remove duplicates
  return [...new Set(permissions)];
}

/**
 * Check if a plan feature grants access to a specific permission
 */
export function planHasPermission(planType: string, permissionKey: string): boolean {
  const planPermissions = getPlanPermissions(planType);
  return planPermissions.includes(permissionKey);
}

/**
 * Check if a plan has any of the specified permissions
 */
export function planHasAnyPermission(planType: string, permissionKeys: string[]): boolean {
  const planPermissions = getPlanPermissions(planType);
  return permissionKeys.some((key) => planPermissions.includes(key));
}

/**
 * Check if a plan has all of the specified permissions
 */
export function planHasAllPermissions(planType: string, permissionKeys: string[]): boolean {
  const planPermissions = getPlanPermissions(planType);
  return permissionKeys.every((key) => planPermissions.includes(key));
}

