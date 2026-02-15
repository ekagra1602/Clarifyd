import { test as base, BrowserContext, Page } from "@playwright/test";
import { TeacherIndexPage } from "../pages/teacher-index.page";
import { TeacherSessionPage } from "../pages/teacher-session.page";
import { JoinPage } from "../pages/join.page";
import { StudentSessionPage } from "../pages/student-session.page";

/**
 * Extended test fixture that provides separate browser contexts
 * for teacher and student, along with pre-created session join code.
 */
interface SessionFixture {
  teacherContext: BrowserContext;
  studentContext: BrowserContext;
  teacherPage: Page;
  studentPage: Page;
  joinCode: string;
  sessionId: string;
}

export const test = base.extend<SessionFixture>({
  teacherContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);
    await context.close();
  },

  studentContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);
    await context.close();
  },

  teacherPage: async ({ teacherContext }, use) => {
    const page = await teacherContext.newPage();
    await use(page);
  },

  studentPage: async ({ studentContext }, use) => {
    const page = await studentContext.newPage();
    await use(page);
  },

  // Creates a session and provides the join code
  joinCode: async ({ teacherPage }, use) => {
    const teacherIndex = new TeacherIndexPage(teacherPage);
    await teacherIndex.goto();
    await teacherIndex.createSession("E2E Test Class");

    const teacherSession = new TeacherSessionPage(teacherPage);
    const code = await teacherSession.getJoinCode();

    await use(code);
  },

  // Extract session ID from URL after session creation
  sessionId: async ({ teacherPage, joinCode }, use) => {
    // joinCode fixture already navigated to the session page
    const url = teacherPage.url();
    const sessionId = url.split("/").pop() || "";
    await use(sessionId);
  },
});

export { expect } from "@playwright/test";

/**
 * Helper to create a full teacher-student session setup
 */
export async function setupTeacherStudentSession(
  teacherPage: Page,
  studentPage: Page
): Promise<{ joinCode: string; sessionId: string }> {
  // Teacher creates session
  const teacherIndex = new TeacherIndexPage(teacherPage);
  await teacherIndex.goto();
  const sessionId = await teacherIndex.createSession("E2E Test Class");

  // Get join code
  const teacherSession = new TeacherSessionPage(teacherPage);
  const joinCode = await teacherSession.getJoinCode();

  // Student joins
  const joinPage = new JoinPage(studentPage);
  await joinPage.goto();
  await joinPage.joinSession(joinCode);

  // Wait for student to be in session
  const studentSession = new StudentSessionPage(studentPage);
  await studentSession.waitForLive();

  return { joinCode, sessionId };
}
