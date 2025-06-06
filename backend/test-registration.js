#!/usr/bin/env node

/**
 * Test script for user registration functionality
 * Tests both successful registration and error cases
 */

const axios = require("axios");

// Test configuration
const API_BASE_URL = "https://vcarpool-api-prod.azurewebsites.net/api";
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: "TestPassword123!",
  firstName: "Test",
  lastName: "User",
  phoneNumber: "+1234567890",
  department: "Engineering",
};

async function testRegistration() {
  console.log("🧪 Testing User Registration Functionality...\n");

  try {
    // Test 1: Valid registration
    console.log("1️⃣ Testing valid registration...");
    console.log("Request:", {
      email: TEST_USER.email,
      firstName: TEST_USER.firstName,
      lastName: TEST_USER.lastName,
      phoneNumber: TEST_USER.phoneNumber,
      department: TEST_USER.department,
    });

    const response = await axios.post(
      `${API_BASE_URL}/auth/register`,
      TEST_USER,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 201 && response.data.success) {
      console.log("✅ Registration successful!");
      console.log("User ID:", response.data.data.user.id);
      console.log("User Role:", response.data.data.user.role);
      console.log("Token received:", response.data.data.token ? "Yes" : "No");
      console.log(
        "Refresh token received:",
        response.data.data.refreshToken ? "Yes" : "No"
      );
    } else {
      console.log("❌ Registration failed:", response.data);
    }
  } catch (error) {
    console.log(
      "❌ Registration test failed:",
      error.response?.data || error.message
    );
  }

  console.log("\n");

  try {
    // Test 2: Duplicate email registration
    console.log("2️⃣ Testing duplicate email registration...");

    const duplicateResponse = await axios.post(
      `${API_BASE_URL}/auth/register`,
      TEST_USER,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log(
      "❌ Expected duplicate email error, but registration succeeded"
    );
  } catch (error) {
    if (error.response?.status === 409) {
      console.log("✅ Correctly rejected duplicate email registration");
      console.log("Error message:", error.response.data.error);
    } else {
      console.log(
        "❌ Unexpected error for duplicate registration:",
        error.response?.data || error.message
      );
    }
  }

  console.log("\n");

  try {
    // Test 3: Invalid email format
    console.log("3️⃣ Testing invalid email format...");

    const invalidEmailUser = {
      ...TEST_USER,
      email: "invalid-email-format",
    };

    const invalidResponse = await axios.post(
      `${API_BASE_URL}/auth/register`,
      invalidEmailUser,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("❌ Expected validation error, but registration succeeded");
  } catch (error) {
    if (error.response?.status === 400) {
      console.log("✅ Correctly rejected invalid email format");
      console.log("Error message:", error.response.data.error);
    } else {
      console.log(
        "❌ Unexpected error for invalid email:",
        error.response?.data || error.message
      );
    }
  }

  console.log("\n");

  try {
    // Test 4: Short password
    console.log("4️⃣ Testing short password...");

    const shortPasswordUser = {
      ...TEST_USER,
      email: `test-short-${Date.now()}@example.com`,
      password: "123",
    };

    const shortPwResponse = await axios.post(
      `${API_BASE_URL}/auth/register`,
      shortPasswordUser,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log(
      "❌ Expected password validation error, but registration succeeded"
    );
  } catch (error) {
    if (error.response?.status === 400) {
      console.log("✅ Correctly rejected short password");
      console.log("Error message:", error.response.data.error);
    } else {
      console.log(
        "❌ Unexpected error for short password:",
        error.response?.data || error.message
      );
    }
  }

  console.log("\n");

  try {
    // Test 5: Missing required fields
    console.log("5️⃣ Testing missing required fields...");

    const incompleteUser = {
      email: `test-incomplete-${Date.now()}@example.com`,
      password: "TestPassword123!",
      // Missing firstName and lastName
    };

    const incompleteResponse = await axios.post(
      `${API_BASE_URL}/auth/register`,
      incompleteUser,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("❌ Expected validation error, but registration succeeded");
  } catch (error) {
    if (error.response?.status === 400) {
      console.log("✅ Correctly rejected incomplete registration data");
      console.log("Error message:", error.response.data.error);
    } else {
      console.log(
        "❌ Unexpected error for incomplete data:",
        error.response?.data || error.message
      );
    }
  }

  console.log("\n🎉 Registration testing completed!");
}

// Run the tests
testRegistration().catch(console.error);
