import React from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Package,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { signOutUser } from "../../api/auth";
import toast from "react-hot-toast";

const Sidebar = ({ isOpen, onClose }) => {
  const { userData, hasPermission } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOutUser();
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: BarChart3,
      roles: ["admin", "manager", "viewer"],
    },
    {
      name: "Revenue",
      href: "/revenue",
      icon: DollarSign,
      roles: ["admin", "manager", "viewer"],
    },
    {
      name: "Expenses",
      href: "/expenses",
      icon: TrendingUp,
      roles: ["admin", "manager", "viewer"],
    },
    {
      name: "Inventory",
      href: "/inventory",
      icon: Package,
      roles: ["admin", "manager", "viewer"],
    },
    {
      name: "Customers",
      href: "/customers",
      icon: Users,
      roles: ["admin", "manager", "viewer"],
    },
    {
      name: "Reports",
      href: "/reports",
      icon: FileText,
      roles: ["admin", "manager", "viewer"],
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      roles: ["admin", "manager"],
    },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(userData?.role)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">FD</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Finance Dashboard
                </h1>
                <p className="text-xs text-gray-500">
                  {userData?.role || "User"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? "active" : ""}`
                  }
                  onClick={onClose}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-medium text-sm">
                  {userData?.name?.charAt(0) || "U"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userData?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userData?.email || "user@example.com"}
                </p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
