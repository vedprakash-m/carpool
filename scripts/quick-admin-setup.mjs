#!/usr/bin/env node

/**
 * Quick Admin Setup - Temporary Development Credentials
 * Provides immediate admin credentials for VCarpool application testing
 */

console.log("🔐 VCarpool Admin Credentials (Development/Testing)\n");

console.log("📋 IMMEDIATE ACCESS CREDENTIALS:");
console.log("====================================");
console.log(
  "🌐 Application URL: https://lively-stone-016bfa20f.6.azurestaticapps.net"
);
console.log("📧 Email: admin@vcarpool.com");
console.log("🔑 Password: Admin123!");
console.log("👤 Role: admin");
console.log("====================================\n");

console.log("ℹ️  IMPORTANT NOTES:");
console.log("• These are MOCK credentials for frontend testing");
console.log("• The frontend currently uses mock authentication");
console.log("• Real authentication requires database setup");
console.log("• Use these credentials to test the UI/UX flow\n");

console.log("📋 TO CREATE REAL ADMIN USER:");
console.log("1. Ensure Cosmos DB is configured in backend/local.settings.json");
console.log("2. Run: node scripts/create-admin-user.mjs");
console.log("3. Follow the prompts to create a real database user\n");

console.log("🚀 FRONTEND TESTING:");
console.log("• The app will accept any email/password combination");
console.log("• Mock authentication is enabled for development");
console.log("• You can test all features with the mock credentials above\n");

console.log("🔧 PRODUCTION SETUP:");
console.log("• Configure real authentication in backend");
console.log("• Create admin user via create-admin-user.mjs script");
console.log("• Update frontend to use real API endpoints\n");

console.log("✅ Ready to test VCarpool with admin@vcarpool.com / Admin123!");
