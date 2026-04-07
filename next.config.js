/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  swcMinify: false, // Disabled to reduce peak memory during build
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  productionBrowserSourceMaps: false,
  serverExternalPackages: [],
  experimental: {
    webpackMemoryOptimizations: true,
    webpackBuildWorker: true,
    parallelServerCompiles: false,
    cpus: 1,
    optimizePackageImports: ['lucide-react', 'date-fns', 'xlsx', 'zod'],
  },
};

module.exports = nextConfig;
