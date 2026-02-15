import { useMemo, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Mic, MicOff, Loader2, Copy, DownloadCloud, Ear } from "lucide-react";
import { useRealtimeTranscription } from "../hooks/useRealtimeTranscription";

export function TranscriptionControls({ sessionId }: { sessionId: Id<"sessions"> }) {
  const {
    isRecording,
    isConnecting,
    error,
    startRecording,
    stopRecording,
  } = useRealtimeTranscription({ sessionId });

  const importZoomTranscript = useAction(api.zoom.importZoomTranscript);

  const [meetingId, setMeetingId] = useState("");
  const [zoomStatus, setZoomStatus] = useState<
    "idle" | "importing" | "success" | "error"
  >("idle");
  const [zoomMessage, setZoomMessage] = useState<string>("");

  const [convexSiteUrl, setConvexSiteUrl] = useState(
    import.meta.env.VITE_CONVEX_SITE_URL ?? ""
  );
  const [transcriptionSecret, setTranscriptionSecret] = useState("");

  const curlTemplate = useMemo(() => {
    const url = convexSiteUrl
      ? `${convexSiteUrl.replace(/\/$/, "")}/transcription`
      : "<YOUR_CONVEX_SITE_URL>/transcription";

    return `curl -X POST "${url}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"sessionId":"${sessionId}","text":"hello world","secret":"${transcriptionSecret || "<TRANSCRIPTION_SECRET>"}","source":"local_loopback"}'`;
  }, [convexSiteUrl, transcriptionSecret, sessionId]);

  const browserbaseTemplate = useMemo(() => {
    const url = convexSiteUrl
      ? `${convexSiteUrl.replace(/\/$/, "")}/transcription`
      : "<YOUR_CONVEX_SITE_URL>/transcription";

    // Runs with bun (repo already uses bun)
    return `SESSION_ID=${sessionId} \\\nCONVEX_TRANSCRIPTION_URL="${url}" \\\nTRANSCRIPTION_SECRET="${transcriptionSecret || "<TRANSCRIPTION_SECRET>"}" \\\nZOOM_JOIN_URL="<ZOOM_WEB_CLIENT_JOIN_URL>" \\\nBROWSERBASE_API_KEY="<BROWSERBASE_API_KEY>" \\\nbun scripts/ears/browserbase_zoom_captions.ts`;
  }, [convexSiteUrl, transcriptionSecret, sessionId]);

  const loopbackTemplate = useMemo(() => {
    const url = convexSiteUrl
      ? `${convexSiteUrl.replace(/\/$/, "")}/transcription`
      : "<YOUR_CONVEX_SITE_URL>/transcription";

    return `export GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>\n` +
      `python scripts/ears/local_loopback_gemini.py \\\n  --session-id "${sessionId}" \\\n  --convex-url "${url}" \\\n  --secret "${transcriptionSecret || "<TRANSCRIPTION_SECRET>"}"`;
  }, [convexSiteUrl, transcriptionSecret, sessionId]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const onImportZoom = async () => {
    const id = meetingId.trim();
    if (!id) return;

    setZoomStatus("importing");
    setZoomMessage("");
    try {
      const res = await importZoomTranscript({ sessionId, meetingId: id });
      setZoomStatus("success");
      setZoomMessage(`Imported ${res.imported} transcript lines from Zoom.`);
    } catch (e) {
      setZoomStatus("error");
      setZoomMessage(e instanceof Error ? e.message : "Failed to import transcript.");
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-red-600 text-sm bg-red-50 border-2 border-red-200 p-3 rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Live mic transcription (existing flow) */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isConnecting}
        className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl border-2 border-ink font-bold text-lg transition-all shadow-comic-sm hover:shadow-comic hover:-translate-y-0.5 active:translate-y-0 active:shadow-comic-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-comic-sm disabled:hover:translate-y-0 ${isRecording ? "bg-coral text-white" : "bg-soft-purple text-white"
          }`}
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Connecting...
          </>
        ) : isRecording ? (
          <>
            <MicOff className="w-5 h-5" />
            Stop Transcription
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            Start Transcription
          </>
        )}
      </button>

      {isRecording && (
        <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse border border-green-600" />
          Live transcription active
        </div>
      )}

      {/* Track 4: "Ears" – alternative ingestion */}
      <div className="border-2 border-ink rounded-2xl p-4 bg-white shadow-comic-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 bg-mustard/20 rounded-2xl border-2 border-ink flex items-center justify-center">
            <Ear className="w-5 h-5 text-ink" />
          </div>
          <div>
            <div className="font-black text-lg">Ears (Data Ingestion)</div>
            <div className="text-sm font-bold text-slate-500">
              Import or pipe transcripts without a Zoom bot.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Zoom post-hoc import */}
          <div className="border-2 border-ink rounded-2xl p-4 bg-slate-50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-black">Approach B: Zoom Post‑Hoc API</div>
                <div className="text-sm font-bold text-slate-500">
                  After class ends, pull the cloud recording transcript (.vtt).
                </div>
              </div>
              <DownloadCloud className="w-5 h-5 text-ink" />
            </div>

            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                placeholder="Zoom Meeting ID"
                className="flex-1 px-4 py-3 rounded-xl border-2 border-ink font-bold bg-white"
              />
              <button
                onClick={onImportZoom}
                disabled={zoomStatus === "importing"}
                className="px-5 py-3 rounded-xl border-2 border-ink font-black bg-white shadow-comic-sm hover:shadow-comic hover:-translate-y-0.5 active:translate-y-0 active:shadow-comic-sm disabled:opacity-50"
              >
                {zoomStatus === "importing" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Importing...
                  </span>
                ) : (
                  "Import"
                )}
              </button>
            </div>

            {zoomMessage && (
              <div
                className={`mt-3 text-sm font-bold border-2 rounded-xl p-3 ${zoomStatus === "error"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-green-50 border-green-200 text-green-700"
                  }`}
              >
                {zoomMessage}
              </div>
            )}
          </div>

          {/* External ingestion helpers */}
          <div className="border-2 border-ink rounded-2xl p-4 bg-slate-50">
            <div className="font-black">Approach A/C: External Piping</div>
            <div className="text-sm font-bold text-slate-500 mt-1">
              Use the scripts in <span className="font-mono">scripts/ears/</span> to push text into this session.
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={convexSiteUrl}
                onChange={(e) => setConvexSiteUrl(e.target.value)}
                placeholder="VITE_CONVEX_SITE_URL (https://...convex.site)"
                className="px-4 py-3 rounded-xl border-2 border-ink font-bold bg-white"
              />
              <input
                value={transcriptionSecret}
                onChange={(e) => setTranscriptionSecret(e.target.value)}
                placeholder="TRANSCRIPTION_SECRET"
                className="px-4 py-3 rounded-xl border-2 border-ink font-bold bg-white"
              />
            </div>

            <div className="mt-3 space-y-3">
              <ScriptBlock
                title="Local Loopback → Gemini (Python)"
                code={loopbackTemplate}
                onCopy={() => copyToClipboard(loopbackTemplate)}
              />
              <ScriptBlock
                title="BrowserBase CC Scrape (bun + Playwright)"
                code={browserbaseTemplate}
                onCopy={() => copyToClipboard(browserbaseTemplate)}
              />
              <ScriptBlock
                title="Raw curl (send a line)"
                code={curlTemplate}
                onCopy={() => copyToClipboard(curlTemplate)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScriptBlock({
  title,
  code,
  onCopy,
}: {
  title: string;
  code: string;
  onCopy: () => void;
}) {
  return (
    <div className="bg-white border-2 border-ink rounded-2xl p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-black text-sm">{title}</div>
        <button
          onClick={onCopy}
          className="px-3 py-2 rounded-xl border-2 border-ink bg-white shadow-comic-sm hover:shadow-comic hover:-translate-y-0.5 active:translate-y-0 active:shadow-comic-sm font-black text-xs inline-flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Copy
        </button>
      </div>
      <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-x-auto">
        {code}
      </pre>
    </div>
  );
}
