/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  swcMinify: true, // Recommended for memory efficiency and performance
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
  // output: 'standalone',
  productionBrowserSourceMaps: false,
  serverExternalPackages: [],
  experimental: {
    webpackMemoryOptimizations: true,
    webpackBuildWorker: true,
    parallelServerCompiles: false,
    cpus: 1,
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', 'xlsx', 'zod'],
  },
};

module.exports = nextConfig;
