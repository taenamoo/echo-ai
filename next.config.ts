import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Add custom webpack configuration here    
    if(!isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        // Ignore node_modules to prevent unnecessary rebuilds
        ignored: /node_modules/,
      };
    }
    return config;
  }
};

export default nextConfig;
