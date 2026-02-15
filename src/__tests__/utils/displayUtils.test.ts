/**
 * Tests for display utility functions
 */
import { describe, it, expect } from "vitest";
import {
  getAccuracyColorClass,
  formatAccuracyPercent,
  isLostSpike,
  getLostSignalColorClass,
} from "../../utils/displayUtils";

describe("displayUtils", () => {
  describe("getAccuracyColorClass", () => {
    it("should return text-green-400 for accuracy >= 0.7", () => {
      expect(getAccuracyColorClass(0.7)).toBe("text-green-400");
      expect(getAccuracyColorClass(0.75)).toBe("text-green-400");
      expect(getAccuracyColorClass(0.9)).toBe("text-green-400");
      expect(getAccuracyColorClass(1.0)).toBe("text-green-400");
    });

    it("should return text-yellow-400 for accuracy >= 0.5 and < 0.7", () => {
      expect(getAccuracyColorClass(0.5)).toBe("text-yellow-400");
      expect(getAccuracyColorClass(0.55)).toBe("text-yellow-400");
      expect(getAccuracyColorClass(0.69)).toBe("text-yellow-400");
    });

    it("should return text-red-400 for accuracy < 0.5", () => {
      expect(getAccuracyColorClass(0)).toBe("text-red-400");
      expect(getAccuracyColorClass(0.25)).toBe("text-red-400");
      expect(getAccuracyColorClass(0.49)).toBe("text-red-400");
    });

    it("should handle edge cases", () => {
      expect(getAccuracyColorClass(0)).toBe("text-red-400");
      expect(getAccuracyColorClass(0.5)).toBe("text-yellow-400");
      expect(getAccuracyColorClass(0.7)).toBe("text-green-400");
      expect(getAccuracyColorClass(1.0)).toBe("text-green-400");
    });

    it("should handle boundary values precisely", () => {
      expect(getAccuracyColorClass(0.4999)).toBe("text-red-400");
      expect(getAccuracyColorClass(0.5)).toBe("text-yellow-400");
      expect(getAccuracyColorClass(0.6999)).toBe("text-yellow-400");
      expect(getAccuracyColorClass(0.7)).toBe("text-green-400");
    });
  });

  describe("formatAccuracyPercent", () => {
    it("should format accuracy as percentage string", () => {
      expect(formatAccuracyPercent(0.75)).toBe("75%");
      expect(formatAccuracyPercent(1.0)).toBe("100%");
      expect(formatAccuracyPercent(0)).toBe("0%");
    });

    it("should round to nearest integer", () => {
      expect(formatAccuracyPercent(0.754)).toBe("75%");
      expect(formatAccuracyPercent(0.755)).toBe("76%");
      expect(formatAccuracyPercent(0.999)).toBe("100%");
    });

    it("should handle 50% correctly", () => {
      expect(formatAccuracyPercent(0.5)).toBe("50%");
    });

    it("should handle small values", () => {
      expect(formatAccuracyPercent(0.01)).toBe("1%");
      expect(formatAccuracyPercent(0.001)).toBe("0%");
    });
  });

  describe("isLostSpike", () => {
    it("should return true when count exceeds threshold", () => {
      expect(isLostSpike(4)).toBe(true);
      expect(isLostSpike(5)).toBe(true);
      expect(isLostSpike(10)).toBe(true);
    });

    it("should return false when count is at or below threshold", () => {
      expect(isLostSpike(0)).toBe(false);
      expect(isLostSpike(1)).toBe(false);
      expect(isLostSpike(2)).toBe(false);
      expect(isLostSpike(3)).toBe(false);
    });

    it("should default threshold to 3", () => {
      expect(isLostSpike(3)).toBe(false);
      expect(isLostSpike(4)).toBe(true);
    });

    it("should respect custom threshold", () => {
      expect(isLostSpike(5, 5)).toBe(false);
      expect(isLostSpike(6, 5)).toBe(true);
      expect(isLostSpike(10, 10)).toBe(false);
      expect(isLostSpike(11, 10)).toBe(true);
    });

    it("should handle threshold of 0", () => {
      expect(isLostSpike(0, 0)).toBe(false);
      expect(isLostSpike(1, 0)).toBe(true);
    });
  });

  describe("getLostSignalColorClass", () => {
    it("should return text-red-400 when spike detected", () => {
      expect(getLostSignalColorClass(4)).toBe("text-red-400");
      expect(getLostSignalColorClass(10)).toBe("text-red-400");
    });

    it("should return text-white when no spike", () => {
      expect(getLostSignalColorClass(0)).toBe("text-white");
      expect(getLostSignalColorClass(3)).toBe("text-white");
    });

    it("should respect custom threshold", () => {
      expect(getLostSignalColorClass(5, 5)).toBe("text-white");
      expect(getLostSignalColorClass(6, 5)).toBe("text-red-400");
    });
  });
});
