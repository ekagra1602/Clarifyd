import { Page, Locator, expect } from "@playwright/test";

export class StudentSessionPage {
  readonly page: Page;
  readonly transcript: Locator;
  readonly lostButton: Locator;
  readonly chatButton: Locator;
  readonly chatCloseButton: Locator;
  readonly chatSidebar: Locator;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly quizModal: Locator;
  readonly quizSubmitButton: Locator;
  readonly liveIndicator: Locator;
  readonly sessionEndedMessage: Locator;
  readonly quizSuccessMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.transcript = page.getByText(/live transcript/i);
    this.lostButton = page.getByRole("button", { name: /i'm lost/i });
    this.chatButton = page.getByRole("button", {
      name: /ask question|close chat/i,
    });
    // X close button in the AI Assistant header (for mobile full-screen chat)
    // Find the header container (has border-b-2) and get the button inside it
    this.chatCloseButton = page.locator('.border-b-2:has-text("AI Assistant") button');
    this.chatSidebar = page.getByText("AI Assistant").locator("xpath=ancestor::div[contains(@class, 'w-full') or contains(@class, 'w-96')]");
    this.chatInput = page.getByPlaceholder(/type your question/i);
    // The send button is inside the chat form, next to the input
    this.sendButton = page.locator('form button[type="submit"]');
    this.quizModal = page.getByText("Pop Quiz").locator("xpath=ancestor::div[contains(@class, 'fixed')]");
    this.quizSubmitButton = page.getByRole("button", {
      name: /submit answers/i,
    });
    this.liveIndicator = page.getByText("LIVE").first();
    this.sessionEndedMessage = page.getByText(/that's a wrap/i);
    this.quizSuccessMessage = page.getByText(/you're awesome/i);
  }

  async goto(sessionId: string) {
    await this.page.goto(`/session/${sessionId}`);
  }

  async waitForLive() {
    await this.liveIndicator.waitFor({ state: "visible", timeout: 20000 });
  }

  async markAsLost() {
    await this.lostButton.click();
    // Wait for button state change - text changes to "I'M LOST!"
    await expect(this.lostButton).toContainText(/i'm lost!/i, {
      timeout: 10000,
    });
  }

  async markAsNotLost() {
    // On mobile, the chat opens full-screen when marking as lost,
    // so we need to close it first to access the lost button
    const isChatOpen = await this.chatInput.isVisible();
    if (isChatOpen) {
      await this.closeChat();
    }

    // Ensure the button is visible and stable before clicking
    await this.lostButton.waitFor({ state: "visible" });
    // Wait for any animations to settle
    await this.page.waitForTimeout(1000);
    // Use force click to bypass animation interference
    await this.lostButton.click({ force: true });
    // Wait for button state change - text changes back to "I'm Lost?"
    await expect(this.lostButton).toContainText(/i'm lost\?/i, {
      timeout: 15000,
    });
  }

  async openChat() {
    const buttonText = await this.chatButton.textContent();
    if (!buttonText?.toLowerCase().includes("close")) {
      await this.chatButton.click();
    }
    await this.chatInput.waitFor({ state: "visible", timeout: 10000 });
  }

  async closeChat() {
    // Try to find and click the close button
    // On desktop: "Close Chat" button at the bottom
    // On mobile: X button in the AI Assistant header (full-screen chat)

    // First try the X button in the AI Assistant header (works on both desktop and mobile)
    const xButtonVisible = await this.chatCloseButton.isVisible();
    if (xButtonVisible) {
      await this.chatCloseButton.click();
      await this.chatInput.waitFor({ state: "hidden", timeout: 10000 });
      return;
    }

    // Fallback: try the "Close Chat" button at the bottom
    const chatButtonVisible = await this.chatButton.isVisible();
    if (chatButtonVisible) {
      const chatButtonText = await this.chatButton.textContent();
      if (chatButtonText?.toLowerCase().includes("close")) {
        await this.chatButton.click();
      }
    }
    await this.chatInput.waitFor({ state: "hidden", timeout: 10000 });
  }

  async askQuestion(question: string) {
    await this.openChat();
    await this.chatInput.fill(question);

    // Wait for input to have the value
    await expect(this.chatInput).toHaveValue(question);

    // Press Enter to submit the form (more reliable than clicking the button)
    await this.chatInput.press("Enter");

    // Wait for question to appear in the chat (it appears in a coral/red bubble)
    await expect(this.page.locator(".bg-coral").filter({ hasText: question })).toBeVisible({
      timeout: 30000,
    });
  }

  async waitForAnswer(timeout = 30000) {
    // Wait for AI response (look for the Sparkles icon which appears with answers)
    // or wait for "Thinking..." to disappear and content to appear
    await expect(
      this.page.locator(
        'div:has(svg.lucide-sparkles) + div, .bg-white.border-2:has-text("Based")'
      )
    ).toBeVisible({ timeout });
  }

  async waitForQuiz() {
    // Wait for quiz modal with "Pop Quiz" text to be visible
    await expect(this.page.getByText("Pop Quiz")).toBeVisible({
      timeout: 45000,
    });
  }

  async answerQuiz(answers: number[]) {
    await this.waitForQuiz();

    // Wait a moment for the quiz UI to fully render
    await this.page.waitForTimeout(500);

    // For each question, click the answer choice
    for (let i = 0; i < answers.length; i++) {
      // Find all question blocks by looking for "1.", "2.", etc.
      const questionNumber = `${i + 1}.`;
      const questionLocator = this.page
        .getByText(questionNumber, { exact: false })
        .first();

      // Find the parent div that contains the choices (space-y-3)
      const choicesContainer = questionLocator.locator(
        "xpath=following-sibling::div"
      );
      const choices = choicesContainer.locator("button");

      // Click the answer choice
      await choices.nth(answers[i]).click();
    }

    await this.quizSubmitButton.click();

    // Wait for submission confirmation
    await this.quizSuccessMessage.waitFor({ state: "visible", timeout: 15000 });
  }

  async isLostButtonActive(): Promise<boolean> {
    const text = await this.lostButton.textContent();
    return text?.includes("!") ?? false;
  }
}
