import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  // Paksa axios & cheerio berjalan di Node.js runtime (bukan Edge)
  serverExternalPackages: ['axios', 'cheerio', 'jsdom'],
};

export default nextConfig;
