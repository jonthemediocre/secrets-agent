"use client";

import React, { useState, ReactNode } from 'react';
import { ShieldCheckIcon, UserCircleIcon, Bars3Icon, XMarkIcon, Cog6ToothIcon, FolderIcon, HomeIcon, DocumentTextIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface AppLayoutProps {
  children: ReactNode;
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

interface NavItem {
  name: string;
  pageId: string;
  icon: React.ElementType;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, currentPage = 'dashboard', onNavigate }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation: NavItem[] = [
    { name: 'Dashboard', pageId: 'dashboard', icon: HomeIcon },
    { name: 'Projects', pageId: 'projects', icon: FolderIcon },
    { name: 'Env Management', pageId: 'env-management', icon: DocumentTextIcon },
    { name: 'Settings', pageId: 'settings', icon: Cog6ToothIcon },
  ];

  const handleNavigation = (pageId: string) => {
    if (onNavigate) {
      onNavigate(pageId);
    }
    setSidebarOpen(false); // Close mobile sidebar on navigation
  };

  const handleSignOut = () => {
    // Implement sign out logic here
    console.log('Sign out clicked');
  };

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
              <div className="ml-4 flex items-center md:ml-6">
                <div className="relative ml-3">
                  <button 
                    className="flex max-w-xs items-center rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                    onClick={handleSignOut}
                  >
                    <span className="sr-only">Open user menu</span>
                    <UserCircleIcon className="h-8 w-8 rounded-full text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
            <div className="-mr-2 flex md:hidden">
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
          {navigation.map((item) => {
            const isActive = currentPage === item.pageId;
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.pageId)}
                className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-left transition-colors ${
                  isActive 
                    ? 'bg-gray-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-600 hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon 
                  className={`mr-3 flex-shrink-0 h-6 w-6 ${
                    isActive ? 'text-indigo-400' : 'text-gray-400'
                  }`} 
                  aria-hidden="true" 
                />
                {item.name}
              </button>
            );
          })}
          <div className="!mt-auto pt-4 border-t border-gray-600">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-600 hover:text-white text-left transition-colors"
            >
              <ArrowRightOnRectangleIcon className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400" aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </nav>

        {/* Mobile Sidebar (Overlay) */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-20 flex" role="dialog" aria-modal="true">
            <div 
              className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" 
              onClick={() => setSidebarOpen(false)} 
              aria-hidden="true"
            />
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
              {navigation.map((item) => {
                const isActive = currentPage === item.pageId;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigation(item.pageId)}
                    className={`w-full flex items-center px-3 py-2 rounded-md text-base font-medium text-left transition-colors ${
                      isActive ? 'bg-gray-900' : 'hover:bg-gray-700'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon 
                      className={`mr-4 flex-shrink-0 h-6 w-6 ${
                        isActive ? 'text-indigo-400' : 'text-gray-400'
                      }`} 
                      aria-hidden="true" 
                    />
                    {item.name}
                  </button>
                );
              })}
              <div className="!mt-auto pt-4 border-t border-gray-500">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center px-3 py-2 rounded-md text-base font-medium hover:bg-gray-700 text-left transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="mr-4 flex-shrink-0 h-6 w-6 text-gray-400" aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            </div>
            <div className="w-14 flex-shrink-0" aria-hidden="true">
              {/* Dummy element to force sidebar to shrink to fit close icon */}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout; 