/**
 * E2E Test Helper Functions
 * Utility functions for test data management, user actions, and common patterns
 */

import { Page, expect } from '@playwright/test';
import axios from 'axios';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'parent' | 'admin';
}

export interface TestCarpoolGroup {
  name: string;
  school: string;
  schedule: {
    days: string[];
    pickupTime: string;
    dropoffTime: string;
  };
  maxCapacity: number;
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:7072';

/**
 * Creates a test user with random data
 */
export async function createTestUser(role: 'parent' | 'admin' = 'parent'): Promise<TestUser> {
  const timestamp = Date.now();
  return {
    email: `test.user.${timestamp}@example.com`,
    password: 'testpass123',
    name: `Test User ${timestamp}`,
    phone: `+1555${String(timestamp).slice(-7)}`,
    role
  };
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
 * Creates a test carpool group
 */
export async function createTestCarpoolGroup(): Promise<TestCarpoolGroup> {
  const timestamp = Date.now();
  return {
    name: `Test Carpool ${timestamp}`,
    school: 'Test Elementary School',
    schedule: {
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      pickupTime: '07:30',
      dropoffTime: '15:30'
    },
    maxCapacity: 4
  };
}

/**
 * Login helper function
 */
export async function loginUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL('/dashboard');
}

/**
 * Login as admin helper
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await loginUser(page, 'test.admin@example.com', 'testpass123');
}

/**
 * Login as parent helper
 */
export async function loginAsParent(page: Page): Promise<void> {
  await loginUser(page, 'test.parent1@example.com', 'testpass123');
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
    fullPage: true 
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
  await page.route(url, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
}

/**
 * Intercept and modify API request
 */
export async function interceptAPIRequest(page: Page, url: string, modifier: (request: any) => any): Promise<void> {
  await page.route(url, async route => {
    const request = route.request();
    const postData = request.postData();
    const modifiedData = modifier(postData ? JSON.parse(postData) : {});
    
    route.continue({
      postData: JSON.stringify(modifiedData),
      headers: {
        ...request.headers(),
        'content-type': 'application/json'
      }
    });
  });
}

/**
 * Check network requests for errors
 */
export async function checkNetworkErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('response', response => {
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
