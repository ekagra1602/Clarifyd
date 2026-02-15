import { Page, Locator, expect } from "@playwright/test";

/**
 * Wait for Convex real-time subscription to update
 * Uses polling since Convex updates are async
 */
export async function waitForConvexUpdate<T>(
  checkFn: () => Promise<T>,
  expectedFn: (value: T) => boolean,
  options: { timeout?: number; interval?: number } = {}
) {
  const { timeout = 10000, interval = 500 } = options;

  await expect(async () => {
    const value = await checkFn();
    expect(expectedFn(value)).toBe(true);
  }).toPass({ timeout, intervals: [interval] });
}

/**
 * Wait for element text to match expected value via Convex subscription
 */
export async function waitForTextUpdate(
  locator: Locator,
  matcher: string | RegExp,
  timeout = 10000
) {
  await expect(locator).toHaveText(matcher, { timeout });
}

/**
 * Wait for element to contain text via Convex subscription
 */
export async function waitForTextContains(
  locator: Locator,
  text: string,
  timeout = 10000
) {
  await expect(locator).toContainText(text, { timeout });
}

/**
 * Wait for Convex to sync between two browser contexts
 * Useful for teacher-student interaction tests
 */
export async function waitForCrossContextSync(delay = 1000) {
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Wait for a number to update in a locator's text
 * Useful for student count, lost count, etc.
 */
export async function waitForCountUpdate(
  locator: Locator,
  expectedCount: number,
  timeout = 15000
) {
  await expect(async () => {
    const text = await locator.textContent();
    const match = text?.match(/(\d+)/);
    const count = match ? parseInt(match[1]) : -1;
    expect(count).toBe(expectedCount);
  }).toPass({ timeout, intervals: [500] });
}
