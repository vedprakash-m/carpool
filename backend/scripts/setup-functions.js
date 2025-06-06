#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// List of essential functions to set up (traditional model only)
const requiredFunctions = [
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
  // Remove conflicting database functions that cause route conflicts
  // "auth-login-db",        // Conflicts with auth-login-legacy
  // "trips-stats-db",       // Conflicts with trips-stats
];

console.log("🔧 Setting up Azure Functions...");

requiredFunctions.forEach((functionName) => {
  const srcFunctionDir = path.join("src", "functions", functionName);
  const distFunctionDir = path.join("dist", "functions", functionName);
  const rootFunctionDir = functionName;

  // Check if function already exists at root level (for legacy functions)
  if (
    fs.existsSync(path.join(rootFunctionDir, "index.js")) &&
    fs.existsSync(path.join(rootFunctionDir, "function.json"))
  ) {
    console.log(`✅ ${functionName}: Already present at root level`);
    return;
  }

  // Check if source function exists in src/functions
  if (!fs.existsSync(srcFunctionDir)) {
    console.log(`⚠️  Skipping ${functionName} - source not found`);
    return;
  }

  try {
    // Create root function directory (preserve existing if it's a JavaScript function)
    if (!fs.existsSync(rootFunctionDir)) {
      fs.mkdirSync(rootFunctionDir, { recursive: true });
    } else if (
      fs.existsSync(path.join(rootFunctionDir, "index.js")) &&
      !fs.existsSync(path.join("src", "functions", functionName, "index.js"))
    ) {
      // This is an existing JavaScript function, preserve it
      console.log(
        `📦 Preserving existing JavaScript function: ${functionName}`
      );
      return;
    }

    // Copy function.json from source
    const srcFunctionJson = path.join(srcFunctionDir, "function.json");
    const destFunctionJson = path.join(rootFunctionDir, "function.json");

    if (fs.existsSync(srcFunctionJson)) {
      fs.copyFileSync(srcFunctionJson, destFunctionJson);
      console.log(`✅ Copied function.json for ${functionName}`);
    } else {
      console.log(`❌ function.json not found for ${functionName}`);
      return;
    }

    // Try to copy JavaScript file first (for legacy functions)
    const srcIndexJs = path.join(srcFunctionDir, "index.js");
    const distIndexJs = path.join(distFunctionDir, "index.js");
    const destIndexJs = path.join(rootFunctionDir, "index.js");

    if (fs.existsSync(srcIndexJs)) {
      // Use source JavaScript file directly
      fs.copyFileSync(srcIndexJs, destIndexJs);
      console.log(`✅ Copied index.js for ${functionName} (from source)`);
    } else if (fs.existsSync(distIndexJs)) {
      // Use compiled TypeScript file
      fs.copyFileSync(distIndexJs, destIndexJs);
      console.log(`✅ Copied index.js for ${functionName} (compiled)`);
    } else {
      console.log(`❌ No index.js found for ${functionName}`);
    }

    // Copy source map if it exists
    const distIndexMap = path.join(distFunctionDir, "index.js.map");
    const destIndexMap = path.join(rootFunctionDir, "index.js.map");

    if (fs.existsSync(distIndexMap)) {
      fs.copyFileSync(distIndexMap, destIndexMap);
    }
  } catch (error) {
    console.error(`❌ Error setting up ${functionName}:`, error.message);
  }
});

console.log("✅ Azure Functions setup completed!");
console.log(
  "📋 Functions configured:",
  requiredFunctions.filter((fn) => fs.existsSync(fn)).join(", ")
);
