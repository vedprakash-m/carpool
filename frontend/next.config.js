/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

// Only use static export for specific build scenarios, not for Azure SWA
const isStaticExport = process.env.FORCE_STATIC_EXPORT === "true";

const nextConfig = {
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:7071/api",
  },

  // Configure images for better compatibility
  images: {
    unoptimized: false,
    domains: [],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Better compatibility with Azure Static Web Apps
  trailingSlash: false,

  // Only apply static export settings when explicitly requested (not for Azure SWA)
  ...(isStaticExport && {
    output: "export",
    images: {
      unoptimized: true,
    },
    trailingSlash: true,
  }),

  // Optimize module imports
  modularizeImports: {
    "@mui/icons-material": {
      transform: "@mui/icons-material/{{member}}",
    },
    "@mui/material": {
      transform: "@mui/material/{{member}}",
    },
  },

  // Configure compiler for improved performance
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Optimize loading of SVG files
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
