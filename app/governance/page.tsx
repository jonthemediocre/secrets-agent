// Governance Page Component
export default function GovernancePage() {
  return (
    <div className="governance-page">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Security Governance
          </h1>
          <p className="text-gray-600">
            Manage security policies, compliance settings, and governance rules for your secrets management platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Compliance Policies</h3>
            <p className="text-gray-600 mb-4">Configure and monitor compliance with security standards.</p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              Manage Policies
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Access Controls</h3>
            <p className="text-gray-600 mb-4">Define user permissions and access restrictions.</p>
            <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Configure Access
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Audit Logs</h3>
            <p className="text-gray-600 mb-4">Review security events and governance actions.</p>
            <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
              View Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}