/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic configuration
  reactStrictMode: true,
  transpilePackages: ["@vcarpool/shared"],

  // Aggressive build optimization
  swcMinify: true,
  compress: false, // Disable compression during build to save time
  poweredByHeader: false,
  generateEtags: false,

  // Advanced webpack optimization
  webpack: (config, { dev, isServer, webpack }) => {
    // Production optimizations
    if (!dev) {
      // More aggressive optimization
      config.optimization = {
        ...config.optimization,
        minimize: true,
        concatenateModules: true,
        usedExports: true,
        sideEffects: false,

        // Advanced chunk splitting for faster builds
        splitChunks: {
          chunks: "all",
          minSize: 20000,
          maxSize: 100000,
          cacheGroups: {
            // Vendor chunk
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              priority: 20,
              reuseExistingChunk: true,
            },
            // Shared components
            shared: {
              name: "shared",
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };

      // Reduce memory usage during build
      config.optimization.minimizer?.forEach((minimizer) => {
        if (minimizer.constructor.name === "TerserPlugin") {
          minimizer.options.parallel = false; // Reduce memory usage
          minimizer.options.terserOptions = {
            ...minimizer.options.terserOptions,
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ["console.log", "console.info", "console.debug"],
            },
          };
        }
      });

      // Disable source maps for production to speed up build
      config.devtool = false;
    }

    // Module resolution optimization
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": require("path").resolve(__dirname, "src"),
    };

    // Ignore test files during build
    config.module.rules.push({
      test: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
      use: "ignore-loader",
    });

    // Optimize node_modules processing
    config.resolve.modules = ["node_modules"];
    config.resolve.symlinks = false;

    return config;
  },

  // Experimental features for performance
  experimental: {
    // Remove problematic experimental features
    turbo: undefined,
    optimizeCss: false,

    // Enable useful optimizations
    optimizePackageImports: ["@vcarpool/shared"],
  },

  // Output for Azure Static Web Apps
  output: "standalone",

  // Image optimization (disable for faster builds)
  images: {
    unoptimized: true,
  },

  // Reduce build output
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // Environment variables
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
};

module.exports = nextConfig;
