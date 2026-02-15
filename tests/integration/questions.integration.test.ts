/**
 * Integration tests for questions (Q&A) using convex-test
 *
 * Note: askQuestion schedules an async AI answer generation action.
 * We call finishInProgressScheduledFunctions() to wait for scheduled
 * functions to complete and avoid "write outside transaction" errors.
 */
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules } from "../testUtils";

describe("Questions Integration Tests", () => {
  describe("askQuestion", () => {
    it("should create question without answer", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const { questionId } = await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId: "student-123",
        question: "What is photosynthesis?",
      });

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      const question = await t.query(api.questions.getQuestion, { questionId });

      expect(question).toBeDefined();
      expect(question?.question).toBe("What is photosynthesis?");
      // Answer may be set by the scheduled function (AI generates an error message if API key missing)
    });

    it("should return questionId", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const { questionId } = await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId: "student-123",
        question: "Test question?",
      });

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      expect(questionId).toBeDefined();
    });

    it("should set createdAt timestamp", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const before = Date.now();

      const { questionId } = await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId: "student-123",
        question: "Test question?",
      });

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      const after = Date.now();
      const question = await t.query(api.questions.getQuestion, { questionId });

      expect(question?.createdAt).toBeGreaterThanOrEqual(before);
      expect(question?.createdAt).toBeLessThanOrEqual(after);
    });

    it("should associate question with sessionId", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const { questionId } = await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId: "student-123",
        question: "Test question?",
      });

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      const question = await t.query(api.questions.getQuestion, { questionId });
      expect(question?.sessionId).toBe(sessionId);
    });

    it("should store studentId", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const { questionId } = await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId: "student-abc",
        question: "Test question?",
      });

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      const question = await t.query(api.questions.getQuestion, { questionId });
      expect(question?.studentId).toBe("student-abc");
    });
  });

  describe("saveAnswer", () => {
    it("should update question with AI answer", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const { questionId } = await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId: "student-123",
        question: "What is photosynthesis?",
      });

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      await t.mutation(api.questions.saveAnswer, {
        questionId,
        answer:
          "Photosynthesis is the process by which plants convert sunlight into energy.",
      });

      const question = await t.query(api.questions.getQuestion, { questionId });
      expect(question?.answer).toBe(
        "Photosynthesis is the process by which plants convert sunlight into energy."
      );
    });

    it("should overwrite existing answer", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const { questionId } = await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId: "student-123",
        question: "What is 2+2?",
      });

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      await t.mutation(api.questions.saveAnswer, {
        questionId,
        answer: "First answer",
      });

      await t.mutation(api.questions.saveAnswer, {
        questionId,
        answer: "Updated answer",
      });

      const question = await t.query(api.questions.getQuestion, { questionId });
      expect(question?.answer).toBe("Updated answer");
    });
  });

  describe("listRecentQuestions", () => {
    it("should return empty array for session with no questions", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const questions = await t.query(api.questions.listRecentQuestions, {
        sessionId,
      });

      expect(questions).toEqual([]);
    });

    it("should return questions in chronological order (oldest first)", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId: "student-1",
        question: "First question?",
      });
      await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId: "student-2",
        question: "Second question?",
      });
      await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId: "student-3",
        question: "Third question?",
      });

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      const questions = await t.query(api.questions.listRecentQuestions, {
        sessionId,
      });

      expect(questions[0].question).toBe("First question?");
      expect(questions[1].question).toBe("Second question?");
      expect(questions[2].question).toBe("Third question?");
    });

    it("should default to limit of 20", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Add 25 questions
      for (let i = 0; i < 25; i++) {
        await t.mutation(api.questions.askQuestion, {
          sessionId,
          studentId: `student-${i}`,
          question: `Question ${i}?`,
        });
      }

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      const questions = await t.query(api.questions.listRecentQuestions, {
        sessionId,
      });

      expect(questions).toHaveLength(20);
    });

    it("should respect custom limit parameter", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      for (let i = 0; i < 10; i++) {
        await t.mutation(api.questions.askQuestion, {
          sessionId,
          studentId: `student-${i}`,
          question: `Question ${i}?`,
        });
      }

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      const questions = await t.query(api.questions.listRecentQuestions, {
        sessionId,
        limit: 5,
      });

      expect(questions).toHaveLength(5);
    });

    it("should return most recent N questions when limit exceeded", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      for (let i = 0; i < 10; i++) {
        await t.mutation(api.questions.askQuestion, {
          sessionId,
          studentId: `student-${i}`,
          question: `Question ${i}?`,
        });
      }

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      const questions = await t.query(api.questions.listRecentQuestions, {
        sessionId,
        limit: 3,
      });

      // Should get questions 7, 8, 9 in chronological order
      expect(questions[0].question).toBe("Question 7?");
      expect(questions[1].question).toBe("Question 8?");
      expect(questions[2].question).toBe("Question 9?");
    });

    it("should include answer field when present", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const { questionId } = await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId: "student-123",
        question: "Test question?",
      });

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      await t.mutation(api.questions.saveAnswer, {
        questionId,
        answer: "Test answer",
      });

      const questions = await t.query(api.questions.listRecentQuestions, {
        sessionId,
      });

      expect(questions[0].answer).toBe("Test answer");
    });

    it("should isolate questions by session", async () => {
      const t = convexTest(schema, modules);
      const { sessionId: session1 } = await t.mutation(
        api.sessions.createSession,
        {}
      );
      const { sessionId: session2 } = await t.mutation(
        api.sessions.createSession,
        {}
      );

      await t.mutation(api.questions.askQuestion, {
        sessionId: session1,
        studentId: "student-1",
        question: "Session 1 question?",
      });
      await t.mutation(api.questions.askQuestion, {
        sessionId: session2,
        studentId: "student-2",
        question: "Session 2 question?",
      });

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      const questions1 = await t.query(api.questions.listRecentQuestions, {
        sessionId: session1,
      });
      const questions2 = await t.query(api.questions.listRecentQuestions, {
        sessionId: session2,
      });

      expect(questions1).toHaveLength(1);
      expect(questions1[0].question).toBe("Session 1 question?");
      expect(questions2).toHaveLength(1);
      expect(questions2[0].question).toBe("Session 2 question?");
    });
  });

  describe("getQuestion", () => {
    it("should return question by ID", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const { questionId } = await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId: "student-123",
        question: "Test question?",
      });

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      const question = await t.query(api.questions.getQuestion, { questionId });

      expect(question).toBeDefined();
      expect(question?._id).toBe(questionId);
      expect(question?.question).toBe("Test question?");
    });

    it("should return all question fields", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const { questionId } = await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId: "student-abc",
        question: "What is AI?",
      });

      // Wait for scheduled AI answer generation to complete
      await t.finishInProgressScheduledFunctions();

      await t.mutation(api.questions.saveAnswer, {
        questionId,
        answer: "AI is artificial intelligence.",
      });

      const question = await t.query(api.questions.getQuestion, { questionId });

      expect(question?.sessionId).toBe(sessionId);
      expect(question?.studentId).toBe("student-abc");
      expect(question?.question).toBe("What is AI?");
      expect(question?.answer).toBe("AI is artificial intelligence.");
      expect(question?.createdAt).toBeDefined();
    });
  });
});
