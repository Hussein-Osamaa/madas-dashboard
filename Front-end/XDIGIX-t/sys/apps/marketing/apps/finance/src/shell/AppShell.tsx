import { Fragment, useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Bars3Icon, Cog6ToothIcon, CurrencyDollarIcon, ReceiptPercentIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { useState } from 'react';
import clsx from 'clsx';
import NavigationConfig from './navigation';
import { usePermissions } from '../context/PermissionsProvider';

const AppShell = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { hasPermission, hasAnyPermission } = usePermissions();

  // Filter navigation items based on permissions
  const filteredNavigation = useMemo(() => {
    return NavigationConfig.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.permission) return true; // No permission required
        if (Array.isArray(item.permission)) {
          return hasAnyPermission(item.permission);
        }
        return hasPermission(item.permission);
      })
    })).filter((section) => section.items.length > 0); // Remove empty sections
  }, [hasPermission, hasAnyPermission]);

  return (
    <div className="min-h-screen bg-base text-madas-text">
      <Transition.Root show={mobileOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 lg:hidden" onClose={setMobileOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 pt-6 shadow-xl">
                  <div className="flex h-12 items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-semibold">
                      DF
                    </div>
                    <p className="font-semibold text-lg">DIGIX Finance</p>
                  </div>
                  <nav className="flex flex-1 flex-col gap-2">
                    {filteredNavigation.map((section) => (
                      <div key={section.label}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-madas-text/60 mb-2">
                          {section.label}
                        </p>
                        <ul className="space-y-1">
                          {section.items.map((item) => (
                            <li key={item.to}>
                              <NavLink
                                to={item.to}
                                onClick={() => setMobileOpen(false)}
                                className={({ isActive }) =>
                                  clsx(
                                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                                    isActive
                                      ? 'bg-primary text-white shadow-lg'
                                      : 'bg-white text-madas-text hover:bg-primary/10 hover:text-primary'
                                  )
                                }
                              >
                                <item.icon className="h-5 w-5" />
                                <span>{item.label}</span>
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-6 overflow-y-auto bg-white px-8 py-10 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white text-lg font-semibold">
              <CurrencyDollarIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-primary">DIGIX Finance HQ</h1>
              <p className="text-sm text-madas-text/65">Manage every dollar in DIGIX</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-6">
            {filteredNavigation.map((section) => (
              <div key={section.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-madas-text/50 mb-2">
                  {section.label}
                </p>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          clsx(
                            'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition',
                            isActive
                              ? 'bg-primary text-white shadow-lg shadow-primary/30'
                              : 'bg-white text-madas-text hover:bg-primary/10 hover:text-primary'
                          )
                        }
                      >
                        <item.icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span>{item.label}</span>
                        {item.badge ? (
                          <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary">
                            {item.badge}
                          </span>
                        ) : null}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                <ReceiptPercentIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">Need help?</p>
                <p className="text-xs text-madas-text/70">Book a 1:1 finance walkthrough with our team.</p>
              </div>
            </div>
            <button className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition">
              Book Session
            </button>
          </div>
        </div>
      </div>

      <div className="lg:pl-72">
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-white px-5 py-4 shadow-md">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
            onClick={() => setMobileOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <CurrencyDollarIcon className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold text-primary">DIGIX Finance HQ</span>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>
        <main className="min-h-screen bg-base/80">
          <div className="px-6 py-8 sm:px-10 lg:px-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;

