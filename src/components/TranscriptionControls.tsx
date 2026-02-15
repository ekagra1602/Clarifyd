import { Id } from "../../convex/_generated/dataModel";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useRealtimeTranscription } from "../hooks/useRealtimeTranscription";

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
        <div className="text-red-600 text-sm bg-red-50 border-2 border-red-200 p-3 rounded-xl font-medium">
          {error}
        </div>
      )}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isConnecting}
        className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl border-2 border-ink font-bold text-lg transition-all shadow-comic-sm hover:shadow-comic hover:-translate-y-0.5 active:translate-y-0 active:shadow-comic-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-comic-sm disabled:hover:translate-y-0 ${
          isRecording
            ? "bg-coral text-white"
            : "bg-soft-purple text-white"
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
    </div>
  );
}
