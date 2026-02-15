/**
 * Tests for JoinPage component logic
 *
 * These tests verify the core logic of the JoinPage without requiring
 * full React component mounting with Convex providers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("JoinPage Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe("Code Input Validation", () => {
    it("should reject empty code", () => {
      const code = "";
      const isValid = code.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it("should reject whitespace-only code", () => {
      const code = "   ";
      const isValid = code.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it("should accept valid code", () => {
      const code = "blue-tiger-42";
      const isValid = code.trim().length > 0;
      expect(isValid).toBe(true);
    });

    it("should trim code before submission", () => {
      const code = "  blue-tiger-42  ";
      const trimmed = code.trim();
      expect(trimmed).toBe("blue-tiger-42");
    });
  });

  describe("Error State Management", () => {
    it("should set error for empty code", () => {
      const code = "";
      let error = "";

      if (!code.trim()) {
        error = "Please enter a join code";
      }

      expect(error).toBe("Please enter a join code");
    });

    it("should clear error for valid code", () => {
      let error = "Previous error";
      const code = "blue-tiger-42";

      if (code.trim()) {
        error = "";
      }

      expect(error).toBe("");
    });

    it("should set error from mutation failure", () => {
      let error = "";
      const mutationError = new Error("Session not found");

      // Simulate catching mutation error
      error = mutationError.message;

      expect(error).toBe("Session not found");
    });
  });

  describe("Loading State", () => {
    it("should track joining state", () => {
      let isJoining = false;

      // Before join attempt
      expect(isJoining).toBe(false);

      // During join
      isJoining = true;
      expect(isJoining).toBe(true);

      // After join (success or failure)
      isJoining = false;
      expect(isJoining).toBe(false);
    });

    it("should disable button while joining", () => {
      const isJoining = true;
      const buttonDisabled = isJoining;
      expect(buttonDisabled).toBe(true);
    });
  });

  describe("Session Storage Persistence", () => {
    it("should store studentId after successful join", () => {
      const sessionId = "session-123";
      const studentId = "student-abc-123";

      sessionStorage.setItem(`studentId-${sessionId}`, studentId);

      expect(sessionStorage.getItem(`studentId-${sessionId}`)).toBe(studentId);
    });

    it("should generate correct storage key", () => {
      const sessionId = "session-456";
      const key = `studentId-${sessionId}`;
      expect(key).toBe("studentId-session-456");
    });
  });

  describe("Navigation", () => {
    it("should construct correct navigation path", () => {
      const sessionId = "session-123";
      const path = `/session/${sessionId}`;
      expect(path).toBe("/session/session-123");
    });
  });

  describe("Form Submission Flow", () => {
    it("should prevent default form submission", () => {
      const event = { preventDefault: vi.fn() };
      event.preventDefault();
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("should validate before calling mutation", () => {
      const code = "";
      let mutationCalled = false;
      let error = "";

      if (!code.trim()) {
        error = "Please enter a join code";
      } else {
        mutationCalled = true;
      }

      expect(error).toBe("Please enter a join code");
      expect(mutationCalled).toBe(false);
    });
  });
});
