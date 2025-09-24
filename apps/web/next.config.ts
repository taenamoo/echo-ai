import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@echo-ai/auth',
    '@echo-ai/aws-clients',
    '@echo-ai/config',
    '@echo-ai/core-domain',
    '@echo-ai/documents',
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    }
    return config;
  },
};

export default nextConfig;
