import '../../../../src/global.css'; // Adjust path as necessary
"use client";

import React, { useState, ReactNode } from 'react';
import { ShieldCheckIcon, UserCircleIcon, Bars3Icon, XMarkIcon, Cog6ToothIcon, FolderIcon, HomeIcon, DocumentTextIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'; // Example icons

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  current: boolean; // Simple way to indicate current page for styling
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Example navigation items - this would likely come from a config or be dynamic
  const navigation: NavItem[] = [
    { name: 'Dashboard', href: '#', icon: HomeIcon, current: true },
    { name: 'Projects', href: '#', icon: FolderIcon, current: false },
    { name: 'Env Management', href: '#', icon: DocumentTextIcon, current: false }, // Placeholder for where EnvManagerPanel might live
    { name: 'Settings', href: '#', icon: Cog6ToothIcon, current: false },
  ];

  // const UserNavigation = [
  //   { name: 'Your Profile', href: '#' },
  //   { name: 'Sign out', href: '#' },
  // ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Bar */}
      <header className="bg-gray-800 text-white shadow-md sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 mr-2 text-indigo-400" />
              <span className="font-semibold text-xl">Secrets Agent</span>
            </div>
            <div className="hidden md:block">
              {/* User session - placeholder */}
              <div className="ml-4 flex items-center md:ml-6">
                {/* <button
                  type="button"
                  className="rounded-full bg-gray-700 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  <span className="sr-only">View notifications</span>
                  <BellIcon className="h-6 w-6" aria-hidden="true" /> // BellIcon not imported, example
                </button> */}

                {/* Profile dropdown - conceptual */}
                <div className="relative ml-3">
                  <div>
                    <button className="flex max-w-xs items-center rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                      <span className="sr-only">Open user menu</span>
                      <UserCircleIcon className="h-8 w-8 rounded-full text-gray-400" />
                    </button>
                  </div>
                  {/* Dropdown menu, show/hide based on menu state (not implemented here) */}
                  {/* Example: 
                  <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {UserNavigation.map((item) => (
                      <a key={item.name} href={item.href} className='block px-4 py-2 text-sm text-gray-700'>
                        {item.name}
                      </a>
                    ))}
                  </div>
                  */}
                </div>
              </div>
            </div>
            <div className="-mr-2 flex md:hidden">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="inline-flex items-center justify-center rounded-md bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                <span className="sr-only">Open main menu</span>
                {sidebarOpen ? (
                  <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (Desktop) */}
        <nav aria-label="Sidebar" className="hidden md:block md:flex-shrink-0 md:overflow-y-auto md:bg-gray-700 md:w-64 p-4 space-y-1">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-600 hover:text-white'}`}
              aria-current={item.current ? 'page' : undefined}
            >
              <item.icon className={`mr-3 flex-shrink-0 h-6 w-6 ${item.current ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-300'}`} aria-hidden="true" />
              {item.name}
            </a>
          ))}
          <div className="!mt-auto pt-4 border-t border-gray-600">
             <a
              href="#" // Consider a real sign-out handler
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-600 hover:text-white`}
            >
              <ArrowRightOnRectangleIcon className={`mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300`} aria-hidden="true" />
              Sign Out
            </a>
          </div>
        </nav>

        {/* Mobile Sidebar (Overlay) */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-20 flex" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" onClick={() => setSidebarOpen(false)} aria-hidden="true"></div>
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-gray-800 p-4 space-y-1 text-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                  <button
                    type="button"
                    className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${item.current ? 'bg-gray-900' : 'hover:bg-gray-700'}`}
                  aria-current={item.current ? 'page' : undefined}
                >
                  <item.icon className={`mr-4 flex-shrink-0 h-6 w-6 ${item.current ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-300'}`} aria-hidden="true" />
                  {item.name}
                </a>
              ))}
              <div className="!mt-auto pt-4 border-t border-gray-500">
                <a
                  href="#" // Consider a real sign-out handler
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium hover:bg-gray-700`}
                >
                  <ArrowRightOnRectangleIcon className={`mr-4 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-300`} aria-hidden="true" />
                  Sign Out
                </a>
              </div>
            </div>
            <div className="w-14 flex-shrink-0" aria-hidden="true">
              {/* Dummy element to force sidebar to shrink to fit close icon */}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* The children prop will render the specific page content here */}
          {/* For example, if on the /env-management page, EnvManagerPanel would be rendered here */}
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout; 