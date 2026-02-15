import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";

type VideoRequestStatus = "queued" | "processing" | "completed" | "failed";

export const listStudentVideoRequests = query({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 12;
    const rows = await ctx.db
      .query("videoRequests")
      .withIndex("by_session_student", (q) =>
        q.eq("sessionId", args.sessionId).eq("studentId", args.studentId)
      )
      .order("desc")
      .take(limit);
    return rows.reverse();
  },
});

export const createVideoFromTranscript = mutation({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    const sourcePrompt = "Create a short learning video based on what the teacher just explained.";
    const now = Date.now();

    const requestId = await ctx.db.insert("videoRequests", {
      sessionId: args.sessionId,
      studentId: args.studentId,
      triggerType: "transcript",
      sourcePrompt,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.videosNode.processVideoRequest, {
      requestId,
    });

    return { requestId };
  },
});

export const createVideoFromStudentPrompt = mutation({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const cleaned = args.prompt.trim();
    if (!cleaned) {
      throw new Error("Prompt cannot be empty");
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("videoRequests", {
      sessionId: args.sessionId,
      studentId: args.studentId,
      triggerType: "custom_prompt",
      studentPrompt: cleaned,
      sourcePrompt: cleaned,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.videosNode.processVideoRequest, {
      requestId,
    });

    return { requestId };
  },
});

export const getVideoRequestInternal = internalQuery({
  args: { requestId: v.id("videoRequests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.requestId);
  },
});

export const updateVideoRequestStatusInternal = internalMutation({
  args: {
    requestId: v.id("videoRequests"),
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    optimizedPrompt: v.optional(v.string()),
    provider: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    providerRequestId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: {
      status: VideoRequestStatus;
      updatedAt: number;
      optimizedPrompt?: string;
      provider?: string;
      videoUrl?: string;
      providerRequestId?: string;
      error?: string;
    } = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.optimizedPrompt !== undefined) patch.optimizedPrompt = args.optimizedPrompt;
    if (args.provider !== undefined) patch.provider = args.provider;
    if (args.videoUrl !== undefined) patch.videoUrl = args.videoUrl;
    if (args.providerRequestId !== undefined) patch.providerRequestId = args.providerRequestId;
    if (args.error !== undefined) patch.error = args.error;

    await ctx.db.patch(args.requestId, patch);
  },
});
