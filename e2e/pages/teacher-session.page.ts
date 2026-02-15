import { Page, Locator, expect } from "@playwright/test";

export class TeacherSessionPage {
  readonly page: Page;
  readonly joinCode: Locator;
  readonly studentCount: Locator;
  readonly confusedSection: Locator;
  readonly launchQuizButton: Locator;
  readonly closeQuizButton: Locator;
  readonly qrCodeButton: Locator;
  readonly endClassButton: Locator;
  readonly liveIndicator: Locator;
  readonly quizActiveIndicator: Locator;
  readonly quizReadyIndicator: Locator;
  readonly endSessionConfirmButton: Locator;
  readonly classDismissedMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Join code is in a dashed border div next to "Join Code:" label
    this.joinCode = page.locator(".border-dashed.font-mono");
    // Student count shows "X Students" in the navbar
    this.studentCount = page.getByText(/\d+ Students/);
    // Confused section contains the number and "confused" text separately
    this.confusedSection = page.getByText("confused");
    this.launchQuizButton = page.getByRole("button", { name: /launch quiz/i });
    this.closeQuizButton = page.getByRole("button", { name: /close quiz/i });
    this.qrCodeButton = page
      .locator("button")
      .filter({ has: page.locator("svg") })
      .nth(2);
    this.endClassButton = page.getByText("End Class").locator("..");
    this.liveIndicator = page.getByText("LIVE").first();
    this.quizActiveIndicator = page.getByText("ACTIVE NOW");
    this.quizReadyIndicator = page.getByText("READY");
    this.endSessionConfirmButton = page.getByRole("button", {
      name: /end it|yes.*end/i,
    });
    this.classDismissedMessage = page.getByText(/class dismissed/i);
  }

  async goto(sessionId: string) {
    await this.page.goto(`/teacher/session/${sessionId}`);
    await this.liveIndicator.waitFor({ state: "visible", timeout: 30000 });
  }

  async getJoinCode(): Promise<string> {
    await this.joinCode.waitFor({ state: "visible", timeout: 10000 });
    const codeText = await this.joinCode.textContent();
    return codeText?.trim() || "";
  }

  async getStudentCount(): Promise<number> {
    const text = await this.studentCount.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  async getConfusedCount(): Promise<number> {
    // The confused count is displayed as a number above the "confused" text
    // Find the immediate parent container (mt-4 flex gap-2 items-end) and extract the number
    const container = this.confusedSection.locator("xpath=ancestor::div[contains(@class, 'gap-2')]").first();
    const text = await container.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  async launchQuiz() {
    await this.launchQuizButton.click();
    // Wait for quiz to become active - may take time for AI generation
    await this.quizActiveIndicator.waitFor({
      state: "visible",
      timeout: 45000,
    });
  }

  async closeQuiz() {
    await this.closeQuizButton.click();
    await this.launchQuizButton.waitFor({ state: "visible" });
  }

  async endSession() {
    await this.endClassButton.click();
    await this.page.waitForTimeout(500); // Wait for modal animation
    await this.endSessionConfirmButton.waitFor({ state: "visible" });
    await this.endSessionConfirmButton.click();
  }

  async waitForStudentCount(expected: number) {
    await expect(async () => {
      const count = await this.getStudentCount();
      expect(count).toBe(expected);
    }).toPass({ timeout: 20000, intervals: [500] });
  }

  async waitForConfusedCount(expected: number) {
    // First wait for the confused section to be visible
    await this.confusedSection.waitFor({ state: "visible", timeout: 10000 });

    await expect(async () => {
      const count = await this.getConfusedCount();
      expect(count).toBe(expected);
    }).toPass({ timeout: 30000, intervals: [500] });
  }
}
