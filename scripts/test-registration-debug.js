const axios = require("axios");

async function testRegistration() {
  console.log("🔍 Testing Registration Endpoint...\n");

  const testCases = [
    {
      name: "Valid Registration",
      data: {
        email: `test-${Date.now()}@example.com`,
        password: process.env.TEST_PASSWORD || "test-password-placeholder",
        firstName: "Test",
        lastName: "User",
        phoneNumber: "+1234567890",
      },
    },
    {
      name: "Minimal Required Fields",
      data: {
        email: `minimal-${Date.now()}@example.com`,
        password: process.env.TEST_PASSWORD || "test-password-placeholder",
        firstName: "Min",
        lastName: "User",
      },
    },
    {
      name: "CORS Preflight Test",
      method: "OPTIONS",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);

    try {
      const config = {
        method: testCase.method || "POST",
        url: "https://vcarpool-api-prod.azurewebsites.net/api/v1/auth/register",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://lively-stone-016bfa20f.6.azurestaticapps.net",
        },
        timeout: 10000,
      };

      if (testCase.data) {
        config.data = testCase.data;
        console.log("Request Data:", JSON.stringify(testCase.data, null, 2));
      }

      const response = await axios(config);

      console.log("✅ Success!");
      console.log("Status:", response.status);
      console.log("Headers:", response.headers);
      console.log("Response:", JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log("❌ Error!");
      console.log("Status:", error.response?.status || "NO_RESPONSE");
      console.log("Status Text:", error.response?.statusText || "NO_STATUS");
      console.log("Headers:", error.response?.headers || "NO_HEADERS");
      console.log("Error Data:", error.response?.data || error.message);

      if (error.code) {
        console.log("Error Code:", error.code);
      }
    }
  }

  console.log("\n🎯 Testing Complete!");
}

// Run the test
testRegistration().catch(console.error);
