import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

function assertTranscriptionSecret(secret: unknown): { ok: true } | Response {
  if (!secret || typeof secret !== "string") {
    return new Response("Missing secret", { status: 400 });
  }
  const expected = process.env.TRANSCRIPTION_SECRET;
  if (!expected) {
    return new Response("TRANSCRIPTION_SECRET not set", { status: 500 });
  }
  if (secret !== expected) {
    return new Response("Invalid secret", { status: 401 });
  }
  return { ok: true };
}

// External ingestion endpoint (used by scripts, BrowserBase scrapers, etc.)
//
// POST /transcription
// {
//   "sessionId": "...",
//   "text": "...",
//   "secret": "...",
//   "source": "zoom_vtt" | "browserbase_cc" | "local_loopback" | ...,
//   "createdAt": 1700000000000
// }
http.route({
  path: "/transcription",
  method: "POST",
  handler: httpAction(async (ctx: any, request: Request): Promise<Response> => {
    try {
      const body = await request.json();
      const { sessionId, text, secret, source, createdAt } = body ?? {};

      if (!sessionId || typeof sessionId !== "string") {
        return new Response("Missing sessionId", { status: 400 });
      }

      if (typeof text !== "string") {
        return new Response("Missing text", { status: 400 });
      }

      const sec = assertTranscriptionSecret(secret);
      if (sec instanceof Response) return sec;

      await ctx.runMutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text,
        source: typeof source === "string" ? source : undefined,
        createdAt: typeof createdAt === "number" ? createdAt : undefined,
      });

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Transcription endpoint error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

// Bulk ingestion endpoint.
//
// POST /transcription/bulk
// {
//   "sessionId": "...",
//   "lines": [{"text":"...","source":"zoom_vtt","createdAt":1700...}, ...],
//   "secret": "..."
// }
http.route({
  path: "/transcription/bulk",
  method: "POST",
  handler: httpAction(async (ctx: any, request: Request): Promise<Response> => {
    try {
      const body = await request.json();
      const { sessionId, lines, secret } = body ?? {};

      if (!sessionId || typeof sessionId !== "string") {
        return new Response("Missing sessionId", { status: 400 });
      }

      if (!Array.isArray(lines)) {
        return new Response("Missing lines", { status: 400 });
      }

      const sec = assertTranscriptionSecret(secret);
      if (sec instanceof Response) return sec;

      await ctx.runMutation(api.transcripts.appendTranscriptLinesBulk, {
        sessionId,
        lines: lines
          .filter((l: any) => l && typeof l.text === "string")
          .map((l: any) => ({
            text: l.text,
            source: typeof l.source === "string" ? l.source : undefined,
            createdAt: typeof l.createdAt === "number" ? l.createdAt : undefined,
          })),
      });

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Bulk transcription endpoint error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

export default http;
