import { Page, Locator } from "@playwright/test";

export class TeacherIndexPage {
  readonly page: Page;
  readonly classNameInput: Locator;
  readonly startSessionButton: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.classNameInput = page.getByPlaceholder(/biology 101/i);
    this.startSessionButton = page.getByRole("button", {
      name: /start session/i,
    });
    this.loadingIndicator = page.getByText(/starting class/i);
  }

  async goto() {
    await this.page.goto("/teacher");
  }

  async createSession(name?: string): Promise<string> {
    if (name) {
      await this.classNameInput.fill(name);
    }
    await this.startSessionButton.click();

    // Wait for navigation to session page
    await this.page.waitForURL(/\/teacher\/session\/.+/);

    // Extract session ID from URL
    const url = this.page.url();
    const sessionId = url.split("/").pop();
    return sessionId || "";
  }
}
