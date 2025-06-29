#!/usr/bin/env node

/**
 * Microsoft Entra ID Migration Validation Script
 *
 * This script validates the current state of the Entra ID migration
 * and provides a comprehensive status report.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: string[];
}

interface MigrationStatus {
  overallStatus: 'COMPLETE' | 'IN_PROGRESS' | 'NOT_STARTED';
  completionPercentage: number;
  results: ValidationResult[];
  recommendations: string[];
}

class EntraIDMigrationValidator {
  private results: ValidationResult[] = [];
  private rootPath: string;

  constructor(rootPath: string = '/Users/vedprakashmishra/vcarpool') {
    this.rootPath = rootPath;
  }

  private addResult(
    component: string,
    status: 'PASS' | 'FAIL' | 'WARNING',
    message: string,
    details?: string[],
  ) {
    this.results.push({ component, status, message, details });
  }

  private fileExists(filePath: string): boolean {
    return fs.existsSync(path.join(this.rootPath, filePath));
  }

  private checkFileContent(filePath: string, searchText: string): boolean {
    try {
      const fullPath = path.join(this.rootPath, filePath);
      if (!fs.existsSync(fullPath)) return false;
      const content = fs.readFileSync(fullPath, 'utf-8');
      return content.includes(searchText);
    } catch {
      return false;
    }
  }

  validateDocumentation(): void {
    // Check if Apps_Auth_Requirement.md exists
    if (this.fileExists('docs/Apps_Auth_Requirement.md')) {
      this.addResult('Documentation', 'PASS', 'Apps_Auth_Requirement.md exists');
    } else {
      this.addResult('Documentation', 'FAIL', 'Apps_Auth_Requirement.md missing');
    }

    // Check if metadata.md has migration plan
    if (this.checkFileContent('docs/metadata.md', 'MICROSOFT ENTRA ID MIGRATION PLAN')) {
      this.addResult('Documentation', 'PASS', 'Migration plan documented in metadata.md');
    } else {
      this.addResult('Documentation', 'WARNING', 'Migration plan not found in metadata.md');
    }

    // Check if documentation has been updated for Entra ID
    const docsToCheck = ['README.md', 'docs/User_Experience.md', 'docs/CONTRIBUTING.md'];

    docsToCheck.forEach((doc) => {
      if (
        this.checkFileContent(doc, 'Microsoft Entra ID') ||
        this.checkFileContent(doc, 'Entra ID')
      ) {
        this.addResult('Documentation', 'PASS', `${doc} updated for Entra ID`);
      } else {
        this.addResult('Documentation', 'WARNING', `${doc} may need Entra ID updates`);
      }
    });
  }

  validateBackendImplementation(): void {
    // Check EntraAuthService exists
    if (this.fileExists('backend/src/services/entra-auth.service.ts')) {
      this.addResult('Backend', 'PASS', 'EntraAuthService implemented');
    } else {
      this.addResult('Backend', 'FAIL', 'EntraAuthService missing');
    }

    // Check JWKS validation
    if (this.checkFileContent('backend/src/services/entra-auth.service.ts', 'jwks-rsa')) {
      this.addResult('Backend', 'PASS', 'JWKS token validation implemented');
    } else {
      this.addResult('Backend', 'WARNING', 'JWKS validation may be missing');
    }

    // Check VedUser interface
    if (this.checkFileContent('shared/src/types.ts', 'VedUser')) {
      this.addResult('Backend', 'PASS', 'VedUser interface defined');
    } else {
      this.addResult('Backend', 'FAIL', 'VedUser interface missing');
    }

    // Check auth-entra-unified endpoint
    if (this.fileExists('backend/auth-entra-unified/index.ts')) {
      this.addResult('Backend', 'PASS', 'Unified auth endpoint exists');
    } else {
      this.addResult('Backend', 'FAIL', 'Unified auth endpoint missing');
    }

    // Check database service entra support
    if (this.checkFileContent('backend/src/services/database.service.ts', 'getUserByEntraId')) {
      this.addResult('Backend', 'PASS', 'Database service supports Entra ID');
    } else {
      this.addResult('Backend', 'WARNING', 'Database service may need Entra ID support');
    }

    // Check package.json for required dependencies
    const requiredPackages = ['jwks-rsa', '@azure/msal-node'];
    requiredPackages.forEach((pkg) => {
      if (this.checkFileContent('backend/package.json', `"${pkg}"`)) {
        this.addResult('Backend', 'PASS', `${pkg} dependency installed`);
      } else {
        this.addResult('Backend', 'WARNING', `${pkg} dependency may be missing`);
      }
    });
  }

  validateFrontendImplementation(): void {
    // Check MSAL React integration
    if (this.checkFileContent('frontend/package.json', '@azure/msal-react')) {
      this.addResult('Frontend', 'PASS', 'MSAL React dependency installed');
    } else {
      this.addResult('Frontend', 'FAIL', 'MSAL React dependency missing');
    }

    // Check EntraAuthStore
    if (this.fileExists('frontend/src/store/entra-auth.store.ts')) {
      this.addResult('Frontend', 'PASS', 'EntraAuthStore implemented');
    } else {
      this.addResult('Frontend', 'FAIL', 'EntraAuthStore missing');
    }

    // Check AuthProvider component
    if (this.fileExists('frontend/src/components/auth/AuthProvider.tsx')) {
      this.addResult('Frontend', 'PASS', 'AuthProvider component exists');
    } else {
      this.addResult('Frontend', 'FAIL', 'AuthProvider component missing');
    }

    // Check LoginForm with hybrid support
    if (this.fileExists('frontend/src/components/auth/LoginForm.tsx')) {
      this.addResult('Frontend', 'PASS', 'LoginForm component exists');

      // Check for hybrid auth support
      if (this.checkFileContent('frontend/src/components/auth/LoginForm.tsx', 'loginWithEntra')) {
        this.addResult('Frontend', 'PASS', 'LoginForm supports Entra ID');
      } else {
        this.addResult('Frontend', 'WARNING', 'LoginForm may not support Entra ID');
      }
    } else {
      this.addResult('Frontend', 'FAIL', 'LoginForm component missing');
    }

    // Check for environment configuration
    if (
      this.checkFileContent('frontend/.env.example', 'ENTRA') ||
      this.checkFileContent('frontend/.env.local.example', 'ENTRA')
    ) {
      this.addResult('Frontend', 'PASS', 'Environment configuration for Entra ID exists');
    } else {
      this.addResult(
        'Frontend',
        'WARNING',
        'Environment configuration may need Entra ID variables',
      );
    }
  }

  validateTestingImplementation(): void {
    // Check backend tests
    const backendTestFiles = [
      'backend/src/__tests__/entra-auth.service.test.ts',
      'backend/src/__tests__/auth-entra-unified.integration.test.ts',
    ];

    backendTestFiles.forEach((testFile) => {
      if (this.fileExists(testFile)) {
        this.addResult('Testing', 'PASS', `${path.basename(testFile)} exists`);
      } else {
        this.addResult('Testing', 'WARNING', `${path.basename(testFile)} missing`);
      }
    });

    // Check frontend tests
    if (this.fileExists('frontend/src/__tests__/entra-auth.store.test.ts')) {
      this.addResult('Testing', 'PASS', 'Frontend auth store tests exist');
    } else {
      this.addResult('Testing', 'WARNING', 'Frontend auth store tests missing');
    }

    // Check E2E tests
    if (this.fileExists('e2e/specs/auth-flows.spec.ts')) {
      this.addResult('Testing', 'PASS', 'E2E authentication tests exist');
    } else {
      this.addResult('Testing', 'WARNING', 'E2E authentication tests missing');
    }
  }

  validateMigrationTools(): void {
    // Check migration script
    if (this.fileExists('backend/scripts/migrate-users.ts')) {
      this.addResult('Migration', 'PASS', 'User migration script exists');
    } else {
      this.addResult('Migration', 'WARNING', 'User migration script missing');
    }

    // Check if migration script has key features
    if (
      this.checkFileContent('backend/scripts/migrate-users.ts', 'VedUser') &&
      this.checkFileContent('backend/scripts/migrate-users.ts', 'rollback')
    ) {
      this.addResult('Migration', 'PASS', 'Migration script has required features');
    } else {
      this.addResult('Migration', 'WARNING', 'Migration script may be incomplete');
    }
  }

  validateSecurityConfiguration(): void {
    // Check for Entra ID configuration
    if (
      this.checkFileContent('backend/local.settings.json.example', 'ENTRA') ||
      this.checkFileContent('Confidential/README.md', 'ENTRA')
    ) {
      this.addResult('Security', 'PASS', 'Entra ID configuration documented');
    } else {
      this.addResult('Security', 'WARNING', 'Entra ID configuration may need documentation');
    }

    // Check for secure token handling
    if (this.checkFileContent('backend/src/services/entra-auth.service.ts', 'validateToken')) {
      this.addResult('Security', 'PASS', 'Token validation implemented');
    } else {
      this.addResult('Security', 'WARNING', 'Token validation may be missing');
    }
  }

  generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failCount = this.results.filter((r) => r.status === 'FAIL').length;
    const warningCount = this.results.filter((r) => r.status === 'WARNING').length;

    if (failCount > 0) {
      recommendations.push(`Address ${failCount} critical issues before proceeding with migration`);
    }

    if (warningCount > 0) {
      recommendations.push(`Review ${warningCount} warnings and implement improvements`);
    }

    // Specific recommendations based on results
    const hasBackendTests = this.results.some(
      (r) => r.component === 'Testing' && r.message.includes('backend') && r.status === 'PASS',
    );

    if (!hasBackendTests) {
      recommendations.push('Implement comprehensive backend testing before production deployment');
    }

    const hasMigrationScript = this.results.some(
      (r) => r.component === 'Migration' && r.message.includes('script') && r.status === 'PASS',
    );

    if (!hasMigrationScript) {
      recommendations.push('Complete user migration script development');
    }

    const hasE2ETests = this.results.some(
      (r) => r.component === 'Testing' && r.message.includes('E2E') && r.status === 'PASS',
    );

    if (!hasE2ETests) {
      recommendations.push('Develop end-to-end authentication flow testing');
    }

    if (recommendations.length === 0) {
      recommendations.push('All components look good! Ready for production migration planning');
    }

    return recommendations;
  }

  validateAll(): MigrationStatus {
    console.log('🔍 Validating Microsoft Entra ID Migration Status...\n');

    this.validateDocumentation();
    this.validateBackendImplementation();
    this.validateFrontendImplementation();
    this.validateTestingImplementation();
    this.validateMigrationTools();
    this.validateSecurityConfiguration();

    const totalChecks = this.results.length;
    const passCount = this.results.filter((r) => r.status === 'PASS').length;
    const failCount = this.results.filter((r) => r.status === 'FAIL').length;
    const warningCount = this.results.filter((r) => r.status === 'WARNING').length;

    const completionPercentage = Math.round((passCount / totalChecks) * 100);

    let overallStatus: 'COMPLETE' | 'IN_PROGRESS' | 'NOT_STARTED';
    if (completionPercentage >= 90 && failCount === 0) {
      overallStatus = 'COMPLETE';
    } else if (completionPercentage >= 50) {
      overallStatus = 'IN_PROGRESS';
    } else {
      overallStatus = 'NOT_STARTED';
    }

    const recommendations = this.generateRecommendations();

    return {
      overallStatus,
      completionPercentage,
      results: this.results,
      recommendations,
    };
  }

  printReport(status: MigrationStatus): void {
    console.log('📊 MICROSOFT ENTRA ID MIGRATION STATUS REPORT');
    console.log('='.repeat(60));
    console.log(`Overall Status: ${status.overallStatus}`);
    console.log(`Completion: ${status.completionPercentage}%`);
    console.log(`Date: ${new Date().toISOString().split('T')[0]}\n`);

    // Group results by component
    const components = ['Documentation', 'Backend', 'Frontend', 'Testing', 'Migration', 'Security'];

    components.forEach((component) => {
      const componentResults = status.results.filter((r) => r.component === component);
      if (componentResults.length === 0) return;

      console.log(`📋 ${component}:`);
      componentResults.forEach((result) => {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
        console.log(`  ${icon} ${result.message}`);
        if (result.details) {
          result.details.forEach((detail) => console.log(`     - ${detail}`));
        }
      });
      console.log();
    });

    // Summary statistics
    const passCount = status.results.filter((r) => r.status === 'PASS').length;
    const failCount = status.results.filter((r) => r.status === 'FAIL').length;
    const warningCount = status.results.filter((r) => r.status === 'WARNING').length;

    console.log('📈 Summary:');
    console.log(`  ✅ Passed: ${passCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log(`  ⚠️  Warnings: ${warningCount}`);
    console.log(`  📊 Total: ${status.results.length}\n`);

    // Recommendations
    if (status.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      status.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
      console.log();
    }

    // Next steps
    console.log('🚀 Next Steps:');
    if (status.overallStatus === 'COMPLETE') {
      console.log('  1. Plan production deployment with blue-green strategy');
      console.log('  2. Prepare user communication and training materials');
      console.log('  3. Schedule migration window and execute rollout');
    } else if (status.overallStatus === 'IN_PROGRESS') {
      console.log('  1. Address critical failures first');
      console.log('  2. Complete remaining implementation tasks');
      console.log('  3. Run comprehensive testing validation');
    } else {
      console.log('  1. Review implementation plan and priorities');
      console.log('  2. Begin with backend service implementation');
      console.log('  3. Set up development environment for testing');
    }
  }
}

// CLI execution
async function main() {
  const validator = new EntraIDMigrationValidator();
  const status = validator.validateAll();
  validator.printReport(status);

  // Save report to file
  const reportPath = path.join(process.cwd(), 'entra-migration-status.json');
  fs.writeFileSync(reportPath, JSON.stringify(status, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Exit with appropriate code
  process.exit(status.overallStatus === 'COMPLETE' ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}

export { EntraIDMigrationValidator, MigrationStatus, ValidationResult };
