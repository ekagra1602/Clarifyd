import { test, expect } from "@playwright/test";
import { TeacherIndexPage } from "../pages/teacher-index.page";
import { TeacherSessionPage } from "../pages/teacher-session.page";
import { JoinPage } from "../pages/join.page";
import { StudentSessionPage } from "../pages/student-session.page";

test.describe("Session Flow", () => {
  test("teacher creates session and gets join code", async ({ page }) => {
    const teacherIndex = new TeacherIndexPage(page);
    await teacherIndex.goto();

    const sessionId = await teacherIndex.createSession("Test Class");
    expect(sessionId).toBeTruthy();

    const teacherSession = new TeacherSessionPage(page);
    await expect(teacherSession.liveIndicator).toBeVisible();

    const joinCode = await teacherSession.getJoinCode();
    // Join codes follow pattern: adjective-noun-number
    expect(joinCode).toMatch(/^[a-z]+-[a-z]+-\d+$/);
  });

  test("student joins session with valid code", async ({ browser }) => {
    // Create two browser contexts: teacher and student
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();

    const teacherPage = await teacherContext.newPage();
    const studentPage = await studentContext.newPage();

    try {
      // Teacher creates session
      const teacherIndex = new TeacherIndexPage(teacherPage);
      await teacherIndex.goto();
      await teacherIndex.createSession("Test Class");

      const teacherSession = new TeacherSessionPage(teacherPage);
      const joinCode = await teacherSession.getJoinCode();

      // Student joins
      const joinPage = new JoinPage(studentPage);
      await joinPage.goto();
      await joinPage.joinSession(joinCode);

      // Verify student is in session
      const studentSession = new StudentSessionPage(studentPage);
      await expect(studentSession.liveIndicator).toBeVisible();

      // Verify teacher sees student count update
      await teacherSession.waitForStudentCount(1);
    } finally {
      await teacherContext.close();
      await studentContext.close();
    }
  });

  test("student cannot join with invalid code", async ({ page }) => {
    const joinPage = new JoinPage(page);
    await joinPage.goto();

    await joinPage.codeInput.fill("invalid-code-999");
    await joinPage.joinButton.click();

    // Should show error message
    await joinPage.expectError();
  });

  test("student sees session ended message when teacher ends session", async ({
    browser,
  }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();

    const teacherPage = await teacherContext.newPage();
    const studentPage = await studentContext.newPage();

    try {
      // Teacher creates session
      const teacherIndex = new TeacherIndexPage(teacherPage);
      await teacherIndex.goto();
      await teacherIndex.createSession("Test Class");

      const teacherSession = new TeacherSessionPage(teacherPage);
      const joinCode = await teacherSession.getJoinCode();

      // Student joins
      const joinPage = new JoinPage(studentPage);
      await joinPage.goto();
      await joinPage.joinSession(joinCode);

      const studentSession = new StudentSessionPage(studentPage);
      await studentSession.waitForLive();

      // Teacher ends session
      await teacherSession.endSession();

      // Student sees session ended message
      await expect(studentSession.sessionEndedMessage).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await teacherContext.close();
      await studentContext.close();
    }
  });
});
