/**
 * Main entry point for Azure Functions v4
 * This file imports all function modules to ensure they are registered
 */

// Import all functions to register them with the Azure Functions runtime
import "./functions/health";
import "./functions/auth-login";
import "./functions/auth-register";
import "./functions/auth-refresh-token";
import "./functions/trips-stats";
import "./functions/trips-list";
import "./functions/trips-create";
import "./functions/users-me";

// Initialize the application
import "./startup";
