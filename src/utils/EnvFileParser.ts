import fs from 'fs';
import { createLogger } from './logger';

const logger = createLogger('EnvFileParser');

export function parseEnvFile(filePath: string): Record<string, string> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const env: Record<string, string> = {};
    
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    logger.info('Environment file parsed successfully', {
      filePath,
      keyCount: Object.keys(env).length
    });
    
    return env;
  } catch (error) {
    logger.error('Failed to parse environment file', {
      filePath,
      error: error instanceof Error ? error.message : String(error)
    });
    return {};
  }
}

export function serializeEnvFile(envObject: Record<string, string>): string {
  let envString = '';
  for (const key in envObject) {
    if (Object.prototype.hasOwnProperty.call(envObject, key)) {
      const value = envObject[key];
      // Simple serialization: KEY="VALUE" (ensure values with spaces or special chars are quoted)
      // dotenv.parse can handle quoted values, so we should aim for compatibility.
      // A more robust solution might involve checking if the value needs quoting.
      if (value.includes(' ') || value.includes('#') || value.includes('=')) {
        envString += `${key}="${value.replace(/"/g, '\\"')}"\n`;
      } else {
        envString += `${key}=${value}\n`;
      }
    }
  }
  return envString;
} 