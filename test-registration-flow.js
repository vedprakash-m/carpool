/**
 * Test script to simulate the registration form flow
 * This tests the critical operations that could cause array access errors
 */

// Mock React Hook Form structure
const mockFields = [
  {
    id: "child-1",
    firstName: "",
    lastName: "",
    grade: "",
    school: "Tesla STEM High School",
  },
];

// Mock append function
function mockAppend(newChild) {
  mockFields.push({
    id: `child-${mockFields.length + 1}`,
    ...newChild,
  });
  console.log("After append:", mockFields);
}

// Mock remove function
function mockRemove(index) {
  if (index >= 0 && index < mockFields.length && mockFields.length > 1) {
    mockFields.splice(index, 1);
    console.log("After remove:", mockFields);
  } else {
    console.warn("Cannot remove - bounds check failed");
  }
}

// Test safeFields logic
function testSafeFields(fields) {
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    console.warn("Fields array is empty or undefined, using default child");
    return [
      {
        id: "default-child",
        firstName: "",
        lastName: "",
        grade: "",
        school: "Tesla STEM High School",
      },
    ];
  }

  return fields.map((field, index) => {
    // Handle null, undefined, or invalid field objects
    if (!field || typeof field !== "object") {
      console.warn(`Invalid field at index ${index}:`, field);
      return {
        id: `fallback-child-${index}`,
        firstName: "",
        lastName: "",
        grade: "",
        school: "Tesla STEM High School",
      };
    }

    return {
      ...field,
      id: field.id || `child-${index}`,
      firstName: field.firstName || "",
      lastName: field.lastName || "",
      grade: field.grade || "",
      school: field.school || "Tesla STEM High School",
    };
  });
}

// Test array access patterns that could cause errors
function testArrayAccess() {
  console.log("=== Testing Array Access Patterns ===");

  // Test 1: Normal case
  console.log("Test 1: Normal array access");
  const safeFields = testSafeFields(mockFields);
  console.log("safeFields[0]:", safeFields[0]);

  // Test 2: Empty array
  console.log("\nTest 2: Empty array");
  const emptySafeFields = testSafeFields([]);
  console.log("emptySafeFields[0]:", emptySafeFields[0]);

  // Test 3: Undefined array
  console.log("\nTest 3: Undefined array");
  const undefinedSafeFields = testSafeFields(undefined);
  console.log("undefinedSafeFields[0]:", undefinedSafeFields[0]);

  // Test 4: Malformed array
  console.log("\nTest 4: Malformed array");
  const malformedSafeFields = testSafeFields([null, undefined, {}]);
  console.log("malformedSafeFields:", malformedSafeFields);
}

// Test form operations
function testFormOperations() {
  console.log("\n=== Testing Form Operations ===");

  console.log("Initial fields:", mockFields);

  // Test adding a child
  console.log("\nAdding child...");
  mockAppend({
    firstName: "",
    lastName: "",
    grade: "",
    school: "Tesla STEM High School",
  });

  // Test removing a child (should work)
  console.log("\nRemoving child at index 1...");
  mockRemove(1);

  // Test removing when only one child (should fail safely)
  console.log("\nTrying to remove when only one child...");
  mockRemove(0);

  // Test removing invalid index
  console.log("\nTrying to remove invalid index...");
  mockRemove(10);
}

// Run tests
testArrayAccess();
testFormOperations();

console.log("\n=== All tests completed without TypeError ===");
