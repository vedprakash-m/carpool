/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic configuration
  reactStrictMode: true,
  transpilePackages: ["@vcarpool/shared"],

  // Build optimization for Azure Static Web Apps
  swcMinify: true,
  compress: true, // Enable compression to reduce upload size
  poweredByHeader: false,
  generateEtags: false,

  // Webpack optimization for smaller, faster uploads
  webpack: (config, { dev, isServer, webpack }) => {
    // Production optimizations
    if (!dev) {
      // Optimized chunk splitting for fewer files
      config.optimization = {
        ...config.optimization,
        minimize: true,
        concatenateModules: true,
        usedExports: true,
        sideEffects: false,

        // Reduced chunk splitting for faster uploads
        splitChunks: {
          chunks: "all",
          minSize: 200000, // Larger minimum chunks
          maxSize: 1000000, // Allow much larger chunks
          cacheGroups: {
            // Combine most vendor code into fewer chunks
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              priority: 20,
              reuseExistingChunk: true,
              enforce: true, // Force single vendor chunk where possible
            },
            // Combine shared components
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Aggressive minification for smaller files
      config.optimization.minimizer?.forEach((minimizer) => {
        if (minimizer.constructor.name === "TerserPlugin") {
          minimizer.options.parallel = 2;
          minimizer.options.terserOptions = {
            ...minimizer.options.terserOptions,
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ["console.log", "console.info", "console.debug"],
              passes: 3, // More compression passes for smaller output
            },
          };
        }
      });

      // Disable source maps for production
      config.devtool = false;
    }

    // Module resolution optimization
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": require("path").resolve(__dirname, "src"),
    };

    // Ignore unnecessary files
    config.module.rules.push({
      test: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
      use: "ignore-loader",
    });

    return config;
  },

  // Minimal experimental features
  experimental: {
    optimizePackageImports: ["@vcarpool/shared"],
  },

  // Standalone output for Azure Static Web Apps hybrid mode
  output: "export",

  // Handle dynamic routes for static export
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
};

module.exports = nextConfig;
