'use client';

import React, { useState, useEffect } from 'react';

interface Project {
  name: string;
  description: string;
  secretCount: number;
  type: string;
}

interface RotationStatus {
  infrastructure?: {
    vaultConnected: boolean;
    totalPolicies: number;
  };
  dashboard?: {
    healthStatus: string;
    recentRotations: number;
  };
}

export default function TestPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [rotationStatus, setRotationStatus] = useState<RotationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Test projects API
        const projectsResponse = await fetch('/api/projects');
        const projectsData = await projectsResponse.json();
        
        // Test rotation API
        const rotationResponse = await fetch('/api/rotation/status');
        const rotationData = await rotationResponse.json();
        
        setProjects(projectsData.projects || []);
        setRotationStatus(rotationData.status || null);
      } catch (error) {
        console.error('API Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) {
    return <div className="p-8">Loading real data...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
        🚀 <strong>REAL DATA TEST PAGE</strong> - Verify APIs are working
      </div>
      
      <h1 className="text-2xl font-bold mb-6">API Test Results</h1>
      
      {/* Projects Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Projects ({projects.length})</h2>
        {projects.length > 0 ? (
          <div className="space-y-4">
            {projects.map((project, index) => (
              <div key={index} className="border p-4 rounded">
                <h3 className="font-medium">{project.name}</h3>
                <p className="text-sm text-gray-600">{project.description}</p>
                <p className="text-sm">Secrets: {project.secretCount}</p>
                <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  {project.type}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No projects loaded</p>
        )}
      </div>

      {/* Rotation Status Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Rotation Status</h2>
        {rotationStatus ? (
          <div className="space-y-2">
            <p><strong>Vault Connected:</strong> {rotationStatus.infrastructure?.vaultConnected ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Total Policies:</strong> {rotationStatus.infrastructure?.totalPolicies || 0}</p>
            <p><strong>Health Status:</strong> {rotationStatus.dashboard?.healthStatus || 'Unknown'}</p>
            <p><strong>Recent Rotations:</strong> {rotationStatus.dashboard?.recentRotations || 0}</p>
          </div>
        ) : (
          <p className="text-gray-500">No rotation status loaded</p>
        )}
      </div>

      {/* Raw JSON Display */}
      <div className="bg-gray-100 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Raw API Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Projects JSON:</h3>
            <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(projects, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-medium mb-2">Rotation Status JSON:</h3>
            <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(rotationStatus, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
} 