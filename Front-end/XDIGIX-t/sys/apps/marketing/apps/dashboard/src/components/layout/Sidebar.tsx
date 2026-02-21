import clsx from 'clsx';
import { Fragment, useState, useMemo, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useBusiness } from '../../contexts/BusinessContext';
import { useRBAC } from '../../contexts/RBACContext';
import { getRoutePermissions } from '../../utils/routePermissions';

type SidebarSection = {
  title?: string;
  items: Array<
    | {
        type: 'link';
        label: string;
        icon: string;
        to: string;
      }
    | {
        type: 'dropdown';
        label: string;
        icon: string;
        items: Array<{ label: string; to: string; icon: string }>;
      }
  >;
};

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

// Base sections for all users
const getBaseSections = (): SidebarSection[] => [
  {
    items: [
      { type: 'link', label: 'Dashboard', icon: 'dashboard', to: '/' },
      {
        type: 'dropdown',
        label: 'Orders',
        icon: 'receipt_long',
        items: [
          { label: 'All Orders', to: '/orders', icon: 'list_alt' },
          { label: 'Order Tracking', to: '/orders/tracking', icon: 'local_shipping' },
          { label: 'Abandoned Carts', to: '/orders/abandoned-carts', icon: 'remove_shopping_cart' }
        ]
      },
      { type: 'link', label: 'POS', icon: 'point_of_sale', to: '/pos' },
      {
        type: 'dropdown',
        label: 'Inventory',
        icon: 'inventory_2',
        items: [
          { label: 'Products', to: '/inventory/products', icon: 'inventory' },
          { label: 'Collections', to: '/inventory/collections', icon: 'collections' },
          { label: 'Reviews', to: '/inventory/reviews', icon: 'rate_review' },
          { label: 'Low Stock', to: '/inventory/low-stock', icon: 'warning' },
          { label: 'Last Pieces', to: '/inventory/last-pieces', icon: 'hourglass_bottom' }
        ]
      },
      { type: 'link', label: 'Customers', icon: 'group', to: '/customers' },
      {
        type: 'dropdown',
        label: 'Marketing',
        icon: 'campaign',
        items: [
          { label: 'Discount Codes', to: '/marketing/discounts', icon: 'local_offer' },
          { label: 'Product Pricing', to: '/marketing/pricing', icon: 'sell' }
        ]
      },
      {
        type: 'dropdown',
        label: 'E-commerce',
        icon: 'storefront',
        items: [
          { label: 'Website Builder', to: '/ecommerce/website-builder', icon: 'web' },
          { label: 'Code Editor', to: '/ecommerce/code-editor', icon: 'code' },
          { label: 'Visit Store', to: '/ecommerce/visit-store', icon: 'shopping_bag' },
          { label: 'Custom Domains', to: '/ecommerce/custom-domains', icon: 'language' },
          { label: 'Navigation', to: '/ecommerce/navigation', icon: 'navigation' }
        ]
      },
      {
        type: 'dropdown',
        label: 'Finance',
        icon: 'account_balance_wallet',
        items: [
          { label: 'Overview', to: '/finance/overview', icon: 'dashboard' },
          { label: 'Deposits', to: '/finance/deposits', icon: 'savings' },
          { label: 'Expenses', to: '/finance/expenses', icon: 'receipt' },
          { label: 'Budgets', to: '/finance/budgets', icon: 'bookmark' },
          { label: 'Reports', to: '/finance/reports', icon: 'assessment' },
          { label: 'Capital Return', to: '/finance/capital', icon: 'trending_up' },
          { label: 'Cash Flow Reserve', to: '/finance/cash-flow', icon: 'account_balance_wallet' },
          { label: 'Profit Settlement', to: '/finance/profit-settlement', icon: 'handshake' },
          { label: 'Analytics', to: '/finance/analytics', icon: 'insights' }
        ]
      },
      { type: 'link', label: 'Settings', icon: 'settings', to: '/settings' }
    ]
  }
];

