import { test, expect } from "@playwright/test";
import { TeacherIndexPage } from "../pages/teacher-index.page";
import { TeacherSessionPage } from "../pages/teacher-session.page";
import { JoinPage } from "../pages/join.page";
import { StudentSessionPage } from "../pages/student-session.page";

test.describe("Lost Signal Feature", () => {
  test("student marks as lost, teacher sees confusion meter update", async ({
    browser,
  }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();

    const teacherPage = await teacherContext.newPage();
    const studentPage = await studentContext.newPage();

    try {
      // Setup session
      const teacherIndex = new TeacherIndexPage(teacherPage);
      await teacherIndex.goto();
      await teacherIndex.createSession("Lost Signal Test");

      const teacherSession = new TeacherSessionPage(teacherPage);
      const joinCode = await teacherSession.getJoinCode();

      // Student joins
      const joinPage = new JoinPage(studentPage);
      await joinPage.goto();
      await joinPage.joinSession(joinCode);

      const studentSession = new StudentSessionPage(studentPage);
      await studentSession.waitForLive();

      // Verify initial state - 0 confused
      await teacherSession.waitForConfusedCount(0);

      // Student marks as lost
      await studentSession.markAsLost();

      // Verify button state changed
      expect(await studentSession.isLostButtonActive()).toBe(true);

      // Teacher sees confusion meter update to 1
      await teacherSession.waitForConfusedCount(1);

      // Student unmarks as lost
      await studentSession.markAsNotLost();

      // Verify button state changed back
      expect(await studentSession.isLostButtonActive()).toBe(false);

      // Teacher sees count decrease back to 0 (may take time for real-time sync)
      await teacherSession.waitForConfusedCount(0);
    } finally {
      await teacherContext.close();
      await studentContext.close();
    }
  });

  test("lost signal opens chat sidebar automatically", async ({ browser }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();

    const teacherPage = await teacherContext.newPage();
    const studentPage = await studentContext.newPage();

    try {
      // Setup
      const teacherIndex = new TeacherIndexPage(teacherPage);
      await teacherIndex.goto();
      await teacherIndex.createSession("Lost Chat Test");

      const teacherSession = new TeacherSessionPage(teacherPage);
      const joinCode = await teacherSession.getJoinCode();

      const joinPage = new JoinPage(studentPage);
      await joinPage.goto();
      await joinPage.joinSession(joinCode);

      const studentSession = new StudentSessionPage(studentPage);
      await studentSession.waitForLive();

      // Mark as lost
      await studentSession.markAsLost();

      // Chat should open automatically
      await expect(studentSession.chatInput).toBeVisible({ timeout: 10000 });

      // Auto-posted question should appear in chat
      // The system auto-posts "I'm feeling lost. Can you help me catch up?"
      await expect(
        studentPage.getByText(/help me catch up|feeling lost/i)
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await teacherContext.close();
      await studentContext.close();
    }
  });
});
