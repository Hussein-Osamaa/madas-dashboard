import { Fragment } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserPlus,
  Package,
  Settings,
  Plus,
  Banknote,
  Truck,
} from 'lucide-react';
import { usePermissions, PERMISSIONS } from '../contexts/PermissionContext';

type SectionItem = { label: string; icon: React.ReactNode; to: string; permission?: string };

const sectionItems: { title?: string; items: SectionItem[] }[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, to: '' }] },
  {
    title: 'Management',
    items: [
      { label: 'Clients', icon: <Building2 className="w-5 h-5" />, to: 'clients', permission: PERMISSIONS.clientsRead },
      { label: 'Client Users', icon: <UserPlus className="w-5 h-5" />, to: 'client-users', permission: PERMISSIONS.clientsRead },
      { label: 'Staff & Users', icon: <Users className="w-5 h-5" />, to: 'users', permission: PERMISSIONS.usersRead },
      { label: 'Settings', icon: <Settings className="w-5 h-5" />, to: 'settings' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Fulfillment', icon: <Package className="w-5 h-5" />, to: 'fulfillment', permission: PERMISSIONS.fulfillmentRead },
      { label: 'Finance', icon: <Banknote className="w-5 h-5" />, to: 'finance', permission: PERMISSIONS.financeRead },
      { label: 'Shipping', icon: <Truck className="w-5 h-5" />, to: 'shipping', permission: PERMISSIONS.shippingRead },
    ],
  },
];

type SidebarProps = { isOpen: boolean; onClose: () => void };

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { can, isAdmin } = usePermissions();

  const sections = sectionItems.map((sec) => ({
    ...sec,
    items: sec.items.filter((item) => !item.permission || can(item.permission) || isAdmin),
  })).filter((sec) => sec.items.length > 0);

  const quickActions = [
    { label: 'Add Client', icon: <Plus className="w-4 h-4" />, onClick: () => { navigate('/clients'); onClose(); } },
  ];

  return (
    <Fragment>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity z-20 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed lg:static left-0 top-16 h-[calc(100vh-4rem)] lg:h-full w-72 bg-[#1a1b3e]/95 backdrop-blur-xl border-r border-white/5 z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <nav className="flex-1 min-h-0 px-4 py-6 space-y-6 overflow-y-auto">
            {sections.map((section, i) => (
              <div key={i}>
                {section.title && (
                  <p className="text-xs uppercase tracking-wider text-gray-500 font-medium px-3 mb-3">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === ''}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive ? 'bg-amber-500/10 text-amber-400 border-l-2 border-amber-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`
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
          <div className="flex-shrink-0 p-4 border-t border-white/5">
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl p-4 border border-amber-500/10">
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {(can(PERMISSIONS.clientsRead) || isAdmin)
                  ? quickActions.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        className="w-full flex items-center gap-2 text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5"
                        onClick={action.onClick}
                      >
                        {action.icon}
                        <span>{action.label}</span>
                      </button>
                    ))
                  : null}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 px-3">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">System operational</span>
            </div>
          </div>
        </div>
      </aside>
    </Fragment>
  );
}
