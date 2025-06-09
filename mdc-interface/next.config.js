/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  typescript: {
    // Enable strict mode for better type safety
    ignoreBuildErrors: false,
  },
  eslint: {
    // Don't fail build on ESLint errors during production builds
    ignoreDuringBuilds: false,
  },
  // Enable webpack 5 features
  webpack: (config, { isServer }) => {
    // Handle monaco-editor for server-side rendering
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  // Environment variables
  env: {
    MDC_API_URL: process.env.MDC_API_URL || 'http://localhost:3001',
    MDC_RULES_PATH: process.env.MDC_RULES_PATH || '.cursor/rules',
  },
  // Image optimization
  images: {
    domains: ['localhost'],
  },
  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['monaco-editor'],
  },
}

module.exports = nextConfig 