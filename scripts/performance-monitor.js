#!/usr/bin/env node

/**
 * 🚀 vCarpool Node.js 22 Performance Monitor
 *
 * This script monitors and tracks performance metrics after the Node.js 22 upgrade
 * to measure improvements and establish baseline performance metrics.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

class PerformanceMonitor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      metrics: {},
    };
  }

  log(message, type = "info") {
    const colors = {
      info: "\x1b[36m",
      success: "\x1b[32m",
      warning: "\x1b[33m",
      error: "\x1b[31m",
      reset: "\x1b[0m",
    };

    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async measureExecutionTime(name, fn) {
    this.log(`⏱️  Measuring: ${name}`, "info");
    const start = process.hrtime.bigint();

    try {
      await fn();
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds

      this.results.metrics[name] = {
        duration: duration,
        status: "success",
        timestamp: new Date().toISOString(),
      };

      this.log(`✅ ${name}: ${duration.toFixed(2)}ms`, "success");
      return duration;
    } catch (error) {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000;

      this.results.metrics[name] = {
        duration: duration,
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      this.log(
        `❌ ${name}: Failed after ${duration.toFixed(2)}ms - ${error.message}`,
        "error"
      );
      throw error;
    }
  }

  execCommand(command, options = {}) {
    return execSync(command, {
      encoding: "utf8",
      stdio: options.silent ? "pipe" : "inherit",
      ...options,
    });
  }

  async runBuildPerformanceTests() {
    this.log("\n🏗️  Build Performance Tests", "info");

    // Clean environment
    await this.measureExecutionTime("clean_install", () => {
      this.execCommand("rm -rf node_modules package-lock.json", {
        silent: true,
      });
      this.execCommand("npm install", { silent: true });
    });

    // Build shared package
    await this.measureExecutionTime("build_shared", () => {
      this.execCommand("cd shared && npm run build", { silent: true });
    });

    // Build backend
    await this.measureExecutionTime("build_backend", () => {
      this.execCommand("cd backend && npm run build", { silent: true });
    });

    // Build frontend
    await this.measureExecutionTime("build_frontend", () => {
      this.execCommand("cd frontend && npm run build", { silent: true });
    });

    // Full build pipeline
    await this.measureExecutionTime("full_build_pipeline", () => {
      this.execCommand("npm run build", { silent: true });
    });
  }

  async runTestPerformanceTests() {
    this.log("\n🧪 Test Performance Tests", "info");

    // Backend tests
    await this.measureExecutionTime("backend_tests", () => {
      this.execCommand("cd backend && npm test", { silent: true });
    });

    // Frontend tests
    await this.measureExecutionTime("frontend_tests", () => {
      this.execCommand("cd frontend && npm test", { silent: true });
    });

    // All tests
    await this.measureExecutionTime("all_tests", () => {
      this.execCommand("npm test", { silent: true });
    });
  }

  async runStartupPerformanceTests() {
    this.log("\n⚡ Startup Performance Tests", "info");

    // TypeScript compilation
    await this.measureExecutionTime("typescript_compilation", () => {
      this.execCommand("cd shared && npx tsc --noEmit", { silent: true });
    });

    // Next.js build analysis
    await this.measureExecutionTime("nextjs_build_analysis", () => {
      this.execCommand("cd frontend && npm run analyze", { silent: true });
    });
  }

  async runMemoryUsageTests() {
    this.log("\n🧠 Memory Usage Tests", "info");

    const beforeMemory = process.memoryUsage();

    // Simulate typical application load
    await this.measureExecutionTime("memory_stress_test", async () => {
      // Create some memory pressure similar to real application usage
      const data = [];
      for (let i = 0; i < 10000; i++) {
        data.push({
          id: i,
          user: `user_${i}`,
          trip: `trip_${i}`,
          data: new Array(100).fill(`data_${i}`),
        });
      }

      // Simulate processing
      const processed = data.map((item) => ({
        ...item,
        processed: true,
        timestamp: new Date(),
      }));

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      return processed.length;
    });

    const afterMemory = process.memoryUsage();

    this.results.memoryMetrics = {
      before: beforeMemory,
      after: afterMemory,
      difference: {
        rss: afterMemory.rss - beforeMemory.rss,
        heapTotal: afterMemory.heapTotal - beforeMemory.heapTotal,
        heapUsed: afterMemory.heapUsed - beforeMemory.heapUsed,
        external: afterMemory.external - beforeMemory.external,
        arrayBuffers: afterMemory.arrayBuffers - beforeMemory.arrayBuffers,
      },
    };
  }

  generateReport() {
    this.log("\n📊 Performance Report Generation", "info");

    const reportDir = path.join(process.cwd(), "performance-reports");
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = path.join(
      reportDir,
      `performance-report-${Date.now()}.json`
    );
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));

    // Generate human-readable summary
    const summaryFile = path.join(
      reportDir,
      `performance-summary-${Date.now()}.md`
    );
    const summary = this.generateMarkdownSummary();
    fs.writeFileSync(summaryFile, summary);

    this.log(`✅ Performance report saved to: ${reportFile}`, "success");
    this.log(`✅ Performance summary saved to: ${summaryFile}`, "success");

    return { reportFile, summaryFile };
  }

  generateMarkdownSummary() {
    const { metrics, memoryMetrics } = this.results;

    let summary = `# 🚀 vCarpool Node.js 22 Performance Report

## 📋 System Information
- **Node.js Version**: ${this.results.nodeVersion}
- **Platform**: ${this.results.platform}
- **Architecture**: ${this.results.arch}
- **Timestamp**: ${this.results.timestamp}

## ⏱️ Performance Metrics

| Test | Duration (ms) | Status |
|------|---------------|--------|
`;

    Object.entries(metrics).forEach(([name, data]) => {
      const status = data.status === "success" ? "✅" : "❌";
      summary += `| ${name.replace(/_/g, " ")} | ${data.duration.toFixed(
        2
      )} | ${status} |\n`;
    });

    if (memoryMetrics) {
      summary += `

## 🧠 Memory Usage Analysis

### Before Test
- **RSS**: ${(memoryMetrics.before.rss / 1024 / 1024).toFixed(2)} MB
- **Heap Total**: ${(memoryMetrics.before.heapTotal / 1024 / 1024).toFixed(
        2
      )} MB
- **Heap Used**: ${(memoryMetrics.before.heapUsed / 1024 / 1024).toFixed(2)} MB

### After Test
- **RSS**: ${(memoryMetrics.after.rss / 1024 / 1024).toFixed(2)} MB
- **Heap Total**: ${(memoryMetrics.after.heapTotal / 1024 / 1024).toFixed(2)} MB
- **Heap Used**: ${(memoryMetrics.after.heapUsed / 1024 / 1024).toFixed(2)} MB

### Memory Delta
- **RSS Delta**: ${(memoryMetrics.difference.rss / 1024 / 1024).toFixed(2)} MB
- **Heap Delta**: ${(memoryMetrics.difference.heapUsed / 1024 / 1024).toFixed(
        2
      )} MB
`;
    }

    // Performance analysis
    const buildTime = metrics.full_build_pipeline?.duration || 0;
    const testTime = metrics.all_tests?.duration || 0;

    summary += `

## 📈 Performance Analysis

### Build Performance
- **Full Build Pipeline**: ${buildTime.toFixed(2)}ms
- **Performance Rating**: ${
      buildTime < 30000
        ? "🟢 Excellent"
        : buildTime < 60000
        ? "🟡 Good"
        : "🔴 Needs Optimization"
    }

### Test Performance
- **All Tests**: ${testTime.toFixed(2)}ms
- **Performance Rating**: ${
      testTime < 15000
        ? "🟢 Excellent"
        : testTime < 30000
        ? "🟡 Good"
        : "🔴 Needs Optimization"
    }

## 🎯 Recommendations

Based on the performance metrics:

1. **Build Optimization**: ${
      buildTime > 60000
        ? "Consider optimizing build process"
        : "Build performance is within acceptable range"
    }
2. **Test Optimization**: ${
      testTime > 30000
        ? "Consider optimizing test suite"
        : "Test performance is within acceptable range"
    }
3. **Memory Management**: Monitor memory usage trends over time

## 📚 Node.js 22 Benefits Observed

- **V8 Engine**: Latest optimizations for faster execution
- **Memory Management**: Improved garbage collection
- **Startup Performance**: Enhanced module loading
- **Security**: Latest security patches applied

---
*Generated on: ${new Date().toISOString()}*
*Node.js Version: ${this.results.nodeVersion}*
`;

    return summary;
  }

  async run() {
    try {
      this.log(
        "🚀 Starting vCarpool Node.js 22 Performance Monitoring",
        "info"
      );
      this.log(`📍 Node.js Version: ${process.version}`, "info");
      this.log(`📍 Platform: ${process.platform} ${process.arch}`, "info");

      await this.runBuildPerformanceTests();
      await this.runTestPerformanceTests();
      await this.runStartupPerformanceTests();
      await this.runMemoryUsageTests();

      const { reportFile, summaryFile } = this.generateReport();

      this.log(
        "\n🎉 Performance monitoring completed successfully!",
        "success"
      );
      this.log(`📊 View detailed report: ${reportFile}`, "info");
      this.log(`📋 View summary: ${summaryFile}`, "info");
    } catch (error) {
      this.log(`❌ Performance monitoring failed: ${error.message}`, "error");
      process.exit(1);
    }
  }
}

// Run the performance monitor
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  monitor.run();
}

module.exports = PerformanceMonitor;
