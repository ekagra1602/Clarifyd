/**
 * Approach B (CLI): Zoom post-hoc transcript import.
 *
 * This is a CLI alternative to the in-app Convex action. It:
 *  1) Fetches a Zoom cloud recording transcript (.vtt)
 *  2) Parses it into lines
 *  3) Pushes lines to Convex via POST /transcription/bulk
 *
 * Run (with bun):
 *   bun scripts/ears/zoom_posthoc.ts
 *
 * Required env:
 *   SESSION_ID
 *   ZOOM_MEETING_ID
 *   ZOOM_ACCOUNT_ID
 *   ZOOM_CLIENT_ID
 *   ZOOM_CLIENT_SECRET
 *   CONVEX_TRANSCRIPTION_BULK_URL   (e.g. https://<deployment>.convex.site/transcription/bulk)
 *   TRANSCRIPTION_SECRET
 */

const ZOOM_OAUTH_TOKEN_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

function must(v: string | undefined, name: string): string {
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function getZoomAccessToken(): Promise<string> {
  const accountId = must(process.env.ZOOM_ACCOUNT_ID, "ZOOM_ACCOUNT_ID");
  const clientId = must(process.env.ZOOM_CLIENT_ID, "ZOOM_CLIENT_ID");
  const clientSecret = must(process.env.ZOOM_CLIENT_SECRET, "ZOOM_CLIENT_SECRET");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const url = new URL(ZOOM_OAUTH_TOKEN_URL);
  url.searchParams.set("grant_type", "account_credentials");
  url.searchParams.set("account_id", accountId);

  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!resp.ok) throw new Error(`Token error: ${resp.status} ${await resp.text()}`);

  const data = (await resp.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("No access_token in response");
  return data.access_token;
}

function parseVttToLines(vtt: string): string[] {
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

    const bl = raw.split("\n");
    while (bl.length && /^\d+$/.test(bl[0].trim())) bl.shift();
    while (bl.length && /-->/.test(bl[0])) bl.shift();

    const text = bl
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) lines.push(text);
  }

  const out: string[] = [];
  for (const l of lines) {
    if (out.length === 0 || out[out.length - 1] !== l) out.push(l);
  }
  return out;
}

async function main() {
  const sessionId = must(process.env.SESSION_ID, "SESSION_ID");
  const meetingId = must(process.env.ZOOM_MEETING_ID, "ZOOM_MEETING_ID");
  const bulkUrl = must(
    process.env.CONVEX_TRANSCRIPTION_BULK_URL,
    "CONVEX_TRANSCRIPTION_BULK_URL"
  );
  const secret = must(process.env.TRANSCRIPTION_SECRET, "TRANSCRIPTION_SECRET");

  const accessToken = await getZoomAccessToken();

  const recordingsResp = await fetch(
    `${ZOOM_API_BASE}/meetings/${encodeURIComponent(meetingId)}/recordings`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!recordingsResp.ok) {
    throw new Error(
      `Recordings error: ${recordingsResp.status} ${await recordingsResp.text()}`
    );
  }

  const recordings = (await recordingsResp.json()) as any;
  const files = (recordings.recording_files ?? []) as any[];

  const transcriptFile = files.find((f) => {
    const ext = String(f.file_extension ?? "").toLowerCase();
    const type = String(f.file_type ?? "").toUpperCase();
    return ext === "vtt" && (type === "TRANSCRIPT" || type === "CC" || type === "CHAT");
  });

  if (!transcriptFile?.download_url) {
    throw new Error("No transcript (.vtt) found for this meeting.");
  }

  const dl = new URL(transcriptFile.download_url);
  if (!dl.searchParams.has("access_token")) dl.searchParams.set("access_token", accessToken);

  const vttResp = await fetch(dl.toString());
  if (!vttResp.ok) {
    throw new Error(
      `Transcript download error: ${vttResp.status} ${await vttResp.text()}`
    );
  }

  const vtt = await vttResp.text();
  const lines = parseVttToLines(vtt);

  const payload = {
    sessionId,
    secret,
    lines: lines.map((text, i) => ({
      text,
      source: "zoom_vtt",
      createdAt: Date.now() + i,
    })),
  };

  const pushResp = await fetch(bulkUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!pushResp.ok) {
    throw new Error(`Convex push error: ${pushResp.status} ${await pushResp.text()}`);
  }

  console.log(`Imported ${lines.length} lines into session ${sessionId}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
