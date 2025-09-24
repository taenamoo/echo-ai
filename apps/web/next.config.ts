import type { NextConfig } from 'next';
// Load root-level env as fallback for monorepo dev (apps/web/.env.local may be absent)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Do not override env already present; just fill in missing keys from repo root .env.local
loadEnv({ path: path.join(__dirname, '../../.env.local'), override: false });

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
