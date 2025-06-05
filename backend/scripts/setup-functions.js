#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// List of essential functions to set up (traditional model only)
const FUNCTIONS = [
  "auth-login",
  "auth-register",
  "auth-refresh-token",
  "trips-stats",
  "trips-list",
  "trips-create",
  "users-me",
];

console.log("🔧 Setting up Azure Functions...");

FUNCTIONS.forEach((functionName) => {
  const srcFunctionDir = path.join("src", "functions", functionName);
  const distFunctionDir = path.join("dist", "functions", functionName);
  const rootFunctionDir = functionName;

  // Check if source function exists
  if (!fs.existsSync(srcFunctionDir)) {
    console.log(`⚠️  Skipping ${functionName} - source not found`);
    return;
  }

  try {
    // Create root function directory
    if (!fs.existsSync(rootFunctionDir)) {
      fs.mkdirSync(rootFunctionDir, { recursive: true });
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

    // Copy compiled JavaScript from dist
    const distIndexJs = path.join(distFunctionDir, "index.js");
    const destIndexJs = path.join(rootFunctionDir, "index.js");

    if (fs.existsSync(distIndexJs)) {
      fs.copyFileSync(distIndexJs, destIndexJs);
      console.log(`✅ Copied index.js for ${functionName}`);
    } else {
      console.log(`❌ Compiled index.js not found for ${functionName}`);
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
  FUNCTIONS.filter((fn) => fs.existsSync(fn)).join(", ")
);
