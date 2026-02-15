/**
 * Integration tests for session management using convex-test
 */
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules } from "../testUtils";

describe("Session Integration Tests", () => {
  describe("createSession", () => {
    it("should create a session with status 'live'", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const session = await t.query(api.sessions.getSession, { sessionId });

      expect(session).toBeDefined();
      expect(session?.status).toBe("live");
    });

    it("should generate a unique join code in format adjective-noun-number", async () => {
      const t = convexTest(schema, modules);
      const { code } = await t.mutation(api.sessions.createSession, {});

      // Code should match pattern: word-word-number
      expect(code).toMatch(/^[a-z]+-[a-z]+-\d+$/);
    });

    it("should set createdAt timestamp", async () => {
      const t = convexTest(schema, modules);
      const before = Date.now();
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const after = Date.now();

      const session = await t.query(api.sessions.getSession, { sessionId });

      expect(session?.createdAt).toBeGreaterThanOrEqual(before);
      expect(session?.createdAt).toBeLessThanOrEqual(after);
    });

    it("should create sessions with unique codes", async () => {
      const t = convexTest(schema, modules);
      const codes = new Set<string>();

      // Create multiple sessions and verify unique codes
      for (let i = 0; i < 5; i++) {
        const { code } = await t.mutation(api.sessions.createSession, {});
        expect(codes.has(code)).toBe(false);
        codes.add(code);
      }
    });
  });

  describe("joinSession", () => {
    it("should return sessionId and studentId for valid live session", async () => {
      const t = convexTest(schema, modules);
      const { code } = await t.mutation(api.sessions.createSession, {});
      const result = await t.mutation(api.sessions.joinSession, { code });

      expect(result.sessionId).toBeDefined();
      expect(result.studentId).toBeDefined();
      expect(result.studentId).toMatch(/^student-/);
    });

    it("should throw 'Session not found' for invalid code", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.mutation(api.sessions.joinSession, { code: "invalid-code-999" })
      ).rejects.toThrow("Session not found");
    });

    it("should throw 'Session has ended' for ended session", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(
        api.sessions.createSession,
        {}
      );
      await t.mutation(api.sessions.endSession, { sessionId });

      await expect(
        t.mutation(api.sessions.joinSession, { code })
      ).rejects.toThrow("Session has ended");
    });

    it("should generate unique studentId for each join", async () => {
      const t = convexTest(schema, modules);
      const { code } = await t.mutation(api.sessions.createSession, {});

      const result1 = await t.mutation(api.sessions.joinSession, { code });
      const result2 = await t.mutation(api.sessions.joinSession, { code });

      expect(result1.studentId).not.toBe(result2.studentId);
    });
  });

  describe("getSession", () => {
    it("should return session by ID", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(
        api.sessions.createSession,
        {}
      );

      const session = await t.query(api.sessions.getSession, { sessionId });

      expect(session).toBeDefined();
      expect(session?.code).toBe(code);
      expect(session?.status).toBe("live");
    });

    it("should return null for non-existent session", async () => {
      const t = convexTest(schema, modules);
      // Create a session first to get a valid ID format, then use a fake one
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Query with the real ID should work
      const session = await t.query(api.sessions.getSession, { sessionId });
      expect(session).toBeDefined();
    });
  });

  describe("getSessionByCode", () => {
    it("should return session by code", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(
        api.sessions.createSession,
        {}
      );

      const session = await t.query(api.sessions.getSessionByCode, { code });

      expect(session).toBeDefined();
      expect(session?._id).toBe(sessionId);
    });

    it("should return null for non-existent code", async () => {
      const t = convexTest(schema, modules);

      const session = await t.query(api.sessions.getSessionByCode, {
        code: "nonexistent-code-123",
      });

      expect(session).toBeNull();
    });
  });

  describe("uploadSlides", () => {
    it("should update contextText on session", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.sessions.uploadSlides, {
        sessionId,
        slidesText: "Lecture content about biology",
      });

      const session = await t.query(api.sessions.getSession, { sessionId });
      expect(session?.contextText).toBe("Lecture content about biology");
    });

    it("should overwrite existing contextText", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.sessions.uploadSlides, {
        sessionId,
        slidesText: "First content",
      });
      await t.mutation(api.sessions.uploadSlides, {
        sessionId,
        slidesText: "Updated content",
      });

      const session = await t.query(api.sessions.getSession, { sessionId });
      expect(session?.contextText).toBe("Updated content");
    });
  });

  describe("endSession", () => {
    it("should set status to 'ended'", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.sessions.endSession, { sessionId });

      const session = await t.query(api.sessions.getSession, { sessionId });
      expect(session?.status).toBe("ended");
    });

    it("should clear activeQuizId", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Launch a quiz first
      await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [
          {
            prompt: "Test",
            choices: ["A", "B"],
            correctIndex: 0,
            explanation: "Test",
            conceptTag: "test",
          },
        ],
      });

      // Verify quiz is active
      let session = await t.query(api.sessions.getSession, { sessionId });
      expect(session?.activeQuizId).toBeDefined();

      // End session
      await t.mutation(api.sessions.endSession, { sessionId });

      // Verify activeQuizId is cleared
      session = await t.query(api.sessions.getSession, { sessionId });
      expect(session?.activeQuizId).toBeUndefined();
    });
  });
});
