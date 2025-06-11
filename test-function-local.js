// Test the registration function locally
const registrationFunction = require("./backend/auth-register-simple/index.js");

// Mock context object
const mockContext = {
  log: console.log,
  res: null,
};

// Mock request object
const mockRequest = {
  method: "POST",
  body: {
    email: "test@example.com",
    password: process.env.TEST_PASSWORD || "test-password-placeholder",
    firstName: "Test",
    lastName: "User",
    phoneNumber: "+1234567890",
  },
};

async function testLocal() {
  console.log("🧪 Testing registration function locally...\n");

  try {
    await registrationFunction(mockContext, mockRequest);

    console.log("✅ Function executed successfully!");
    console.log("Response Status:", mockContext.res?.status);
    console.log(
      "Response Body:",
      JSON.stringify(mockContext.res?.body, null, 2)
    );
  } catch (error) {
    console.log("❌ Function failed:", error.message);
    console.log("Stack:", error.stack);
  }
}

testLocal();
