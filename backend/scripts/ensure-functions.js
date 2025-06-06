#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// List of essential functions that must be present
const REQUIRED_FUNCTIONS = [
  "hello",
  "auth-login-legacy",
  "trips-stats",
  "users-me",
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

    // Copy index.js
    const srcIndexJs = path.join(srcFunctionDir, "index.js");
    const destIndexJs = path.join(rootFunctionDir, "index.js");

    if (fs.existsSync(srcIndexJs)) {
      fs.copyFileSync(srcIndexJs, destIndexJs);
      console.log(`✅ ${functionName}: Copied index.js`);
    } else {
      console.log(`❌ ${functionName}: index.js not found`);
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
