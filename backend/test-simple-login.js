const https = require("https");

// Test credentials for mock authentication - these are NOT real secrets
const payload = JSON.stringify({
  email: "test-admin@example.com", // Mock test email
  password: "test-password-123", // Mock test password - replace with env var in production
});

const options = {
  hostname: "vcarpool-api-prod.azurewebsites.net",
  port: 443,
  path: "/api/auth/login",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  },
};

console.log("Making request with payload:", payload);

const req = https.request(options, (res) => {
  console.log("Status:", res.statusCode);
  console.log("Headers:", JSON.stringify(res.headers, null, 2));

  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
    console.log("Received chunk:", chunk.toString());
  });

  res.on("end", () => {
    console.log("Full response body:", data);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        console.log("Parsed JSON:", JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log("Failed to parse JSON:", e.message);
      }
    } else {
      console.log("Empty response body");
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e);
});

req.write(payload);
req.end();
