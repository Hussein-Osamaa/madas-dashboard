/**
 * XDIGIX Admin Sidebar
 * Navigation sidebar for the super admin dashboard
 */

import clsx from 'clsx';
import { Fragment } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  CreditCard,
  UserCog,
  BarChart3,
  KeyRound,
  Plus,
  UserPlus,
  X,
  Package,
  Truck,
  CheckCircle,
  Clock
} from 'lucide-react';

type SidebarSection = {
  title?: string;
  items: Array<{
    type: 'link';
    label: string;
    icon: React.ReactNode;
    to: string;
  }>;
};

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const sections: SidebarSection[] = [
  {
    title: 'Overview',
    items: [
      { type: 'link', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, to: '/' }
    ]
  },
  {
    title: 'Management',
    items: [
      { type: 'link', label: 'Clients', icon: <Building2 className="w-5 h-5" />, to: '/clients' },
      { type: 'link', label: 'Company Staff', icon: <Users className="w-5 h-5" />, to: '/staff' },
      { type: 'link', label: 'Subscriptions', icon: <CreditCard className="w-5 h-5" />, to: '/subscriptions' }
    ]
  },
  {
    title: 'Warehouse',
    items: [
      { type: 'link', label: 'Staff Management', icon: <UserCog className="w-5 h-5" />, to: '/staff-management' }
    ]
  },
  {
    title: 'Fulfillment',
    items: [
      { type: 'link', label: 'All Orders', icon: <Package className="w-5 h-5" />, to: '/fulfillment' },
      { type: 'link', label: 'Pending', icon: <Clock className="w-5 h-5" />, to: '/pending-orders' },
      { type: 'link', label: 'Ready for Pickup', icon: <CheckCircle className="w-5 h-5" />, to: '/ready-for-pickup' },
      { type: 'link', label: 'Shipping', icon: <Truck className="w-5 h-5" />, to: '/shipping' }
    ]
  },
  {
    title: 'Security',
    items: [
      { type: 'link', label: 'Plan Permissions', icon: <CreditCard className="w-5 h-5" />, to: '/plan-permissions' },
      { type: 'link', label: 'Client Staff Permissions', icon: <Users className="w-5 h-5" />, to: '/client-staff-permissions' }
    ]
  },
  {
    title: 'Insights',
    items: [
      { type: 'link', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, to: '/analytics' }
    ]
  }
];

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const navigate = useNavigate();

  const quickActions = [
    { label: 'Add Client', icon: <Plus className="w-4 h-4" />, onClick: () => { navigate('/clients'); onClose(); } },
    { label: 'Add Staff', icon: <UserPlus className="w-4 h-4" />, onClick: () => { navigate('/staff'); onClose(); } }
  ];

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity z-20',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static left-0 top-16 h-[calc(100vh-4rem)] lg:h-full w-72 bg-[#1a1b3e]/95 backdrop-blur-xl border-r border-white/5 z-30 transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Mobile close button */}
        <button
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col h-full overflow-hidden">
          <nav className="flex-1 min-h-0 px-4 py-6 space-y-6 overflow-y-auto">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                {section.title && (
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-medium px-3 mb-3">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item, itemIndex) => (
                    <NavLink
                      key={itemIndex}
                      to={item.to}
                      className={({ isActive }) =>
                        clsx(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-400'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        )
                      }
                      onClick={onClose}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Quick Actions */}
          <div className="flex-shrink-0 p-4 border-t border-white/5">
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl p-4 border border-amber-500/10">
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    className="w-full flex items-center gap-2 text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-all"
                    onClick={action.onClick}
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* System status */}
            <div className="mt-4 flex items-center gap-2 px-3">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">System operational</span>
            </div>
          </div>
        </div>
      </aside>
    </Fragment>
  );
};

export default Sidebar;
