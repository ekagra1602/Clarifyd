import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/join")({ component: JoinPage });

function JoinPage() {
  const navigate = useNavigate();
  const joinSession = useMutation(api.sessions.joinSession);
  // Initialize code from URL search param manually to avoid strict route validation issues
  const [code, setCode] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("code") || "";
    }
    return "";
  });
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter a join code");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const result = await joinSession({ code: code.trim().toLowerCase() });
      // Store studentId in localStorage for persistence across reloads/rejoins
      localStorage.setItem(`studentId-${result.sessionId}`, result.studentId);
      // Also set sessionStorage as a fallback/redundancy
      sessionStorage.setItem(`studentId-${result.sessionId}`, result.studentId);
      navigate({
        to: "/session/$sessionId",
        params: { sessionId: result.sessionId },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join session");
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-lavender-bg py-20 px-6 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto bg-white p-8 rounded-[2.5rem] shadow-comic border-2 border-ink relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-soft-purple/15 rounded-tr-[100px] -z-0" />

        <h1 className="text-4xl font-extrabold text-ink text-center mb-4 relative z-10">
          Join Session
        </h1>
        <p className="text-slate-500 font-bold text-center mb-10 relative z-10">
          Enter the code from your teacher to join the lecture.
        </p>

        <form onSubmit={handleJoin} className="space-y-6 relative z-10">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. blue-tiger-42"
              className="w-full px-4 py-5 bg-white border-2 border-ink rounded-2xl text-ink placeholder-slate-300 outline-none focus:border-coral focus:shadow-comic transition-all text-center text-xl font-extrabold font-mono"
            />
            {error && (
              <p className="mt-2 text-red-600 font-bold text-sm text-center border-2 border-red-300 bg-red-50 py-2 rounded-lg">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isJoining}
            className="w-full inline-flex items-center justify-center gap-3 px-8 py-5 bg-coral hover:bg-coral-dark disabled:opacity-50 text-white font-extrabold rounded-2xl border-2 border-ink shadow-comic text-xl btn-press"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Join Class
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
