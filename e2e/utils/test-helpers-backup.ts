/**
 * E2E Test Helper Functions
 * Utility functions for test data management, user actions, and common patterns
 */

import { Page, expect, APIRequestContext } from '@playwright/test';
import axios from 'axios';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'parent' | 'admin';
}

export interface TestCarpoolGroup {
  id?: string;
  name: string;
  school: string;
  schedule: {
    days: string[];
    pickupTime: string;
    dropoffTime: string;
  };
  maxCapacity: number;
  currentParticipants?: number;
  costPerSeat?: number;
  createdBy?: string;
}

export interface TestChild {
  firstName: string;
  lastName: string;
  grade: string;
  school: string;
  birthDate?: string;
}

export interface TestFamily {
  familyName: string;
  parent: TestUser;
  children: TestChild[];
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7072';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

/**
 * Makes an API request with proper error handling
 */
export async function makeApiRequest(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  headers?: Record<string, string>
) {
  const baseURL = process.env.BACKEND_URL || 'http://localhost:7072';
  const fullUrl = url.startsWith('/') ? `${baseURL}${url}` : `${baseURL}/${url}`;

  const requestOptions: any = {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    requestOptions.data = data;
  }

  try {
    return await request[method.toLowerCase() as keyof APIRequestContext](fullUrl, requestOptions);
  } catch (error) {
    console.error(`API request failed: ${method} ${fullUrl}`, error);
    throw error;
  }
}

/**
 * Creates a test user with optional database persistence
 */
export async function createTestUser(role: 'parent' | 'admin' = 'parent', persistToDb: boolean = true): Promise<TestUser> {
  const timestamp = Date.now();
  const user: TestUser = {
    email: `test.${role}.${timestamp}@example.com`,
    password: 'TestPassword123!',
    name: `Test ${role === 'admin' ? 'Administrator' : 'Parent'} ${timestamp}`,
    phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    role,
  };

  if (persistToDb) {
    // Register user via API
    try {
      await registerUserViaAPI(user);
    } catch (error) {
      console.warn('Failed to register user via API, using mock data:', error);
    }
  }

  return user;
}

/**
 * Creates a test family with parent and children
 */
export async function createTestFamily(): Promise<TestFamily> {
  const parent = await createTestUser('parent');
  const timestamp = Date.now();

  return {
    familyName: `${parent.name.split(' ')[1]} Family`,
    parent,
    children: [
      {
        firstName: 'Emma',
        lastName: parent.name.split(' ')[1] || 'Doe',
        grade: '5',
        school: 'Tesla STEM High School',
        birthDate: '2013-08-15',
      },
      {
        firstName: 'Alex',
        lastName: parent.name.split(' ')[1] || 'Doe',
        grade: '8',
        school: 'Tesla STEM High School',
        birthDate: '2010-05-22',
      },
    ],
    address: {
      street: `${100 + (timestamp % 900)} Test Street`,
      city: 'Redmond',
      state: 'WA',
      zipCode: '98052',
    },
  };
}

/**
 * Creates a test carpool group
 */
export async function createTestCarpoolGroup(createdBy?: string): Promise<TestCarpoolGroup> {
  const timestamp = Date.now();
  return {
    name: `Test Carpool Group ${timestamp}`,
    school: 'Tesla STEM High School',
    schedule: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      pickupTime: '08:00',
      dropoffTime: '15:30',
    },
    maxCapacity: 4,
    currentParticipants: 1,
    costPerSeat: 5.0,
    createdBy,
  };
}

/**
 * Logs in a user via the UI
 */
export async function loginAsUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL('/dashboard');
}

/**
 * Registers a new user via the API (for setup)
 */
export async function registerUserViaAPI(user: TestUser, family?: TestFamily): Promise<void> {
  try {
    const registrationData = {
      familyName: family?.familyName || `${user.name} Family`,
      parent: {
        firstName: user.name.split(' ')[0],
        lastName: user.name.split(' ')[1] || 'Doe',
        email: user.email,
        password: user.password,
        phoneNumber: user.phone,
      },
      children: family?.children || [
        {
          firstName: 'Test',
          lastName: 'Child',
          grade: '5',
          school: 'Tesla STEM High School',
        },
      ],
      homeAddress: family?.address || {
        street: '123 Test Street',
        city: 'Redmond',
        state: 'WA',
        zipCode: '98052',
      },
    };

    await axios.post(`${BACKEND_URL}/api/auth/register`, registrationData);
  } catch (error) {
    console.warn('Failed to register user via API:', error);
  }
}

