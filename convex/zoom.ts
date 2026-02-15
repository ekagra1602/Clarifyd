"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

const ZOOM_OAUTH_TOKEN_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} environment variable`);
  return v;
}

async function getZoomAccessToken(): Promise<string> {
  // Server-to-Server OAuth (account_credentials grant)
  // See Zoom docs for configuring an S2S OAuth app.
  const accountId = requireEnv("ZOOM_ACCOUNT_ID");
  const clientId = requireEnv("ZOOM_CLIENT_ID");
  const clientSecret = requireEnv("ZOOM_CLIENT_SECRET");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const url = new URL(ZOOM_OAUTH_TOKEN_URL);
  url.searchParams.set("grant_type", "account_credentials");
  url.searchParams.set("account_id", accountId);

  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
    },
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Zoom token error (${resp.status}): ${errText}`);
  }

  const data = (await resp.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Zoom token response missing access_token");
  }
  return data.access_token;
}

function parseVttToLines(vtt: string): string[] {
  // Very small VTT parser:
  // - Split into cue blocks
  // - Drop headers / indices / timecodes
  // - Join cue text lines
  const normalized = vtt
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const blocks = normalized.split("\n\n");
  const lines: string[] = [];

  for (const block of blocks) {
    const raw = block.trim();
    if (!raw) continue;
    if (raw.startsWith("WEBVTT")) continue;

    const blockLines = raw.split("\n");

    // Remove leading numeric cue id
    while (blockLines.length && /^\d+$/.test(blockLines[0].trim())) {
      blockLines.shift();
    }

    // Remove timecode line(s)
    while (blockLines.length && /-->/.test(blockLines[0])) {
      blockLines.shift();
    }

    const text = blockLines
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ")
      // Zoom sometimes repeats speaker labels; keep it simple.
      .replace(/\s+/g, " ")
      .trim();

    if (!text) continue;
    lines.push(text);
  }

  // Light de-dupe of consecutive identical lines
  const deduped: string[] = [];
  for (const l of lines) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== l) {
      deduped.push(l);
    }
  }
  return deduped;
}

export const importZoomTranscript = action({
  args: {
    sessionId: v.id("sessions"),
    meetingId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate session exists (can be live or ended)
    const session = await ctx.runQuery(api.sessions.getSession, {
      sessionId: args.sessionId,
    });
    if (!session) throw new Error("Session not found");

    const accessToken = await getZoomAccessToken();

    const recordingsResp = await fetch(
      `${ZOOM_API_BASE}/meetings/${encodeURIComponent(args.meetingId)}/recordings`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!recordingsResp.ok) {
      const errText = await recordingsResp.text().catch(() => "");
      throw new Error(`Zoom recordings error (${recordingsResp.status}): ${errText}`);
    }

    const recordings = (await recordingsResp.json()) as {
      recording_files?: Array<{
        file_type?: string;
        file_extension?: string;
        download_url?: string;
        recording_type?: string;
      }>;
    };

    const files = recordings.recording_files ?? [];

    // Zoom may label transcripts as TRANSCRIPT or CC depending on account/settings.
    const transcriptFile = files.find((f) => {
      const ext = (f.file_extension ?? "").toLowerCase();
      const type = (f.file_type ?? "").toUpperCase();
      return ext === "vtt" && (type === "TRANSCRIPT" || type === "CC" || type === "CHAT");
    });

    if (!transcriptFile?.download_url) {
      throw new Error(
        "No transcript (.vtt) found for this meeting. Ensure Cloud Recording + Audio Transcript is enabled in Zoom."
      );
    }

    const dl = new URL(transcriptFile.download_url);
    if (!dl.searchParams.has("access_token")) {
      dl.searchParams.set("access_token", accessToken);
    }

    const vttResp = await fetch(dl.toString());
    if (!vttResp.ok) {
      const errText = await vttResp.text().catch(() => "");
      throw new Error(`Transcript download error (${vttResp.status}): ${errText}`);
    }

    const vtt = await vttResp.text();
    const lines = parseVttToLines(vtt);

    await ctx.runMutation(api.transcripts.appendTranscriptLinesBulk, {
      sessionId: args.sessionId,
      lines: lines.map((text, i) => ({
        text,
        source: "zoom_vtt",
        // Preserve ordering deterministically
        createdAt: Date.now() + i,
      })),
    });

    return { imported: lines.length };
  },
});
