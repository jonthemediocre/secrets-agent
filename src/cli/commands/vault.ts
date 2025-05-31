import { Command } from 'commander';
import { VaultService } from '../../services/vault';

export class VaultCommands {
  static register(program: Command): void {
    const vault = program.command('vault')
      .description('Vault management commands');

    vault
      .command('init')
      .description('Initialize a new vault')
      .option('-p, --path <path>', 'Path to create the vault', '.vault')
      .option('-k, --key-file <keyFile>', 'Path to save the master key', '.vault.key')
      .action(async (options) => {
        const vaultService = new VaultService(options.path);
        await vaultService.initialize(options.keyFile);
        console.log('Vault initialized successfully');
      });

    vault
      .command('status')
      .description('Check vault status')
      .option('-p, --path <path>', 'Path to the vault', '.vault')
      .action(async (options) => {
        const vaultService = new VaultService(options.path);
        const status = await vaultService.getStatus();
        console.log('Vault Status:', status);
      });

    vault
      .command('seal')
      .description('Seal the vault')
      .option('-p, --path <path>', 'Path to the vault', '.vault')
      .action(async (options) => {
        const vaultService = new VaultService(options.path);
        await vaultService.seal();
        console.log('Vault sealed successfully');
      });

    vault
      .command('unseal')
      .description('Unseal the vault')
      .option('-p, --path <path>', 'Path to the vault', '.vault')
      .option('-k, --key-file <keyFile>', 'Path to the master key file', '.vault.key')
      .action(async (options) => {
        const vaultService = new VaultService(options.path);
        await vaultService.unseal(options.keyFile);
        console.log('Vault unsealed successfully');
      });

    vault
      .command('backup')
      .description('Create vault backup')
      .option('-p, --path <path>', 'Path to the vault', '.vault')
      .option('-o, --output <output>', 'Backup file path', '.vault.backup')
      .action(async (options) => {
        const vaultService = new VaultService(options.path);
        await vaultService.backup(options.output);
        console.log('Vault backup created successfully');
      });

    vault
      .command('restore')
      .description('Restore vault from backup')
      .option('-p, --path <path>', 'Path to restore the vault', '.vault')
      .option('-i, --input <input>', 'Backup file path', '.vault.backup')
      .action(async (options) => {
        const vaultService = new VaultService(options.path);
        await vaultService.restore(options.input);
        console.log('Vault restored successfully');
      });

    vault
      .command('rotate-key')
      .description('Rotate vault master key')
      .option('-p, --path <path>', 'Path to the vault', '.vault')
      .option('-k, --key-file <keyFile>', 'Path to the master key file', '.vault.key')
      .action(async (options) => {
        const vaultService = new VaultService(options.path);
        await vaultService.rotateMasterKey(options.keyFile);
        console.log('Vault master key rotated successfully');
      });
  }
} 