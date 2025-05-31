#!/usr/bin/env node

import { Command } from 'commander';
import { VaultCommands } from './commands/vault';
import { createSecretsCommands } from './commands/secrets';
import { MCPCommands } from './commands/mcp';
import { version } from '../../package.json';

const program = new Command();

program
  .name('secrets-cli')
  .description('Secrets management and injection CLI')
  .version(version);

// Add vault management commands
VaultCommands.register(program);

// Add secrets management commands
program.addCommand(createSecretsCommands());

// Add MCP bridge commands
MCPCommands.register(program);

export function runCLI() {
  program.parse(process.argv);
}

async function main() {
  try {
    // Parse command line arguments
    await runCLI();
  } catch (error) {
    console.error('CLI execution failed', { 
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

main().catch(error => {
  console.error('CLI initialization failed', { 
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
}); 