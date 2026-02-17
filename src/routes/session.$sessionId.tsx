import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useAction } from "convex/react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect, useRef, useCallback } from "react";
import { usePaginatedTranscript } from "../hooks/usePaginatedTranscript";
import {
  Loader2,
  Sparkles,
  ThumbsUp,
  Send,
  CheckCircle2,
  MessageCircle,
  Users,
  Download,
  Clapperboard,
  Wand2,
  XCircle,
  Globe,
  MessageSquare,
  X,
  Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { LeaderboardModal } from "../components/LeaderboardModal";
import { ProfileOnboardingModal } from "../components/ProfileOnboardingModal";

export const Route = createFileRoute("/session/$sessionId")({
  component: StudentSessionPage,
  ssr: false,
});

function StudentSessionPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [isQAOpen, setIsQAOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const keepAlive = useMutation(api.sessions.keepAlive);

  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const generateSessionNotesAction = useAction(api.ai.service.generateSessionNotes);

  const handleDownloadNotes = async () => {
    setIsGeneratingNotes(true);
    try {
      const markdownNotes = await generateSessionNotesAction({
        sessionId: sessionId as Id<"sessions">
      });
      const blob = new Blob([markdownNotes], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "session-notes.md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Failed to generate notes:", error);
      alert(error.message || "Failed to generate notes.");
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(`studentId-${sessionId}`) || sessionStorage.getItem(`studentId-${sessionId}`);
    if (stored) setStudentId(stored);
    setCheckedStorage(true);
  }, [sessionId]);

  useEffect(() => {
    if (checkedStorage && !studentId) navigate({ to: "/join" });
  }, [checkedStorage, studentId, navigate]);

  useEffect(() => {
    if (!studentId || !sessionId) return;
    keepAlive({ sessionId: sessionId as Id<"sessions">, studentId });
    const interval = setInterval(() => {
      keepAlive({ sessionId: sessionId as Id<"sessions">, studentId });
    }, 5000);
    return () => clearInterval(interval);
  }, [studentId, sessionId, keepAlive]);

  const session = useQuery(api.sessions.getSession, { sessionId: sessionId as Id<"sessions"> });
  const paginatedTranscript = usePaginatedTranscript(sessionId as Id<"sessions">);
  const activeQuiz = useQuery(api.quizzes.getActiveQuiz, { sessionId: sessionId as Id<"sessions"> });
  const studentState = useQuery(api.sessions.getStudentState,
    studentId ? { sessionId: sessionId as Id<"sessions">, studentId } : "skip"
  );
  const studentCount = useQuery(api.sessions.getStudentCount, { sessionId: sessionId as Id<"sessions"> });
  const recentQuestions = useQuery(api.questions.listRecentQuestions, {
    sessionId: sessionId as Id<"sessions">,
    studentId: studentId ?? undefined,
  });

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session.status === "ended") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-aurora bg-grid">
        <div className="card-glass p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-secondary/15 border border-secondary/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-secondary-light" />
          </div>
          <h1 className="text-2xl font-display font-bold text-text-primary mb-2">Session Ended</h1>
          <p className="text-text-muted mb-6">Great work today.</p>
          <button
            onClick={handleDownloadNotes}
            disabled={isGeneratingNotes}
            className="w-full card-glass-hover py-3 px-5 text-text-primary font-semibold flex items-center justify-center gap-2 btn-press"
          >
            {isGeneratingNotes ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating Notes...</>
            ) : (
              <><Download className="w-4 h-4" /> Download Summary Notes</>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-bg-primary flex overflow-hidden relative bg-grid">

      {/* Quiz Overlay */}
      <AnimatePresence>
        {activeQuiz && studentId && <QuizModal quiz={activeQuiz} studentId={studentId} />}
      </AnimatePresence>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <LeaderboardModal
            sessionId={sessionId as Id<"sessions">}
            currentStudentId={studentId}
            onClose={() => setShowLeaderboard(false)}
          />
        )}
      </AnimatePresence>

      {/* Profile onboarding */}
      <AnimatePresence>
        {(showProfileModal || (studentState && !studentState.profileComplete && !hasCompletedOnboarding)) && studentId && (
          <ProfileOnboardingModal
            sessionId={sessionId as Id<"sessions">}
            studentId={studentId}
            initialProfile={studentState ?? undefined}
            isEdit={showProfileModal}
            onClose={() => {
              setShowProfileModal(false);
              if (studentState && !studentState.profileComplete) setHasCompletedOnboarding(true);
            }}
            onSaved={() => {
              setHasCompletedOnboarding(true);
              setShowProfileModal(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full transition-all duration-300">

        {/* Header */}
        <div className="absolute top-5 left-5 right-5 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="card-glass px-3.5 py-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-lime rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-lime tracking-wide">LIVE</span>
            </div>
            <div className="card-glass px-3.5 py-2 font-semibold text-text-secondary text-sm hidden lg:block">
              {session.roomName || "Classroom"}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="card-glass px-3.5 py-2 font-mono font-semibold text-primary-light text-xs tracking-wider">
              #{session.code}
            </div>
            <div className="card-glass px-3.5 py-2 font-semibold text-text-secondary text-sm flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-text-muted" />
              <span className="tabular-nums">{studentCount ?? "..."}</span>
            </div>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="card-glass-hover px-3 py-2 flex items-center gap-1.5"
              title="Leaderboard"
            >
              <Trophy className="w-3.5 h-3.5 text-warm" />
              <span className="text-xs font-semibold tabular-nums text-text-secondary">{studentState?.currentStreak ?? 0}</span>
            </button>
            <button
              onClick={() => setShowProfileModal(true)}
              className="card-glass-hover px-3 py-2 text-xs font-semibold text-text-secondary"
              title="Profile"
            >
              Profile
            </button>
          </div>
        </div>

        {/* Transcript Area */}
        <TranscriptView
          transcript={paginatedTranscript.lines}
          hasMore={paginatedTranscript.hasMore}
          isLoadingMore={paginatedTranscript.isLoadingMore}
          onLoadMore={paginatedTranscript.loadMore}
        />

        {/* Floating Bottom Controls */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          <button
            onClick={() => {
              const next = !isVideoOpen;
              setIsVideoOpen(next);
              if (next) setIsQAOpen(false);
            }}
            className={clsx(
              "h-12 px-5 rounded-xl font-semibold text-sm flex items-center gap-2.5 transition-all btn-press border",
              isVideoOpen
                ? "bg-secondary text-white border-secondary shadow-glow-secondary"
                : "bg-bg-card backdrop-blur-xl text-text-secondary border-border hover:bg-bg-card-hover hover:border-border-hover"
            )}
          >
            <Clapperboard className="w-4 h-4" />
            {isVideoOpen ? "Close Video" : "Video Studio"}
          </button>

          <button
            onClick={() => {
              const next = !isQAOpen;
              setIsQAOpen(next);
              if (next) setIsVideoOpen(false);
            }}
            className={clsx(
              "h-12 px-5 rounded-xl font-semibold text-sm flex items-center gap-2.5 transition-all btn-press border",
              isQAOpen
                ? "bg-primary text-white border-primary shadow-glow"
                : "bg-bg-card backdrop-blur-xl text-text-secondary border-border hover:bg-bg-card-hover hover:border-border-hover"
            )}
          >
            <MessageCircle className="w-4 h-4" />
            {isQAOpen ? "Close Chat" : "Ask Question"}
          </button>
        </div>
      </div>

      {/* Chat Overlay */}
      <AnimatePresence>
        {isQAOpen && studentId && (
          <ChatOverlay
            sessionId={sessionId as Id<"sessions">}
            studentId={studentId}
            questions={recentQuestions ?? []}
            currentTranscriptLine={
              paginatedTranscript.lines.length > 0
                ? paginatedTranscript.lines[paginatedTranscript.lines.length - 1].text
                : null
            }
            onClose={() => setIsQAOpen(false)}
            instructorName={session.instructorName}
            instructorAvatar={session.instructorAvatar}
          />
        )}
      </AnimatePresence>

      {/* Video Studio Overlay */}
      <AnimatePresence>
        {isVideoOpen && studentId && (
          <VideoStudioOverlay
            sessionId={sessionId as Id<"sessions">}
            studentId={studentId}
            activeVideoUrl={activeVideoUrl}
            setActiveVideoUrl={setActiveVideoUrl}
            currentTranscriptLine={
              paginatedTranscript.lines.length > 0
                ? paginatedTranscript.lines[paginatedTranscript.lines.length - 1].text
                : null
            }
            onClose={() => {
              setIsVideoOpen(false);
              setActiveVideoUrl(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function VideoStudioOverlay({
  sessionId, studentId, activeVideoUrl, setActiveVideoUrl, currentTranscriptLine, onClose,
}: {
  sessionId: Id<"sessions">; studentId: string; activeVideoUrl: string | null;
  setActiveVideoUrl: (url: string | null) => void; currentTranscriptLine: string | null; onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [isSubmittingTranscript, setIsSubmittingTranscript] = useState(false);
  const prevVideoRequestsRef = useRef<string | null>(null);

  const videoRequests = useQuery(api.videos.listStudentVideoRequests, { sessionId, studentId, limit: 10 });
  const createFromTranscript = useMutation(api.videos.createVideoFromTranscript);
  const createFromPrompt = useMutation(api.videos.createVideoFromStudentPrompt);

  useEffect(() => {
    if (!videoRequests || videoRequests.length === 0) return;
    const latest = videoRequests[videoRequests.length - 1];
    const latestKey = `${latest._id}-${latest.status}`;
    if (latest.status === "completed" && latest.videoUrl && prevVideoRequestsRef.current !== latestKey) {
      setActiveVideoUrl(latest.videoUrl);
    }
    prevVideoRequestsRef.current = latestKey;
  }, [videoRequests, setActiveVideoUrl]);

  const handleTranscriptVideo = async () => {
    if (isSubmittingTranscript) return;
    setIsSubmittingTranscript(true);
    setActiveVideoUrl(null);
    try { await createFromTranscript({ sessionId, studentId }); }
    catch (error) { console.error("Failed to create transcript video request:", error); }
    finally { setIsSubmittingTranscript(false); }
  };

  const handleCustomPromptVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isSubmittingCustom) return;
    setIsSubmittingCustom(true);
    setActiveVideoUrl(null);
    try { await createFromPrompt({ sessionId, studentId, prompt: prompt.trim() }); setPrompt(""); }
    catch (error) { console.error("Failed to create custom video request:", error); }
    finally { setIsSubmittingCustom(false); }
  };

  const latestRequest = videoRequests && videoRequests.length > 0 ? videoRequests[videoRequests.length - 1] : null;
  const isGenerating = latestRequest?.status === "queued" || latestRequest?.status === "processing";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex flex-col"
    >
      <div className="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden">
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: "spring", bounce: 0.12, duration: 0.45 }}
          className="card-glass w-full max-w-3xl max-h-[calc(100vh-100px)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
            <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary/15 border border-secondary/20 flex items-center justify-center">
                <Clapperboard className="w-4 h-4 text-secondary-light" />
              </div>
              Video Studio
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-bg-elevated rounded-lg transition-colors">
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-4">
              {activeVideoUrl ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <video src={activeVideoUrl} controls autoPlay className="w-full rounded-xl border border-border bg-black" style={{ maxHeight: "350px" }} />
                </motion.div>
              ) : isGenerating ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-secondary/5 border border-dashed border-secondary/20 rounded-xl flex flex-col items-center justify-center py-12 gap-3"
                >
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                    <Clapperboard className="w-8 h-8 text-secondary" />
                  </motion.div>
                  <p className="font-semibold text-text-primary">Generating your video...</p>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="w-1.5 h-1.5 bg-secondary rounded-full"
                        animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                  {latestRequest?.optimizedPrompt && (
                    <p className="text-xs text-text-muted text-center px-6 mt-2 italic max-w-md">&ldquo;{latestRequest.optimizedPrompt}&rdquo;</p>
                  )}
                </motion.div>
              ) : (
                <div className="bg-bg-elevated border border-dashed border-border rounded-xl flex flex-col items-center justify-center py-12 gap-2">
                  <Clapperboard className="w-8 h-8 text-text-muted/30" />
                  <p className="text-text-muted text-sm text-center">Generate a video from your lecture or type a custom prompt</p>
                </div>
              )}

              {latestRequest?.status === "failed" && latestRequest.error && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-accent/10 border border-accent/20 rounded-xl p-3 flex items-start gap-2"
                >
                  <XCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <p className="text-sm font-medium text-accent">{latestRequest.error}</p>
                </motion.div>
              )}

              <div className="space-y-3">
                <button onClick={handleTranscriptVideo} disabled={isSubmittingTranscript || isGenerating}
                  className="w-full bg-gradient-to-r from-secondary to-secondary-light text-white rounded-xl px-5 py-3.5 font-semibold shadow-glow-secondary btn-press flex items-center justify-center gap-3 disabled:opacity-40"
                >
                  {isSubmittingTranscript || (isGenerating && latestRequest?.triggerType === "transcript")
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Wand2 className="w-4 h-4" />}
                  Generate from Current Lecture
                </button>

                <div className="flex items-center gap-3 opacity-30">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <form onSubmit={handleCustomPromptVideo} className="flex gap-2">
                  <input value={prompt} onChange={(e) => setPrompt(e.target.value)}
                    placeholder='e.g. "Explain gravity with a visual simulation"'
                    className="flex-1 px-4 py-3 bg-bg-input border border-border rounded-xl outline-none text-text-primary font-medium text-sm placeholder:text-text-muted focus:border-primary/40 focus:shadow-glow-sm transition-all"
                    disabled={isGenerating} />
                  <button type="submit" disabled={!prompt.trim() || isSubmittingCustom || isGenerating}
                    className="px-5 py-3 bg-primary text-white rounded-xl shadow-glow-sm btn-press font-semibold disabled:opacity-30 flex items-center gap-2"
                  >
                    {isSubmittingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span className="hidden sm:inline">Generate</span>
                  </button>
                </form>
              </div>

              {videoRequests && videoRequests.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-3">Previous Generations</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[...videoRequests].reverse().map((request) => {
                      const isActive = activeVideoUrl === request.videoUrl;
                      return (
                        <button key={request._id}
                          onClick={() => { if (request.status === "completed" && request.videoUrl) setActiveVideoUrl(request.videoUrl); }}
                          disabled={request.status !== "completed"}
                          className={clsx(
                            "text-left bg-bg-elevated border rounded-xl p-3 transition-all",
                            request.status === "completed" ? "border-border hover:border-border-hover cursor-pointer" : "border-border/50 opacity-50 cursor-default",
                            isActive && "ring-1 ring-secondary ring-offset-1 ring-offset-bg-primary"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                              {request.triggerType === "transcript" ? "Lecture" : "Prompt"}
                            </span>
                            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-semibold",
                              request.status === "completed" ? "bg-lime/15 text-lime" :
                              request.status === "failed" ? "bg-accent/15 text-accent" :
                              "bg-warm/15 text-warm"
                            )}>{request.status}</span>
                          </div>
                          <p className="text-xs font-medium text-text-secondary line-clamp-2">{request.studentPrompt ?? request.sourcePrompt}</p>
                          {request.optimizedPrompt && <p className="text-[10px] mt-1 text-text-muted line-clamp-1 italic">{request.optimizedPrompt}</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Live Transcript Ticker */}
      <div className="shrink-0 px-4 pb-5 pt-1">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-3xl mx-auto">
          {currentTranscriptLine ? (
            <div className="card-glass px-5 py-3 flex items-center gap-3">
              <div className="shrink-0 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Live</span>
              </div>
              <p className="font-medium text-text-primary text-sm truncate">{currentTranscriptLine}</p>
            </div>
          ) : (
            <div className="bg-bg-card/50 backdrop-blur-md border border-dashed border-border rounded-2xl px-5 py-3 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
              <p className="text-text-muted text-sm">Waiting for teacher to speak...</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function TranscriptView({
  transcript, hasMore, isLoadingMore, onLoadMore,
}: {
  transcript: { _id: string; text: string; createdAt: number; source?: string }[];
  hasMore: boolean; isLoadingMore: boolean; onLoadMore: () => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const shouldAutoScrollRef = useRef(true);
  const prevTranscriptLengthRef = useRef(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isLoadingMore) return;
    prevScrollHeightRef.current = container.scrollHeight;
  }, [isLoadingMore]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || prevScrollHeightRef.current === 0) return;
    const newScrollHeight = container.scrollHeight;
    const heightDiff = newScrollHeight - prevScrollHeightRef.current;
    if (heightDiff > 0 && !shouldAutoScrollRef.current) container.scrollTop += heightDiff;
    prevScrollHeightRef.current = 0;
  }, [transcript.length]);

  useEffect(() => {
    if (transcript.length > prevTranscriptLengthRef.current && shouldAutoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevTranscriptLengthRef.current = transcript.length;
  }, [transcript]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
    if (scrollTop < 200 && hasMore && !isLoadingMore) onLoadMore();
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div ref={scrollContainerRef} onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 pt-24 pb-32 max-w-3xl mx-auto w-full"
    >
      <div className="flex flex-col gap-6 min-h-full justify-end pb-4">
        <div ref={topSentinelRef} className="h-1" />
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
            <span className="ml-2 text-sm text-text-muted">Loading earlier transcript...</span>
          </div>
        )}
        {hasMore && !isLoadingMore && transcript.length > 0 && (
          <button onClick={onLoadMore} className="flex items-center justify-center py-2 text-sm text-text-muted hover:text-text-secondary transition-colors">
            Load earlier transcript
          </button>
        )}

        {transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40 flex-1">
            <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-dashed border-border flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-text-muted/40" />
            </div>
            <p className="text-text-muted text-sm">Waiting for teacher to speak...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 opacity-50 px-2 sticky top-0 z-10 bg-bg-primary/80 backdrop-blur-sm py-2 -mx-2 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
              <span className="text-[10px] font-semibold tracking-widest uppercase text-text-muted">Live Transcript</span>
              {transcript.length > 50 && <span className="text-[10px] text-text-muted ml-auto">{transcript.length} lines</span>}
            </div>
            <div className="flex flex-col gap-6 px-4">
              {transcript.map((line, index) => {
                const isRecent = index === transcript.length - 1;
                return (
                  <motion.div key={line._id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }} layout
                    className={clsx("text-left transition-all duration-500 ease-out",
                      isRecent ? "opacity-100" : "opacity-30"
                    )}
                  >
                    <p className={clsx("font-medium leading-relaxed transition-all duration-500",
                      isRecent ? "text-2xl md:text-3xl text-text-primary" : "text-lg md:text-xl text-text-muted"
                    )}>
                      {line.text}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

import { AvatarPreview } from "../components/AvatarPreview";

function ChatOverlay({
  sessionId, studentId, questions, currentTranscriptLine, onClose, instructorName, instructorAvatar
}: {
  sessionId: Id<"sessions">; studentId: string;
  questions: { _id: string; question: string; answer?: string; isApproved?: boolean; translatedQuestion?: string; translatedAnswer?: string; originalLanguage?: string; createdAt: number; teacherFollowUp?: string; translatedTeacherFollowUp?: string }[];
  currentTranscriptLine: string | null; onClose: () => void; instructorName?: string; instructorAvatar?: any;
}) {
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const askQuestion = useMutation(api.questions.askQuestion);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [questions]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAsking) return;
    setIsAsking(true);
    try { await askQuestion({ sessionId, studentId, question: input.trim() }); setInput(""); }
    catch (error) { console.error("Failed to ask question:", error); }
    setIsAsking(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex flex-col"
    >
      <div className="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden">
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          transition={{ type: "spring", bounce: 0.12, duration: 0.45 }}
          className="card-glass w-full max-w-2xl max-h-[calc(100vh-100px)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
            <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-warm/15 border border-warm/20 flex items-center justify-center overflow-hidden">
                {instructorAvatar ? (
                  <AvatarPreview avatar={instructorAvatar} size="sm" />
                ) : (
                  <Sparkles className="w-4 h-4 text-warm-light" />
                )}
              </div>
              {instructorName || "AI Assistant"}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-bg-elevated rounded-lg transition-colors">
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4" ref={scrollRef}>
            {questions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-muted gap-3 py-12">
                <MessageCircle className="w-10 h-10 opacity-20" />
                <p className="text-sm text-center">
                  Ask anything about the lecture!<br />
                  <span className="text-xs text-text-muted/60">AI will answer based on what the teacher is saying.</span>
                </p>
              </div>
            ) : (
              questions.map((q) => (
                <div key={q._id} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="bg-primary/20 border border-primary/20 text-text-primary rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
                      <p className="font-medium text-sm">{q.question}</p>
                    </div>
                  </div>
                  {q.answer && (
                    <div className="flex justify-start">
                      <div className={clsx(
                        "border rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]",
                        q.isApproved ? "bg-bg-elevated border-border" : "bg-warm/5 border-warm/20"
                      )}>
                        {q.translatedAnswer ? (
                          <div className="space-y-1">
                            <p className="font-medium text-sm text-text-secondary">{q.translatedAnswer}</p>
                            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider flex items-center gap-1">
                              <Globe className="w-3 h-3" /> Translated
                            </p>
                          </div>
                        ) : (
                          <p className="font-medium text-sm text-text-secondary">{q.answer}</p>
                        )}

                        {(q.teacherFollowUp || q.translatedTeacherFollowUp) && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-start gap-2">
                              <div className="bg-primary/10 p-1.5 rounded-lg shrink-0">
                                <MessageSquare className="w-3 h-3 text-primary-light" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-primary-light font-semibold uppercase tracking-wider">Teacher Note</p>
                                <p className="text-sm text-text-secondary">{q.translatedTeacherFollowUp || q.teacherFollowUp}</p>
                                {q.translatedTeacherFollowUp && (
                                  <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider flex items-center gap-1">
                                    <Globe className="w-3 h-3" /> Translated
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {!q.isApproved && !q.teacherFollowUp && (
                          <p className="text-[10px] text-warm font-semibold mt-2 flex items-center gap-1 uppercase tracking-wider">
                            <Loader2 className="w-3 h-3 animate-spin" /> Verifying...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the lecture..."
                className="flex-1 px-4 py-3 bg-bg-input border border-border rounded-xl outline-none text-text-primary font-medium placeholder-text-muted focus:border-primary/40 focus:shadow-glow-sm transition-all text-sm" />
              <button type="submit" disabled={!input.trim() || isAsking}
                className="px-5 py-3 bg-primary text-white rounded-xl shadow-glow-sm btn-press font-semibold disabled:opacity-30 flex items-center gap-2"
              >
                {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Live Transcript Ticker */}
      <div className="shrink-0 px-4 pb-5 pt-1">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-2xl mx-auto">
          {currentTranscriptLine ? (
            <div className="card-glass px-5 py-3 flex items-center gap-3">
              <div className="shrink-0 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Live</span>
              </div>
              <p className="font-medium text-text-primary text-sm truncate">{currentTranscriptLine}</p>
            </div>
          ) : (
            <div className="bg-bg-card/50 backdrop-blur-md border border-dashed border-border rounded-2xl px-5 py-3 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
              <p className="text-text-muted text-sm">Waiting for teacher to speak...</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function getSubmittedQuizKey(quizId: string) { return `quiz-submitted-${quizId}`; }

function QuizModal({ quiz, studentId }: { quiz: any; studentId: string }) {
  const [answers, setAnswers] = useState<number[]>(new Array(quiz.questions.length).fill(-1));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitQuiz = useMutation(api.quizzes.submitQuiz);

  const hasSubmitted = useQuery(api.quizzes.hasStudentSubmitted, { quizId: quiz._id, studentId });
  const [localSubmitted, setLocalSubmitted] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem(getSubmittedQuizKey(quiz._id)) === "true";
    return false;
  });

  const submitted = hasSubmitted === true || localSubmitted;

  const handleSelectAnswer = (qi: number, ci: number) => {
    if (submitted) return;
    const newAnswers = [...answers];
    newAnswers[qi] = ci;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (answers.some(a => a === -1)) { alert("Please answer all questions"); return; }
    setIsSubmitting(true);
    try {
      await submitQuiz({ quizId: quiz._id, studentId, answers });
      sessionStorage.setItem(getSubmittedQuizKey(quiz._id), "true");
      setLocalSubmitted(true);
    } catch (e) { console.error(e); }
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      >
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
          className="card-glass p-10 max-w-sm w-full text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-lime/15 border border-lime/20 flex items-center justify-center mx-auto mb-6">
            <ThumbsUp className="w-8 h-8 text-lime" />
          </div>
          <h2 className="text-2xl font-display font-bold text-text-primary mb-2">Submitted!</h2>
          <p className="text-text-muted text-sm">Responses sent successfully.</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"
    >
      <motion.div initial={{ y: 50 }} animate={{ y: 0 }}
        className="card-glass p-6 max-w-xl w-full my-8 max-h-[85vh] overflow-y-auto"
      >
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-warm/15 border border-warm/20 mb-3">
            <span className="text-xs font-semibold text-warm-light tracking-wide">Pop Quiz</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-text-primary">Quick Check</h2>
        </div>

        <div className="space-y-7">
          {quiz.questions.map((q: any, qi: number) => (
            <div key={qi} className="space-y-3">
              <p className="text-sm font-semibold text-text-primary">{qi + 1}. {q.prompt}</p>
              <div className="space-y-2">
                {q.choices.map((choice: string, ci: number) => (
                  <button key={ci} onClick={() => handleSelectAnswer(qi, ci)}
                    className={clsx(
                      "w-full text-left px-4 py-3.5 rounded-xl font-medium text-sm transition-all border",
                      answers[qi] === ci
                        ? "border-primary bg-primary/15 text-primary-light"
                        : "border-border bg-bg-elevated text-text-secondary hover:bg-bg-card-hover hover:border-border-hover"
                    )}
                  >
                    <span className={clsx("inline-block w-7", answers[qi] === ci ? "opacity-100" : "opacity-40")}>{String.fromCharCode(65 + ci)}.</span>
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleSubmit} disabled={isSubmitting || answers.some(a => a === -1)}
          className="w-full mt-7 py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl shadow-glow btn-press disabled:opacity-40"
        >
          {isSubmitting ? "Sending..." : "Submit Answers"}
        </button>
      </motion.div>
    </motion.div>
  );
}
