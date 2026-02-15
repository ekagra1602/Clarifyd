import { Page, Locator } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  readonly teacherCard: Locator;
  readonly studentCard: Locator;
  readonly startClassButton: Locator;
  readonly joinSessionButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.teacherCard = page.locator('a[href="/teacher"]');
    this.studentCard = page.locator('a[href="/join"]');
    this.startClassButton = page.getByRole("link", { name: /start class/i });
    this.joinSessionButton = page.getByRole("link", { name: /join session/i });
  }

  async goto() {
    await this.page.goto("/");
  }

  async navigateToTeacher() {
    await this.teacherCard.click();
    await this.page.waitForURL("/teacher");
  }

  async navigateToJoin() {
    await this.studentCard.click();
    await this.page.waitForURL("/join");
  }
}
