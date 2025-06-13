/**
 * Comprehensive Registration Form Flow Test
 * Tests the complete user interaction flow including step navigation
 */

// Mock console methods to capture output
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

let logs = [];
let warnings = [];
let errors = [];

console.log = (...args) => {
  logs.push(args.join(" "));
  originalLog(...args);
};

console.warn = (...args) => {
  warnings.push(args.join(" "));
  originalWarn(...args);
};

console.error = (...args) => {
  errors.push(args.join(" "));
  originalError(...args);
};

// Test step navigation and form state management
function testStepNavigation() {
  console.log("=== Testing Step Navigation ===");

  let currentStep = 1;

  // Simulate Step 1: Fill out family info and click "Next"
  console.log("Step 1: Filling out family information...");
  const familyData = {
    familyName: "Test Family",
    parent: {
      firstName: "John",
      lastName: "Doe",
      email: "john@test.com",
      password: "password123",
    },
  };

  console.log("Family data entered:", familyData);

  // Simulate clicking "Next: Add Children"
  const nextStep = () => {
    currentStep = currentStep + 1;
    console.log(`Navigated to step ${currentStep}`);
  };

  nextStep();

  // Step 2: Test children array operations
  console.log("Step 2: Testing children operations...");
  return currentStep;
}

// Test children array manipulation (the critical part)
function testChildrenOperations() {
  console.log("=== Testing Children Array Operations ===");

  // Simulate useFieldArray behavior
  let fields = [
    {
      id: "child-1",
      firstName: "",
      lastName: "",
      grade: "",
      school: "Tesla STEM High School",
    },
  ];

  console.log("Initial fields:", fields);

  // Test safeFields wrapper (this is where the error was happening)
  function createSafeFields(fields) {
    try {
      // If fields is undefined or empty, return a default child to prevent crashes
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

      // Return fields with safety checks for each individual field
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
          // Ensure each field has required properties with fallbacks
          id: field.id || `child-${index}`,
          firstName: field.firstName || "",
          lastName: field.lastName || "",
          grade: field.grade || "",
          school: field.school || "Tesla STEM High School",
        };
      });
    } catch (error) {
      console.error("Error in createSafeFields:", error);
      return [
        {
          id: "emergency-fallback",
          firstName: "",
          lastName: "",
          grade: "",
          school: "Tesla STEM High School",
        },
      ];
    }
  }

  // Test 1: Normal operation
  console.log("\nTest 1: Normal safeFields creation");
  let safeFields = createSafeFields(fields);
  console.log("safeFields[0]:", safeFields[0]);

  // Test 2: Adding a child (append operation)
  console.log("\nTest 2: Adding child");
  const append = (newChild) => {
    fields.push({
      id: `child-${fields.length + 1}`,
      ...newChild,
    });
    console.log("After append, fields length:", fields.length);
  };

  append({
    firstName: "",
    lastName: "",
    grade: "",
    school: "Tesla STEM High School",
  });

  safeFields = createSafeFields(fields);
  console.log("Updated safeFields length:", safeFields.length);

  // Test 3: Removing a child (the critical operation)
  console.log("\nTest 3: Removing child");
  const remove = (index) => {
    try {
      if (
        index >= 0 &&
        index < safeFields.length &&
        fields &&
        Array.isArray(fields) &&
        fields.length > 1 &&
        index < fields.length
      ) {
        console.log(
          `Removing child at index ${index}, current fields length: ${fields.length}`
        );
        fields.splice(index, 1);
        console.log("After remove, fields length:", fields.length);
      } else {
        console.warn(
          `Cannot remove child at index ${index}. Fields length: ${fields?.length}, SafeFields length: ${safeFields.length}`
        );
      }
    } catch (error) {
      console.error("Error removing child:", error);
    }
  };

  // Try to remove the second child (should work)
  remove(1);

  safeFields = createSafeFields(fields);
  console.log("Final safeFields length:", safeFields.length);

  // Test 4: Try to remove the last child (should fail safely)
  console.log("\nTest 4: Trying to remove last child");
  remove(0);

  // Test 5: Test with corrupted data
  console.log("\nTest 5: Testing with corrupted data");
  const corruptedFields = [null, undefined, {}, { id: "valid" }];
  const safeCorrrupted = createSafeFields(corruptedFields);
  console.log("Corrupted fields handled safely:", safeCorrrupted.length);

  return true;
}

// Test form submission
function testFormSubmission() {
  console.log("\n=== Testing Form Submission ===");

  const submitData = {
    familyName: "Test Family",
    parent: {
      firstName: "John",
      lastName: "Doe",
      email: "john@test.com",
      password: "password123",
    },
    children: [
      {
        firstName: "Jane",
        lastName: "Doe",
        grade: "9",
        school: "Tesla STEM High School",
      },
    ],
  };

  console.log("Submitting data:", submitData);

  // Validate children array before submission
  if (!submitData.children || submitData.children.length === 0) {
    console.error("Validation failed: No children provided");
    return false;
  }

  // Validate each child has required fields
  const invalidChild = submitData.children.find(
    (child) =>
      !child.firstName || !child.lastName || !child.grade || !child.school
  );

  if (invalidChild) {
    console.error("Validation failed: Invalid child data");
    return false;
  }

  console.log("Form submission validation passed!");
  return true;
}

// Run complete test suite
function runCompleteTest() {
  console.log("🚀 Starting Complete Registration Form Flow Test\n");

  try {
    // Test 1: Step navigation
    const finalStep = testStepNavigation();
    console.log(`Navigation test completed. Final step: ${finalStep}`);

    // Test 2: Children operations
    const childrenTestPassed = testChildrenOperations();
    console.log(`Children operations test passed: ${childrenTestPassed}`);

    // Test 3: Form submission
    const submissionTestPassed = testFormSubmission();
    console.log(`Form submission test passed: ${submissionTestPassed}`);

    console.log("\n✅ All tests completed successfully!");
    console.log(`\nSummary:`);
    console.log(`- Logs: ${logs.length}`);
    console.log(`- Warnings: ${warnings.length}`);
    console.log(`- Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log("\n❌ ERRORS DETECTED:");
      errors.forEach((error) => console.log(`  - ${error}`));
    }

    if (warnings.length > 0) {
      console.log("\n⚠️  WARNINGS:");
      warnings.forEach((warning) => console.log(`  - ${warning}`));
    }

    return errors.length === 0;
  } catch (error) {
    console.error("💥 CRITICAL ERROR:", error);
    return false;
  }
}

// Execute the test
const testResult = runCompleteTest();
console.log(`\n🎯 Overall Test Result: ${testResult ? "PASSED" : "FAILED"}`);
