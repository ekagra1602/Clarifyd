/**
 * Zoom transcript import: fetch cloud recording transcript via Zoom API
 * and append to session transcript. Requires Zoom Server-to-Server OAuth app.
 *
 * Env: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
 * See: https://developers.zoom.us/docs/internal-apps/s2s-oauth/
 */
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const ZOOM_TOKEN_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

async function getZoomAccessToken(): Promise<string> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) {
    throw new Error(
      "Zoom credentials missing. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET in Convex env."
    );
  }

  const body = new URLSearchParams({
    grant_type: "account_credentials",
    account_id: accountId,
  });
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(ZOOM_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom token failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Zoom token response missing access_token");
  return data.access_token;
}

/** Parse VTT content into lines of text (strip timestamps and WEBVTT header) */
function parseVttToLines(vtt: string): { text: string }[] {
  const lines = vtt.split(/\r?\n/);
  const result: { text: string }[] = [];
  let inHeader = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    if (line.startsWith("WEBVTT") || line.startsWith("NOTE")) {
      inHeader = false;
      continue;
    }
    if ((inHeader && line.startsWith("Kind:")) || line.startsWith("Language:")) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/.test(line)) continue;
    if (line) result.push({ text: line });
  }

  return result;
}

export const importZoomTranscript = action({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(internal.sessions.getSessionZoomMeetingInternal, {
      sessionId: args.sessionId,
    });
    if (!session?.zoomMeetingId) {
      return { success: false, error: "No Zoom meeting ID set for this session." };
    }

    const token = await getZoomAccessToken();
    const meetingId = session.zoomMeetingId;

    const recordingsRes = await fetch(`${ZOOM_API_BASE}/meetings/${meetingId}/recordings`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (recordingsRes.status === 404) {
      return { success: false, error: "Zoom meeting or recording not found. Record the meeting to the cloud and enable transcription." };
    }
    if (!recordingsRes.ok) {
      const err = await recordingsRes.text();
      return { success: false, error: `Zoom API: ${recordingsRes.status} ${err}` };
    }

    const recordings = (await recordingsRes.json()) as {
      recording_files?: Array<{
        file_type?: string;
        download_url?: string;
        status?: string;
      }>;
    };

    const files = recordings.recording_files ?? [];
    const transcriptFile = files.find(
      (f) =>
        f.file_type === "TRANSCRIPT" ||
        f.file_type === "VTT" ||
        (f.download_url && (f.download_url.includes("transcript") || f.download_url.includes("vtt")))
    ) ?? files.find((f) => f.file_type === "CHAT"); // fallback: sometimes transcript is separate

    const downloadUrl = transcriptFile?.download_url;
    if (!downloadUrl) {
      return {
        success: false,
        error: "No transcript file found for this recording. Enable 'Record to cloud' and 'Audio transcript' in Zoom.",
      };
    }

    const downloadUrlWithToken = `${downloadUrl}${downloadUrl.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`;
    const vttRes = await fetch(downloadUrlWithToken);
    if (!vttRes.ok) {
      return { success: false, error: `Failed to download transcript file: ${vttRes.status}` };
    }

    const vttText = await vttRes.text();
    const parsed = parseVttToLines(vttText);
    if (parsed.length === 0) {
      return { success: false, error: "Transcript file is empty or could not be parsed." };
    }

    const now = Date.now();
    const lines = parsed.map((p, i) => ({
      text: p.text,
      createdAt: now - (parsed.length - i) * 1000,
    }));

    await ctx.runMutation(internal.transcripts.insertTranscriptLinesBatch, {
      sessionId: args.sessionId,
      lines,
    });

    return { success: true, linesImported: lines.length };
  },
});
