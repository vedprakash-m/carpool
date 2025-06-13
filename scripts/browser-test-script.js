/**
 * Browser Console Test Script
 * Paste this into the browser console on the registration page
 * to test the form interactions in the actual production environment
 */

console.log("🧪 Starting Registration Form Browser Test...");

// Test 1: Check if the form elements exist
function testFormElements() {
  console.log("\n=== Test 1: Form Elements ===");

  const form = document.querySelector("form");
  const familyNameInput = document.querySelector('input[name="familyName"]');
  const nextButton = document.querySelector('button[type="button"]');

  console.log("Form found:", !!form);
  console.log("Family name input found:", !!familyNameInput);
  console.log("Next button found:", !!nextButton);

  return !!form && !!familyNameInput && !!nextButton;
}

// Test 2: Test step navigation
function testStepNavigation() {
  console.log("\n=== Test 2: Step Navigation ===");

  try {
    // Fill out the family name
    const familyNameInput = document.querySelector('input[name="familyName"]');
    if (familyNameInput) {
      familyNameInput.value = "Test Family";
      familyNameInput.dispatchEvent(new Event("input", { bubbles: true }));
      console.log("✓ Family name filled");
    }

    // Fill out parent info
    const firstNameInput = document.querySelector(
      'input[name="parent.firstName"]'
    );
    const lastNameInput = document.querySelector(
      'input[name="parent.lastName"]'
    );
    const emailInput = document.querySelector('input[name="parent.email"]');
    const passwordInput = document.querySelector(
      'input[name="parent.password"]'
    );

    if (firstNameInput) {
      firstNameInput.value = "John";
      firstNameInput.dispatchEvent(new Event("input", { bubbles: true }));
      console.log("✓ First name filled");
    }

    if (lastNameInput) {
      lastNameInput.value = "Doe";
      lastNameInput.dispatchEvent(new Event("input", { bubbles: true }));
      console.log("✓ Last name filled");
    }

    if (emailInput) {
      emailInput.value = "john@test.com";
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      console.log("✓ Email filled");
    }

    if (passwordInput) {
      passwordInput.value = "password123";
      passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
      console.log("✓ Password filled");
    }

    // Click next button
    const nextButton = document.querySelector('button[type="button"]');
    if (nextButton && nextButton.textContent.includes("Next")) {
      console.log("🖱️  Clicking Next button...");
      nextButton.click();

      // Wait a bit for the step transition
      setTimeout(() => {
        const step2Header = document.querySelector("h3");
        if (step2Header && step2Header.textContent.includes("Step 2")) {
          console.log("✅ Successfully navigated to Step 2!");
          testChildrenOperations();
        } else {
          console.log("❌ Failed to navigate to Step 2");
        }
      }, 500);
    }

    return true;
  } catch (error) {
    console.error("❌ Error in step navigation:", error);
    return false;
  }
}

// Test 3: Test children operations (the critical part)
function testChildrenOperations() {
  console.log("\n=== Test 3: Children Operations ===");

  try {
    // Check if children form is visible
    const childrenSection = document.querySelector("h3");
    if (childrenSection && childrenSection.textContent.includes("Step 2")) {
      console.log("✅ Children form section is visible");

      // Check for child inputs
      const childInputs = document.querySelectorAll(
        'input[name^="children.0"]'
      );
      console.log("Child inputs found:", childInputs.length);

      // Test adding a child
      const addButton = document.querySelector('button[type="button"]');
      const addButtons = Array.from(
        document.querySelectorAll('button[type="button"]')
      );
      const addChildButton = addButtons.find(
        (btn) =>
          btn.textContent && btn.textContent.includes("Add Another Child")
      );

      if (addChildButton) {
        console.log("🖱️  Testing Add Child button...");
        addChildButton.click();

        setTimeout(() => {
          const allChildInputs = document.querySelectorAll(
            'input[name^="children."]'
          );
          console.log("Child inputs after add:", allChildInputs.length);

          // Test removing a child
          const removeButtons = document.querySelectorAll(
            'button[type="button"] svg'
          );
          const trashIcon = Array.from(removeButtons).find(
            (svg) =>
              svg.getAttribute("data-slot") === "icon" ||
              svg.classList.contains("h-5")
          );

          if (trashIcon && trashIcon.parentElement) {
            console.log("🖱️  Testing Remove Child button...");
            trashIcon.parentElement.click();

            setTimeout(() => {
              const finalChildInputs = document.querySelectorAll(
                'input[name^="children."]'
              );
              console.log(
                "Child inputs after remove:",
                finalChildInputs.length
              );
              console.log("✅ Children operations completed successfully!");
            }, 300);
          }
        }, 300);
      }
    } else {
      console.log("❌ Children form section not found");
    }

    return true;
  } catch (error) {
    console.error("❌ Error in children operations:", error);
    return false;
  }
}

// Run the complete test
function runBrowserTest() {
  console.log("🚀 Starting browser form test...");

  const elementsExist = testFormElements();
  if (elementsExist) {
    console.log("✅ Form elements validation passed");
    testStepNavigation();
  } else {
    console.log("❌ Form elements validation failed");
  }
}

// Auto-run the test
runBrowserTest();

console.log("\n📝 Instructions:");
console.log("1. Watch the console for test results");
console.log("2. The form should auto-fill and navigate to Step 2");
console.log("3. Children operations (add/remove) should work without errors");
console.log("4. Look for any TypeError messages - there should be none!");
