import { test, expect } from "@playwright/test";
import { HomePage } from "../pages/home.page";
import { TeacherIndexPage } from "../pages/teacher-index.page";
import { JoinPage } from "../pages/join.page";

test.describe("Navigation", () => {
  test("home page displays teacher and student cards", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();

    await expect(homePage.teacherCard).toBeVisible();
    await expect(homePage.studentCard).toBeVisible();
    await expect(homePage.startClassButton).toBeVisible();
    await expect(homePage.joinSessionButton).toBeVisible();
  });

  test("can navigate from home to teacher page", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.navigateToTeacher();

    const teacherIndex = new TeacherIndexPage(page);
    await expect(teacherIndex.startSessionButton).toBeVisible();
    await expect(teacherIndex.classNameInput).toBeVisible();
  });

  test("can navigate from home to join page", async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.navigateToJoin();

    const joinPage = new JoinPage(page);
    await expect(joinPage.joinButton).toBeVisible();
    await expect(joinPage.codeInput).toBeVisible();
  });

  test("join page pre-fills code from URL param", async ({ page }) => {
    const joinPage = new JoinPage(page);
    await joinPage.goto("test-code-123");

    await expect(joinPage.codeInput).toHaveValue("test-code-123");
  });
});