/**
 * Creates a carpool group via the API
 */
export async function createCarpoolGroupViaAPI(
  group: TestCarpoolGroup,
  authToken: string,
): Promise<string> {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/trips/create`,
      {
        title: group.name,
        destination: group.school,
        departureTime: group.schedule.pickupTime,
        returnTime: group.schedule.dropoffTime,
        days: group.schedule.days,
        maxCapacity: group.maxCapacity,
        costPerSeat: group.costPerSeat || 0,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );
    return response.data.tripId;
  } catch (error) {
    console.warn('Failed to create carpool group via API:', error);
    throw error;
  }
}

/**
 * Cleans up a test user from the database
 */
export async function cleanupTestUser(email: string): Promise<void> {
  try {
    await axios.delete(`${BACKEND_URL}/api/test/users/${encodeURIComponent(email)}`);
  } catch (error) {
    console.warn('Could not cleanup test user:', error);
  }
}

/**
 * Cleans up a test carpool group from the database
 */
export async function cleanupTestCarpoolGroup(groupId: string, authToken: string): Promise<void> {
  try {
    await axios.delete(`${BACKEND_URL}/api/trips/${groupId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  } catch (error) {
    console.warn('Could not cleanup test carpool group:', error);
  }
}

/**
 * Sets up test data in the database
 */
export async function seedTestData(): Promise<void> {
  try {
    await axios.post(`${BACKEND_URL}/api/test/seed`);
  } catch (error) {
    console.warn('Could not seed test data:', error);
  }
}

/**
 * Resets the test database to a clean state
 */
export async function resetTestDatabase(): Promise<void> {
  try {
    await axios.post(`${BACKEND_URL}/api/test/reset`);
  } catch (error) {
    console.warn('Could not reset test database:', error);
  }
}

/**
 * Gets an authentication token for a user (for API calls)
 */
export async function getAuthToken(email: string, password: string): Promise<string> {
  try {
    const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email,
      password,
    });
    return response.data.accessToken;
  } catch (error) {
    console.warn('Could not get auth token:', error);
    throw error;
  }
}

/**
 * Waits for an element to be visible with custom timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 10000,
): Promise<void> {
  await expect(page.locator(selector)).toBeVisible({ timeout });
}

/**
 * Fills a form field and validates it was filled correctly
 */
export async function fillAndValidate(page: Page, selector: string, value: string): Promise<void> {
  await page.fill(selector, value);
  await expect(page.locator(selector)).toHaveValue(value);
}

/**
 * Clicks a button and waits for navigation
 */
export async function clickAndWaitForNavigation(
  page: Page,
  selector: string,
  expectedUrl?: string | RegExp,
): Promise<void> {
  await page.click(selector);
  if (expectedUrl) {
    await expect(page).toHaveURL(expectedUrl);
  }
}

/**
 * Handles modal dialogs - waits for modal, performs action, waits for closure
 */
export async function handleModal(
  page: Page,
  modalSelector: string,
  action: (page: Page) => Promise<void>,
): Promise<void> {
  await expect(page.locator(modalSelector)).toBeVisible();
  await action(page);
  await expect(page.locator(modalSelector)).not.toBeVisible();
}

/**
 * Checks if user has specific role by checking UI elements
 */
export async function verifyUserRole(page: Page, expectedRole: 'parent' | 'admin'): Promise<void> {
  if (expectedRole === 'admin') {
    await expect(page.locator('[data-testid="admin-menu"]')).toBeVisible();
  } else {
    await expect(page.locator('[data-testid="admin-menu"]')).not.toBeVisible();
  }
}

/**
 * Uploads a file in tests
 */
export async function uploadFile(
  page: Page,
  fileInputSelector: string,
  filePath: string,
): Promise<void> {
  const fileInput = page.locator(fileInputSelector);
  await fileInput.setInputFiles(filePath);
}

/**
 * Verifies success message appears and disappears
 */
