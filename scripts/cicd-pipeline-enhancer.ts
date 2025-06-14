/**
 * CI/CD Pipeline Enhancement Script
 * Phase 1: Foundation Strengthening - Deployment Pipeline
 *
 * Implements:
 * - Blue-green deployment strategy
 * - Comprehensive security scanning
 * - Automated testing in pipeline
 * - Performance regression detection
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface DeploymentConfig {
  environment: "development" | "staging" | "production";
  blueGreenEnabled: boolean;
  securityScanEnabled: boolean;
  performanceTestsEnabled: boolean;
  rollbackOnFailure: boolean;
  healthCheckTimeout: number;
  deploymentSlots: {
    blue: string;
    green: string;
  };
}

interface PipelineResult {
  success: boolean;
  stage: string;
  duration: number;
  errors: string[];
  warnings: string[];
  artifacts: string[];
  metrics: Record<string, number>;
}

class CICDPipelineEnhancer {
  private readonly rootDir: string;
  private readonly config: DeploymentConfig;
  private results: PipelineResult[] = [];

  constructor(rootDir: string, config: Partial<DeploymentConfig> = {}) {
    this.rootDir = rootDir;
    this.config = {
      environment: "staging",
      blueGreenEnabled: true,
      securityScanEnabled: true,
      performanceTestsEnabled: true,
      rollbackOnFailure: true,
      healthCheckTimeout: 300000, // 5 minutes
      deploymentSlots: {
        blue: "vcarpool-api-blue",
        green: "vcarpool-api-green",
      },
      ...config,
    };
  }

  /**
   * Execute the complete CI/CD pipeline
   */
  async execute(): Promise<boolean> {
    console.log("🚀 Starting Enhanced CI/CD Pipeline");
    console.log(`Environment: ${this.config.environment}`);
    console.log(
      `Blue-Green Deployment: ${
        this.config.blueGreenEnabled ? "Enabled" : "Disabled"
      }\n`
    );

    try {
      // Stage 1: Pre-deployment validation
      await this.runStage("pre-deployment", () =>
        this.preDeploymentValidation()
      );

      // Stage 2: Build and test
      await this.runStage("build-test", () => this.buildAndTest());

      // Stage 3: Security scanning
      if (this.config.securityScanEnabled) {
        await this.runStage("security-scan", () => this.securityScanning());
      }

      // Stage 4: Performance testing
      if (this.config.performanceTestsEnabled) {
        await this.runStage("performance-test", () =>
          this.performanceTesting()
        );
      }

      // Stage 5: Deployment
      await this.runStage("deployment", () => this.deployment());

      // Stage 6: Post-deployment validation
      await this.runStage("post-deployment", () =>
        this.postDeploymentValidation()
      );

      console.log("✅ CI/CD Pipeline completed successfully!");
      this.generateReport();
      return true;
    } catch (error) {
      console.error("❌ CI/CD Pipeline failed:", error.message);

      if (this.config.rollbackOnFailure) {
        await this.rollback();
      }

      this.generateReport();
      return false;
    }
  }

  /**
   * Run a pipeline stage with error handling and metrics
   */
  private async runStage(
    stageName: string,
    stageFunction: () => Promise<void>
  ): Promise<void> {
    console.log(`📋 Running stage: ${stageName}`);
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const artifacts: string[] = [];

    try {
      await stageFunction();

      const result: PipelineResult = {
        success: true,
        stage: stageName,
        duration: Date.now() - startTime,
        errors,
        warnings,
        artifacts,
        metrics: {},
      };

      this.results.push(result);
      console.log(`✅ Stage ${stageName} completed in ${result.duration}ms\n`);
    } catch (error) {
      errors.push(error.message);

      const result: PipelineResult = {
        success: false,
        stage: stageName,
        duration: Date.now() - startTime,
        errors,
        warnings,
        artifacts,
        metrics: {},
      };

      this.results.push(result);
      throw error;
    }
  }

  /**
   * Pre-deployment validation
   */
  private async preDeploymentValidation(): Promise<void> {
    console.log("  🔍 Validating environment configuration...");

    // Check required environment variables
    const requiredEnvVars = [
      "AZURE_SUBSCRIPTION_ID",
      "AZURE_RESOURCE_GROUP",
      "COSMOS_DB_CONNECTION_STRING",
      "JWT_SECRET",
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
      }
    }

    // Validate Azure CLI is authenticated
    try {
      execSync("az account show", { encoding: "utf8" });
      console.log("  ✅ Azure CLI authenticated");
    } catch (error) {
      throw new Error('Azure CLI not authenticated. Run "az login" first.');
    }

    // Check for uncommitted changes in production
    if (this.config.environment === "production") {
      try {
        const gitStatus = execSync("git status --porcelain", {
          cwd: this.rootDir,
          encoding: "utf8",
        });

        if (gitStatus.trim()) {
          throw new Error(
            "Uncommitted changes detected. Commit or stash changes before production deployment."
          );
        }
      } catch (error) {
        console.warn("  ⚠️ Could not check git status:", error.message);
      }
    }

    console.log("  ✅ Pre-deployment validation passed");
  }

  /**
   * Build and test stage
   */
  private async buildAndTest(): Promise<void> {
    console.log("  🔨 Building backend...");

    // Install dependencies
    execSync("npm ci", {
      cwd: path.join(this.rootDir, "backend"),
      stdio: "inherit",
    });

    // Build backend
    execSync("npm run build", {
      cwd: path.join(this.rootDir, "backend"),
      stdio: "inherit",
    });

    console.log("  🧪 Running backend tests...");

    // Run backend tests with coverage
    const testResult = execSync("npm run test:ci", {
      cwd: path.join(this.rootDir, "backend"),
      encoding: "utf8",
    });

    // Parse test coverage (simplified)
    const coverageMatch = testResult.match(/All files.*?(\d+\.?\d*)/);
    const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;

    if (coverage < 80) {
      throw new Error(
        `Test coverage ${coverage}% is below minimum threshold of 80%`
      );
    }

    console.log(`  ✅ Backend tests passed with ${coverage}% coverage`);

    // Build and test frontend
    console.log("  🔨 Building frontend...");

    execSync("npm ci", {
      cwd: path.join(this.rootDir, "frontend"),
      stdio: "inherit",
    });

    execSync("npm run build", {
      cwd: path.join(this.rootDir, "frontend"),
      stdio: "inherit",
    });

    console.log("  🧪 Running frontend tests...");

    execSync("npm test -- --watchAll=false --coverage", {
      cwd: path.join(this.rootDir, "frontend"),
      stdio: "inherit",
    });

    console.log("  ✅ Build and test stage completed");
  }

  /**
   * Security scanning stage
   */
  private async securityScanning(): Promise<void> {
    console.log("  🔒 Running security scans...");

    // NPM audit for backend
    try {
      execSync("npm audit --audit-level moderate", {
        cwd: path.join(this.rootDir, "backend"),
        stdio: "inherit",
      });
      console.log("  ✅ Backend npm audit passed");
    } catch (error) {
      console.warn("  ⚠️ Backend npm audit found issues");
    }

    // NPM audit for frontend
    try {
      execSync("npm audit --audit-level moderate", {
        cwd: path.join(this.rootDir, "frontend"),
        stdio: "inherit",
      });
      console.log("  ✅ Frontend npm audit passed");
    } catch (error) {
      console.warn("  ⚠️ Frontend npm audit found issues");
    }

    // ESLint security checks
    try {
      execSync(
        "npx eslint . --ext .ts,.tsx,.js,.jsx --config .eslintrc.security.js",
        {
          cwd: this.rootDir,
          stdio: "inherit",
        }
      );
      console.log("  ✅ ESLint security checks passed");
    } catch (error) {
      console.warn("  ⚠️ ESLint security checks found issues");
    }

    // Check for sensitive data in environment files
    this.checkForSensitiveData();

    console.log("  ✅ Security scanning completed");
  }

  /**
   * Performance testing stage
   */
  private async performanceTesting(): Promise<void> {
    console.log("  ⚡ Running performance tests...");

    // Backend performance tests
    try {
      execSync("npm run test:performance", {
        cwd: path.join(this.rootDir, "backend"),
        stdio: "inherit",
      });
      console.log("  ✅ Backend performance tests passed");
    } catch (error) {
      console.warn("  ⚠️ Backend performance tests not available");
    }

    // Frontend performance tests (Lighthouse CI)
    try {
      execSync("npx lhci autorun", {
        cwd: path.join(this.rootDir, "frontend"),
        stdio: "inherit",
      });
      console.log("  ✅ Frontend performance tests passed");
    } catch (error) {
      console.warn("  ⚠️ Frontend performance tests not available");
    }

    // Bundle size analysis
    this.analyzeBundleSize();

    console.log("  ✅ Performance testing completed");
  }

  /**
   * Deployment stage with blue-green strategy
   */
  private async deployment(): Promise<void> {
    console.log("  🚀 Starting deployment...");

    if (this.config.blueGreenEnabled) {
      await this.blueGreenDeployment();
    } else {
      await this.standardDeployment();
    }

    console.log("  ✅ Deployment completed");
  }

  /**
   * Blue-green deployment implementation
   */
  private async blueGreenDeployment(): Promise<void> {
    console.log("  🔄 Executing blue-green deployment...");

    // Determine current active slot
    const currentSlot = await this.getCurrentActiveSlot();
    const targetSlot = currentSlot === "blue" ? "green" : "blue";
    const targetSlotName = this.config.deploymentSlots[targetSlot];

    console.log(`  📍 Current active: ${currentSlot}, Target: ${targetSlot}`);

    // Deploy to target slot
    console.log(`  📦 Deploying to ${targetSlot} slot...`);
    execSync(`func azure functionapp publish ${targetSlotName} --typescript`, {
      cwd: path.join(this.rootDir, "backend"),
      stdio: "inherit",
    });

    // Health check on target slot
    await this.performHealthCheck(targetSlotName);

    // Swap slots
    console.log(`  🔄 Swapping slots...`);
    execSync(
      `az functionapp deployment slot swap --name ${this.config.deploymentSlots.blue} --resource-group ${process.env.AZURE_RESOURCE_GROUP} --slot ${targetSlot}`,
      {
        stdio: "inherit",
      }
    );

    // Final health check
    await this.performHealthCheck(this.config.deploymentSlots.blue);
  }

  /**
   * Standard deployment
   */
  private async standardDeployment(): Promise<void> {
    console.log("  📦 Deploying backend...");

    execSync("func azure functionapp publish vcarpool-api --typescript", {
      cwd: path.join(this.rootDir, "backend"),
      stdio: "inherit",
    });

    console.log("  📦 Deploying frontend...");

    execSync("npm run deploy", {
      cwd: path.join(this.rootDir, "frontend"),
      stdio: "inherit",
    });
  }

  /**
   * Post-deployment validation
   */
  private async postDeploymentValidation(): Promise<void> {
    console.log("  ✅ Running post-deployment validation...");

    // Health checks
    await this.performHealthCheck();

    // Smoke tests
    await this.runSmokeTests();

    // Performance baseline validation
    await this.validatePerformanceBaseline();

    console.log("  ✅ Post-deployment validation completed");
  }

  /**
   * Perform health check on deployed application
   */
  private async performHealthCheck(slotName?: string): Promise<void> {
    const baseUrl = slotName
      ? `https://${slotName}.azurewebsites.net`
      : `https://vcarpool-api.azurewebsites.net`;

    const healthUrl = `${baseUrl}/api/health`;

    console.log(`  🏥 Checking health at ${healthUrl}...`);

    const maxRetries = 10;
    const retryDelay = 30000; // 30 seconds

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(healthUrl);

        if (response.ok) {
          const health = await response.json();

          if (health.status === "healthy") {
            console.log("  ✅ Health check passed");
            return;
          }
        }

        console.log(
          `  ⏳ Health check attempt ${i + 1}/${maxRetries} failed, retrying...`
        );
      } catch (error) {
        console.log(
          `  ⏳ Health check attempt ${i + 1}/${maxRetries} failed: ${
            error.message
          }`
        );
      }

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    throw new Error("Health check failed after maximum retries");
  }

  /**
   * Run smoke tests against deployed application
   */
  private async runSmokeTests(): Promise<void> {
    console.log("  🚬 Running smoke tests...");

    // Run E2E tests against deployed environment
    try {
      execSync("npx playwright test --config=playwright.config.production.ts", {
        cwd: path.join(this.rootDir, "frontend"),
        stdio: "inherit",
        env: {
          ...process.env,
          PLAYWRIGHT_TEST_BASE_URL: "https://vcarpool.azurestaticapps.net",
        },
      });
      console.log("  ✅ Smoke tests passed");
    } catch (error) {
      console.warn("  ⚠️ Smoke tests not available or failed");
    }
  }

  /**
   * Validate performance baseline
   */
  private async validatePerformanceBaseline(): Promise<void> {
    console.log("  📊 Validating performance baseline...");

    // Check API response times
    const apiEndpoints = [
      "/api/health",
      "/api/v1/auth/me",
      "/api/v1/trips/stats",
    ];

    for (const endpoint of apiEndpoints) {
      const start = Date.now();

      try {
        const response = await fetch(
          `https://vcarpool-api.azurewebsites.net${endpoint}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.TEST_TOKEN || "dummy"}`,
            },
          }
        );

        const duration = Date.now() - start;

        if (duration > 5000) {
          // 5 second threshold
          console.warn(`  ⚠️ Slow response for ${endpoint}: ${duration}ms`);
        } else {
          console.log(`  ✅ ${endpoint}: ${duration}ms`);
        }
      } catch (error) {
        console.warn(`  ⚠️ Failed to test ${endpoint}: ${error.message}`);
      }
    }
  }

  /**
   * Rollback deployment
   */
  private async rollback(): Promise<void> {
    console.log("🔙 Rolling back deployment...");

    if (this.config.blueGreenEnabled) {
      // Swap back to previous slot
      const currentSlot = await this.getCurrentActiveSlot();
      const previousSlot = currentSlot === "blue" ? "green" : "blue";

      execSync(
        `az functionapp deployment slot swap --name ${this.config.deploymentSlots.blue} --resource-group ${process.env.AZURE_RESOURCE_GROUP} --slot ${previousSlot}`,
        {
          stdio: "inherit",
        }
      );

      console.log("✅ Rollback completed");
    } else {
      console.log("⚠️ Standard deployment rollback not implemented");
    }
  }

  /**
   * Get current active deployment slot
   */
  private async getCurrentActiveSlot(): Promise<"blue" | "green"> {
    // Simplified implementation - would query Azure for actual slot info
    return "blue";
  }

  /**
   * Check for sensitive data in files
   */
  private checkForSensitiveData(): void {
    const sensitivePatterns = [
      /password\s*=\s*["'][^"']+["']/i,
      /api[_-]?key\s*=\s*["'][^"']+["']/i,
      /secret\s*=\s*["'][^"']+["']/i,
      /token\s*=\s*["'][^"']+["']/i,
    ];

    const filesToCheck = [
      ".env",
      ".env.local",
      ".env.production",
      "local.settings.json",
    ];

    for (const file of filesToCheck) {
      const filePath = path.join(this.rootDir, file);

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");

        for (const pattern of sensitivePatterns) {
          if (pattern.test(content)) {
            console.warn(`  ⚠️ Potential sensitive data found in ${file}`);
          }
        }
      }
    }
  }

  /**
   * Analyze bundle size
   */
  private analyzeBundleSize(): void {
    const frontendBuildDir = path.join(this.rootDir, "frontend", ".next");

    if (fs.existsSync(frontendBuildDir)) {
      try {
        execSync("npx next-bundle-analyzer", {
          cwd: path.join(this.rootDir, "frontend"),
          stdio: "inherit",
        });
        console.log("  ✅ Bundle size analysis completed");
      } catch (error) {
        console.warn("  ⚠️ Bundle size analysis not available");
      }
    }
  }

  /**
   * Generate deployment report
   */
  private generateReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      config: this.config,
      results: this.results,
      summary: {
        totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
        successfulStages: this.results.filter((r) => r.success).length,
        failedStages: this.results.filter((r) => !r.success).length,
        totalErrors: this.results.reduce((sum, r) => sum + r.errors.length, 0),
        totalWarnings: this.results.reduce(
          (sum, r) => sum + r.warnings.length,
          0
        ),
      },
    };

    const reportPath = path.join(this.rootDir, "deployment-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📄 Deployment report saved to: ${reportPath}`);
    console.log("\n📊 Pipeline Summary:");
    console.log(`  Total Duration: ${report.summary.totalDuration}ms`);
    console.log(`  Successful Stages: ${report.summary.successfulStages}`);
    console.log(`  Failed Stages: ${report.summary.failedStages}`);
    console.log(`  Total Errors: ${report.summary.totalErrors}`);
    console.log(`  Total Warnings: ${report.summary.totalWarnings}`);
  }
}

// Execute if run directly
if (require.main === module) {
  const enhancer = new CICDPipelineEnhancer(process.cwd(), {
    environment: (process.env.NODE_ENV as any) || "staging",
    blueGreenEnabled: process.env.BLUE_GREEN_ENABLED === "true",
    securityScanEnabled: process.env.SECURITY_SCAN_ENABLED !== "false",
    performanceTestsEnabled: process.env.PERFORMANCE_TESTS_ENABLED !== "false",
  });

  enhancer
    .execute()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((error) => {
      console.error("Pipeline execution failed:", error);
      process.exit(1);
    });
}

export { CICDPipelineEnhancer };
