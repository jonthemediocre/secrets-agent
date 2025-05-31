const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable support for workspace packages
config.watchFolders = [
  // Include the root node_modules
  require('path').resolve(__dirname, '../../node_modules'),
  // Include shared packages
  require('path').resolve(__dirname, '../../src'),
  require('path').resolve(__dirname, '../../components'),
];

// Resolve workspace packages
config.resolver.nodeModulesPaths = [
  require('path').resolve(__dirname, 'node_modules'),
  require('path').resolve(__dirname, '../../node_modules'),
];

// Support for TypeScript
config.resolver.sourceExts.push('ts', 'tsx');

module.exports = config; 