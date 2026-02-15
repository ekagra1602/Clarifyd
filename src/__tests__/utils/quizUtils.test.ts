/**
 * Tests for quiz utility functions
 */
import { describe, it, expect } from "vitest";
import {
  getSubmittedQuizKey,
  initializeAnswerArray,
  allQuestionsAnswered,
  isAnswerSelected,
  choiceIndexToLetter,
} from "../../utils/quizUtils";

describe("quizUtils", () => {
  describe("getSubmittedQuizKey", () => {
    it("should return correct sessionStorage key format", () => {
      expect(getSubmittedQuizKey("quiz-123")).toBe("quiz-submitted-quiz-123");
    });

    it("should handle various quizId formats", () => {
      expect(getSubmittedQuizKey("abc")).toBe("quiz-submitted-abc");
      expect(getSubmittedQuizKey("123-456-789")).toBe(
        "quiz-submitted-123-456-789"
      );
      expect(getSubmittedQuizKey("")).toBe("quiz-submitted-");
    });

    it("should handle special characters in quizId", () => {
      expect(getSubmittedQuizKey("quiz_with_underscore")).toBe(
        "quiz-submitted-quiz_with_underscore"
      );
    });
  });

  describe("initializeAnswerArray", () => {
    it("should return array of -1 values", () => {
      const answers = initializeAnswerArray(3);
      expect(answers).toEqual([-1, -1, -1]);
    });

    it("should match question count length", () => {
      expect(initializeAnswerArray(0)).toHaveLength(0);
      expect(initializeAnswerArray(1)).toHaveLength(1);
      expect(initializeAnswerArray(5)).toHaveLength(5);
      expect(initializeAnswerArray(10)).toHaveLength(10);
    });

    it("should return all -1 values", () => {
      const answers = initializeAnswerArray(5);
      expect(answers.every((a) => a === -1)).toBe(true);
    });

    it("should return a new array each time", () => {
      const arr1 = initializeAnswerArray(3);
      const arr2 = initializeAnswerArray(3);
      expect(arr1).not.toBe(arr2);
    });
  });

  describe("allQuestionsAnswered", () => {
    it("should return false if any answer is -1", () => {
      expect(allQuestionsAnswered([-1, 0, 1])).toBe(false);
      expect(allQuestionsAnswered([0, -1, 1])).toBe(false);
      expect(allQuestionsAnswered([0, 1, -1])).toBe(false);
      expect(allQuestionsAnswered([-1, -1, -1])).toBe(false);
    });

    it("should return true if all answers are >= 0", () => {
      expect(allQuestionsAnswered([0, 1, 2])).toBe(true);
      expect(allQuestionsAnswered([0])).toBe(true);
      expect(allQuestionsAnswered([0, 0, 0, 0])).toBe(true);
      expect(allQuestionsAnswered([3, 2, 1, 0])).toBe(true);
    });

    it("should return true for empty array", () => {
      expect(allQuestionsAnswered([])).toBe(true);
    });

    it("should handle single question", () => {
      expect(allQuestionsAnswered([-1])).toBe(false);
      expect(allQuestionsAnswered([0])).toBe(true);
    });
  });

  describe("isAnswerSelected", () => {
    it("should return false if answer is -1", () => {
      expect(isAnswerSelected([-1, 0, 1], 0)).toBe(false);
      expect(isAnswerSelected([0, -1, 1], 1)).toBe(false);
    });

    it("should return true if answer is >= 0", () => {
      expect(isAnswerSelected([0, 1, 2], 0)).toBe(true);
      expect(isAnswerSelected([0, 1, 2], 1)).toBe(true);
      expect(isAnswerSelected([0, 1, 2], 2)).toBe(true);
    });

    it("should handle edge case of 0", () => {
      expect(isAnswerSelected([0], 0)).toBe(true);
    });
  });

  describe("choiceIndexToLetter", () => {
    it("should convert 0 to A", () => {
      expect(choiceIndexToLetter(0)).toBe("A");
    });

    it("should convert 1 to B", () => {
      expect(choiceIndexToLetter(1)).toBe("B");
    });

    it("should convert 2 to C", () => {
      expect(choiceIndexToLetter(2)).toBe("C");
    });

    it("should convert 3 to D", () => {
      expect(choiceIndexToLetter(3)).toBe("D");
    });

    it("should handle larger indices", () => {
      expect(choiceIndexToLetter(25)).toBe("Z");
    });
  });
});
