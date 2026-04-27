/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  compress: false,
  optimizeFonts: false,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
    isrMemoryCacheSize: 0,
  },
};

module.exports = nextConfig;
