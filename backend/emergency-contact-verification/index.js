const { app } = require("@azure/functions");

// Mock emergency contact database
const mockEmergencyContacts = new Map();
const verificationCodes = new Map();

// Helper function to validate emergency contact data
function validateEmergencyContact(contact) {
  const errors = [];

  if (!contact.name || contact.name.trim().length < 2) {
    errors.push("Emergency contact name must be at least 2 characters");
  }

  if (
    !contact.relationship ||
    ![
      "parent",
      "guardian",
      "grandparent",
      "family_friend",
      "relative",
      "other",
    ].includes(contact.relationship)
  ) {
    errors.push("Valid relationship is required");
  }

  if (
    !contact.phoneNumber ||
    !/^\+?1?[2-9]\d{9}$/.test(contact.phoneNumber.replace(/\D/g, ""))
  ) {
    errors.push("Valid US phone number is required");
  }

  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    errors.push("Valid email address is required if provided");
  }

  return errors;
}

// Helper function to generate verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to send verification SMS (mock)
async function sendVerificationSMS(phoneNumber, code, contactName) {
  // In production, use Azure Communication Services or Twilio
  console.log(
    `[MOCK SMS] Sending verification code ${code} to ${phoneNumber} for emergency contact ${contactName}`
  );

  // Simulate SMS delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    success: true,
    messageId: `mock_sms_${Date.now()}`,
    message: `Verification code sent to ${phoneNumber}`,
  };
}

app.http("emergency-contact-verification", {
  methods: ["POST", "PUT"],
  authLevel: "anonymous",
  route: "emergency-contacts/verify",
  handler: async (request, context) => {
    try {
      // Add CORS headers
      const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json",
      };

      // Handle OPTIONS preflight request
      if (request.method === "OPTIONS") {
        return {
          status: 200,
          headers,
        };
      }

      const body = await request.json();
      const { action, userId, contactData, verificationCode } = body;

      // Mock authentication - in production, validate JWT token
      if (!userId) {
        return {
          status: 401,
          headers,
          body: JSON.stringify({
            success: false,
            error: "Authentication required",
            code: "AUTH_REQUIRED",
          }),
        };
      }

      switch (action) {
        case "add_contact":
          // Validate emergency contact data
          const validationErrors = validateEmergencyContact(contactData);
          if (validationErrors.length > 0) {
            return {
              status: 400,
              headers,
              body: JSON.stringify({
                success: false,
                errors: validationErrors,
              }),
            };
          }

          // Generate and send verification code
          const code = generateVerificationCode();
          const contactId = `${userId}_${Date.now()}`;

          // Store contact data temporarily
          const contactKey = `${userId}_${contactData.phoneNumber}`;
          mockEmergencyContacts.set(contactKey, {
            id: contactId,
            userId,
            ...contactData,
            verified: false,
            createdAt: new Date().toISOString(),
          });

          // Store verification code
          verificationCodes.set(contactKey, {
            code,
            attempts: 0,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
            contactId,
          });

          // Send verification SMS
          const smsResult = await sendVerificationSMS(
            contactData.phoneNumber,
            code,
            contactData.name
          );

          return {
            status: 200,
            headers,
            body: JSON.stringify({
              success: true,
              contactId,
              message: `Verification code sent to ${contactData.phoneNumber}`,
              expiresAt: verificationCodes.get(contactKey).expiresAt,
            }),
          };

        case "verify_contact":
          if (!verificationCode || !contactData?.phoneNumber) {
            return {
              status: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: "Verification code and phone number are required",
              }),
            };
          }

          const verifyKey = `${userId}_${contactData.phoneNumber}`;
          const storedVerification = verificationCodes.get(verifyKey);
          const storedContact = mockEmergencyContacts.get(verifyKey);

          if (!storedVerification || !storedContact) {
            return {
              status: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: "No verification in progress for this contact",
              }),
            };
          }

          // Check if code expired
          if (new Date() > new Date(storedVerification.expiresAt)) {
            verificationCodes.delete(verifyKey);
            return {
              status: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: "Verification code has expired",
                code: "CODE_EXPIRED",
              }),
            };
          }

          // Check attempt limit
          if (storedVerification.attempts >= 3) {
            verificationCodes.delete(verifyKey);
            return {
              status: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: "Too many verification attempts",
                code: "TOO_MANY_ATTEMPTS",
              }),
            };
          }

          // Increment attempts
          storedVerification.attempts++;

          // Verify code
          if (storedVerification.code !== verificationCode) {
            return {
              status: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: "Invalid verification code",
                attemptsRemaining: 3 - storedVerification.attempts,
              }),
            };
          }

          // Mark contact as verified
          storedContact.verified = true;
          storedContact.verifiedAt = new Date().toISOString();

          // Clean up verification code
          verificationCodes.delete(verifyKey);

          return {
            status: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: "Emergency contact verified successfully",
              contact: {
                id: storedContact.id,
                name: storedContact.name,
                relationship: storedContact.relationship,
                phoneNumber: storedContact.phoneNumber,
                email: storedContact.email,
                verified: true,
                verifiedAt: storedContact.verifiedAt,
              },
            }),
          };

        case "get_contacts":
          // Get all verified emergency contacts for user
          const userContacts = Array.from(
            mockEmergencyContacts.values()
          ).filter((contact) => contact.userId === userId && contact.verified);

          return {
            status: 200,
            headers,
            body: JSON.stringify({
              success: true,
              contacts: userContacts.map((contact) => ({
                id: contact.id,
                name: contact.name,
                relationship: contact.relationship,
                phoneNumber: contact.phoneNumber,
                email: contact.email,
                verified: contact.verified,
                verifiedAt: contact.verifiedAt,
              })),
            }),
          };

        case "resend_code":
          if (!contactData?.phoneNumber) {
            return {
              status: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: "Phone number is required",
              }),
            };
          }

          const resendKey = `${userId}_${contactData.phoneNumber}`;
          const existingContact = mockEmergencyContacts.get(resendKey);
          const existingVerification = verificationCodes.get(resendKey);

          if (!existingContact || existingContact.verified) {
            return {
              status: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: "No unverified contact found for this phone number",
              }),
            };
          }

          // Generate new code
          const newCode = generateVerificationCode();
          verificationCodes.set(resendKey, {
            code: newCode,
            attempts: 0,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            contactId: existingContact.id,
          });

          // Send new verification SMS
          await sendVerificationSMS(
            contactData.phoneNumber,
            newCode,
            existingContact.name
          );

          return {
            status: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: `New verification code sent to ${contactData.phoneNumber}`,
              expiresAt: verificationCodes.get(resendKey).expiresAt,
            }),
          };

        default:
          return {
            status: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error:
                "Invalid action. Supported actions: add_contact, verify_contact, get_contacts, resend_code",
            }),
          };
      }
    } catch (error) {
      context.error("Emergency contact verification error:", error);

      return {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          success: false,
          error: "Internal server error",
          details:
            process.env.NODE_ENV === "development" ? error.message : undefined,
        }),
      };
    }
  },
});
