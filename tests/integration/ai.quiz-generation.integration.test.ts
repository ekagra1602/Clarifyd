/**
 * Integration tests for AI Quiz Generation feature
 *
 * Tests the flow of generating quizzes using AI when teachers request them.
 * Note: Actual Gemini API calls cannot be tested without API keys;
 * these tests focus on the scheduling and integration flow.
 */
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules, sampleQuizQuestions } from "../testUtils";

describe("AI Quiz Generation Integration Tests", () => {
  describe("generateAndLaunchQuiz mutation", () => {
    it("should return scheduled: true immediately", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const result = await t.mutation(api.quizzes.generateAndLaunchQuiz, {
        sessionId,
      });

      expect(result).toEqual({ scheduled: true });
    });

    it("should accept optional questionCount parameter", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const result = await t.mutation(api.quizzes.generateAndLaunchQuiz, {
        sessionId,
        questionCount: 5,
      });

      expect(result).toEqual({ scheduled: true });
    });

    it("should accept optional difficulty parameter", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const result = await t.mutation(api.quizzes.generateAndLaunchQuiz, {
        sessionId,
        difficulty: "hard",
      });

      expect(result).toEqual({ scheduled: true });
    });

    it("should accept all optional parameters", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const result = await t.mutation(api.quizzes.generateAndLaunchQuiz, {
        sessionId,
        questionCount: 10,
        difficulty: "easy",
      });

      expect(result).toEqual({ scheduled: true });
    });
  });

  describe("launchQuizInternal mutation", () => {
    it("should create quiz with provided questions", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const { quizId } = await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      expect(quizId).toBeDefined();
    });

    it("should set activeQuizId on session", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const { quizId } = await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      const session = await t.query(api.sessions.getSession, { sessionId });
      expect(session?.activeQuizId).toBe(quizId);
    });

    it("should throw error for empty questions array", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await expect(
        t.mutation(internal.quizzes.launchQuizInternal, {
          sessionId,
          questions: [],
        })
      ).rejects.toThrow("Quiz must have at least one question");
    });

    it("should store questions with all required fields", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      const quiz = await t.query(api.quizzes.getActiveQuiz, { sessionId });

      expect(quiz?.questions).toHaveLength(3);
      quiz?.questions.forEach((q) => {
        expect(q.prompt).toBeDefined();
        expect(q.choices).toBeDefined();
        expect(Array.isArray(q.choices)).toBe(true);
        expect(typeof q.correctIndex).toBe("number");
        expect(q.explanation).toBeDefined();
        expect(q.conceptTag).toBeDefined();
      });
    });
  });

  describe("Integration with existing quiz system", () => {
    it("should work with getActiveQuiz query", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Simulate what generateQuiz action would do
      await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      const quiz = await t.query(api.quizzes.getActiveQuiz, { sessionId });

      expect(quiz).toBeDefined();
      expect(quiz?.questions).toHaveLength(3);
    });

    it("should allow students to submit answers to generated quiz", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      // Simulate generated quiz
      const { quizId } = await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      const result = await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId,
        answers: [1, 2, 1], // Correct answers based on sampleQuizQuestions
      });

      expect(result).toEqual({ success: true });
    });

    it("should calculate stats correctly for generated quiz", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});

      // Join multiple students
      const student1 = await t.mutation(api.sessions.joinSession, { code });
      const student2 = await t.mutation(api.sessions.joinSession, { code });
      const student3 = await t.mutation(api.sessions.joinSession, { code });

      // Simulate generated quiz
      const { quizId } = await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      // Students submit answers
      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: student1.studentId,
        answers: [1, 2, 1], // All correct
      });
      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: student2.studentId,
        answers: [0, 2, 1], // First wrong, others correct
      });
      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId: student3.studentId,
        answers: [1, 0, 0], // First correct, others wrong
      });

      const stats = await t.query(api.quizzes.getQuizStats, { quizId });

      expect(stats.totalResponses).toBe(3);
      // Question 1: 2 correct (1,1) / 3 total = 0.666...
      expect(stats.perQuestionAccuracy[0]).toBeCloseTo(2 / 3, 5);
      // Question 2: 2 correct (2,2) / 3 total = 0.666...
      expect(stats.perQuestionAccuracy[1]).toBeCloseTo(2 / 3, 5);
      // Question 3: 2 correct (1,1) / 3 total = 0.666...
      expect(stats.perQuestionAccuracy[2]).toBeCloseTo(2 / 3, 5);
    });

    it("should work with closeQuiz mutation", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Simulate generated quiz
      await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      // Verify quiz is active
      let quiz = await t.query(api.quizzes.getActiveQuiz, { sessionId });
      expect(quiz).toBeDefined();

      // Close quiz
      await t.mutation(api.quizzes.closeQuiz, { sessionId });

      // Verify quiz is closed
      quiz = await t.query(api.quizzes.getActiveQuiz, { sessionId });
      expect(quiz).toBeNull();
    });

    it("should work with hasStudentSubmitted query", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      // Simulate generated quiz
      const { quizId } = await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      // Before submission
      let hasSubmitted = await t.query(api.quizzes.hasStudentSubmitted, {
        quizId,
        studentId,
      });
      expect(hasSubmitted).toBe(false);

      // Submit answers
      await t.mutation(api.quizzes.submitQuiz, {
        quizId,
        studentId,
        answers: [1, 2, 1],
      });

      // After submission
      hasSubmitted = await t.query(api.quizzes.hasStudentSubmitted, {
        quizId,
        studentId,
      });
      expect(hasSubmitted).toBe(true);
    });
  });

  describe("Quiz question structure validation", () => {
    it("should store conceptTag for each question", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      const quiz = await t.query(api.quizzes.getActiveQuiz, { sessionId });

      expect(quiz?.questions[0].conceptTag).toBe("arithmetic");
      expect(quiz?.questions[1].conceptTag).toBe("science");
      expect(quiz?.questions[2].conceptTag).toBe("astronomy");
    });

    it("should store explanation for each question", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: sampleQuizQuestions,
      });

      const quiz = await t.query(api.quizzes.getActiveQuiz, { sessionId });

      quiz?.questions.forEach((q) => {
        expect(q.explanation.length).toBeGreaterThan(0);
      });
    });

    it("should handle AI-like generated questions with varying choice counts", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const aiGeneratedQuestions = [
        {
          prompt: "What is the powerhouse of the cell?",
          choices: ["Nucleus", "Mitochondria", "Ribosome"],
          correctIndex: 1,
          explanation: "Mitochondria produces ATP for cellular energy.",
          conceptTag: "Cell Biology",
        },
        {
          prompt: "Which planet is closest to the sun?",
          choices: ["Venus", "Mercury", "Earth", "Mars", "Jupiter"],
          correctIndex: 1,
          explanation: "Mercury orbits closest to the sun at about 58 million km.",
          conceptTag: "Astronomy",
        },
      ];

      await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: aiGeneratedQuestions,
      });

      const quiz = await t.query(api.quizzes.getActiveQuiz, { sessionId });

      expect(quiz?.questions[0].choices).toHaveLength(3);
      expect(quiz?.questions[1].choices).toHaveLength(5);
    });
  });

  describe("Multiple quiz generation", () => {
    it("should replace previous active quiz when new one is generated", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // First quiz
      const { quizId: firstQuizId } = await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: [sampleQuizQuestions[0]],
      });

      let session = await t.query(api.sessions.getSession, { sessionId });
      expect(session?.activeQuizId).toBe(firstQuizId);

      // Second quiz (simulating new generation)
      const { quizId: secondQuizId } = await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: [sampleQuizQuestions[1]],
      });

      session = await t.query(api.sessions.getSession, { sessionId });
      expect(session?.activeQuizId).toBe(secondQuizId);
      expect(session?.activeQuizId).not.toBe(firstQuizId);
    });

    it("should keep previous quiz data even after new quiz is active", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      // First quiz with submission
      const { quizId: firstQuizId } = await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: [sampleQuizQuestions[0]],
      });

      await t.mutation(api.quizzes.submitQuiz, {
        quizId: firstQuizId,
        studentId,
        answers: [1],
      });

      // Second quiz
      await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: [sampleQuizQuestions[1]],
      });

      // First quiz stats should still be accessible
      const firstQuizStats = await t.query(api.quizzes.getQuizStats, { quizId: firstQuizId });
      expect(firstQuizStats.totalResponses).toBe(1);
    });
  });

  describe("getLastQuizForSession", () => {
    it("should return null when no quizzes exist", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const lastQuiz = await t.query(internal.quizzes.getLastQuizForSession, {
        sessionId,
      });

      expect(lastQuiz).toBeNull();
    });

    it("should return the most recent quiz for a session", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Create first quiz
      await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: [sampleQuizQuestions[0]],
      });

      // Create second quiz (should be returned as most recent)
      const { quizId: secondQuizId } = await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: [sampleQuizQuestions[1]],
      });

      const lastQuiz = await t.query(internal.quizzes.getLastQuizForSession, {
        sessionId,
      });

      expect(lastQuiz).toBeDefined();
      expect(lastQuiz?._id).toBe(secondQuizId);
    });

    it("should return quiz with createdAt timestamp for context filtering", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const beforeCreate = Date.now();

      await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId,
        questions: [sampleQuizQuestions[0]],
      });

      const afterCreate = Date.now();

      const lastQuiz = await t.query(internal.quizzes.getLastQuizForSession, {
        sessionId,
      });

      expect(lastQuiz).toBeDefined();
      expect(lastQuiz?.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(lastQuiz?.createdAt).toBeLessThanOrEqual(afterCreate);
    });

    it("should not return quizzes from other sessions", async () => {
      const t = convexTest(schema, modules);
      const { sessionId: session1 } = await t.mutation(api.sessions.createSession, {});
      const { sessionId: session2 } = await t.mutation(api.sessions.createSession, {});

      // Create quiz only in session 1
      await t.mutation(internal.quizzes.launchQuizInternal, {
        sessionId: session1,
        questions: [sampleQuizQuestions[0]],
      });

      // Query session 2 should return null
      const lastQuizSession2 = await t.query(internal.quizzes.getLastQuizForSession, {
        sessionId: session2,
      });

      expect(lastQuizSession2).toBeNull();
    });
  });
});
