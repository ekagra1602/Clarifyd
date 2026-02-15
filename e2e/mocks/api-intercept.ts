import { Page } from "@playwright/test";
import { mockGeminiAPI } from "./gemini.mock";

export interface MockOptions {
  mockGemini?: boolean;
  geminiResponseType?: "quiz" | "qa" | "lost" | "summary";
}

export async function setupMocks(page: Page, options: MockOptions = {}) {
  const { mockGemini = true, geminiResponseType = "qa" } = options;

  if (mockGemini) {
    await mockGeminiAPI(page, geminiResponseType);
  }
}

/**
 * Setup mocks for quiz flow - intercepts Gemini API for quiz generation
 */
export async function setupQuizMocks(page: Page) {
  await setupMocks(page, { mockGemini: true, geminiResponseType: "quiz" });
}

/**
 * Setup mocks for Q&A flow - intercepts Gemini API for Q&A answers
 */
export async function setupQAMocks(page: Page) {
  await setupMocks(page, { mockGemini: true, geminiResponseType: "qa" });
}

/**
 * Setup mocks for lost signal flow - intercepts Gemini API for lost summaries
 */
export async function setupLostMocks(page: Page) {
  await setupMocks(page, { mockGemini: true, geminiResponseType: "lost" });
}
