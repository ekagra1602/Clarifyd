import { Mic, MicOff, Loader2 } from "lucide-react";
import { useRealtimeTranscription } from "../hooks/useRealtimeTranscription";
import { Id } from "../../convex/_generated/dataModel";

export function TranscriptionControls({ sessionId }: { sessionId: Id<"sessions"> }) {
  const {
    isRecording,
    isConnecting,
    error,
    startRecording,
    stopRecording,
  } = useRealtimeTranscription({ sessionId });

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-accent text-sm bg-accent/10 border border-accent/20 p-3 rounded-xl font-medium">
          {error}
        </div>
      )}

      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isConnecting}
        className={`w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-semibold transition-all btn-press disabled:opacity-40 ${
          isRecording
            ? "bg-accent text-white shadow-glow-accent"
            : "bg-gradient-to-r from-secondary to-secondary-light text-white shadow-glow-secondary"
        }`}
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </>
        ) : isRecording ? (
          <>
            <MicOff className="w-4 h-4" />
            Stop Transcription
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            Start Transcription
          </>
        )}
      </button>

      {isRecording && (
        <div className="flex items-center gap-2 text-lime text-sm font-medium">
          <div className="w-2 h-2 bg-lime rounded-full animate-pulse" />
          Live transcription active
        </div>
      )}
    </div>
  );
}
