/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

// Determine if we're building for static export (Azure Static Web Apps)
const isStaticExport = process.env.NEXT_EXPORT === 'true' || process.env.BUILD_STATIC === 'true';

const nextConfig = {
  // Enable static export for Azure Static Web Apps deployment
  output: isStaticExport ? 'export' : undefined,
  
  // Disable image optimization for static export
  images: {
    unoptimized: isStaticExport,
    domains: [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7071/api',
  },
  
  // Trailing slash for static export
  trailingSlash: isStaticExport,
  
  // Optimize module imports
  modularizeImports: {
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
  },
  
  // Configure compiler for improved performance
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize loading of SVG files
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
}

module.exports = withBundleAnalyzer(nextConfig)
