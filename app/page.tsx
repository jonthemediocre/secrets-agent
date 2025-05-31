'use client';

import React from 'react';

interface Project {
  name: string;
  path: string;
  type: string;
  hasEnvFile?: boolean;
  hasPackageJson?: boolean;
  hasDockerFile?: boolean;
  estimatedSecrets?: number;
  confidence?: string;
  lastModified?: string;
  sizeKB?: number;
}

interface ScanResponse {
  success: boolean;
  projects: Project[];
  summary?: {
    totalProjects: number;
    totalEstimatedSecrets: number;
    highConfidenceProjects: number;
  };
}

interface RotationStatus {
  infrastructure: {
    isInitialized: boolean;
    totalPolicies: number;
    enabledPolicies: number;
    vaultConnected: boolean;
  };
  dashboard: {
    recentRotations: number;
    upcomingRotations: number;
    policiesDue: number;
    healthStatus: string;
  };
}

export default function HomePage() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [rotationStatus, setRotationStatus] = React.useState<RotationStatus | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [projectsPerPage] = React.useState(20);
  const [searchFilter, setSearchFilter] = React.useState('');

  // Load projects on mount
  React.useEffect(() => {
    loadProjects();
    loadRotationStatus();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/scan/projects');
      const data: ScanResponse = await response.json();
      
      if (data.success) {
        setProjects(data.projects);
      } else {
        setError('Failed to load projects');
      }
    } catch (err) {
      setError('Failed to fetch project data');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRotationStatus = async () => {
    try {
      const response = await fetch('/api/rotation/status');
      const data = await response.json();
      if (data.success) {
        setRotationStatus(data.status);
      }
    } catch (err) {
      console.error('Error loading rotation status:', err);
    }
  };

  const handleProjectSelect = (projectName: string, checked: boolean) => {
    const newSelected = new Set(selectedProjects);
    if (checked) {
      newSelected.add(projectName);
    } else {
      newSelected.delete(projectName);
    }
    setSelectedProjects(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map(p => p.name)));
    }
  };

  const handleDeepScan = async () => {
    if (selectedProjects.size === 0) {
      alert('Please select at least one project to scan');
      return;
    }

    setLoadingAction('scanning');
    try {
      const results = [];
      for (const projectName of Array.from(selectedProjects)) {
        const project = projects.find(p => p.name === projectName);
        if (!project) continue;

        const response = await fetch('/api/secrets/scaffold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: projectName,
            projectPath: project.path,
            action: 'scan'
          })
        });

        const result = await response.json();
        results.push({ project: projectName, result });
      }

      // Show results summary
      const totalSuggestions = results.reduce((sum, r) => sum + (r.result.result?.suggestions?.length || 0), 0);
      alert(`✅ Deep scan complete!\n\n🔍 Scanned: ${selectedProjects.size} projects\n🔒 Found: ${totalSuggestions} potential secrets\n\nCheck browser console for detailed results.`);
      console.log('Deep scan results:', results);

    } catch (err) {
      console.error('Deep scan failed:', err);
      alert('❌ Deep scan failed. Check console for details.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleExportEnv = async () => {
    if (selectedProjects.size === 0) {
      alert('Please select at least one project to export');
      return;
    }

    setLoadingAction('exporting');
    try {
      for (const projectName of Array.from(selectedProjects)) {
        const response = await fetch(`/api/env/export?project=${encodeURIComponent(projectName)}`);
        
        if (response.ok) {
          const envContent = await response.text();
          
          // Create download
          const blob = new Blob([envContent], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${projectName}.env`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          const error = await response.json();
          console.error(`Export failed for ${projectName}:`, error);
        }
      }

      alert(`✅ Environment files exported for ${selectedProjects.size} project(s)`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('❌ Export failed. Check console for details.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRotateSecrets = async () => {
    if (!rotationStatus?.infrastructure.isInitialized) {
      alert('❌ Rotation system not initialized. Please set up vault first.');
      return;
    }

    if (rotationStatus.dashboard.policiesDue === 0) {
      alert('✅ No secrets are due for rotation at this time.');
      return;
    }

    setLoadingAction('rotating');
    try {
      // Trigger rotation for policies due
      const response = await fetch('/api/rotation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_rotation_all' })
      });

      if (response.ok) {
        await loadRotationStatus();
        alert(`✅ Secret rotation completed successfully!`);
      } else {
        const error = await response.json();
        alert(`❌ Rotation failed: ${error.details}`);
      }
    } catch (err) {
      console.error('Rotation failed:', err);
      alert('❌ Rotation failed. Check console for details.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConfigureVault = async () => {
    // Navigate to the vault management page
    window.location.href = '/vault';
  };

  // Filter and paginate projects
  const filteredProjects = React.useMemo(() => {
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      project.path.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [projects, searchFilter]);

  const paginatedProjects = React.useMemo(() => {
    const startIndex = (currentPage - 1) * projectsPerPage;
    return filteredProjects.slice(startIndex, startIndex + projectsPerPage);
  }, [filteredProjects, currentPage, projectsPerPage]);

  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);

  const summary = React.useMemo(() => {
    const totalProjects = projects.length;
    const totalEstimatedSecrets = projects.reduce((sum, p) => sum + (p.estimatedSecrets || 0), 0);
    const highConfidenceProjects = projects.filter(p => p.confidence === 'high').length;
    
    return { totalProjects, totalEstimatedSecrets, highConfidenceProjects };
  }, [projects]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🔄</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">🔐 Secrets Agent</h1>
          <p className="text-gray-600">Scanning projects for secrets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">Error</h1>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔐 Secrets Agent Scanner</h1>
          <p className="text-gray-600">Project scanning results and vault management</p>
          
          {rotationStatus && (
            <div className="mt-4 flex space-x-4 text-sm">
              <span className={`px-2 py-1 rounded ${rotationStatus.infrastructure.vaultConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                Vault: {rotationStatus.infrastructure.vaultConnected ? 'Connected' : 'Disconnected'}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                Policies: {rotationStatus.infrastructure.totalPolicies}
              </span>
              {rotationStatus.dashboard.policiesDue > 0 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                  Due for Rotation: {rotationStatus.dashboard.policiesDue}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-blue-600">{summary.totalProjects}</div>
            <div className="text-sm text-gray-600">Total Projects Scanned</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-green-600">{summary.totalEstimatedSecrets}</div>
            <div className="text-sm text-gray-600">Estimated Secrets Found</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-2xl font-bold text-purple-600">{summary.highConfidenceProjects}</div>
            <div className="text-sm text-gray-600">High Confidence Projects</div>
          </div>
        </div>

        {/* Search and Selection Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col space-y-4">
            {/* Search Bar */}
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="🔍 Search projects by name or path..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="text-sm text-gray-600">
                Showing {filteredProjects.length} of {projects.length} projects
              </div>
            </div>
            
            {/* Selection Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedProjects.size === filteredProjects.length && filteredProjects.length > 0}
                    onChange={handleSelectAll}
                    className="mr-2"
                  />
                  Select All ({selectedProjects.size} selected)
                </label>
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={handleDeepScan}
                  disabled={selectedProjects.size === 0 || loadingAction === 'scanning'}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {loadingAction === 'scanning' ? '🔄 Scanning...' : '🔍 Deep Scan Selected'}
                </button>
                
                <button 
                  onClick={handleExportEnv}
                  disabled={selectedProjects.size === 0 || loadingAction === 'exporting'}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                >
                  {loadingAction === 'exporting' ? '🔄 Exporting...' : '📋 Export .env Files'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Project Scan Results</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Est. Secrets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Indicators
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProjects.map((project, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProjects.has(project.name)}
                        onChange={(e) => handleProjectSelect(project.name, e.target.checked)}
                        className="h-4 w-4 text-blue-600"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{project.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{project.path}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        project.confidence === 'high' ? 'bg-green-100 text-green-800' :
                        project.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.confidence}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {project.estimatedSecrets}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-1">
                        {project.hasEnvFile && <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">.env</span>}
                        {project.hasPackageJson && <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">package.json</span>}
                        {project.hasDockerFile && <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Docker</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(project.lastModified || '').toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} ({filteredProjects.length} total projects)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vault Operations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={handleRotateSecrets}
              disabled={loadingAction === 'rotating'}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              {loadingAction === 'rotating' ? '🔄 Rotating...' : '🔄 Rotate Due Secrets'}
              {rotationStatus?.dashboard.policiesDue ? ` (${rotationStatus.dashboard.policiesDue})` : ''}
            </button>
            
            <button 
              onClick={handleConfigureVault}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              ⚙️ Configure Vault Integration
            </button>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>✅ Connected Features:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Project scanning with intelligence estimation</li>
              <li>Deep secret detection and scaffolding</li>
              <li>SOPS-encrypted vault export (.env generation)</li>
              <li>Automated secret rotation policies</li>
              <li>Real-time vault status monitoring</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 