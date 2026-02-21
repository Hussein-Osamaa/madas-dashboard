/**
 * Maps routes to their required permissions
 * This is used to check if a user can access a specific route
 */
export const routePermissionMap: Record<string, string[]> = {
  '/': ['dashboard_view'],
  '/orders': ['order_view'],
  '/orders/scan-log': ['scan_log'],
  '/orders/abandoned-carts': ['order_view'],
  '/orders/tracking': ['order_view'],
  '/pos': ['pos_view', 'pos_access'],
  '/customers': ['customer_view'],
  '/inventory/products': ['product_view'],
  '/inventory/products/:productId': ['product_view'],
  '/inventory/collections': ['collection_view'],
  '/inventory/last-pieces': ['product_view'],
  '/inventory/low-stock': ['low_stock_view'],
  '/inventory/reviews': ['reviews_view'],
  '/finance/overview': ['finance_view'],
  '/finance/deposits': ['finance_view'],
  '/finance/expenses': ['finance_expenses'],
  '/finance/budgets': ['finance_view'],
  '/finance/reports': ['finance_reports'],
  '/finance/capital': ['finance_view'],
  '/finance/profit-settlement': ['finance_view'],
  '/finance/analytics': ['finance_view'],
  '/ecommerce/website-builder': ['website_builder'],
  '/ecommerce/templates': ['website_templates'],
  '/ecommerce/visit-store': ['website_builder'],
  '/ecommerce/custom-domains': ['website_settings'],
  '/ecommerce/website-settings': ['website_settings'],
  '/ecommerce/code-editor': ['website_builder'],
  '/rbac/users': ['staff_view'],
  '/rbac/roles': ['roles_view'],
  '/settings': ['settings_general'],
  '/settings/analytics': ['settings_integrations'],
  '/settings/shipping': ['settings_shipping'],
  '/settings/payments': ['settings_integrations']
};

/**
 * Get required permissions for a route
 */
export function getRoutePermissions(pathname: string): string[] {
  // Try exact match first
  if (routePermissionMap[pathname]) {
    return routePermissionMap[pathname];
  }

  // Try to match by prefix (for nested routes)
  for (const [route, permissions] of Object.entries(routePermissionMap)) {
    if (pathname.startsWith(route)) {
      return permissions;
    }
  }

  // No permission mapping found - allow access (for public routes)
  return [];
}

/**
 * Check if a route requires permissions
 */
export function routeRequiresPermission(pathname: string): boolean {
  return getRoutePermissions(pathname).length > 0;
}