export async function verifySuccessMessage(
  page: Page,
  messageText?: string,
  timeout: number = 5000,
): Promise<void> {
  const successMessage = page.locator('[data-testid="success-message"]');
  await expect(successMessage).toBeVisible({ timeout });

  if (messageText) {
    await expect(successMessage).toContainText(messageText);
  }

  // Wait for message to disappear (most success messages are temporary)
  await expect(successMessage).not.toBeVisible({ timeout: timeout + 3000 });
}

/**
 * Verifies error message appears
 */
export async function verifyErrorMessage(
  page: Page,
  messageText?: string,
  timeout: number = 5000,
): Promise<void> {
  const errorMessage = page.locator('[data-testid="error-message"]');
  await expect(errorMessage).toBeVisible({ timeout });

  if (messageText) {
    await expect(errorMessage).toContainText(messageText);
  }
}

/**
 * Simulates network conditions for testing
 */
export async function simulateSlowNetwork(page: Page): Promise<void> {
  await page.route('**/*', (route) => {
    setTimeout(() => route.continue(), 1000);
  });
}

/**
 * Simulates network failure for testing error handling
 */
export async function simulateNetworkFailure(
  page: Page,
  urlPattern: string = '**/*',
): Promise<void> {
  await page.route(urlPattern, (route) => route.abort());
}

/**
 * Restores normal network conditions
 */
export async function restoreNetwork(page: Page): Promise<void> {
  await page.unroute('**/*');
}

/**
 * Takes a screenshot with a custom name for debugging
 */
export async function takeDebugScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/debug-${name}-${Date.now()}.png` });
}

/**
 * Logs browser console messages for debugging
 */
export async function logConsoleMessages(page: Page): Promise<void> {
  page.on('console', (msg) => console.log('Browser console:', msg.text()));
  page.on('pageerror', (error) => console.error('Browser error:', error.message));
}

/**
 * Login helper function
 */
export async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await loginAsUser(page, email, password);
}

/**
 * Login as admin helper (using pre-seeded admin account)
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAsUser(page, 'test.admin@example.com', 'testpass123');
}

/**
 * Login as parent helper (using pre-seeded parent account)
 */
export async function loginAsParent(page: Page): Promise<void> {
  await loginAsUser(page, 'test.parent1@example.com', 'testpass123');
}

/**
 * Logout helper function
 */
export async function logoutUser(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await expect(page).toHaveURL('/');
}

/**
 * Wait for element to be visible with timeout
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Fill form field and trigger blur event
 */
export async function fillAndBlur(page: Page, selector: string, value: string): Promise<void> {
  await page.fill(selector, value);
  await page.locator(selector).blur();
}

/**
 * Take a screenshot with descriptive name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Wait for API response
 */
export async function waitForAPIResponse(page: Page, urlPattern: string | RegExp): Promise<any> {
  const response = await page.waitForResponse(urlPattern);
  return response.json();
}

/**
 * Check if element is visible
 */
export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Wait for page to be loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/**
 * Clear local storage and session storage
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Set viewport for mobile testing
 */
export async function setMobileViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 375, height: 667 });
}

/**
 * Set viewport for desktop testing
 */
export async function setDesktopViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
}

/**
 * Mock API response
 */
export async function mockAPIResponse(page: Page, url: string, response: any): Promise<void> {
  await page.route(url, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Intercept and modify API request
 */
export async function interceptAPIRequest(
  page: Page,
  url: string,
  modifier: (request: any) => any,
): Promise<void> {
  await page.route(url, async (route) => {
    const request = route.request();
    const postData = request.postData();
    const modifiedData = modifier(postData ? JSON.parse(postData) : {});

    route.continue({
      postData: JSON.stringify(modifiedData),
      headers: {
        ...request.headers(),
        'content-type': 'application/json',
      },
    });
  });
}

/**
 * Check network requests for errors
 */
export async function checkNetworkErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });

  return errors;
}

/**
 * Database helper: Reset test database
 */
export async function resetTestDatabase(): Promise<void> {
  try {
    await axios.post(`${BACKEND_URL}/api/test/reset-database`);
  } catch (error) {
    console.warn('Could not reset test database:', error);
  }
}

/**
 * Database helper: Seed test data
 */
export async function seedTestData(): Promise<void> {
  try {
    await axios.post(`${BACKEND_URL}/api/test/seed-data`);
  } catch (error) {
    console.warn('Could not seed test data:', error);
  }
}
