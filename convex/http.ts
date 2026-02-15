import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against itself to maintain constant time
    b = a;
  }
  let result = a.length === b.length ? 0 : 1;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const http = httpRouter();

http.route({
  path: "/transcription",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { sessionId, text, secret } = body;

    // Validate required fields
    if (typeof sessionId !== "string" || !sessionId) {
      return new Response("Bad Request: missing sessionId", { status: 400 });
    }
    if (typeof text !== "string") {
      return new Response("Bad Request: missing text", { status: 400 });
    }
    if (typeof secret !== "string" || !secret) {
      return new Response("Bad Request: missing secret", { status: 400 });
    }

    // Validate secret with timing-safe comparison
    const expectedSecret = process.env.TRANSCRIPTION_SECRET;
    if (!expectedSecret || !timingSafeEqual(secret, expectedSecret)) {
      return new Response("Unauthorized", { status: 401 });
    }

    await ctx.runMutation(api.transcripts.appendTranscriptLine, {
      sessionId: sessionId as Id<"sessions">,
      text,
    });
    return new Response("OK", { status: 200 });
  }),
});

export default http;
