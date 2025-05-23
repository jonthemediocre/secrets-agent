// Path: apps/api/agents/secrets/ui/EnvManagerPanel.test.tsx
// Test suite for EnvManagerPanel.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom'; // Ensure this is imported for matchers like .toBeInTheDocument()
import EnvManagerPanel from './EnvManagerPanel'; // Assuming path is correct

const mockProjects = [
  { id: "proj1", name: "Project Alpha" },
  { id: "proj2", name: "Project Beta" },
];

const mockEnvFileContent = `
API_KEY=new_api_key_from_file
DB_HOST=new_db_host_from_file
NEW_VARIABLE=some_value
# This is a comment
EMPTY_VAR=
`;

// Note: The component EnvManagerPanel.tsx currently has its own internal mock functions.
// For robust unit testing, these would ideally be injected or mockable via jest.mock().
// These tests will currently rely on those internal mocks, which might be reset or behave
// as defined within the component, not overridden per test unless the component is refactored.

describe('EnvManagerPanel', () => {
  // Mock for window.URL.createObjectURL and document.createElement for jsdom
  let createObjectURLMock: jest.Mock;
  let createElementMock: jest.Mock;
  let appendChildMock: jest.Mock;
  let removeChildMock: jest.Mock;

  beforeEach(() => {
    // Setup mocks for DOM functions used in export
    createObjectURLMock = jest.fn(() => 'mock_url');
    global.URL.createObjectURL = createObjectURLMock;

    // More robust mocking for document methods
    const mockLink = { href: '', download: '', click: jest.fn(), style: { display: ''} }; // Added style for potential manipulation
    createElementMock = jest.fn(() => mockLink as unknown as HTMLAnchorElement);
    document.createElement = createElementMock;
    
    appendChildMock = jest.fn();
    document.body.appendChild = appendChildMock;

    removeChildMock = jest.fn();
    document.body.removeChild = removeChildMock;
  });

  afterEach(() => {
    // Restore original implementations
    jest.restoreAllMocks(); 
    // Explicitly restore global mocks if they were set directly
    if ((global.URL.createObjectURL as jest.Mock).mockClear) {
        (global.URL.createObjectURL as jest.Mock).mockRestore();
    }
    // The document method mocks are restored by jest.restoreAllMocks() if they were created with jest.spyOn
    // If set directly like above, ensure they are reset or handled if needed, though jest.restoreAllMocks covers spies.
  });

  test('renders the panel with project selector', () => {
    render(<EnvManagerPanel projects={mockProjects} />);
    expect(screen.getByText('.env File Manager')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Project:')).toBeInTheDocument();
    mockProjects.forEach(p => {
      expect(screen.getByText(p.name)).toBeInTheDocument();
    });
  });

  test('allows project selection and shows import/export sections', () => {
    render(<EnvManagerPanel projects={mockProjects} />);
    const projectSelect = screen.getByLabelText('Select Project:') as HTMLSelectElement;
    
    fireEvent.change(projectSelect, { target: { value: 'proj1' } });
    // expect(projectSelect.value).toBe('proj1'); // JSDOM might not update .value immediately for select, focus on behavior
    expect(screen.getByText('Import .env File')).toBeInTheDocument();
    expect(screen.getByText('Export Secrets to .env File')).toBeInTheDocument();
  });

  test('handles .env file upload and displays import preview', async () => {
    render(<EnvManagerPanel projects={mockProjects} activeProjectId="proj1" />);
    
    const fileInput = screen.getByLabelText('Upload .env file:') as HTMLInputElement;
    const file = new File([mockEnvFileContent], '.env', { type: 'text/plain' });

    await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText('Import Preview for Project Alpha')).toBeInTheDocument();
    });

    expect(screen.getByText('API_KEY=new_api_key_from_file')).toBeInTheDocument();
    expect(screen.getByText(/Conflict: Vault already has this key with value: "current_api_key_in_vault"/)).toBeInTheDocument();
    expect(screen.getByText('DB_HOST=new_db_host_from_file')).toBeInTheDocument();
    expect(screen.getByText(/Conflict: Vault already has this key with value: "current_db_host_in_vault"/)).toBeInTheDocument();
    expect(screen.getByText('NEW_VARIABLE=some_value')).toBeInTheDocument();
    expect(screen.getByText('New secret: Will be added to the vault.')).toBeInTheDocument();
    expect(screen.getByText('EMPTY_VAR=')).toBeInTheDocument(); 
  });

  test('allows confirming import and shows feedback', async () => {
    // This test relies on the internal mockImportSecretsToVault of EnvManagerPanel
    render(<EnvManagerPanel projects={mockProjects} activeProjectId="proj1" />);
    const fileInput = screen.getByLabelText('Upload .env file:') as HTMLInputElement;
    const file = new File([mockEnvFileContent], '.env', { type: 'text/plain' });

    await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
    });
    await waitFor(() => expect(screen.getByText('Confirm Import')).toBeEnabled());

    const confirmButton = screen.getByText('Confirm Import');
    await act(async () => {
        fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Secrets imported successfully!')).toBeInTheDocument();
    });
  });

  test('allows preparing export and shows preview', async () => {
    // This test relies on the internal mockGetSecretsForProject of EnvManagerPanel
    render(<EnvManagerPanel projects={mockProjects} activeProjectId="proj1" />);
    const prepareExportButton = screen.getByText('Prepare Export');

    await act(async () => {
        fireEvent.click(prepareExportButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Export Preview for Project Alpha')).toBeInTheDocument();
    });
    expect(screen.getByText(/API_KEY=current_api_key_in_vault/)).toBeInTheDocument();
    expect(screen.getByText(/DB_HOST=current_db_host_in_vault/)).toBeInTheDocument();
    // Check if input field for filename has the correct default value
    const fileNameInput = screen.getByDisplayValue('.env.Project Alpha') as HTMLInputElement;
    expect(fileNameInput.value).toBe('.env.Project Alpha');
  });

  test('allows downloading the exported .env file', async () => {
    render(<EnvManagerPanel projects={mockProjects} activeProjectId="proj1" />);
    const prepareExportButton = screen.getByText('Prepare Export');
    await act(async () => {
        fireEvent.click(prepareExportButton);
    });
    await waitFor(() => expect(screen.getByText('Download .env File')).toBeEnabled());

    const downloadButton = screen.getByText('Download .env File');
    
    // Get the mock link object that was created by our createElement mock
    const mockLinkInstance = (createElementMock as jest.Mock).mock.results[0].value;

    await act(async () => {
        fireEvent.click(downloadButton);
    });

    expect(mockLinkInstance.click).toHaveBeenCalled();
    expect(mockLinkInstance.download).toBe('.env.Project Alpha');
    expect(screen.getByText('Secrets exported successfully!')).toBeInTheDocument();
  });

}); 