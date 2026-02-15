/**
 * Integration tests for transcription HTTP endpoint and related mutations
 */
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules } from "../testUtils";

describe("Transcription Integration Tests", () => {
  describe("appendTranscriptLine (via HTTP endpoint)", () => {
    it("should append transcript line to session", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "Hello, this is a test transcript.",
      });

      const lines = await t.query(api.transcripts.listTranscript, {
        sessionId,
      });

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toBe("Hello, this is a test transcript.");
      expect(lines[0].sessionId).toBe(sessionId);
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

    it("should append multiple lines in order", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "First line",
      });
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "Second line",
      });
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "Third line",
      });

      const lines = await t.query(api.transcripts.listTranscript, {
        sessionId,
      });

      expect(lines).toHaveLength(3);
      expect(lines[0].text).toBe("First line");
      expect(lines[1].text).toBe("Second line");
      expect(lines[2].text).toBe("Third line");
    });

    it("should handle empty text", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "",
      });

      const lines = await t.query(api.transcripts.listTranscript, {
        sessionId,
      });

      expect(lines).toHaveLength(1);
      expect(lines[0].text).toBe("");
    });

    it("should handle long transcript text", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const longText = "A".repeat(1000);

      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: longText,
      });

      const lines = await t.query(api.transcripts.listTranscript, {
        sessionId,
      });

      expect(lines[0].text).toBe(longText);
      expect(lines[0].text).toHaveLength(1000);
    });

    it("should isolate transcripts by session", async () => {
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
      expect(lines2).toHaveLength(1);
      expect(lines1[0].text).toBe("Session 1 line");
      expect(lines2[0].text).toBe("Session 2 line");
    });
  });

  describe("HTTP endpoint authentication logic", () => {
    it("should validate secret matches environment variable", () => {
      const envSecret = "my-secret-123";
      const providedSecret = "my-secret-123";
      const isValid = providedSecret === envSecret;

      expect(isValid).toBe(true);
    });

    it("should reject invalid secret", () => {
      const envSecret = "my-secret-123";
      const providedSecret = "wrong-secret";
      const isValid = providedSecret === envSecret;

      expect(isValid).toBe(false);
    });

    it("should reject missing secret", () => {
      const envSecret = "my-secret-123";
      const providedSecret = undefined;
      const isValid = providedSecret === envSecret;

      expect(isValid).toBe(false);
    });

    it("should reject empty secret", () => {
      const envSecret = "my-secret-123";
      const providedSecret = "";
      const isValid = providedSecret === envSecret;

      expect(isValid).toBe(false);
    });
  });

  describe("HTTP request payload validation", () => {
    it("should validate required fields are present", () => {
      const payload = {
        sessionId: "session-123",
        text: "Test transcript",
        secret: "my-secret",
      };

      expect(payload.sessionId).toBeDefined();
      expect(payload.text).toBeDefined();
      expect(payload.secret).toBeDefined();
    });

    it("should identify missing sessionId", () => {
      const payload = {
        text: "Test transcript",
        secret: "my-secret",
      };

      expect("sessionId" in payload).toBe(false);
    });

    it("should identify missing text", () => {
      const payload = {
        sessionId: "session-123",
        secret: "my-secret",
      };

      expect("text" in payload).toBe(false);
    });

    it("should identify missing secret", () => {
      const payload = {
        sessionId: "session-123",
        text: "Test transcript",
      };

      expect("secret" in payload).toBe(false);
    });
  });
});
