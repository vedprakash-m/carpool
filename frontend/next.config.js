/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa').default({ dest: 'public' });

const nextConfig = {
  // Basic configuration
  reactStrictMode: true,
  transpilePackages: ["@vcarpool/shared"],

  // Simple build configuration for Azure Static Web Apps
  swcMinify: true,
  poweredByHeader: false,

  // Use static export for Azure Static Web Apps
  output: "export",
  trailingSlash: true,
  distDir: "out",

  // Image optimization disabled for better compatibility
  images: {
    unoptimized: true,
  },

  // Build-time optimizations
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // Environment variables
  env: {
    BUILD_TIME: new Date().toISOString(),
    // API Configuration based on environment
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === "production"
        ? "https://vcarpool-api-prod.azurewebsites.net/api"
        : "http://localhost:7071/api"),
    NEXT_PUBLIC_ENV: process.env.NODE_ENV,
  },

  experimental: {
    scrollRestoration: true,
  },
};

module.exports = withPWA(nextConfig);
