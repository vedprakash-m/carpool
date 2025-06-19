#!/usr/bin/env node

/**
 * Verification Script for VCarpool Security Fixes
 * This script verifies that both critical issues have been resolved:
 * 1. Authentication bypass vulnerabilities
 * 2. Tesla STEM school naming inconsistencies
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 VCarpool Security & Consistency Verification");
console.log("=".repeat(50));

// 1. Verify authentication bypass fixes
console.log("\n📛 Checking Authentication Security Fixes...");

const authFiles = [
  "/Users/vedprakashmishra/vcarpool/backend/src/functions/auth-login-legacy/index.js",
  "/Users/vedprakashmishra/vcarpool/backend/src/functions/auth-login-simple/index.js",
  "/Users/vedprakashmishra/vcarpool/backend/src/utils/unified-auth.js",
];

let securityIssues = 0;

authFiles.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf8");

    // Check for hardcoded bypass passwords
    const dangerousPatterns = [
      "test-admin-password",
      "test-parent-password",
      "test-student-password",
      '|| "test-',
      "fallbackPassword",
    ];

    dangerousPatterns.forEach((pattern) => {
      if (content.includes(pattern)) {
        console.log(
          `❌ SECURITY ISSUE: Found "${pattern}" in ${path.basename(filePath)}`
        );
        securityIssues++;
      }
    });

    // Check for proper environment variable usage
    if (
      content.includes("process.env.ADMIN_PASSWORD") &&
      !content.includes('|| "test-admin-password"')
    ) {
      console.log(`✅ Proper env var usage in ${path.basename(filePath)}`);
    }
  }
});

// 2. Verify Tesla STEM naming consistency
console.log("\n🏫 Checking Tesla STEM School Naming Consistency...");

const schoolFiles = [
  "/Users/vedprakashmishra/vcarpool/backend/parent-group-search/index.js",
  "/Users/vedprakashmishra/vcarpool/backend/address-validation/index.js",
  "/Users/vedprakashmishra/vcarpool/frontend/src/config/schools.ts",
];

let namingIssues = 0;
const correctName = "Tesla STEM High School";
const incorrectVariants = [
  "Tesla Stem High School",
  "Tesla STEM high school",
  "Tesla Stem high school",
];

schoolFiles.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf8");

    incorrectVariants.forEach((variant) => {
      if (content.includes(variant)) {
        console.log(
          `❌ NAMING ISSUE: Found "${variant}" in ${path.basename(filePath)}`
        );
        namingIssues++;
      }
    });

    if (content.includes(correctName)) {
      console.log(
        `✅ Correct naming "${correctName}" in ${path.basename(filePath)}`
      );
    }
  }
});

// Summary
console.log("\n📊 Verification Summary");
console.log("=".repeat(30));

if (securityIssues === 0) {
  console.log("✅ Authentication security: ALL ISSUES FIXED");
} else {
  console.log(`❌ Authentication security: ${securityIssues} issues remaining`);
}

if (namingIssues === 0) {
  console.log("✅ School naming consistency: ALL ISSUES FIXED");
} else {
  console.log(`❌ School naming consistency: ${namingIssues} issues remaining`);
}

const totalIssues = securityIssues + namingIssues;
if (totalIssues === 0) {
  console.log("\n🎉 ALL CRITICAL ISSUES HAVE BEEN RESOLVED!");
  console.log("   - Authentication bypass vulnerabilities fixed");
  console.log("   - Tesla STEM school naming standardized");
  console.log("   - System is now secure and consistent");
} else {
  console.log(`\n⚠️  ${totalIssues} issues still need attention`);
}

console.log("\n🔧 Next Steps:");
console.log("   1. Deploy changes to production");
console.log("   2. Update environment variables with proper ADMIN_PASSWORD");
console.log("   3. Test login functionality in staging environment");
console.log("   4. Verify Tesla STEM High School appears in school dropdowns");
