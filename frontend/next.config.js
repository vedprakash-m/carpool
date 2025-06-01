/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

// Determine if we need static export
const isStaticExport = process.env.NEXT_EXPORT === 'true' || process.env.NODE_ENV === 'production'

const nextConfig = {
  // Enable static export when needed
  ...(isStaticExport && { output: 'export' }),
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7071/api',
  },
  
  // Configure images for static export compatibility
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
  
  // Add trailing slash for better static hosting compatibility
  trailingSlash: true,
  
  // Disable server-side features for static export
  ...(isStaticExport && {
    // Disable image optimization for static export
    images: {
      unoptimized: true,
    },
  }),
  
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
