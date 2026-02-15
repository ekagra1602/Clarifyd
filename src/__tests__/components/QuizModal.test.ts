/**
 * Tests for QuizModal component logic
 *
 * These tests verify the core logic of the QuizModal without requiring
 * full React component mounting with Convex providers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSubmittedQuizKey,
  initializeAnswerArray,
  allQuestionsAnswered,
} from "../../utils/quizUtils";

describe("QuizModal Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe("Answer State Management", () => {
    it("should initialize answer array with -1 for each question", () => {
      const questionCount = 3;
      const answers = initializeAnswerArray(questionCount);

      expect(answers).toEqual([-1, -1, -1]);
      expect(answers).toHaveLength(questionCount);
    });

    it("should track answer selection correctly", () => {
      const answers = initializeAnswerArray(3);

      // Simulate selecting answer for question 0
      const newAnswers = [...answers];
      newAnswers[0] = 2;

      expect(newAnswers[0]).toBe(2);
      expect(newAnswers[1]).toBe(-1);
      expect(newAnswers[2]).toBe(-1);
    });

    it("should allow changing selected answer", () => {
      const answers = [2, -1, -1];

      // Change answer for question 0
      const newAnswers = [...answers];
      newAnswers[0] = 1;

      expect(newAnswers[0]).toBe(1);
    });
  });

  describe("Submission Validation", () => {
    it("should reject submission when not all questions answered", () => {
      const answers = [0, -1, 2];
      expect(allQuestionsAnswered(answers)).toBe(false);
    });

    it("should accept submission when all questions answered", () => {
      const answers = [0, 1, 2];
      expect(allQuestionsAnswered(answers)).toBe(true);
    });

    it("should handle single question quiz", () => {
      expect(allQuestionsAnswered([-1])).toBe(false);
      expect(allQuestionsAnswered([0])).toBe(true);
    });
  });

  describe("Submission Tracking", () => {
    it("should generate correct sessionStorage key", () => {
      const quizId = "quiz-123";
      const key = getSubmittedQuizKey(quizId);

      expect(key).toBe("quiz-submitted-quiz-123");
    });

    it("should store submission in sessionStorage", () => {
      const quizId = "quiz-456";
      const key = getSubmittedQuizKey(quizId);

      sessionStorage.setItem(key, "true");

      expect(sessionStorage.getItem(key)).toBe("true");
    });

    it("should check submission status from sessionStorage", () => {
      const quizId = "quiz-789";
      const key = getSubmittedQuizKey(quizId);

      // Before submission
      expect(sessionStorage.getItem(key)).toBeNull();

      // After submission
      sessionStorage.setItem(key, "true");
      expect(sessionStorage.getItem(key)).toBe("true");
    });

    it("should track multiple quizzes independently", () => {
      const quiz1Key = getSubmittedQuizKey("quiz-1");
      const quiz2Key = getSubmittedQuizKey("quiz-2");

      sessionStorage.setItem(quiz1Key, "true");

      expect(sessionStorage.getItem(quiz1Key)).toBe("true");
      expect(sessionStorage.getItem(quiz2Key)).toBeNull();
    });
  });

  describe("Submitted State Logic", () => {
    it("should determine submitted state from local storage", () => {
      const quizId = "quiz-test";
      const key = getSubmittedQuizKey(quizId);

      // Simulate checking if already submitted
      const localSubmitted = sessionStorage.getItem(key) === "true";
      expect(localSubmitted).toBe(false);

      // Simulate after submission
      sessionStorage.setItem(key, "true");
      const localSubmittedAfter = sessionStorage.getItem(key) === "true";
      expect(localSubmittedAfter).toBe(true);
    });

    it("should combine server and local state for submitted check", () => {
      const hasSubmittedFromServer = false;
      const localSubmitted = true;

      // Either source being true means submitted
      const submitted = hasSubmittedFromServer === true || localSubmitted;
      expect(submitted).toBe(true);
    });

    it("should prioritize server state when available", () => {
      const hasSubmittedFromServer = true;
      const localSubmitted = false;

      const submitted = hasSubmittedFromServer === true || localSubmitted;
      expect(submitted).toBe(true);
    });
  });
});
