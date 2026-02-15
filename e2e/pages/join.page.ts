import { Page, Locator, expect } from "@playwright/test";

export class JoinPage {
  readonly page: Page;
  readonly codeInput: Locator;
  readonly joinButton: Locator;
  readonly errorMessage: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.codeInput = page.getByPlaceholder(/blue-tiger-42/i);
    this.joinButton = page.getByRole("button", { name: /join class/i });
    this.errorMessage = page.locator(".text-coral, .bg-coral\\/10");
    this.loadingIndicator = page.getByText(/joining/i);
  }

  async goto(code?: string) {
    const url = code ? `/join?code=${code}` : "/join";
    await this.page.goto(url);
  }

  async joinSession(code: string): Promise<string> {
    await this.codeInput.fill(code);
    await this.joinButton.click();

    // Wait for navigation to student session
    await this.page.waitForURL(/\/session\/.+/);

    const url = this.page.url();
    const sessionId = url.split("/").pop();
    return sessionId || "";
  }

  async expectError(message?: string) {
    await this.errorMessage.waitFor({ state: "visible" });
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }
}
