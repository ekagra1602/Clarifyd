/**
 * Integration tests for transcript operations using convex-test
 */
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules } from "../testUtils";

describe("Transcript Integration Tests", () => {
  describe("appendTranscriptLine", () => {
    it("should insert new transcript line", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "Hello, welcome to the lecture",
      });

      const lines = await t.query(api.transcripts.listTranscript, {
        sessionId,
      });

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toBe("Hello, welcome to the lecture");
    });

    it("should set createdAt timestamp", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const before = Date.now();

      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "Test line",
      });

      const after = Date.now();
      const lines = await t.query(api.transcripts.listTranscript, {
        sessionId,
      });

      expect(lines[0].createdAt).toBeGreaterThanOrEqual(before);
      expect(lines[0].createdAt).toBeLessThanOrEqual(after);
    });

    it("should associate line with correct sessionId", async () => {
      const t = convexTest(schema, modules);
      const { sessionId: session1 } = await t.mutation(
        api.sessions.createSession,
        {}
      );
      const { sessionId: session2 } = await t.mutation(
        api.sessions.createSession,
        {}
      );

      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId: session1,
        text: "Session 1 line",
      });
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId: session2,
        text: "Session 2 line",
      });

      const lines1 = await t.query(api.transcripts.listTranscript, {
        sessionId: session1,
      });
      const lines2 = await t.query(api.transcripts.listTranscript, {
        sessionId: session2,
      });

      expect(lines1).toHaveLength(1);
      expect(lines1[0].text).toBe("Session 1 line");
      expect(lines2).toHaveLength(1);
      expect(lines2[0].text).toBe("Session 2 line");
    });

    it("should append multiple lines (append-only pattern)", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "Line 1",
      });
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "Line 2",
      });
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "Line 3",
      });

      const lines = await t.query(api.transcripts.listTranscript, {
        sessionId,
      });

      expect(lines).toHaveLength(3);
    });
  });

  describe("listTranscript", () => {
    it("should return empty array for session with no lines", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const lines = await t.query(api.transcripts.listTranscript, {
        sessionId,
      });

      expect(lines).toEqual([]);
    });

    it("should return lines in chronological order (oldest first)", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Add lines with small delays to ensure different timestamps
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "First",
      });
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "Second",
      });
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "Third",
      });

      const lines = await t.query(api.transcripts.listTranscript, {
        sessionId,
      });

      expect(lines[0].text).toBe("First");
      expect(lines[1].text).toBe("Second");
      expect(lines[2].text).toBe("Third");

      // Verify chronological order by timestamps
      expect(lines[0].createdAt).toBeLessThanOrEqual(lines[1].createdAt);
      expect(lines[1].createdAt).toBeLessThanOrEqual(lines[2].createdAt);
    });

    it("should default to limit of 200 lines", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Add 210 lines
      for (let i = 0; i < 210; i++) {
        await t.mutation(api.transcripts.appendTranscriptLine, {
          sessionId,
          text: `Line ${i}`,
        });
      }

      const lines = await t.query(api.transcripts.listTranscript, {
        sessionId,
      });

      expect(lines).toHaveLength(200);
    });

    it("should respect custom limit parameter", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      for (let i = 0; i < 20; i++) {
        await t.mutation(api.transcripts.appendTranscriptLine, {
          sessionId,
          text: `Line ${i}`,
        });
      }

      const lines = await t.query(api.transcripts.listTranscript, {
        sessionId,
        limit: 5,
      });

      expect(lines).toHaveLength(5);
    });

    it("should return most recent N lines when limit is exceeded", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Add 10 lines
      for (let i = 0; i < 10; i++) {
        await t.mutation(api.transcripts.appendTranscriptLine, {
          sessionId,
          text: `Line ${i}`,
        });
      }

      // Get only last 3
      const lines = await t.query(api.transcripts.listTranscript, {
        sessionId,
        limit: 3,
      });

      expect(lines).toHaveLength(3);
      // Should be the most recent 3 lines in chronological order
      expect(lines[0].text).toBe("Line 7");
      expect(lines[1].text).toBe("Line 8");
      expect(lines[2].text).toBe("Line 9");
    });

    it("should correctly reverse desc-order fetch to chronological order", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "A",
      });
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "B",
      });
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "C",
      });

      const lines = await t.query(api.transcripts.listTranscript, {
        sessionId,
        limit: 2,
      });

      // With limit 2, should get last 2 lines (B, C) in chronological order
      expect(lines).toHaveLength(2);
      expect(lines[0].text).toBe("B");
      expect(lines[1].text).toBe("C");
    });
  });
});
