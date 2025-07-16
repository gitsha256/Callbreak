import type { NextConfig } from 'next';
import withPWA from 'next-pwa';

const baseConfig: NextConfig = {
  output: 'export', // ✅ REQUIRED for static export
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',

  // ✅ This line prevents Workbox from trying to cache non-existent files
  buildExcludes: [/app-build-manifest\.json$/, /_buildManifest\.js$/, /_ssgManifest\.js$/],
})(baseConfig);

export default nextConfig;
