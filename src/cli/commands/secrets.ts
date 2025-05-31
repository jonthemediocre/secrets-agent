import { Command } from 'commander';
import { SecretService } from '../../services/secret';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SecretsCommands');

export function createSecretsCommands(): Command {
  const secretsCmd = new Command('secrets');
  secretsCmd.description('Manage secrets and sensitive data');

  const secretService = new SecretService();

  // Set secret command
  secretsCmd
    .command('set <name> <value>')
    .description('Create or update a secret')
    .option('-d, --description <desc>', 'Secret description')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .option('-e, --encrypt', 'Encrypt the secret value')
    .action(async (name: string, value: string, options) => {
      try {
        await secretService.initialize();
        
        const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : [];
        
        const secret = await secretService.createSecret(name, value, {
          description: options.description,
          tags,
          encrypt: options.encrypt
        });
        
        console.log(`✅ Secret '${name}' created successfully`);
        console.log(`ID: ${secret.id}`);
        if (secret.description) {
          console.log(`Description: ${secret.description}`);
        }
        if (secret.tags && secret.tags.length > 0) {
          console.log(`Tags: ${secret.tags.join(', ')}`);
        }
      } catch (error) {
        logger.error('Failed to create secret', { name, error });
        console.error('❌ Failed to create secret:', error instanceof Error ? error.message : String(error));
      }
    });

  // Get secret command
  secretsCmd
    .command('get <id>')
    .description('Retrieve a secret by ID')
    .option('-v, --value-only', 'Show only the secret value')
    .action(async (id: string, options) => {
      try {
        await secretService.initialize();
        const secret = await secretService.getSecret(id);
        
        if (!secret) {
          console.log(`❌ Secret with ID '${id}' not found`);
          return;
        }

        if (options.valueOnly) {
          console.log(secret.value);
        } else {
          console.log('Secret Details:');
          console.log({
            id: secret.id,
            name: secret.name,
            value: secret.value,
            description: secret.description,
            tags: secret.tags,
            createdAt: secret.createdAt.toISOString(),
            updatedAt: secret.updatedAt.toISOString(),
            encrypted: secret.encrypted
          });
        }
      } catch (error) {
        logger.error('Failed to get secret', { id, error });
        console.error('❌ Failed to get secret:', error instanceof Error ? error.message : String(error));
      }
    });

  // List secrets command
  secretsCmd
    .command('list')
    .description('List all secrets (metadata only)')
    .action(async () => {
      try {
        await secretService.initialize();
        const secrets = await secretService.listSecrets();
        
        if (secrets.length === 0) {
          console.log('No secrets found');
          return;
        }

        console.log('\nSecrets:');
        console.table(secrets.map(secret => ({
          ID: secret.id,
          Name: secret.name,
          Description: secret.description || '',
          Tags: secret.tags?.join(', ') || '',
          Created: secret.createdAt.toISOString(),
          Updated: secret.updatedAt.toISOString()
        })));
      } catch (error) {
        logger.error('Failed to list secrets', { error });
        console.error('❌ Failed to list secrets:', error instanceof Error ? error.message : String(error));
      }
    });

  // Update secret command
  secretsCmd
    .command('update <id>')
    .description('Update a secret')
    .option('-v, --value <value>', 'New secret value')
    .option('-d, --description <desc>', 'New description')
    .option('-t, --tags <tags>', 'New comma-separated tags')
    .action(async (id: string, options) => {
      try {
        await secretService.initialize();
        
        const updates: any = {};
        if (options.value) updates.value = options.value;
        if (options.description) updates.description = options.description;
        if (options.tags) updates.tags = options.tags.split(',').map((t: string) => t.trim());
        
        const updatedSecret = await secretService.updateSecret(id, updates);
        
        if (!updatedSecret) {
          console.log(`❌ Secret with ID '${id}' not found`);
          return;
        }
        
        console.log(`✅ Secret '${updatedSecret.name}' updated successfully`);
      } catch (error) {
        logger.error('Failed to update secret', { id, error });
        console.error('❌ Failed to update secret:', error instanceof Error ? error.message : String(error));
      }
    });

  // Delete secret command
  secretsCmd
    .command('delete <id>')
    .description('Delete a secret')
    .option('-f, --force', 'Force deletion without confirmation')
    .action(async (id: string, options) => {
      try {
        await secretService.initialize();
        
        if (!options.force) {
          // In a real implementation, you'd want to use a proper prompt library
          console.log('⚠️  Use --force flag to confirm deletion');
          return;
        }
        
        const deleted = await secretService.deleteSecret(id);
        
        if (deleted) {
          console.log(`✅ Secret deleted successfully`);
        } else {
          console.log(`❌ Secret with ID '${id}' not found`);
        }
      } catch (error) {
        logger.error('Failed to delete secret', { id, error });
        console.error('❌ Failed to delete secret:', error instanceof Error ? error.message : String(error));
      }
    });

  return secretsCmd;
} 