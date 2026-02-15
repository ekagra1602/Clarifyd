import { test, expect } from "@playwright/test";
import { TeacherIndexPage } from "../pages/teacher-index.page";
import { TeacherSessionPage } from "../pages/teacher-session.page";
import { JoinPage } from "../pages/join.page";
import { StudentSessionPage } from "../pages/student-session.page";

// Note: Quiz tests require GEMINI_API_KEY to be configured in Convex backend
// Quiz generation happens server-side and cannot be mocked from browser
test.describe("Quiz Flow", () => {
  test("full quiz lifecycle: launch, answer, close", async ({ browser }) => {
    // Skip on mobile to reduce CI time
    test.skip(
      browser.browserType().name() !== "chromium",
      "Skip quiz lifecycle test on mobile"
    );

    const teacherContext = await browser.newContext();
    const studentContext = await browser.newContext();

    const teacherPage = await teacherContext.newPage();
    const studentPage = await studentContext.newPage();

    try {
      // Teacher creates session
      const teacherIndex = new TeacherIndexPage(teacherPage);
      await teacherIndex.goto();
      await teacherIndex.createSession("Quiz Test Class");

      const teacherSession = new TeacherSessionPage(teacherPage);
      const joinCode = await teacherSession.getJoinCode();

      // Student joins
      const joinPage = new JoinPage(studentPage);
      await joinPage.goto();
      await joinPage.joinSession(joinCode);

      const studentSession = new StudentSessionPage(studentPage);
      await studentSession.waitForLive();

      // Teacher launches quiz (requires Gemini API key)
      await teacherSession.launchQuiz();

      // Student sees quiz modal
      await studentSession.waitForQuiz();

      // Student answers quiz (select first choice for each question)
      await studentSession.answerQuiz([0, 0, 0]);

      // Quiz success message shown to student
      await expect(studentSession.quizSuccessMessage).toBeVisible();

      // Teacher closes quiz
      await teacherSession.closeQuiz();

      // Launch quiz button should be visible again
      await expect(teacherSession.launchQuizButton).toBeVisible();
    } finally {
      await teacherContext.close();
      await studentContext.close();
    }
  });

  test("quiz shows READY indicator initially", async ({ page }) => {
    // Teacher creates session
    const teacherIndex = new TeacherIndexPage(page);
    await teacherIndex.goto();
    await teacherIndex.createSession("Quiz Indicator Test");

    const teacherSession = new TeacherSessionPage(page);

    // Initially shows READY
    await expect(teacherSession.quizReadyIndicator).toBeVisible();

    // Launch quiz button should be available
    await expect(teacherSession.launchQuizButton).toBeVisible();
  });
});
