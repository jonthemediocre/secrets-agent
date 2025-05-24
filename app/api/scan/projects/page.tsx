'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';

interface ProjectDiscovery {
  name: string;
  path: string;
  hasEnvFiles: boolean;
  hasConfigFiles: boolean;
  estimatedSecrets: number;
  confidence: 'low' | 'medium' | 'high';
}

interface ScanSummary {
  totalProjects: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  totalEstimatedSecrets: number;
}

export default function ProjectScannerPage() {
  const [projects, setProjects] = useState<ProjectDiscovery[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [scanResults, setScanResults] = useState<any>(null);

  const discoverProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scan/projects?action=discover');
      const data = await response.json();
      
      if (data.success) {
        setProjects(data.data.projects);
        setSummary(data.data.summary);
      } else {
        console.error('Discovery failed:', data.error);
      }
    } catch (error) {
      console.error('Discovery error:', error);
    } finally {
      setLoading(false);
    }
  };

  const scanProject = async (projectName: string) => {
    try {
      const response = await fetch(`/api/scan/projects?action=scan&project=${encodeURIComponent(projectName)}`);
      const data = await response.json();
      
      if (data.success) {
        setScanResults(data.data);
      } else {
        console.error('Scan failed:', data.error);
      }
    } catch (error) {
      console.error('Scan error:', error);
    }
  };

  const importSelectedProjects = async () => {
    if (selectedProjects.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/scan/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_selected',
          projects: selectedProjects
        })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Successfully imported secrets from ${data.data.summary.successful} projects!`);
        setSelectedProjects([]);
      }
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProjectSelection = (projectName: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectName) 
        ? prev.filter(p => p !== projectName)
        : [...prev, projectName]
    );
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  useEffect(() => {
    discoverProjects();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🔍 Project Scanner</h1>
            <p className="text-gray-600 mt-2">
              Automatically discover and import secrets from all your Pinokio projects
            </p>
          </div>
          <div className="space-x-3">
            <button
              onClick={discoverProjects}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '🔄 Scanning...' : '🔍 Refresh Scan'}
            </button>
            {selectedProjects.length > 0 && (
              <button
                onClick={importSelectedProjects}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                📥 Import Selected ({selectedProjects.length})
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{summary.totalProjects}</div>
                <div className="text-sm text-gray-600">Total Projects</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{summary.highConfidence}</div>
                <div className="text-sm text-gray-600">High Confidence</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{summary.mediumConfidence}</div>
                <div className="text-sm text-gray-600">Medium Confidence</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">{summary.totalEstimatedSecrets}</div>
                <div className="text-sm text-gray-600">Estimated Secrets</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Project List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Discovered Projects</h2>
            <div className="text-sm text-gray-500">
              Select projects to import into vault
            </div>
          </div>

          {loading && projects.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin text-4xl">🔄</div>
              <p className="text-gray-500 mt-2">Scanning projects...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card key={project.name} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getConfidenceColor(project.confidence)}`}>
                          {project.confidence}
                        </span>
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(project.name)}
                          onChange={() => toggleProjectSelection(project.name)}
                          className="w-4 h-4 text-blue-600"
                        />
                      </div>
                    </div>
                    <CardDescription className="text-sm text-gray-500 truncate">
                      {project.path}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Estimated Secrets:</span>
                        <span className="font-medium">{project.estimatedSecrets}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Env Files:</span>
                        <span className={project.hasEnvFiles ? 'text-green-600' : 'text-gray-400'}>
                          {project.hasEnvFiles ? '✅' : '❌'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Config Files:</span>
                        <span className={project.hasConfigFiles ? 'text-green-600' : 'text-gray-400'}>
                          {project.hasConfigFiles ? '✅' : '❌'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => scanProject(project.name)}
                      className="w-full mt-3 bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
                    >
                      🔍 Detailed Scan
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Scan Results Modal */}
        {scanResults && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Scan Results: {scanResults.projectName}</h3>
                <button
                  onClick={() => setScanResults(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Confidence</div>
                    <div className={`font-medium ${getConfidenceColor(scanResults.confidence)}`}>
                      {scanResults.confidence}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Secrets Found</div>
                    <div className="font-medium">{scanResults.foundSecrets.length}</div>
                  </div>
                </div>

                {scanResults.foundSecrets.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Discovered Secrets:</h4>
                    <div className="space-y-2">
                      {scanResults.foundSecrets.map((secret: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded">
                          <div className="font-medium">{secret.key}</div>
                          <div className="text-sm text-gray-600">
                            Category: {secret.category} | File: {secret.file}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {scanResults.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Suggestions:</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {scanResults.suggestions.map((suggestion: string, index: number) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 