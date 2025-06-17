#!/usr/bin/env node

/**
 * Simple CI/CD Dependency Validation
 * Quick validation for known issues in CI pipeline
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Quick dependency validation for CI/CD...\n');

const issues = [];
const workspaces = ['', 'backend', 'frontend', 'shared'];

// Known problematic versions
const problematicDeps = [
  { name: 'madge', version: '6.3.1', fix: 'madge@^8.0.0' },
  { name: '@azure/web-pubsub', version: '1.2.1', fix: '@azure/web-pubsub@^1.2.0' },
];

for (const workspace of workspaces) {
  const packageJsonPath = workspace
    ? path.join(process.cwd(), workspace, 'package.json')
    : path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.log(`⏭️  Skipping ${workspace || 'root'} - no package.json`);
    continue;
  }

  console.log(`📦 Checking ${workspace || 'root'}...`);

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    for (const problematic of problematicDeps) {
      if (allDeps[problematic.name]) {
        const version = allDeps[problematic.name];
        if (version.includes(problematic.version)) {
          issues.push({
            workspace: workspace || 'root',
            package: problematic.name,
            current: version,
            fix: problematic.fix,
          });
        }
      }
    }

    console.log(`  ✅ ${workspace || 'root'} validated`);
  } catch (error) {
    console.log(`  ❌ ${workspace || 'root'} failed: ${error.message}`);
    issues.push({
      workspace: workspace || 'root',
      error: error.message,
    });
  }
}

console.log('\n📊 Validation Results');
console.log('====================');

if (issues.length === 0) {
  console.log('🎉 All dependencies are valid!');
  process.exit(0);
} else {
  console.log(`❌ Found ${issues.length} issue(s):\n`);

  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.workspace}:`);
    if (issue.error) {
      console.log(`   Error: ${issue.error}`);
    } else {
      console.log(`   Package: ${issue.package}`);
      console.log(`   Current: ${issue.current}`);
      console.log(`   Fix: npm install ${issue.fix}`);
    }
    console.log('');
  });

  process.exit(1);
}