// Super admin sections
const getSuperAdminSections = (): SidebarSection[] => [
  {
    title: 'Super Admin',
    items: [
      { type: 'link', label: 'Super Admin Dashboard', icon: 'admin_panel_settings', to: '/super-admin' },
      { type: 'link', label: 'Tenants', icon: 'business', to: '/super-admin/tenants' },
      { type: 'link', label: 'Super Admin Users', icon: 'people', to: '/super-admin/users' },
      { type: 'link', label: 'Subscriptions', icon: 'credit_card', to: '/super-admin/subscriptions' },
      { type: 'link', label: 'Roles & Permissions', icon: 'admin_panel_settings', to: '/rbac/roles' }
    ]
  }
];

// Quick actions will be defined inside the component to use navigate

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const { hasAnyPermission: businessHasAnyPermission, role } = useBusiness();
  const { hasAnyPermission: rbacHasAnyPermission } = useRBAC();
  const [accessibleRoutes, setAccessibleRoutes] = useState<Set<string>>(new Set());

  // Check route permissions asynchronously
  useEffect(() => {
    const checkRoutePermissions = async () => {
      const baseSections = getBaseSections();
      const routes = new Set<string>();

      // Collect all routes
      baseSections.forEach((section) => {
        section.items.forEach((item) => {
          if (item.type === 'link') {
            routes.add(item.to);
          } else {
            item.items.forEach((subItem) => {
              if (subItem.to && subItem.to !== '#') {
                routes.add(subItem.to);
              }
            });
          }
        });
      });

      // Check permissions for each route
      const accessible = new Set<string>();
      
      for (const route of routes) {
        const requiredPermissions = getRoutePermissions(route);
        
        // No permission required, allow access
        if (requiredPermissions.length === 0) {
          accessible.add(route);
          continue;
        }

        // Owners have access to everything
        if (role === 'owner') {
          accessible.add(route);
          continue;
        }

        // Check business permissions first (sync)
        if (businessHasAnyPermission(requiredPermissions)) {
          accessible.add(route);
          continue;
        }

        // Check RBAC permissions (async)
        try {
          const hasAccess = await rbacHasAnyPermission(requiredPermissions);
          if (hasAccess) {
            accessible.add(route);
          }
        } catch (error) {
          console.error('[Sidebar] Error checking route permissions:', error);
        }
      }

      setAccessibleRoutes(accessible);
    };

    checkRoutePermissions();
  }, [role, businessHasAnyPermission, rbacHasAnyPermission]);

  // Filter sections based on permissions
  const sections = useMemo(() => {
    const baseSections = getBaseSections();
    
    // Owners have access to everything
    if (role === 'owner') {
      return baseSections;
    }

    // Filter sections based on accessible routes
    return baseSections.map((section) => ({
      ...section,
      items: section.items
        .map((item) => {
          if (item.type === 'link') {
            // Check if route is accessible
            const requiredPermissions = getRoutePermissions(item.to);
            if (requiredPermissions.length === 0) {
              // No permission required, allow access
              return item;
            }
            
            // Check if route is in accessible routes set
            return accessibleRoutes.has(item.to) ? item : null;
          } else {
            // For dropdowns, filter items and only show dropdown if it has accessible items
            const accessibleItems = item.items.filter((subItem) => {
              if (!subItem.to || subItem.to === '#') {
                return true;
              }
              
              const requiredPermissions = getRoutePermissions(subItem.to);
              if (requiredPermissions.length === 0) {
                return true;
              }
              
              return accessibleRoutes.has(subItem.to);
            });

            // Only return dropdown if it has accessible items
            if (accessibleItems.length === 0) {
              return null;
            }

            return {
              ...item,
              items: accessibleItems
            };
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    })).filter((section) => section.items.length > 0);
  }, [role, accessibleRoutes]);

  const quickActions = [
    { label: 'New Order', icon: 'add', onClick: () => { navigate('/orders'); onClose(); } },
    { label: 'Add Product', icon: 'add', onClick: () => { navigate('/inventory/products'); onClose(); } }
  ];

  // Auto-expand dropdowns if any child route is active
  const getDropdownKey = (item: { label: string; items: Array<{ to: string }> }) => item.label;

  const toggleDropdown = (key: string) => {
    setOpenDropdowns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Check if any child route is active for auto-expanding
  const isDropdownActive = (item: { items: Array<{ to: string }> }) => {
    return item.items.some((subItem) => {
      if (subItem.to === '#') return false;
      // For exact match routes like /orders, only match exactly
      if (subItem.to === '/orders') {
        return location.pathname === '/orders';
      }
      // For other routes, use startsWith for nested routes
      return location.pathname === subItem.to || location.pathname.startsWith(subItem.to + '/');
    });
  };

  return (
    <Fragment>
      <div
        className={clsx(
          'fixed inset-0 bg-black/20 lg:hidden transition-opacity',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <aside
        className={clsx(
          'fixed lg:static left-0 top-16 h-[calc(100vh-4rem)] lg:h-full w-64 bg-white shadow-lg lg:shadow-none z-30 transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <nav className="flex-1 min-h-0 px-4 py-6 space-y-2 overflow-y-auto">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-2">
                {section.title && (
                  <p className="text-xs uppercase tracking-wide text-gray-400 px-4">{section.title}</p>
                )}
                {section.items.map((item, itemIndex) => {
                  if (item.type === 'link') {
                    return (
                      <NavLink
                        key={itemIndex}
                        to={item.to}
                        className={({ isActive }) =>
                          clsx(
                            'sidebar-link flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-base hover:text-primary transition-all',
                            isActive && 'bg-base text-primary font-semibold'
                          )
                        }
                        onClick={onClose}
                      >
                        <span className="material-icons">{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  }

                  const dropdownKey = getDropdownKey(item);
                  const isActive = isDropdownActive(item);
                  const isOpen = openDropdowns.has(dropdownKey) || isActive;

                  return (
                    <div key={itemIndex} className="space-y-2">
                      <button
                        type="button"
                        className={clsx(
                          'sidebar-link flex items-center justify-between w-full px-4 py-3 rounded-xl text-gray-700 hover:bg-base hover:text-primary transition-all',
                          isActive && 'bg-base text-primary font-semibold'
                        )}
                        onClick={() => toggleDropdown(dropdownKey)}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="material-icons">{item.icon}</span>
                          <span>{item.label}</span>
                        </div>
                        <span
                          className={clsx(
                            'material-icons transition-transform duration-200',
                            isOpen && 'rotate-180'
                          )}
                        >
                          expand_more
                        </span>
                      </button>
                      <div
                        className={clsx(
                          'ml-6 space-y-1 overflow-hidden transition-all duration-200',
                          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        )}
                      >
                        {item.items.map((subItem, subIndex) => (
                          subItem.to && subItem.to !== '#' ? (
                            <NavLink
                              key={subIndex}
                              to={subItem.to}
                              end={subItem.to === '/orders'}
                              className={({ isActive: subActive }) =>
                                clsx(
                                  'sidebar-link submenu-link flex items-center space-x-3 px-4 py-2 rounded-lg transition-all text-sm',
                                  subActive 
                                    ? 'bg-base text-primary font-medium' 
                                    : 'text-gray-800 hover:bg-base hover:text-primary'
                                )
                              }
                              onClick={onClose}
                            >
                              <span className={clsx(
                                'material-icons text-base',
                                'opacity-100',
                                'text-current'
                              )}>{subItem.icon}</span>
                              <span>{subItem.label}</span>
                            </NavLink>
                          ) : (
                            <button
                              key={subIndex}
                              type="button"
                              className="sidebar-link submenu-link flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-800 hover:bg-base hover:text-primary transition-all text-sm w-full text-left"
                              onClick={() => {
                                // Feature coming soon
                              }}
                              title={`${subItem.label} (coming soon)`}
                            >
                              <span className="material-icons text-base opacity-100 text-current">{subItem.icon}</span>
                              <span>{subItem.label}</span>
                            </button>
                          )
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="flex-shrink-0 p-3 lg:p-4 border-t border-gray-200 bg-white">
            <div className="bg-base rounded-xl p-2.5 lg:p-3">
              <h3 className="text-xs font-medium text-primary mb-1.5">Quick Actions</h3>
              <div className="space-y-1.5">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className="w-full text-left text-xs text-gray-600 hover:text-primary flex items-center space-x-2 py-1.5 px-2 rounded-lg hover:bg-white/50 transition-colors"
                    onClick={action.onClick}
                  >
                    <span className="material-icons text-sm">{action.icon}</span>
                    <span className="truncate">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </Fragment>
  );
};

export default Sidebar;

