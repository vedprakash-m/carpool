#!/usr/bin/env node

/**
 * Admin User Creation Script
 * Creates an admin user for Carpool application
 */

import { CosmosClient } from "@azure/cosmos";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import readline from "readline";

// Load environment variables
dotenv.config({ path: "../backend/local.settings.json" });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

async function createAdminUser() {
  console.log("🔐 Carpool Admin User Creation\n");

  try {
    // Get Cosmos DB connection
    const connectionString =
      process.env.COSMOS_DB_CONNECTION_STRING ||
      process.env.Values?.COSMOS_DB_CONNECTION_STRING;

    if (!connectionString) {
      console.error(
        "❌ COSMOS_DB_CONNECTION_STRING not found in environment variables"
      );
      console.log("Please set it in backend/local.settings.json");
      process.exit(1);
    }

    const client = new CosmosClient(connectionString);
    const database = client.database("carpool");
    const usersContainer = database.container("users");

    // Get admin user details
    console.log("Enter admin user details:\n");

    const email = await question("Email: ");
    const password = await question("Password (min 8 chars): ");
    const firstName = await question("First Name: ");
    const lastName = await question("Last Name: ");
    const phoneNumber = await question("Phone Number (optional): ");

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      console.error("❌ All fields except phone number are required");
      process.exit(1);
    }

    if (password.length < 8) {
      console.error("❌ Password must be at least 8 characters");
      process.exit(1);
    }

    // Check if user already exists
    const existingUserQuery = {
      query: "SELECT * FROM c WHERE c.email = @email",
      parameters: [{ name: "@email", value: email }],
    };

    const { resources: existingUsers } = await usersContainer.items
      .query(existingUserQuery)
      .fetchAll();

    if (existingUsers.length > 0) {
      console.error(`❌ User with email ${email} already exists`);
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin user
    const adminUser = {
      id: uuidv4(),
      email: email.toLowerCase(),
      firstName,
      lastName,
      phoneNumber: phoneNumber || undefined,
      role: "admin",
      passwordHash,
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: !!phoneNumber,
          tripReminders: true,
          swapRequests: true,
          scheduleChanges: true,
        },
        privacy: {
          showPhoneNumber: !!phoneNumber,
          showEmail: false,
        },
        pickupLocation: "",
        dropoffLocation: "",
        preferredTime: "08:00",
        isDriver: false,
        smokingAllowed: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    await usersContainer.items.create(adminUser);

    console.log("\n✅ Admin user created successfully!");
    console.log("\n📋 Login Credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin`);
    console.log("\n🌐 Access the app at:");
    console.log("   https://lively-stone-016bfa20f.6.azurestaticapps.net");
    console.log(
      "\n⚠️  Please save these credentials securely and change the password after first login!"
    );
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createAdminUser();
