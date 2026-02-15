import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Append a new transcript line (append-only for real-time performance)
export const appendTranscriptLine = mutation({
  args: {
    sessionId: v.id("sessions"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("transcriptLines", {
      sessionId: args.sessionId,
      text: args.text,
      createdAt: Date.now(),
    });
  },
});

// Save transcript from browser (direct WebSocket → Convex, no shared secret needed)
export const saveTranscriptFromBrowser = mutation({
  args: {
    sessionId: v.id("sessions"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate session exists and is live
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.status !== "live") {
      throw new Error("Invalid or ended session");
    }

    if (!args.text.trim()) return; // Skip empty

    await ctx.db.insert("transcriptLines", {
      sessionId: args.sessionId,
      text: args.text,
      createdAt: Date.now(),
    });
  },
});

// List transcript lines for a session (real-time subscription)
// Strategy: Fetch most recent N lines in desc order, then reverse to chronological.
// This approach is correct because Convex doesn't support offset-from-end queries.
// Without this pattern, we'd have to fetch ALL lines and slice, which is inefficient.
export const listTranscript = query({
  args: {
    sessionId: v.id("sessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;

    // Fetch most recent lines (desc order, take limit)
    const lines = await ctx.db
      .query("transcriptLines")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(limit);

    // Return in chronological order (oldest first) for display
    return lines.reverse();
  },
});

// Paginated transcript query for windowed loading
// Supports loading older lines via cursor-based pagination
export const listTranscriptPaginated = query({
  args: {
    sessionId: v.id("sessions"),
    limit: v.optional(v.number()),
    // Cursor: load lines created before this timestamp
    beforeTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Use a single query with conditional index filter
    const lines = await ctx.db
      .query("transcriptLines")
      .withIndex("by_session", (q) => {
        const base = q.eq("sessionId", args.sessionId);
        // If cursor provided, filter to lines before that timestamp
        if (args.beforeTimestamp !== undefined) {
          return base.lt("createdAt", args.beforeTimestamp);
        }
        return base;
      })
      .order("desc")
      .take(limit + 1);

    const hasMore = lines.length > limit;
    const resultLines = hasMore ? lines.slice(0, limit) : lines;

    // Get the oldest timestamp from this batch for the next cursor
    const oldestTimestamp = resultLines.length > 0
      ? resultLines[resultLines.length - 1].createdAt
      : undefined;

    // Return in chronological order (oldest first) for display
    return {
      lines: resultLines.reverse(),
      hasMore,
      oldestTimestamp,
    };
  },
});

// Get the count of transcript lines for a session (used for UI indicators)
export const getTranscriptCount = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const lines = await ctx.db
      .query("transcriptLines")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    return lines.length;
  },
});
