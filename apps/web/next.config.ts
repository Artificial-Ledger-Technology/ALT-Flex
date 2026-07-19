import type { NextConfig } from 'next';

// In Docker, the web container must reach the API gateway via its service name
// (api-gateway:4000), not localhost:4000. API_PROXY_URL is set in docker-compose.
const apiProxyUrl = process.env['API_PROXY_URL'] ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Monorepo: Allow importing from workspace packages
  transpilePackages: ['@aegis/core'],
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
