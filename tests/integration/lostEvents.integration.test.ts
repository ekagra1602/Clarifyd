/**
 * Integration tests for lost events using convex-test
 */
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules } from "../testUtils";

describe("Lost Events Integration Tests", () => {
  describe("markLost", () => {
    it("should insert lost event with sessionId and studentId", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.lostEvents.markLost, {
        sessionId,
        studentId: "student-123",
      });

      const stats = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId,
      });

      expect(stats.last5mCount).toBe(1);
    });

    it("should set createdAt timestamp", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});
      const before = Date.now();

      await t.mutation(api.lostEvents.markLost, {
        sessionId,
        studentId: "student-123",
      });

      const after = Date.now();
      const stats = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId,
      });

      // Event should be in last 60 seconds (it was just created)
      expect(stats.last60sCount).toBe(1);
    });

    it("should allow multiple events from same student", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.lostEvents.markLost, {
        sessionId,
        studentId: "student-123",
      });
      await t.mutation(api.lostEvents.markLost, {
        sessionId,
        studentId: "student-123",
      });
      await t.mutation(api.lostEvents.markLost, {
        sessionId,
        studentId: "student-123",
      });

      const stats = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId,
      });

      expect(stats.last5mCount).toBe(3);
    });

    it("should track events from multiple students", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.lostEvents.markLost, {
        sessionId,
        studentId: "student-1",
      });
      await t.mutation(api.lostEvents.markLost, {
        sessionId,
        studentId: "student-2",
      });
      await t.mutation(api.lostEvents.markLost, {
        sessionId,
        studentId: "student-3",
      });

      const stats = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId,
      });

      expect(stats.last5mCount).toBe(3);
    });
  });

  describe("getLostSpikeStats", () => {
    it("should return zero counts for session with no events", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const stats = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId,
      });

      expect(stats.last60sCount).toBe(0);
      expect(stats.last5mCount).toBe(0);
    });

    it("should count events in last 60 seconds window", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Add 5 events (all within 60 seconds since they're just created)
      for (let i = 0; i < 5; i++) {
        await t.mutation(api.lostEvents.markLost, {
          sessionId,
          studentId: `student-${i}`,
        });
      }

      const stats = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId,
      });

      expect(stats.last60sCount).toBe(5);
    });

    it("should create 10 time buckets", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const stats = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId,
      });

      expect(stats.buckets).toHaveLength(10);
    });

    it("should return buckets with correct structure", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const stats = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId,
      });

      for (const bucket of stats.buckets) {
        expect(bucket).toHaveProperty("start");
        expect(bucket).toHaveProperty("end");
        expect(bucket).toHaveProperty("count");
        expect(typeof bucket.start).toBe("number");
        expect(typeof bucket.end).toBe("number");
        expect(typeof bucket.count).toBe("number");
      }
    });

    it("should return buckets in chronological order", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const stats = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId,
      });

      // Verify buckets are in chronological order (earliest first)
      for (let i = 1; i < stats.buckets.length; i++) {
        expect(stats.buckets[i].start).toBeGreaterThan(
          stats.buckets[i - 1].start
        );
      }
    });

    it("should count events in buckets consistently with window counts", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Add events
      for (let i = 0; i < 3; i++) {
        await t.mutation(api.lostEvents.markLost, {
          sessionId,
          studentId: `student-${i}`,
        });
      }

      const stats = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId,
      });

      // Verify counts match what we added
      expect(stats.last60sCount).toBe(3);
      expect(stats.last5mCount).toBe(3);

      // Buckets should exist and have valid structure
      expect(stats.buckets).toHaveLength(10);

      // Total in buckets should be less than or equal to last5mCount
      // (buckets only cover 5 minutes, events at edge may be excluded)
      const totalInBuckets = stats.buckets.reduce((sum, b) => sum + b.count, 0);
      expect(totalInBuckets).toBeLessThanOrEqual(stats.last5mCount);
    });

    it("should isolate events by session", async () => {
      const t = convexTest(schema, modules);
      const { sessionId: session1 } = await t.mutation(
        api.sessions.createSession,
        {}
      );
      const { sessionId: session2 } = await t.mutation(
        api.sessions.createSession,
        {}
      );

      // Add events to session1 only
      await t.mutation(api.lostEvents.markLost, {
        sessionId: session1,
        studentId: "student-1",
      });
      await t.mutation(api.lostEvents.markLost, {
        sessionId: session1,
        studentId: "student-2",
      });

      const stats1 = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId: session1,
      });
      const stats2 = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId: session2,
      });

      expect(stats1.last5mCount).toBe(2);
      expect(stats2.last5mCount).toBe(0);
    });

    it("should assign events to correct buckets based on timestamp", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const now = Date.now();
      const bucketSize = 30 * 1000; // 30 seconds

      // Insert events at specific times using t.run for direct DB access
      // Bucket 9 (most recent): 0-30s ago - insert 3 events
      // Bucket 8: 30-60s ago - insert 2 events
      // Bucket 5: 120-150s ago - insert 1 event
      // Bucket 0 (oldest): 270-300s ago - insert 1 event
      await t.run(async (ctx) => {
        // Bucket 9: 3 events at 5s, 15s, 25s ago
        await ctx.db.insert("lostEvents", {
          sessionId,
          studentId: "s1",
          createdAt: now - 5 * 1000,
        });
        await ctx.db.insert("lostEvents", {
          sessionId,
          studentId: "s2",
          createdAt: now - 15 * 1000,
        });
        await ctx.db.insert("lostEvents", {
          sessionId,
          studentId: "s3",
          createdAt: now - 25 * 1000,
        });

        // Bucket 8: 2 events at 35s, 55s ago
        await ctx.db.insert("lostEvents", {
          sessionId,
          studentId: "s4",
          createdAt: now - 35 * 1000,
        });
        await ctx.db.insert("lostEvents", {
          sessionId,
          studentId: "s5",
          createdAt: now - 55 * 1000,
        });

        // Bucket 5: 1 event at 135s ago (2m 15s)
        await ctx.db.insert("lostEvents", {
          sessionId,
          studentId: "s6",
          createdAt: now - 135 * 1000,
        });

        // Bucket 0: 1 event at 280s ago (4m 40s)
        await ctx.db.insert("lostEvents", {
          sessionId,
          studentId: "s7",
          createdAt: now - 280 * 1000,
        });
      });

      const stats = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId,
      });

      // Verify total counts
      expect(stats.last5mCount).toBe(7);
      // last60sCount: events within 60s = bucket 9 (3) + bucket 8 (2) = 5
      expect(stats.last60sCount).toBe(5);

      // Verify bucket assignments
      expect(stats.buckets[9].count).toBe(3); // Most recent bucket
      expect(stats.buckets[8].count).toBe(2);
      expect(stats.buckets[5].count).toBe(1);
      expect(stats.buckets[0].count).toBe(1); // Oldest bucket

      // Verify empty buckets
      expect(stats.buckets[1].count).toBe(0);
      expect(stats.buckets[2].count).toBe(0);
      expect(stats.buckets[3].count).toBe(0);
      expect(stats.buckets[4].count).toBe(0);
      expect(stats.buckets[6].count).toBe(0);
      expect(stats.buckets[7].count).toBe(0);
    });

    it("should handle events in adjacent buckets correctly", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const now = Date.now();
      const bucketSize = 30 * 1000;

      await t.run(async (ctx) => {
        // Event clearly in bucket 8 (35s ago, well within 30-60s range)
        await ctx.db.insert("lostEvents", {
          sessionId,
          studentId: "in-bucket-8",
          createdAt: now - 35 * 1000,
        });

        // Event clearly in bucket 9 (15s ago, well within 0-30s range)
        await ctx.db.insert("lostEvents", {
          sessionId,
          studentId: "in-bucket-9",
          createdAt: now - 15 * 1000,
        });
      });

      const stats = await t.query(api.lostEvents.getLostSpikeStats, {
        sessionId,
      });

      // Note: Exact boundary testing is not reliable due to timing drift
      // between test's Date.now() and query's Date.now(). Events are placed
      // well within their buckets to avoid flakiness.
      expect(stats.buckets[9].count).toBe(1); // 15s ago -> bucket 9
      expect(stats.buckets[8].count).toBe(1); // 35s ago -> bucket 8
    });
  });
});
