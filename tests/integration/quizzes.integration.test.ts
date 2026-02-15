/**
 * Integration tests for quiz operations using convex-test
 */
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules, sampleQuizQuestions, singleQuestion } from "../testUtils";

describe("Quiz Integration Tests", () => {
  describe("launchQuiz", () => {
    it("should create quiz with provided questions", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      expect(quizId).toBeDefined();
    });

    it("should set activeQuizId on session", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion],
      });

      const session = await t.query(api.sessions.getSession, { sessionId });
      expect(session?.activeQuizId).toBe(quizId);
    });

    it("should throw error for empty questions array", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await expect(
        t.mutation(api.quizzes.launchQuiz, {
          sessionId,
          questions: [],
        })
      ).rejects.toThrow("Quiz must have at least one question");
    });

    it("should store createdAt timestamp", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const before = Date.now();

      await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion],
      });

      const after = Date.now();
      const quiz = await t.query(api.quizzes.getActiveQuiz, { sessionId });

      expect(quiz?.createdAt).toBeGreaterThanOrEqual(before);
      expect(quiz?.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe("submitQuiz", () => {
    it("should record quiz response for first submission", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      const result = await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-123",
        answers: [1, 2, 1], // Correct answers
      });

      expect(result).toEqual({ success: true });
    });

    it("should return already_submitted for duplicate submission", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion],
      });

      // First submission
      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-123",
        answers: [0],
      });

      // Second submission (duplicate)
      const result = await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-123",
        answers: [1], // Different answer
      });

      expect(result).toEqual({ success: false, reason: "already_submitted" });
    });

    it("should allow different students to submit", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion],
      });

      const result1 = await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-1",
        answers: [0],
      });

      const result2 = await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-2",
        answers: [1],
      });

      expect(result1).toEqual({ success: true });
      expect(result2).toEqual({ success: true });
    });

    it("should store answers array correctly", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-123",
        answers: [0, 1, 2],
      });

      // Verify via stats query
      const stats = await t.query(api.quizzes.getQuizStats, { quizId });
      expect(stats.totalResponses).toBe(1);
    });
  });

  describe("getActiveQuiz", () => {
    it("should return active quiz when one exists", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      const quiz = await t.query(api.quizzes.getActiveQuiz, { sessionId });

      expect(quiz).toBeDefined();
      expect(quiz?.questions).toHaveLength(3);
    });

    it("should return null when no active quiz", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const quiz = await t.query(api.quizzes.getActiveQuiz, { sessionId });

      expect(quiz).toBeNull();
    });

    it("should return null after quiz is closed", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion],
      });

      await t.mutation(api.quizzes.closeQuiz, { sessionId });

      const quiz = await t.query(api.quizzes.getActiveQuiz, { sessionId });
      expect(quiz).toBeNull();
    });
  });

  describe("getQuizStats", () => {
    it("should calculate totalResponses correctly", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion],
      });

      // Submit 3 responses
      for (let i = 0; i < 3; i++) {
        await t.mutation(api.quizzes.submitQuiz, {
          quizId,
          studentId: `student-${i}`,
          answers: [0],
        });
      }

      const stats = await t.query(api.quizzes.getQuizStats, { quizId });
      expect(stats.totalResponses).toBe(3);
    });

    it("should calculate perQuestionAccuracy for all correct answers", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion], // correctIndex is 0
      });

      // All students answer correctly
      for (let i = 0; i < 4; i++) {
        await t.mutation(api.quizzes.submitQuiz, {
          quizId,
          studentId: `student-${i}`,
          answers: [0],
        });
      }

      const stats = await t.query(api.quizzes.getQuizStats, { quizId });
      expect(stats.perQuestionAccuracy[0]).toBe(1.0);
    });

    it("should calculate perQuestionAccuracy for mixed answers", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion], // correctIndex is 0
      });

      // 2 correct, 2 incorrect = 50% accuracy
      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-1",
        answers: [0], // Correct
      });
      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-2",
        answers: [0], // Correct
      });
      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-3",
        answers: [1], // Incorrect
      });
      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-4",
        answers: [2], // Incorrect
      });

      const stats = await t.query(api.quizzes.getQuizStats, { quizId });
      expect(stats.perQuestionAccuracy[0]).toBe(0.5);
    });

    it("should calculate choiceDistributions correctly", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion], // 4 choices: A, B, C, D
      });

      // 2 choose A, 1 chooses B, 1 chooses C
      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-1",
        answers: [0],
      });
      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-2",
        answers: [0],
      });
      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-3",
        answers: [1],
      });
      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-4",
        answers: [2],
      });

      const stats = await t.query(api.quizzes.getQuizStats, { quizId });
      expect(stats.choiceDistributions[0]).toEqual([2, 1, 1, 0]);
    });

    it("should return empty stats for no responses", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion],
      });

      const stats = await t.query(api.quizzes.getQuizStats, { quizId });

      expect(stats.totalResponses).toBe(0);
      expect(stats.perQuestionAccuracy[0]).toBe(0);
      expect(stats.choiceDistributions[0]).toEqual([0, 0, 0, 0]);
    });
  });

  describe("closeQuiz", () => {
    it("should clear activeQuizId on session", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion],
      });

      // Verify quiz is active
      let session = await t.query(api.sessions.getSession, { sessionId });
      expect(session?.activeQuizId).toBeDefined();

      // Close quiz
      await t.mutation(api.quizzes.closeQuiz, { sessionId });

      // Verify activeQuizId is cleared
      session = await t.query(api.sessions.getSession, { sessionId });
      expect(session?.activeQuizId).toBeUndefined();
    });
  });

  describe("hasStudentSubmitted", () => {
    it("should return true after student submits", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion],
      });

      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-123",
        answers: [0],
      });

      const hasSubmitted = await t.query(api.quizzes.hasStudentSubmitted, {
        quizId,
        studentId: "student-123",
      });

      expect(hasSubmitted).toBe(true);
    });

    it("should return false before student submits", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion],
      });

      const hasSubmitted = await t.query(api.quizzes.hasStudentSubmitted, {
        quizId,
        studentId: "student-123",
      });

      expect(hasSubmitted).toBe(false);
    });

    it("should return false for different studentId", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const { quizId } = await t.mutation(api.quizzes.launchQuiz, {
        sessionId,
        questions: [singleQuestion],
      });

      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: "student-1",
        answers: [0],
      });

      const hasSubmitted = await t.query(api.quizzes.hasStudentSubmitted, {
        quizId,
        studentId: "student-2",
      });

      expect(hasSubmitted).toBe(false);
    });
  });
});
