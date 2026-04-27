/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: false,
  compress: false,
  optimizeFonts: false,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
};

module.exports = nextConfig;
