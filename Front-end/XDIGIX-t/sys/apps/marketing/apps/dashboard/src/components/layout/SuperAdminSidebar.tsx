/**
 * Super Admin Sidebar
 * Navigation sidebar for the company's super admin dashboard
 */

import clsx from 'clsx';
import { Fragment, useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

type SidebarSection = {
  title?: string;
  items: Array<{
    type: 'link';
    label: string;
    icon: string;
    to: string;
  }>;
};

type SuperAdminSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const sections: SidebarSection[] = [
  {
    items: [
      { type: 'link', label: 'Dashboard', icon: 'dashboard', to: '/super-admin' },
      { type: 'link', label: 'Clients', icon: 'business', to: '/super-admin/clients' },
      { type: 'link', label: 'Company Staff', icon: 'people', to: '/super-admin/staff' },
      { type: 'link', label: 'Access Control', icon: 'admin_panel_settings', to: '/super-admin/access' },
      { type: 'link', label: 'Subscriptions', icon: 'credit_card', to: '/super-admin/subscriptions' },
      { type: 'link', label: 'Analytics', icon: 'analytics', to: '/super-admin/analytics' },
      { type: 'link', label: 'Roles & Permissions', icon: 'admin_panel_settings', to: '/super-admin/roles' }
    ]
  }
];

const SuperAdminSidebar = ({ isOpen, onClose }: SuperAdminSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const quickActions = [
    { label: 'Add Client', icon: 'add_business', onClick: () => { navigate('/super-admin/clients'); onClose(); } },
    { label: 'Add Staff', icon: 'person_add', onClick: () => { navigate('/super-admin/staff'); onClose(); } }
  ];

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
          'fixed lg:static left-0 top-16 h-[calc(100vh-4rem)] lg:h-full w-64 bg-white dark:bg-gray-800 shadow-lg lg:shadow-none z-30 transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <nav className="flex-1 min-h-0 px-4 py-6 space-y-2 overflow-y-auto">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-2">
                {section.title && (
                  <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 px-4">
                    {section.title}
                  </p>
                )}
                {section.items.map((item, itemIndex) => (
                  <NavLink
                    key={itemIndex}
                    to={item.to}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-700 hover:text-purple-600 dark:hover:text-purple-400 transition-all',
                        isActive &&
                          'bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold shadow-md'
                      )
                    }
                    onClick={onClose}
                  >
                    <span className="material-icons">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="flex-shrink-0 p-3 lg:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-2.5 lg:p-3">
              <h3 className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1.5">
                Quick Actions
              </h3>
              <div className="space-y-1.5">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className="w-full text-left text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 flex items-center space-x-2 py-1.5 px-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
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

export default SuperAdminSidebar;

