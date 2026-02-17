import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { ArrowRight, Loader2, Hash } from "lucide-react";

export const Route = createFileRoute("/join")({ component: JoinPage });

function JoinPage() {
  const navigate = useNavigate();
  const joinSession = useMutation(api.sessions.joinSession);
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
      localStorage.setItem(`studentId-${result.sessionId}`, result.studentId);
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-aurora bg-grid">
      <div className="max-w-sm w-full">
        <div className="card-glass p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-secondary to-transparent" />

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-secondary/15 border border-secondary/20 flex items-center justify-center mx-auto mb-5">
              <Hash className="w-6 h-6 text-secondary-light" />
            </div>
            <h1 className="text-2xl font-display font-bold text-text-primary mb-2">
              Join Session
            </h1>
            <p className="text-text-muted text-sm">
              Enter the code from your teacher
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. blue-tiger-42"
                className="w-full px-4 py-4 bg-bg-input border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-secondary/50 focus:shadow-glow-secondary transition-all text-center text-lg font-mono font-semibold tracking-wider"
              />
              {error && (
                <p className="mt-2.5 text-accent text-sm font-medium text-center bg-accent/10 border border-accent/20 py-2 rounded-lg">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isJoining}
              className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-secondary to-secondary-light hover:opacity-90 disabled:opacity-40 text-white font-semibold rounded-xl text-base btn-press shadow-glow-secondary"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join Class
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
