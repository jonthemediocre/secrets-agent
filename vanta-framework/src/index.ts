/**
 * VANTA Framework - Universal Agentic Intelligence Framework
 * Entry point for the standalone framework package
 */

// Core interfaces and types
export * from './interfaces/GenericTypes';

// Core framework components
export { GenericTraceMemory, GenericTraceMemoryInterface, TraceMemoryConfig } from './core/GenericTraceMemory';

// Domain adapters
export { ChatbotAdapter } from './adapters/ChatbotAdapter';
export { AutomationAdapter } from './adapters/AutomationAdapter';
export { AnalysisAdapter } from './adapters/AnalysisAdapter';
export { IntegrationAdapter } from './adapters/IntegrationAdapter';

// Framework factory and utilities
export { VantaFrameworkFactory, VantaFrameworkInstance, DomainConfig } from './factory/VantaFrameworkFactory';
export { FrameworkUtils } from './utils/FrameworkUtils';

// Version information
export const VERSION = '1.0.0';
export const FRAMEWORK_NAME = 'VANTA Framework';

/**
 * Helper function to create a VANTA Framework instance for a specific domain
 */
export async function createVantaFramework(
  domain: 'chatbot' | 'automation' | 'analysis' | 'integration',
  config?: any
) {
  const { VantaFrameworkFactory } = await import('./factory/VantaFrameworkFactory');
  const factory = new VantaFrameworkFactory();
  return await factory.createFramework(domain, config);
}

/**
 * Helper function to create a multi-domain VANTA Framework instance
 */
export async function createMultiDomainFramework(
  domains: Array<'chatbot' | 'automation' | 'analysis' | 'integration'>,
  config?: any
) {
  const { VantaFrameworkFactory } = await import('./factory/VantaFrameworkFactory');
  const factory = new VantaFrameworkFactory();
  return await factory.createMultiDomainFramework(domains, config);
} 