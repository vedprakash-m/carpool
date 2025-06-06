#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// List of essential functions that must be present
const REQUIRED_FUNCTIONS = [
  "hello",
  "auth-login-legacy",
  "auth-register-simple",
  "trips-stats",
  "users-me",
  "admin-create-user",
  "users-change-password",
  // Phase 2 Functions
  "admin-generate-schedule-simple",
  "parents-weekly-preferences-simple",
  // Database-integrated functions (Phase 3)
  "auth-login-db",
  "trips-stats-db",
];

console.log("🔧 Ensuring all required functions are present...");

REQUIRED_FUNCTIONS.forEach((functionName) => {
  const rootFunctionDir = functionName;
  const srcFunctionDir = path.join("src", "functions", functionName);

  // Check if function already exists at root level
  if (
    fs.existsSync(rootFunctionDir) &&
    fs.existsSync(path.join(rootFunctionDir, "index.js")) &&
    fs.existsSync(path.join(rootFunctionDir, "function.json"))
  ) {
    console.log(`✅ ${functionName}: Already present`);
    return;
  }

  // Function missing or incomplete, try to create it from source
  if (!fs.existsSync(srcFunctionDir)) {
    console.log(`❌ ${functionName}: Source not found in ${srcFunctionDir}`);
    return;
  }

  try {
    // Create root function directory
    if (!fs.existsSync(rootFunctionDir)) {
      fs.mkdirSync(rootFunctionDir, { recursive: true });
    }

    // Copy function.json
    const srcFunctionJson = path.join(srcFunctionDir, "function.json");
    const destFunctionJson = path.join(rootFunctionDir, "function.json");

    if (fs.existsSync(srcFunctionJson)) {
      fs.copyFileSync(srcFunctionJson, destFunctionJson);
      console.log(`✅ ${functionName}: Copied function.json`);
    } else {
      console.log(`❌ ${functionName}: function.json not found`);
      return;
    }

    // Try to copy index.js (either from source for JS functions or from dist for TS functions)
    const srcIndexJs = path.join(srcFunctionDir, "index.js");
    const distIndexJs = path.join(
      "dist",
      "functions",
      functionName,
      "index.js"
    );
    const destIndexJs = path.join(rootFunctionDir, "index.js");

    if (fs.existsSync(srcIndexJs)) {
      // JavaScript source exists, copy it
      fs.copyFileSync(srcIndexJs, destIndexJs);
      console.log(`✅ ${functionName}: Copied index.js from source`);
    } else if (fs.existsSync(distIndexJs)) {
      // TypeScript compiled version exists, copy it
      fs.copyFileSync(distIndexJs, destIndexJs);
      console.log(
        `✅ ${functionName}: Copied index.js from compiled TypeScript`
      );
    } else {
      console.log(`❌ ${functionName}: No index.js found in source or dist`);
      return;
    }

    console.log(`✅ ${functionName}: Successfully ensured`);
  } catch (error) {
    console.error(`❌ Error ensuring ${functionName}:`, error.message);
  }
});

// Final verification
console.log("\n🔍 Final verification of required functions:");
let allPresent = true;

REQUIRED_FUNCTIONS.forEach((functionName) => {
  const hasIndexJs = fs.existsSync(path.join(functionName, "index.js"));
  const hasFunctionJson = fs.existsSync(
    path.join(functionName, "function.json")
  );

  if (hasIndexJs && hasFunctionJson) {
    console.log(`✅ ${functionName}: Ready`);
  } else {
    console.log(`❌ ${functionName}: Missing or incomplete`);
    allPresent = false;
  }
});

if (allPresent) {
  console.log("\n🎉 All required functions are present!");
  process.exit(0);
} else {
  console.log("\n💥 Some required functions are missing!");
  process.exit(1);
}
