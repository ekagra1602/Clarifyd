import { Page } from "@playwright/test";
import { mockClaudeAPI } from "./claude.mock";

export interface MockOptions {
  mockClaude?: boolean;
  claudeResponseType?: "quiz" | "qa" | "lost" | "summary";
}

export async function setupMocks(page: Page, options: MockOptions = {}) {
  const { mockClaude = true, claudeResponseType = "qa" } = options;

  if (mockClaude) {
    await mockClaudeAPI(page, claudeResponseType);
  }
}

/**
 * Setup mocks for quiz flow - intercepts Claude API for quiz generation
 */
export async function setupQuizMocks(page: Page) {
  await setupMocks(page, { mockClaude: true, claudeResponseType: "quiz" });
}

/**
 * Setup mocks for Q&A flow - intercepts Claude API for Q&A answers
 */
export async function setupQAMocks(page: Page) {
  await setupMocks(page, { mockClaude: true, claudeResponseType: "qa" });
}

/**
 * Setup mocks for lost signal flow - intercepts Claude API for lost summaries
 */
export async function setupLostMocks(page: Page) {
  await setupMocks(page, { mockClaude: true, claudeResponseType: "lost" });
}
