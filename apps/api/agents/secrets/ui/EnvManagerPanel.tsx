"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { createLogger } from '../../../../../src/utils/logger';
// import { useVault } from '../hooks/useVault'; // Custom hook for vault interactions
// import { Project, SecretEntry } from '../VaultTypes'; // Assuming these types exist

const logger = createLogger('EnvManagerPanel');

// Mock types for standalone demonstration - replace with actual imports
interface Project {
  id: string;
  name: string;
}

interface SecretEntry {
  id: string;
  key: string;
  value: string;
  tags?: string[];
  // Add other relevant fields from your VaultTypes.ts
}

interface ParsedEnvVariable {
  key: string;
  value: string;
  isNew?: boolean;
  hasConflict?: boolean;
  existingValue?: string;
}

interface EnvManagerPanelProps {
  // Props to be passed, e.g., selectedProjectId, onImportComplete, etc.
  // For now, let's assume a global project context or it's passed down.
  projects: Project[]; // List of available projects
  activeProjectId?: string;
}

// Helper to parse .env string into SecretEntry[] (simplified)
const parseEnvTextToSecrets = (envText: string): SecretEntry[] => {
  return envText.split(/\r\n|\n/).reduce((acc, line) => {
    const trimmedLine = line.trim();
    if (trimmedLine === '' || trimmedLine.startsWith('#')) {
      return acc;
    }
    const [key, ...valueParts] = trimmedLine.split('=');
    const value = valueParts.join('=');
    if (key) {
      acc.push({ id: key, key: key.trim(), value: value.trim() }); // Use key as id for simplicity
    }
    return acc;
  }, [] as SecretEntry[]);
};

// Simple Tooltip Component
interface TooltipProps {
  text: string;
  children: React.ReactElement;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(true);
  };

  const hideTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 200); // Small delay to allow mouse to move to tooltip if needed
  };
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="relative inline-block" onMouseEnter={showTooltip} onMouseLeave={hideTooltip}>
      {children}
      {isVisible && (
        <div className="absolute z-10 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm tooltip bottom-full left-1/2 transform -translate-x-1/2 mb-2 min-w-max">
          {text}
          <div className="absolute top-full left-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900 transform -translate-x-1/2"></div>
        </div>
      )}
    </div>
  );
};

