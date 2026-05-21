import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Monorepo: Allow importing from workspace packages
  transpilePackages: ['@aegis/core'],
  output: 'standalone',
};

export default nextConfig;
