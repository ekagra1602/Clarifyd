"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const getStreamingToken = action({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    // Security: Validate session exists and is live
    const session = await ctx.runQuery(api.sessions.getSession, {
      sessionId: args.sessionId,
    });
    if (!session) {
      throw new Error("Session not found");
    }
    if (session.status !== "live") {
      throw new Error("Session has ended");
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      throw new Error("AssemblyAI not configured");
    }

    // Use v3 Universal Streaming token endpoint (GET request with query params)
    const tokenUrl = new URL("https://streaming.assemblyai.com/v3/token");
    tokenUrl.searchParams.set("expires_in_seconds", "600"); // 10 minutes (max allowed)

    const response = await fetch(tokenUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get AssemblyAI token: ${errorText}`);
    }

    const { token } = await response.json();
    return { token };
  },
});
