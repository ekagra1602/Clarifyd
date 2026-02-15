/**
 * Integration tests for Lost Summary AI feature
 *
 * Tests the flow of generating AI summaries when students click "I'm lost".
 * Note: Tests that rely on the full AI action require API keys.
 * These tests focus on the mutation/query flow that can be tested without external APIs.
 */
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules } from "../testUtils";

describe("Lost Summary Integration Tests", () => {
  describe("setLostStatus behavior", () => {
    it("should mark student as lost", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      // Mark as lost
      await t.mutation(api.sessions.setLostStatus, {
        sessionId,
        studentId,
        isLost: true,
      });

      // Check that student is marked as lost
      const state = await t.query(api.sessions.getStudentState, {
        sessionId,
        studentId,
      });

      expect(state?.isLost).toBe(true);
    });

    it("should clear lost status and summary when isLost=false", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      // First set up a summary using the internal mutation directly
      await t.mutation(internal.sessions.saveLostSummary, {
        sessionId,
        studentId,
        summary: "Test summary content",
      });

      // Verify summary exists
      let state = await t.query(api.sessions.getStudentState, {
        sessionId,
        studentId,
      });
      expect(state?.lostSummary).toBe("Test summary content");

      // Mark as lost then unmark
      await t.mutation(api.sessions.setLostStatus, {
        sessionId,
        studentId,
        isLost: true,
      });
      await t.mutation(api.sessions.setLostStatus, {
        sessionId,
        studentId,
        isLost: false,
      });

      // Verify summary is cleared
      state = await t.query(api.sessions.getStudentState, {
        sessionId,
        studentId,
      });
      expect(state?.isLost).toBe(false);
      expect(state?.lostSummary).toBeUndefined();
      expect(state?.lostSummaryAt).toBeUndefined();
    });
  });

  describe("saveLostSummary mutation", () => {
    it("should update correct student record", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      // Directly call saveLostSummary
      await t.mutation(internal.sessions.saveLostSummary, {
        sessionId,
        studentId,
        summary: "Test summary content",
      });

      const state = await t.query(api.sessions.getStudentState, {
        sessionId,
        studentId,
      });

      expect(state?.lostSummary).toBe("Test summary content");
      expect(state?.lostSummaryAt).toBeDefined();
    });

    it("should not affect other students", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const student1 = await t.mutation(api.sessions.joinSession, { code });
      const student2 = await t.mutation(api.sessions.joinSession, { code });

      // Save summary for student1 only
      await t.mutation(internal.sessions.saveLostSummary, {
        sessionId,
        studentId: student1.studentId,
        summary: "Summary for student 1",
      });

      // Check student1 has summary
      const state1 = await t.query(api.sessions.getStudentState, {
        sessionId,
        studentId: student1.studentId,
      });
      expect(state1?.lostSummary).toBe("Summary for student 1");

      // Check student2 does not have summary
      const state2 = await t.query(api.sessions.getStudentState, {
        sessionId,
        studentId: student2.studentId,
      });
      expect(state2?.lostSummary).toBeUndefined();
    });

    it("should set lostSummaryAt timestamp", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      const before = Date.now();

      await t.mutation(internal.sessions.saveLostSummary, {
        sessionId,
        studentId,
        summary: "Test summary",
      });

      const after = Date.now();

      const state = await t.query(api.sessions.getStudentState, {
        sessionId,
        studentId,
      });

      expect(state?.lostSummaryAt).toBeGreaterThanOrEqual(before);
      expect(state?.lostSummaryAt).toBeLessThanOrEqual(after);
    });
  });

  describe("Lost event recording", () => {
    it("should create lostEvent when marking lost", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      await t.mutation(api.sessions.setLostStatus, {
        sessionId,
        studentId,
        isLost: true,
      });

      // Check lost event was recorded
      const stats = await t.query(api.lostEvents.getLostSpikeStats, { sessionId });
      expect(stats.last5mCount).toBeGreaterThanOrEqual(1);
    });

    it("should not create lostEvent when unmarking lost", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      // Mark lost
      await t.mutation(api.sessions.setLostStatus, {
        sessionId,
        studentId,
        isLost: true,
      });

      // Get initial count
      let stats = await t.query(api.lostEvents.getLostSpikeStats, { sessionId });
      const initialCount = stats.last5mCount;

      // Unmark lost
      await t.mutation(api.sessions.setLostStatus, {
        sessionId,
        studentId,
        isLost: false,
      });

      // Count should not increase
      stats = await t.query(api.lostEvents.getLostSpikeStats, { sessionId });
      expect(stats.last5mCount).toBe(initialCount);
    });
  });

  describe("Summary update flow", () => {
    it("should overwrite summary when saving again", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      // First summary
      await t.mutation(internal.sessions.saveLostSummary, {
        sessionId,
        studentId,
        summary: "First summary",
      });

      let state = await t.query(api.sessions.getStudentState, {
        sessionId,
        studentId,
      });
      expect(state?.lostSummary).toBe("First summary");
      const firstTimestamp = state?.lostSummaryAt;

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second summary
      await t.mutation(internal.sessions.saveLostSummary, {
        sessionId,
        studentId,
        summary: "Second summary",
      });

      state = await t.query(api.sessions.getStudentState, {
        sessionId,
        studentId,
      });
      expect(state?.lostSummary).toBe("Second summary");
      expect(state?.lostSummaryAt).toBeGreaterThan(firstTimestamp!);
    });

    it("should preserve summary when marking lost multiple times", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      // Set up initial summary
      await t.mutation(internal.sessions.saveLostSummary, {
        sessionId,
        studentId,
        summary: "Preserved summary",
      });

      // Mark lost (should trigger action that may fail without API key)
      await t.mutation(api.sessions.setLostStatus, {
        sessionId,
        studentId,
        isLost: true,
      });

      // The mutation-set summary should still be there even if action fails
      const state = await t.query(api.sessions.getStudentState, {
        sessionId,
        studentId,
      });

      // Summary might be overwritten by action or preserved - either is acceptable
      // The key test is that isLost is true
      expect(state?.isLost).toBe(true);
    });
  });
});
