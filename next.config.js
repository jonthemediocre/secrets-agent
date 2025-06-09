/** @type {import('next').NextConfig} */
const nextConfig = {
  // appDir is now the default in Next.js 14, no need to specify
  typescript: {
    // We've fixed all TypeScript errors!
    ignoreBuildErrors: false,
  },
  eslint: {
    // We want to see ESLint errors during builds
    ignoreDuringBuilds: false,
  },
}

export default nextConfig; 