/** @type {import('next').NextConfig} */
const path = require("path");
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

  // Optimize for Azure Static Web Apps
  experimental: {
    // Reduce build time and improve startup performance
    turbotrace: {
      logLevel: "bug",
    },
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
    // Optimize image loading
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
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
    "@heroicons/react": {
      transform: "@heroicons/react/{{member}}",
    },
  },

  // Configure compiler for improved performance
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
    // Enable SWC minification
    styledComponents: true,
  },

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Production optimizations
  swcMinify: true,

  // Optimize bundle size
  poweredByHeader: false,
  generateEtags: false,

  // Webpack optimizations
  webpack(config, { isServer, dev }) {
    // SVG optimization
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    // Production optimizations
    if (!dev && !isServer) {
      // Reduce bundle size
      config.resolve.alias = {
        ...config.resolve.alias,
        "@": path.resolve(__dirname, "src"),
      };

      // Optimize chunks
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            maxSize: 200000, // 200KB max chunk size
          },
        },
      };
    }

    return config;
  },

  // Reduce memory usage during build
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
};

module.exports = withBundleAnalyzer(nextConfig);
