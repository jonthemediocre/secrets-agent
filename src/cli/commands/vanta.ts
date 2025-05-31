import { Command } from 'commander';
import chalk from 'chalk';
import { VantaAPIKeyManager } from '../services/VantaAPIKeyManager';

export function createVantaCommand(): Command {
  const vanta = new Command('vanta');
  vanta.description('Manage Vanta AI API keys dynamically for each app');

  // Generate API key for app
  vanta
    .command('generate')
    .description('Generate new Vanta API key for specific app')
    .argument('<appId>', 'App ID to generate key for')
    .option('-p, --permissions <permissions...>', 'Permissions for the key', ['read', 'analyze', 'generate'])
    .action(async (appId: string, options) => {
      try {
        console.log(chalk.blue(`🔑 Generating Vanta API key for ${appId}...`));
        
        const manager = new VantaAPIKeyManager();
        const apiKey = await manager.generateAPIKeyForApp(appId, options.permissions);
        
        console.log(chalk.green('✅ API Key Generated Successfully!'));
        console.log(chalk.cyan(`Key ID: ${apiKey.keyId}`));
        console.log(chalk.cyan(`App: ${apiKey.assignedApp}`));
        console.log(chalk.cyan(`Permissions: ${apiKey.metadata.permissions.join(', ')}`));
        console.log(chalk.cyan(`Rate Limits: ${apiKey.metadata.rateLimits.requestsPerDay}/day`));
        console.log(chalk.yellow(`🔐 API key securely stored in vault`));

      } catch (error) {
        console.error(chalk.red(`❌ Failed to generate API key: ${error.message}`));
        process.exit(1);
      }
    });

  // Get API key for app
  vanta
    .command('get')
    .description('Get or generate API key for app')
    .argument('<appId>', 'App ID to get key for')
    .action(async (appId: string) => {
      try {
        console.log(chalk.blue(`📋 Getting API key for ${appId}...`));
        
        const manager = new VantaAPIKeyManager();
        const apiKey = await manager.getAPIKeyForApp(appId);
        
        console.log(chalk.green('✅ API Key Retrieved!'));
        console.log(chalk.cyan(`Key ID: ${apiKey.keyId}`));
        console.log(chalk.cyan(`Created: ${apiKey.createdAt.toISOString()}`));
        console.log(chalk.cyan(`Usage: ${apiKey.usageCount} requests`));
        console.log(chalk.cyan(`Last Used: ${apiKey.lastUsed?.toISOString() || 'Never'}`));

      } catch (error) {
        console.error(chalk.red(`❌ Failed to get API key: ${error.message}`));
        process.exit(1);
      }
    });

  // Track usage
  vanta
    .command('track')
    .description('Track API usage for a key')
    .argument('<keyId>', 'Key ID to track usage for')
    .argument('<requestType>', 'Type of request (chat, analyze, generate)')
    .argument('<tokens>', 'Number of tokens used')
    .argument('<cost>', 'Cost in dollars')
    .action(async (keyId: string, requestType: string, tokens: string, cost: string) => {
      try {
        console.log(chalk.blue(`📊 Tracking usage for key ${keyId}...`));
        
        const manager = new VantaAPIKeyManager();
        await manager.trackUsage(keyId, requestType, parseInt(tokens), parseFloat(cost));
        
        console.log(chalk.green('✅ Usage tracked successfully!'));

      } catch (error) {
        console.error(chalk.red(`❌ Failed to track usage: ${error.message}`));
        process.exit(1);
      }
    });

  // Get usage stats
  vanta
    .command('usage')
    .description('Get usage statistics for app')
    .argument('<appId>', 'App ID to get stats for')
    .option('-d, --days <days>', 'Number of days to show', '30')
    .action(async (appId: string, options) => {
      try {
        console.log(chalk.blue(`📈 Getting usage stats for ${appId}...`));
        
        const manager = new VantaAPIKeyManager();
        const stats = await manager.getUsageStatsForApp(appId, parseInt(options.days));
        
        if (stats.length === 0) {
          console.log(chalk.yellow(`No usage data found for ${appId}`));
          return;
        }

        console.log(chalk.green(`📊 Usage Statistics for ${appId}:`));
        
        for (const stat of stats) {
          console.log(chalk.cyan(`\n🔑 Key: ${stat.keyId}`));
          console.log(chalk.white(`  Total Requests: ${stat.totalRequests}`));
          console.log(chalk.white(`  Total Tokens: ${stat.tokenUsage.toLocaleString()}`));
          console.log(chalk.white(`  Total Cost: $${stat.costAccumulated.toFixed(4)}`));
          console.log(chalk.white(`  Last Request: ${stat.lastRequestAt.toISOString()}`));
          
          // Show recent daily stats
          const recentDays = Object.entries(stat.dailyStats)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 7);
            
          if (recentDays.length > 0) {
            console.log(chalk.white(`  Recent Daily Usage:`));
            for (const [date, usage] of recentDays) {
              console.log(chalk.gray(`    ${date}: ${usage.requests} req, ${usage.tokens} tokens, $${usage.cost.toFixed(4)}`));
            }
          }
        }

      } catch (error) {
        console.error(chalk.red(`❌ Failed to get usage stats: ${error.message}`));
        process.exit(1);
      }
    });

  // Rotate API key
  vanta
    .command('rotate')
    .description('Rotate API key for app (generate new, deprecate old)')
    .argument('<appId>', 'App ID to rotate key for')
    .action(async (appId: string) => {
      try {
        console.log(chalk.blue(`🔄 Rotating API key for ${appId}...`));
        
        const manager = new VantaAPIKeyManager();
        const newKey = await manager.rotateAPIKeyForApp(appId);
        
        console.log(chalk.green('✅ API Key Rotated Successfully!'));
        console.log(chalk.cyan(`New Key ID: ${newKey.keyId}`));
        console.log(chalk.yellow(`Old key will expire in 24 hours`));

      } catch (error) {
        console.error(chalk.red(`❌ Failed to rotate API key: ${error.message}`));
        process.exit(1);
      }
    });

  // List all app keys
  vanta
    .command('list')
    .description('List all app keys and their status')
    .action(async () => {
      try {
        console.log(chalk.blue('📋 Listing all app keys...'));
        
        const manager = new VantaAPIKeyManager();
        const allKeys = await manager.getAllAppKeys();
        
        if (allKeys.length === 0) {
          console.log(chalk.yellow('No API keys found'));
          return;
        }

        console.log(chalk.green('🔑 All App API Keys:'));
        
        for (const { appId, keys, usage } of allKeys) {
          console.log(chalk.cyan(`\n📱 App: ${appId}`));
          
          for (const key of keys) {
            const isExpired = key.expiresAt && new Date() > key.expiresAt;
            const status = isExpired ? chalk.red('EXPIRED') : chalk.green('ACTIVE');
            
            console.log(chalk.white(`  🔑 ${key.keyId} - ${status}`));
            console.log(chalk.gray(`     Created: ${key.createdAt.toISOString()}`));
            console.log(chalk.gray(`     Usage: ${key.usageCount} requests`));
            console.log(chalk.gray(`     Permissions: ${key.metadata.permissions.join(', ')}`));
            
            if (key.expiresAt) {
              console.log(chalk.gray(`     Expires: ${key.expiresAt.toISOString()}`));
            }
          }
          
          // Show usage summary
          const totalRequests = usage.reduce((sum, u) => sum + u.totalRequests, 0);
          const totalCost = usage.reduce((sum, u) => sum + u.costAccumulated, 0);
          const totalTokens = usage.reduce((sum, u) => sum + u.tokenUsage, 0);
          
          if (totalRequests > 0) {
            console.log(chalk.white(`  📊 Total Usage: ${totalRequests} requests, ${totalTokens.toLocaleString()} tokens, $${totalCost.toFixed(4)}`));
          }
        }

      } catch (error) {
        console.error(chalk.red(`❌ Failed to list keys: ${error.message}`));
        process.exit(1);
      }
    });

  // Setup ecosystem apps
  vanta
    .command('setup-ecosystem')
    .description('Generate API keys for all ecosystem apps')
    .action(async () => {
      try {
        console.log(chalk.blue('🚀 Setting up Vanta API keys for entire ecosystem...'));
        
        const manager = new VantaAPIKeyManager();
        const ecosystemApps = [
          'secrets-agent-mobile',
          'secrets-agent-desktop', 
          'secrets-agent-web',
          'secrets-agent-ai-gateway',
          'secrets-agent-core'
        ];

        for (const appId of ecosystemApps) {
          console.log(chalk.yellow(`🔑 Setting up ${appId}...`));
          
          try {
            const apiKey = await manager.getAPIKeyForApp(appId);
            console.log(chalk.green(`✅ ${appId}: ${apiKey.keyId}`));
          } catch (error) {
            console.log(chalk.red(`❌ ${appId}: Failed - ${error.message}`));
          }
        }

        console.log(chalk.green('\n🎉 Ecosystem setup complete!'));
        console.log(chalk.cyan('📋 Use "secrets-agent vanta list" to see all keys'));
        console.log(chalk.cyan('📊 Use "secrets-agent vanta usage <appId>" to track usage'));

      } catch (error) {
        console.error(chalk.red(`❌ Failed to setup ecosystem: ${error.message}`));
        process.exit(1);
      }
    });

  return vanta;
} 