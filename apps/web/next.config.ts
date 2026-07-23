import type { NextConfig } from 'next';

// In Docker, the web container must reach the API gateway via its service name
// (api-gateway:4000), not localhost:4000. API_PROXY_URL is set in docker-compose.
const apiProxyUrl = process.env['API_PROXY_URL'] ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Monorepo: Allow importing from workspace packages
  transpilePackages: ['@aegis/core'],
  experimental: {
    optimizePackageImports: ['@aegis/core'],
  },
  output: 'standalone',
  webpack: (config, { isServer, webpack }) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        dns: false,
        net: false,
        tls: false,
        fs: false,
        child_process: false,
        pg: false,
        'pg-native': false,
        ioredis: false,
        async_hooks: false,
      };
    }
    return config;
  },
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
