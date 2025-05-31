import { Command } from 'commander';
import { CLIHarvester } from '../harvester/CLIHarvester';
import { 
  API_SERVICES_REGISTRY, 
  getServiceById, 
  getServicesWithCLI, 
  getServicesByCategory, 
  getTopServices,
  getRegistryStats 
} from '../harvester/APIServiceRegistry';
import { VaultAgent } from '../vault/VaultAgent';
import chalk from 'chalk';

const program = new Command();

program
  .name('secrets-harvester')
  .description('🌾 APIHarvester - Automated API credential harvesting and vault integration')
  .version('1.0.0');

/**
 * Discovery Commands
 */
program
  .command('discover')
  .description('🔍 Discover available API services')
  .option('-c, --category <category>', 'Filter by category')
  .option('--cli-only', 'Show only services with CLI support')
  .option('-t, --top <count>', 'Show top N services by popularity', '10')
  .action(async (options) => {
    console.log(chalk.blue('🔍 API Service Discovery'));
    console.log('═'.repeat(50));

    try {
      let services = API_SERVICES_REGISTRY;

      // Apply filters
      if (options.category) {
        services = getServicesByCategory(options.category);
      }

      if (options.cliOnly) {
        services = services.filter(s => s.cliSupport.available);
      }

      if (options.top) {
        const topCount = parseInt(options.top);
        services = services
          .sort((a, b) => b.popularity - a.popularity)
          .slice(0, topCount);
      }

      // Display services
      console.log(`\nFound ${chalk.cyan(services.length)} services:\n`);

      services.forEach((service, index) => {
        const cliIcon = service.cliSupport.available ? '✅' : '❌';
        const rotationIcon = service.rotationSupported ? '🔄' : '➖';
        
        console.log(`${chalk.cyan((index + 1).toString().padStart(2))}. ${chalk.bold(service.name)}`);
        console.log(`    ${chalk.gray('Category:')} ${service.category}`);
        console.log(`    ${chalk.gray('Popularity:')} ${service.popularity}/100`);
        console.log(`    ${chalk.gray('CLI Support:')} ${cliIcon} ${service.cliSupport.available ? service.cliSupport.toolName : 'None'}`);
        console.log(`    ${chalk.gray('Rotation:')} ${rotationIcon}`);
        console.log(`    ${chalk.gray('Description:')} ${service.metadata.description}`);
        console.log();
      });

      // Show summary statistics
      const stats = getRegistryStats();
      console.log(chalk.blue('\n📊 Registry Statistics:'));
      console.log(`Total Services: ${chalk.cyan(stats.totalServices)}`);
      console.log(`CLI Support: ${chalk.cyan(stats.cliSupportCount)} (${chalk.cyan(stats.cliSupportPercentage)}%)`);
      console.log(`Average Popularity: ${chalk.cyan(stats.avgPopularity)}/100`);

    } catch (error) {
      console.error(chalk.red('❌ Discovery failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Service Info Command
 */
program
  .command('info <serviceId>')
  .description('📋 Get detailed information about a specific service')
  .action(async (serviceId) => {
    console.log(chalk.blue(`📋 Service Information: ${serviceId}`));
    console.log('═'.repeat(50));

    try {
      const service = getServiceById(serviceId);
      if (!service) {
        console.error(chalk.red(`❌ Service not found: ${serviceId}`));
        process.exit(1);
      }

      console.log(`${chalk.bold('Name:')} ${service.name}`);
      console.log(`${chalk.bold('Category:')} ${service.category}`);
      console.log(`${chalk.bold('Website:')} ${chalk.blue(service.website)}`);
      console.log(`${chalk.bold('Documentation:')} ${chalk.blue(service.docsUrl)}`);
      console.log(`${chalk.bold('Popularity:')} ${service.popularity}/100`);
      console.log(`${chalk.bold('Description:')} ${service.metadata.description}`);
      console.log(`${chalk.bold('Setup Complexity:')} ${service.metadata.setupComplexity}`);

      console.log(`\n${chalk.cyan('🔧 CLI Support:')}`);
      if (service.cliSupport.available) {
        console.log(`  Tool Name: ${service.cliSupport.toolName}`);
        console.log(`  Install Command: ${service.cliSupport.installCommand}`);
        console.log(`  Auth Command: ${service.cliSupport.authCommand}`);
        console.log(`  Config Path: ${service.cliSupport.configPath || 'N/A'}`);
        console.log(`  Extraction Method: ${service.cliSupport.keyExtractionMethod}`);
      } else {
        console.log(`  ${chalk.red('❌ No CLI support available')}`);
      }

      console.log(`\n${chalk.cyan('🔑 Authentication Methods:')}`);
      service.authMethods.forEach(method => {
        console.log(`  • ${method}`);
      });

      console.log(`\n${chalk.cyan('🎫 Key Formats:')}`);
      service.keyFormats.forEach((format, index) => {
        console.log(`  ${index + 1}. Type: ${format.type}`);
        console.log(`     Pattern: ${format.pattern}`);
        console.log(`     Environment Variable: ${format.envVarName || 'N/A'}`);
        console.log(`     Example: ${format.example}`);
        console.log();
      });

      console.log(`${chalk.cyan('🔄 Key Rotation:')} ${service.rotationSupported ? '✅ Supported' : '❌ Not supported'}`);

    } catch (error) {
      console.error(chalk.red('❌ Failed to get service info:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Harvest Commands
 */
program
  .command('harvest <serviceId>')
  .description('🌾 Harvest API credentials from a service')
  .option('--vault-path <path>', 'Path to vault directory', './vault')
  .action(async (serviceId, options) => {
    console.log(chalk.blue(`🌾 Harvesting credentials for: ${serviceId}`));
    console.log('═'.repeat(50));

    try {
      const service = getServiceById(serviceId);
      if (!service) {
        console.error(chalk.red(`❌ Service not found: ${serviceId}`));
        process.exit(1);
      }

      if (!service.cliSupport.available) {
        console.error(chalk.red(`❌ Service ${service.name} does not support CLI harvesting`));
        console.log(chalk.yellow(`💡 Tip: Use 'secrets-harvester browser ${serviceId}' for browser-guided flow`));
        process.exit(1);
      }

      console.log(`Service: ${chalk.cyan(service.name)}`);
      console.log(`CLI Tool: ${chalk.cyan(service.cliSupport.toolName)}`);
      console.log(`Method: ${chalk.cyan(service.cliSupport.keyExtractionMethod)}`);
      console.log();

      // Initialize harvester
      const harvester = new CLIHarvester();
      
      // Start harvest session
      console.log(chalk.yellow('🚀 Starting harvest session...'));
      const session = await harvester.startHarvestSession(serviceId);

      // Monitor progress
      const steps = session.steps;
      steps.forEach(step => {
        const status = step.status === 'completed' ? '✅' : 
                      step.status === 'failed' ? '❌' : 
                      step.status === 'running' ? '⏳' : '⏸️';
        
        console.log(`${status} ${step.name}`);
        if (step.output) {
          console.log(`   ${chalk.gray(step.output)}`);
        }
        if (step.error) {
          console.log(`   ${chalk.red('Error:')} ${step.error}`);
        }
      });

      if (session.status === 'completed' && session.result) {
        console.log(chalk.green('\n🎉 Harvest completed successfully!'));
        console.log(`Credential Key: ${chalk.cyan(session.result.key)}`);
        console.log(`Auth Method: ${chalk.cyan(session.result.authMethod)}`);
        console.log(`Harvested At: ${chalk.cyan(session.result.harvestMetadata.harvestedAt.toISOString())}`);
        
        // Store in vault
        console.log(chalk.yellow('\n💾 Storing in vault...'));
        const vaultAgent = new VaultAgent(options.vaultPath);
        
        // Create or use existing project
        const projectName = `harvested-${service.category}`;
        await vaultAgent.addSecret(projectName, session.result);
        
        console.log(chalk.green(`✅ Stored in vault project: ${projectName}`));
        
      } else {
        console.log(chalk.red('\n❌ Harvest failed'));
        if (session.error) {
          console.log(`Error: ${chalk.red(session.error)}`);
        }
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('❌ Harvest failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Batch Harvest Command
 */
program
  .command('harvest-batch')
  .description('🌾 Batch harvest from multiple services')
  .option('--category <category>', 'Harvest all services in category')
  .option('--top <count>', 'Harvest top N services', '5')
  .option('--cli-only', 'Only harvest services with CLI support', true)
  .option('--vault-path <path>', 'Path to vault directory', './vault')
  .action(async (options) => {
    console.log(chalk.blue('🌾 Batch API Credential Harvesting'));
    console.log('═'.repeat(50));

    try {
      let services = API_SERVICES_REGISTRY;

      // Apply filters
      if (options.category) {
        services = getServicesByCategory(options.category);
      }

      if (options.cliOnly) {
        services = getServicesWithCLI();
      }

      if (options.top) {
        const topCount = parseInt(options.top);
        services = getTopServices(topCount).filter(s => s.cliSupport.available);
      }

      console.log(`Selected ${chalk.cyan(services.length)} services for harvesting:\n`);
      
      services.forEach((service, index) => {
        console.log(`${chalk.cyan((index + 1).toString())}. ${service.name} (${service.cliSupport.toolName})`);
      });

      console.log(chalk.yellow('\n🚀 Starting batch harvest...'));
      
      const harvester = new CLIHarvester();
      const results = [];
      
      for (const service of services) {
        try {
          console.log(chalk.blue(`\n📡 Harvesting ${service.name}...`));
          const session = await harvester.startHarvestSession(service.id);
          
          if (session.status === 'completed') {
            console.log(chalk.green(`✅ ${service.name} - Success`));
            results.push({ service: service.name, status: 'success', credential: session.result });
          } else {
            console.log(chalk.red(`❌ ${service.name} - Failed: ${session.error}`));
            results.push({ service: service.name, status: 'failed', error: session.error });
          }
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(chalk.red(`❌ ${service.name} - Error: ${errorMessage}`));
          results.push({ service: service.name, status: 'error', error: errorMessage });
        }
      }

      // Summary
      console.log(chalk.blue('\n📊 Batch Harvest Summary:'));
      console.log('═'.repeat(30));
      
      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status !== 'success').length;
      
      console.log(`${chalk.green('✅ Successful:')} ${successful}`);
      console.log(`${chalk.red('❌ Failed:')} ${failed}`);
      console.log(`${chalk.cyan('📊 Total:')} ${results.length}`);

      if (successful > 0) {
        console.log(chalk.green(`\n🎉 Successfully harvested ${successful} API credentials!`));
      }

    } catch (error) {
      console.error(chalk.red('❌ Batch harvest failed:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Status and Management Commands
 */
program
  .command('status')
  .description('📊 Show harvest session status')
  .option('--session-id <id>', 'Show specific session')
  .action(async (options) => {
    console.log(chalk.blue('📊 Harvest Session Status'));
    console.log('═'.repeat(50));

    try {
      const harvester = new CLIHarvester();
      
      if (options.sessionId) {
        const session = harvester.getSession(options.sessionId);
        if (!session) {
          console.error(chalk.red(`❌ Session not found: ${options.sessionId}`));
          process.exit(1);
        }
        
        // Display single session details
        console.log(`Session ID: ${chalk.cyan(session.id)}`);
        console.log(`Service: ${chalk.cyan(session.apiService)}`);
        console.log(`Status: ${getStatusIcon(session.status)} ${session.status}`);
        console.log(`Started: ${chalk.cyan(session.startedAt.toISOString())}`);
        if (session.completedAt) {
          console.log(`Completed: ${chalk.cyan(session.completedAt.toISOString())}`);
        }
        
        console.log(`\n${chalk.cyan('Steps:')}`);
        session.steps.forEach(step => {
          const status = getStatusIcon(step.status);
          console.log(`  ${status} ${step.name}`);
          if (step.output) {
            console.log(`     ${chalk.gray(step.output)}`);
          }
          if (step.error) {
            console.log(`     ${chalk.red('Error:')} ${step.error}`);
          }
        });
        
      } else {
        // Display all sessions
        const sessions = harvester.getAllSessions();
        
        if (sessions.length === 0) {
          console.log(chalk.yellow('No harvest sessions found'));
          return;
        }
        
        sessions.forEach(session => {
          const status = getStatusIcon(session.status);
          console.log(`${status} ${chalk.cyan(session.id)} - ${session.apiService} (${session.status})`);
        });
      }

    } catch (error) {
      console.error(chalk.red('❌ Failed to get status:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Helper functions
function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed': return '✅';
    case 'failed': return '❌';
    case 'in-progress': return '⏳';
    case 'pending': return '⏸️';
    case 'running': return '⏳';
    default: return '❓';
  }
}

program.parse(); 