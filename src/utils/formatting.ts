/**
 * Simple formatting utilities without external dependencies
 */

export function formatTable(data: string[][]): string {
  if (data.length === 0) return '';
  
  // Calculate column widths
  const colWidths = data[0].map((_, colIndex) => 
    Math.max(...data.map(row => (row[colIndex] || '').toString().length))
  );
  
  // Format rows
  const formattedRows = data.map(row => 
    row.map((cell, index) => 
      (cell || '').toString().padEnd(colWidths[index])
    ).join(' | ')
  );
  
  // Add separator after header
  if (formattedRows.length > 1) {
    const separator = colWidths.map(width => '-'.repeat(width)).join('-+-');
    formattedRows.splice(1, 0, separator);
  }
  
  return formattedRows.join('\n');
}

export function formatJson(data: any, indent = 2): string {
  return JSON.stringify(data, null, indent);
}

export function formatList(items: string[], bullet = '•'): string {
  return items.map(item => `${bullet} ${item}`).join('\n');
}

export function formatKeyValue(obj: Record<string, any>, separator = ': '): string {
  return Object.entries(obj)
    .map(([key, value]) => `${key}${separator}${value}`)
    .join('\n');
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
} 