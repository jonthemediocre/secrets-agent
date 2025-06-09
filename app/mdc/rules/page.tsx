'use client'

import Link from 'next/link'
import { DocumentTextIcon, FolderIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">MDC Rules</h1>
              <p className="mt-2 text-lg text-gray-600">Browse and manage your rule collection</p>
            </div>
            <Link
              href="/mdc/rules/create"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Rule
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search rules..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option>All Categories</option>
            <option>Core</option>
            <option>Language</option>
            <option>Framework</option>
            <option>Testing</option>
          </select>
        </div>

        {/* Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        Rule {i + 1}
                      </h3>
                      <p className="text-sm text-gray-500">core/typescript</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Valid
                  </span>
                </div>
                <p className="mt-4 text-sm text-gray-600">
                  TypeScript configuration and best practices for strict type checking.
                </p>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Last updated 2h ago</span>
                  <Link
                    href={`/mdc/rules/${i + 1}`}
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    View →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}