const EnvManagerPanel: React.FC<EnvManagerPanelProps> = ({ projects, activeProjectId: initialActiveProjectId }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedEnvVars, setParsedEnvVars] = useState<ParsedEnvVariable[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>(initialActiveProjectId);
  const [previewMode, setPreviewMode] = useState<"import" | "export" | null>(null);
  const [secretsToExport, setSecretsToExport] = useState<SecretEntry[]>([]);
  const [exportFileName, setExportFileName] = useState<string>(".env.exported");
  const [overwrite, setOverwrite] = useState<boolean>(true);
  const [category, setCategory] = useState<string>("env");
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Function to get existing secrets for comparison during import preview
  const getExistingSecretsForPreview = async (projectId: string): Promise<SecretEntry[]> => {
    // This function would ideally fetch from a dedicated endpoint or use cached vault state.
    // For now, it simulates by fetching what would be exported.
    // This is NOT efficient for large vaults but works for preview purposes here.
    try {
      const response = await fetch(`/api/env/export?project=${projectId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ details: response.statusText }));
        logger.error("Error fetching existing secrets for preview", { 
          error: errorData.details || response.statusText 
        });
        return [];
      }
      const envText = await response.text();
      return parseEnvTextToSecrets(envText);
    } catch (e) {
      logger.error("Error fetching existing secrets for preview", { 
        error: e instanceof Error ? e.message : String(e) 
      });
      return [];
    }
  };

  useEffect(() => {
    if (initialActiveProjectId) {
      setActiveProjectId(initialActiveProjectId);
    }
  }, [initialActiveProjectId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    const file = target.files ? target.files[0] : null;
    if (file) {
      setSelectedFile(file);
      setError(null);
      setFeedbackMessage(null);
      setParsedEnvVars([]);
      setPreviewMode("import");
      setCategory("env");
    } else {
      setSelectedFile(null);
      setParsedEnvVars([]);
      setPreviewMode(null);
    }
  };

  const parseFileForImportPreview = useCallback(async (file: File) => {
    setIsParsing(true);
    setError(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r\n|\n/);
      const variables: ParsedEnvVariable[] = [];
      const existingSecrets = activeProjectId ? await getExistingSecretsForPreview(activeProjectId) : [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine === '' || trimmedLine.startsWith('#')) {
          continue;
        }
        const [key, ...valueParts] = trimmedLine.split('=');
        let value = valueParts.join('=');

        // Basic handling for quoted values, remove if starts and ends with quote
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        
        if (key) {
          const existingSecret = existingSecrets.find(s => s.key === key.trim());
          variables.push({
            key: key.trim(),
            value: value.trim(), // Use the processed value
            isNew: !existingSecret,
            hasConflict: !!existingSecret && existingSecret.value !== value.trim(),
            existingValue: existingSecret?.value,
          });
        }
      }
      setParsedEnvVars(variables);
    } catch (e: unknown) {
      logger.error("Error parsing .env file", { 
        error: e instanceof Error ? e.message : String(e) 
      });
      setError("Failed to parse .env file. Please ensure it's a valid UTF-8 text file.");
      setParsedEnvVars([]);
    }
    setIsParsing(false);
  }, [activeProjectId]);

  useEffect(() => {
    if (selectedFile && previewMode === "import" && activeProjectId) {
      parseFileForImportPreview(selectedFile);
    }
  }, [selectedFile, parseFileForImportPreview, previewMode, activeProjectId]);

  const handleImport = async () => {
    if (!activeProjectId || parsedEnvVars.length === 0) {
      setError("No project selected or no variables to import.");
      return;
    }
    if (!selectedFile) {
        setError("No file selected for import.");
        return;
    }

    setIsImporting(true);
    setError(null);
    setFeedbackMessage(null);
    try {
      const envContent = await selectedFile.text();
      const response = await fetch('/api/env/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          envContent,
          options: { 
            project: activeProjectId, 
            category: category || "env",
            overwrite: overwrite
          }, 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Import request failed", details: response.statusText }));
        throw new Error(errorData.details || errorData.error || "Import request failed");
      }

      const result = await response.json();
      setFeedbackMessage(result.message || "Secrets imported successfully!");
      setParsedEnvVars([]);
      setSelectedFile(null);
      setPreviewMode(null);
    } catch (e: unknown) {
      logger.error("Import failed", { 
        error: e instanceof Error ? e.message : String(e) 
      });
      if (e instanceof Error) {
        setError(e.message || "An unknown error occurred during import.");
      } else {
        setError("An unknown error occurred during import.");
      }
    }
    setIsImporting(false);
  };

  const handlePrepareExport = async () => {
    if (!activeProjectId) {
      setError("Please select a project to export secrets from.");
      return;
    }
    setIsExporting(true);
    setError(null);
    setFeedbackMessage(null);
    try {
      const exportCategory = category || "env";
      const response = await fetch(`/api/env/export?project=${activeProjectId}&category=${encodeURIComponent(exportCategory)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Export request failed", details: response.statusText }));
        throw new Error(errorData.details || errorData.error || "Failed to fetch secrets for export.");
      }
      const envText = await response.text();
      const parsedSecrets = parseEnvTextToSecrets(envText);
      if (parsedSecrets.length === 0) {
        setFeedbackMessage(`No secrets found in project '${projects.find(p=>p.id === activeProjectId)?.name || activeProjectId}' under category '${exportCategory}'.`);
        setSecretsToExport([]);
        setPreviewMode(null); // Don't show export preview if nothing to export
      } else {
        setSecretsToExport(parsedSecrets); 
        setPreviewMode("export");
        setExportFileName(`.env.${projects.find(p => p.id === activeProjectId)?.name || 'project'}.${exportCategory}`);
        setIsExportModalOpen(true); // Open modal after preparing export data
      }
    } catch (e: unknown) {
      logger.error("Failed to fetch secrets for export", { 
        error: e instanceof Error ? e.message : String(e) 
      });
      if (e instanceof Error) {
        setError(e.message || "Failed to fetch secrets.");
      } else {
        setError("Failed to fetch secrets.");
      }
      setSecretsToExport([]);
      setPreviewMode(null);
    }
    setIsExporting(false);
  };

  const handlePerformExportFromModal = () => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (secretsToExport.length === 0) {
        setError("No secrets to export.");
        setIsExportModalOpen(false);
        return;
      }
      const envContent = secretsToExport.map(s => `${s.key}=${s.value}`).join('\n');
      const blob = new Blob([envContent], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      // Use exportFileName from state for the download
      link.download = exportFileName.endsWith('.env') ? exportFileName : `${exportFileName}.env`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      setFeedbackMessage("Secrets exported successfully!");
      setIsExportModalOpen(false);
      setPreviewMode(null); // Clear preview after export
      setSecretsToExport([]); // Clear secrets after export
    }
  };

  const renderImportOptions = () => (
    <div className="my-4 p-4 border border-gray-300 rounded-md bg-gray-50">
      <h3 className="text-lg font-semibold mb-2 text-gray-700">Import Options</h3>
      <div className="mb-3">
        <label htmlFor="categoryInput" className="block text-sm font-medium text-gray-700 mb-1">
          Category (default: env)
          <Tooltip text="Specify a category for these secrets within the project (e.g., 'frontend', 'backend'). Leave as 'env' for default.">
            <span className="ml-1 text-blue-500 cursor-help">(?)</span>
          </Tooltip>
        </label>
        <input
          type="text"
          id="categoryInput"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g., backend, frontend, staging"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <div className="flex items-center">
        <input
          id="overwrite-checkbox"
          type="checkbox"
          checked={overwrite}
          onChange={(e) => setOverwrite(e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
        />
        <label htmlFor="overwrite-checkbox" className="ml-2 block text-sm text-gray-900">
          Overwrite existing secrets with the same name
          <Tooltip text="If checked, secrets in the .env file will replace existing secrets with the same name in the selected category. If unchecked, existing secrets will be kept, and conflicting new secrets will be skipped.">
            <span className="ml-1 text-blue-500 cursor-help">(?)</span>
          </Tooltip>
        </label>
      </div>
    </div>
  );

  const renderImportPreview = () => (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Import Preview for {projects.find(p=>p.id === activeProjectId)?.name || "Selected Project"}</h3>
      {parsedEnvVars.length === 0 && <p>No variables parsed from the file or no file selected.</p>}
      <ul className="space-y-2">
        {parsedEnvVars.map((envVar) => (
          <li key={envVar.key} className={`p-2 rounded ${envVar.hasConflict ? 'bg-yellow-100 border-yellow-300' : envVar.isNew ? 'bg-green-100 border-green-300' : 'bg-blue-100 border-blue-300'} border`}>
            <div className="font-mono text-sm">
              <span className="font-semibold">{envVar.key}</span>={envVar.value}
            </div>
            {envVar.hasConflict && (
              <p className="text-xs text-yellow-700 mt-1">
                Conflict: Vault already has this key with value: "{envVar.existingValue}". Importing will {overwrite ? "overwrite it." : "skip it."}
              </p>
            )}
            {envVar.isNew && <p className="text-xs text-green-700 mt-1">New secret: Will be added to the vault.</p>}
            {!envVar.isNew && !envVar.hasConflict && <p className="text-xs text-blue-700 mt-1">No change: Value matches existing secret in vault.</p>}
          </li>
        ))}
      </ul>
      <button
        onClick={handleImport}
        disabled={isImporting || isExporting || isParsing || parsedEnvVars.length === 0 || !selectedFile}
        className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-w-[180px] text-center"
      >
        {isImporting ? 'Importing...' : 'Confirm & Import Secrets'}
      </button>
    </div>
  );

  const renderExportModal = () => {
    if (!isExportModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
        <div className="relative p-8 bg-white w-full max-w-md m-auto flex-col flex rounded-lg shadow-xl">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Confirm Export</h3>
          <p className="text-sm text-gray-600 mb-1">Project: <span className="font-medium">{projects.find(p => p.id === activeProjectId)?.name || 'N/A'}</span></p>
          <p className="text-sm text-gray-600 mb-4">Category: <span className="font-medium">{category || 'env'}</span></p>
          
          <div className="mb-4">
            <label htmlFor="exportFileNameInput" className="block text-sm font-medium text-gray-700 mb-1">
              Export Filename:
            </label>
            <input
              type="text"
              id="exportFileNameInput"
              value={exportFileName}
              onChange={(e) => setExportFileName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="text-xs text-gray-500 mb-4">
            {secretsToExport.length} secret(s) will be included in the .env file.
          </div>

          {/* Optional: A small preview of keys to be exported can go here */}
          {/* <div className="mb-4 max-h-32 overflow-y-auto border p-2 rounded text-xs">
            {secretsToExport.slice(0, 10).map(s => <div key={s.key}>{s.key}</div>)}
            {secretsToExport.length > 10 && <div>...and {secretsToExport.length - 10} more.</div>}
          </div> */}

          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setIsExportModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handlePerformExportFromModal}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Export File
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-4xl mx-auto my-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">.env File Management</h2>

      {/* Project Selection */}
      <div className="mb-6">
        <label htmlFor="project-select" className="block text-sm font-medium text-gray-700 mb-1">
          Select Project:
        </label>
        <select
          id="project-select"
          value={activeProjectId || ""}
          onChange={(e) => {
            setActiveProjectId(e.target.value);
            setSelectedFile(null);
            setParsedEnvVars([]);
            setSecretsToExport([]);
            setPreviewMode(null);
            setError(null);
            setFeedbackMessage(null);
            setCategory("env");
          }}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="" disabled>-- Select a Project --</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {activeProjectId && (
        <>
          {/* File Input */}
          <div className="mb-4">
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">
              Upload .env file for Import:
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".env,.env.*,*.env"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
          
          {selectedFile && previewMode === "import" && renderImportOptions()}

          {/* Action Buttons (Main action buttons removed from here if Confirm Import is in preview) */}
          {/* Option 1: Keep main import button and preview's confirm button is separate */}
          {/* Option 2: Remove main import button if preview is shown, making preview's button the primary action */}
          {/* Current implementation has main import button and preview has its own confirm button */}
          {/* Let's consolidate: If preview is shown, the button in the preview is the main import trigger. */}
          {/* So, we can conditionally hide the main "Import Selected File" button if the preview (which has its own confirm) is visible */}
          
          <div className="flex space-x-4 mb-6">
            {!(selectedFile && previewMode === "import" && parsedEnvVars.length > 0) && (
              <button
                onClick={handleImport} // This button should ideally not be clicked if preview is active and has its own confirm.
                                      // Or, it should be the one that says "Import without preview" if we had that flow.
                                      // For now, let's assume `parseFileForImportPreview` always runs for a selected file.
                                      // The `disabled` condition already handles `parsedEnvVars.length === 0`
                disabled={isImporting || isExporting || isParsing || !selectedFile || parsedEnvVars.length === 0 || previewMode !== "import"}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-w-[180px] text-center"
              >
                {isImporting ? 'Importing...' : 'Import Selected File'} 
              </button>
            )}
            <button
              onClick={handlePrepareExport}
              disabled={isExporting || isImporting || isParsing || !activeProjectId}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 min-w-[220px] text-center"
            >
              {isExporting ? 'Loading Export...' : 'Prepare & Export Secrets'}
            </button>
          </div>
        </>
      )}

      {/* Feedback Messages */}
      {(isImporting || isExporting || isParsing) && <div className="text-center my-4 text-blue-600">Processing...</div>}
      {error && <div className="my-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">{error}</div>}
      {feedbackMessage && <div className="my-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded-md">{feedbackMessage}</div>}

      {/* Previews */}
      {previewMode === "import" && parsedEnvVars.length > 0 && renderImportPreview()}
      {renderExportModal()}

    </div>
  );
};

export default EnvManagerPanel;

// Example Usage (Conceptual - to be placed in a page component)
/*
const MySecretsPage = () => {
  const mockProjects: Project[] = [
    { id: "proj1", name: "Project Alpha" },
    { id: "proj2", name: "Project Beta" },
  ];

  return (
    <div className="container mx-auto p-4">
      <EnvManagerPanel projects={mockProjects} activeProjectId="proj1" />
    </div>
  );
};
*/ 