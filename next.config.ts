import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow reading local files in config/
  serverExternalPackages: ['fs'],
};

export default nextConfig;
