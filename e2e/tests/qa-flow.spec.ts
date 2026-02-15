import { test, expect } from "@playwright/test";
import { TeacherIndexPage } from "../pages/teacher-index.page";
import { TeacherSessionPage } from "../pages/teacher-session.page";
import { JoinPage } from "../pages/join.page";
import { StudentSessionPage } from "../pages/student-session.page";

test.describe("Q&A Feature", () => {
  test("student can open and close chat sidebar", async ({ browser }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();

    const teacherPage = await teacherContext.newPage();
    const studentPage = await studentContext.newPage();

    try {
      // Setup session
      const teacherIndex = new TeacherIndexPage(teacherPage);
      await teacherIndex.goto();
      await teacherIndex.createSession("Chat Test");

      const teacherSession = new TeacherSessionPage(teacherPage);
      const joinCode = await teacherSession.getJoinCode();

      // Student joins
      const joinPage = new JoinPage(studentPage);
      await joinPage.goto();
      await joinPage.joinSession(joinCode);

      const studentSession = new StudentSessionPage(studentPage);
      await studentSession.waitForLive();

      // Open chat
      await studentSession.openChat();
      await expect(studentSession.chatInput).toBeVisible();

      // Close chat
      await studentSession.closeChat();
      await expect(studentSession.chatInput).not.toBeVisible();
    } finally {
      await teacherContext.close();
      await studentContext.close();
    }
  });

  test("student can submit a question", async ({ browser }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();

    const teacherPage = await teacherContext.newPage();
    const studentPage = await studentContext.newPage();

    try {
      // Setup session
      const teacherIndex = new TeacherIndexPage(teacherPage);
      await teacherIndex.goto();
      await teacherIndex.createSession("Q&A Test");

      const teacherSession = new TeacherSessionPage(teacherPage);
      const joinCode = await teacherSession.getJoinCode();

      // Student joins and asks question
      const joinPage = new JoinPage(studentPage);
      await joinPage.goto();
      await joinPage.joinSession(joinCode);

      const studentSession = new StudentSessionPage(studentPage);
      await studentSession.waitForLive();

      const testQuestion = "What is the meaning of this concept?";
      await studentSession.askQuestion(testQuestion);

      // Question should appear in chat
      // Note: AI answer depends on Gemini API key being configured
      await expect(studentPage.getByText(testQuestion)).toBeVisible({
        timeout: 10000,
      });
    } finally {
      await teacherContext.close();
      await studentContext.close();
    }
  });

  test("chat shows placeholder when empty", async ({ browser }) => {
    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();

    const teacherPage = await teacherContext.newPage();
    const studentPage = await studentContext.newPage();

    try {
      // Setup session
      const teacherIndex = new TeacherIndexPage(teacherPage);
      await teacherIndex.goto();
      await teacherIndex.createSession("Empty Chat Test");

      const teacherSession = new TeacherSessionPage(teacherPage);
      const joinCode = await teacherSession.getJoinCode();

      // Student joins
      const joinPage = new JoinPage(studentPage);
      await joinPage.goto();
      await joinPage.joinSession(joinCode);

      const studentSession = new StudentSessionPage(studentPage);
      await studentSession.waitForLive();

      // Open chat
      await studentSession.openChat();

      // Should show placeholder text
      await expect(
        studentPage.getByText(/ask anything about the lecture/i)
      ).toBeVisible();
    } finally {
      await teacherContext.close();
      await studentContext.close();
    }
  });
});
