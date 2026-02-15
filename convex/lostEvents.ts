import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Record an "I'm lost" event
export const markLost = mutation({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("lostEvents", {
      sessionId: args.sessionId,
      studentId: args.studentId,
      createdAt: Date.now(),
    });
  },
});

// Get lost spike statistics (real-time)
export const getLostSpikeStats = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Get all lost events in the last 5 minutes
    const recentEvents = await ctx.db
      .query("lostEvents")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.gte(q.field("createdAt"), fiveMinutesAgo))
      .collect();

    // Create time buckets (30-second intervals for last 5 minutes = 10 buckets)
    const bucketSize = 30 * 1000; // 30 seconds
    const bucketCount = 10;

    // Single-pass O(n) algorithm: count events per bucket and last 60s simultaneously
    const bucketCounts = new Array<number>(bucketCount).fill(0);
    let last60sCount = 0;

    for (const event of recentEvents) {
      // Count for 60s window
      if (event.createdAt >= oneMinuteAgo) {
        last60sCount++;
      }

      // Assign to bucket (bucket 0 = oldest, bucket 9 = most recent)
      const ageMs = now - event.createdAt;
      const bucketIndex = bucketCount - 1 - Math.floor(ageMs / bucketSize);

      if (bucketIndex >= 0 && bucketIndex < bucketCount) {
        bucketCounts[bucketIndex]++;
      }
    }

    // Build buckets array with time ranges
    const buckets: { start: number; end: number; count: number }[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bucketStart = fiveMinutesAgo + i * bucketSize;
      const bucketEnd = bucketStart + bucketSize;
      buckets.push({ start: bucketStart, end: bucketEnd, count: bucketCounts[i] });
    }

    return {
      last60sCount,
      last5mCount: recentEvents.length,
      buckets,
    };
  },
});
