import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useAction } from "convex/react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect, useRef, useCallback } from "react";
import { usePaginatedTranscript } from "../hooks/usePaginatedTranscript";
import {
  Loader2,
  Sparkles,
  AlertCircle,
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
    if (stored) {
      setStudentId(stored);
    }
    setCheckedStorage(true);
  }, [sessionId]);

  useEffect(() => {
    if (checkedStorage && !studentId) {
      navigate({ to: "/join" });
    }
  }, [checkedStorage, studentId, navigate]);

  // Heartbeat: Keep student active
  useEffect(() => {
    if (!studentId || !sessionId) return;
    keepAlive({ sessionId: sessionId as Id<"sessions">, studentId });
    const interval = setInterval(() => {
      keepAlive({ sessionId: sessionId as Id<"sessions">, studentId });
    }, 5000);
    return () => clearInterval(interval);
  }, [studentId, sessionId, keepAlive]);

  const session = useQuery(api.sessions.getSession, {
    sessionId: sessionId as Id<"sessions">,
  });
  const paginatedTranscript = usePaginatedTranscript(sessionId as Id<"sessions">);
  const activeQuiz = useQuery(api.quizzes.getActiveQuiz, {
    sessionId: sessionId as Id<"sessions">,
  });
  const studentState = useQuery(api.sessions.getStudentState,
    studentId ? { sessionId: sessionId as Id<"sessions">, studentId } : "skip"
  );
  const studentCount = useQuery(api.sessions.getStudentCount, {
    sessionId: sessionId as Id<"sessions">,
  });
  const recentQuestions = useQuery(api.questions.listRecentQuestions, {
    sessionId: sessionId as Id<"sessions">,
    studentId: studentId ?? undefined,
  });

  const setLostStatus = useMutation(api.sessions.setLostStatus);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session.status === "ended") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2rem] shadow-comic border-2 border-ink text-center max-w-md w-full">
          <div className="w-20 h-20 bg-mustard/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-ink">
            <CheckCircle2 className="w-10 h-10 text-ink" />
          </div>
          <h1 className="text-2xl font-black mb-2">That's a wrap!</h1>
          <p className="text-slate-500 font-bold mb-6">
            The lecture has ended. Great work today.
          </p>

          <button
            onClick={handleDownloadNotes}
            disabled={isGeneratingNotes}
            className="w-full bg-white border-2 border-ink text-ink font-bold py-3 px-6 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-comic-sm hover:translate-y-0.5 hover:shadow-none btn-press"
          >
            {isGeneratingNotes ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Notes...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>Download Summary Notes</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const handleImLostAction = async () => {
    if (!studentId) return;
    const isCurrentlyLost = studentState?.isLost;

    await setLostStatus({
      sessionId: sessionId as Id<"sessions">,
      studentId,
      isLost: !isCurrentlyLost,
    });

    if (!isCurrentlyLost) {
      setIsQAOpen(true);
    }
  };

  return (
    <div className="h-screen w-full bg-lavender-bg flex overflow-hidden relative">

      {/* Quiz Overlay */}
      <AnimatePresence>
        {activeQuiz && studentId && (
          <QuizModal quiz={activeQuiz} studentId={studentId} />
        )}
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

      {/* Profile onboarding (first-time) or edit */}
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

        {/* Header - Absolute Top Right */}
        <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
          <button
            onClick={() => setShowProfileModal(true)}
            className="bg-white border-2 border-ink rounded-xl px-3 py-2 shadow-comic-sm font-bold text-ink flex items-center justify-center gap-1.5 hover:bg-mustard/20 transition-colors btn-press"
            title="Profile"
          >
            <span className="text-sm">Profile</span>
          </button>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="bg-white border-2 border-ink rounded-xl px-3 py-2 shadow-comic-sm font-bold text-ink flex items-center justify-center gap-1.5 hover:bg-mustard/20 transition-colors btn-press"
            title="Leaderboard"
          >
            <span>🔥</span>
            <span className="text-sm tabular-nums">{studentState?.currentStreak ?? 0}</span>
          </button>
          <div className="bg-white border-2 border-ink rounded-xl px-4 py-2 shadow-comic-sm font-bold text-ink flex items-center justify-center gap-2 hidden lg:flex">
            {session.roomName || "Classroom"}
          </div>

          <div className="bg-white border-2 border-ink rounded-xl px-4 py-2 shadow-comic-sm font-bold text-ink flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-coral rounded-full animate-pulse border border-ink" />
            <span className="text-sm tracking-wide">LIVE</span>
          </div>

          <div className="bg-white border-2 border-ink rounded-xl px-4 py-2 shadow-comic-sm font-bold text-ink flex items-center justify-center gap-2 min-w-[80px]">
            <Users className="w-5 h-5 text-ink" />
            <span>{studentCount ?? "..."}</span>
          </div>

          <div className="bg-white border-2 border-ink rounded-xl px-4 py-2 shadow-comic-sm font-bold text-ink flex items-center justify-center gap-2 font-mono">
            #{session.code}
          </div>
        </div>

        {/* Transcript Area */}
        <TranscriptView
          transcript={paginatedTranscript.lines}
          hasMore={paginatedTranscript.hasMore}
          isLoadingMore={paginatedTranscript.isLoadingMore}
          onLoadMore={paginatedTranscript.loadMore}
        />

        {/* Floating Bottom Control Bar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">

          {/* Chat Toggle */}
          <button
            onClick={() => {
              const next = !isQAOpen;
              setIsQAOpen(next);
              if (next) setIsVideoOpen(false);
            }}
            className={clsx(
              "h-14 px-6 rounded-2xl border-2 border-ink shadow-comic font-bold text-ink flex items-center gap-3 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-slate-100",
              isQAOpen ? "bg-coral text-white active:bg-coral-dark" : "bg-white"
            )}
          >
            <MessageCircle className="w-6 h-6" />
            <span>{isQAOpen ? "Close Chat" : "Ask Question"}</span>
          </button>

          {/* Video Studio Toggle */}
          <button
            onClick={() => {
              const next = !isVideoOpen;
              setIsVideoOpen(next);
              if (next) setIsQAOpen(false);
            }}
            className={clsx(
              "h-14 px-6 rounded-2xl border-2 border-ink shadow-comic font-bold flex items-center gap-3 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none",
              isVideoOpen
                ? "bg-deep-purple text-white"
                : "bg-soft-purple text-ink hover:bg-soft-purple/80"
            )}
          >
            <Clapperboard className="w-6 h-6" />
            <span>{isVideoOpen ? "Close Video" : "Video Studio"}</span>
          </button>

          {/* I'm Lost Button */}
          <motion.button
            animate={studentState?.isLost ? {
              scale: [1, 1.1, 1],
              transition: { repeat: Infinity, duration: 0.5 }
            } : {}}
            onClick={handleImLostAction}
            className={clsx(
              "h-14 px-6 rounded-2xl border-2 border-ink shadow-comic font-bold flex items-center gap-3 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none",
              studentState?.isLost ? "bg-coral text-white hover:bg-coral-light" : "bg-mustard text-ink hover:bg-mustard-light"
            )}
          >
            <AlertCircle className="w-6 h-6" />
            <span>{studentState?.isLost ? "I'M LOST!" : "I'm Lost?"}</span>
          </motion.button>
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
  sessionId,
  studentId,
  activeVideoUrl,
  setActiveVideoUrl,
  currentTranscriptLine,
  onClose,
}: {
  sessionId: Id<"sessions">;
  studentId: string;
  activeVideoUrl: string | null;
  setActiveVideoUrl: (url: string | null) => void;
  currentTranscriptLine: string | null;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [isSubmittingTranscript, setIsSubmittingTranscript] = useState(false);
  const prevVideoRequestsRef = useRef<string | null>(null);

  const videoRequests = useQuery(api.videos.listStudentVideoRequests, {
    sessionId,
    studentId,
    limit: 10,
  });
  const createFromTranscript = useMutation(api.videos.createVideoFromTranscript);
  const createFromPrompt = useMutation(api.videos.createVideoFromStudentPrompt);

  // Auto-show the latest completed video when it transitions to "completed"
  useEffect(() => {
    if (!videoRequests || videoRequests.length === 0) return;
    const latest = videoRequests[videoRequests.length - 1];
    const latestKey = `${latest._id}-${latest.status}`;
    if (
      latest.status === "completed" &&
      latest.videoUrl &&
      prevVideoRequestsRef.current !== latestKey
    ) {
      setActiveVideoUrl(latest.videoUrl);
    }
    prevVideoRequestsRef.current = latestKey;
  }, [videoRequests, setActiveVideoUrl]);

  const handleTranscriptVideo = async () => {
    if (isSubmittingTranscript) return;
    setIsSubmittingTranscript(true);
    setActiveVideoUrl(null);
    try {
      await createFromTranscript({ sessionId, studentId });
    } catch (error) {
      console.error("Failed to create transcript video request:", error);
    } finally {
      setIsSubmittingTranscript(false);
    }
  };

  const handleCustomPromptVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isSubmittingCustom) return;
    setIsSubmittingCustom(true);
    setActiveVideoUrl(null);
    try {
      await createFromPrompt({ sessionId, studentId, prompt: prompt.trim() });
      setPrompt("");
    } catch (error) {
      console.error("Failed to create custom video request:", error);
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const latestRequest = videoRequests && videoRequests.length > 0
    ? videoRequests[videoRequests.length - 1]
    : null;
  const isGenerating =
    latestRequest?.status === "queued" || latestRequest?.status === "processing";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-ink/20 backdrop-blur-[2px] z-40 flex flex-col"
    >
      {/* Main card area - centered above the ticker */}
      <div className="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden">
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: "spring", bounce: 0.12, duration: 0.45 }}
          className="bg-white border-2 border-ink rounded-[2rem] shadow-comic w-full max-w-3xl max-h-[calc(100vh-100px)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b-2 border-ink bg-deep-purple/10 flex items-center justify-between shrink-0">
            <h2 className="font-black text-xl flex items-center gap-3">
              <div className="w-9 h-9 bg-deep-purple rounded-xl border-2 border-ink shadow-comic-sm flex items-center justify-center">
                <Clapperboard className="w-4 h-4 text-white" />
              </div>
              Video Studio
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-black/5 rounded-full transition-colors group"
            >
              <div className="w-5 h-5 relative flex items-center justify-center">
                <div className="absolute w-full h-0.5 bg-ink rotate-45 group-hover:bg-coral transition-colors" />
                <div className="absolute w-full h-0.5 bg-ink -rotate-45 group-hover:bg-coral transition-colors" />
              </div>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-4">
              {/* Inline Video Player / Generating State / Empty State */}
              {activeVideoUrl ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <video
                    src={activeVideoUrl}
                    controls
                    autoPlay
                    className="w-full rounded-2xl border-2 border-ink shadow-comic bg-black"
                    style={{ maxHeight: "350px" }}
                  />
                </motion.div>
              ) : isGenerating ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-deep-purple/5 border-2 border-dashed border-deep-purple/30 rounded-2xl flex flex-col items-center justify-center py-12 gap-3"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Clapperboard className="w-10 h-10 text-deep-purple" />
                  </motion.div>
                  <p className="font-black text-lg text-ink">Generating your video...</p>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-deep-purple rounded-full"
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>

                  {/* Show the optimized prompt while generating */}
                  {latestRequest?.optimizedPrompt && (
                    <p className="text-xs text-slate-500 text-center px-6 mt-2 italic max-w-md">
                      &ldquo;{latestRequest.optimizedPrompt}&rdquo;
                    </p>
                  )}
                </motion.div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center py-12 gap-2">
                  <Clapperboard className="w-10 h-10 text-slate-300" />
                  <p className="font-bold text-slate-400 text-center text-sm">
                    Generate a video from your lecture or type a custom prompt
                  </p>
                </div>
              )}

              {/* Error display */}
              {latestRequest?.status === "failed" && latestRequest.error && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border-2 border-red-200 rounded-xl p-3 flex items-start gap-2"
                >
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm font-bold text-red-700">{latestRequest.error}</p>
                </motion.div>
              )}

              {/* Generation Controls */}
              <div className="space-y-3">
                <button
                  onClick={handleTranscriptVideo}
                  disabled={isSubmittingTranscript || isGenerating}
                  className="w-full bg-soft-purple border-2 border-ink rounded-xl px-5 py-3.5 font-black text-ink shadow-comic-sm btn-press flex items-center justify-center gap-3 disabled:opacity-50 text-base"
                >
                  {isSubmittingTranscript || (isGenerating && latestRequest?.triggerType === "transcript") ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Wand2 className="w-5 h-5" />
                  )}
                  <span>Generate from Current Lecture</span>
                </button>

                <div className="flex items-center gap-3 opacity-40">
                  <div className="flex-1 h-0.5 bg-ink/20" />
                  <span className="text-xs font-black uppercase tracking-wider">or</span>
                  <div className="flex-1 h-0.5 bg-ink/20" />
                </div>

                <form onSubmit={handleCustomPromptVideo} className="flex gap-2">
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder='e.g. "Explain gravity with a visual simulation"'
                    className="flex-1 px-4 py-3.5 bg-white border-2 border-ink rounded-xl outline-none font-bold text-sm placeholder:text-slate-400 focus:shadow-comic-sm transition-all"
                    disabled={isGenerating}
                  />
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isSubmittingCustom || isGenerating}
                    className="px-5 py-3.5 bg-coral text-white border-2 border-ink rounded-xl shadow-comic-sm btn-press font-black disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmittingCustom ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    <span className="hidden sm:inline">Generate</span>
                  </button>
                </form>
              </div>

              {/* Past Videos */}
              {videoRequests && videoRequests.length > 0 && (
                <div className="pt-2">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-400 mb-3">
                    Previous Generations
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[...videoRequests].reverse().map((request) => {
                      const isActive = activeVideoUrl === request.videoUrl;
                      const statusStyle =
                        request.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : request.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : request.status === "processing"
                              ? "bg-mustard/40 text-ink"
                              : "bg-slate-100 text-slate-600";

                      return (
                        <button
                          key={request._id}
                          onClick={() => {
                            if (request.status === "completed" && request.videoUrl) {
                              setActiveVideoUrl(request.videoUrl);
                            }
                          }}
                          disabled={request.status !== "completed"}
                          className={clsx(
                            "text-left bg-white border-2 rounded-xl p-3 transition-all",
                            request.status === "completed"
                              ? "border-ink hover:shadow-comic-sm cursor-pointer"
                              : "border-slate-200 opacity-60 cursor-default",
                            isActive && "ring-2 ring-deep-purple ring-offset-2"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                              {request.triggerType === "transcript" ? "Lecture" : "Prompt"}
                            </span>
                            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-full font-black", statusStyle)}>
                              {request.status}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-ink line-clamp-2">
                            {request.studentPrompt ?? request.sourcePrompt}
                          </p>
                          {request.optimizedPrompt && (
                            <p className="text-[10px] mt-1 text-slate-400 line-clamp-1 italic">
                              {request.optimizedPrompt}
                            </p>
                          )}
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

      {/* Live Transcript Ticker - pinned to bottom */}
      <div className="shrink-0 px-4 pb-5 pt-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          {currentTranscriptLine ? (
            <div className="bg-white/90 backdrop-blur-md border-2 border-ink rounded-2xl px-5 py-3 shadow-comic-sm flex items-center gap-3">
              <div className="shrink-0 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live</span>
              </div>
              <p className="font-bold text-ink text-base truncate">
                {currentTranscriptLine}
              </p>
            </div>
          ) : (
            <div className="bg-white/60 backdrop-blur-md border-2 border-dashed border-slate-300 rounded-2xl px-5 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <p className="font-bold text-slate-400 text-sm">
                Waiting for teacher to speak...
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function TranscriptView({
  transcript,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  transcript: { _id: string; text: string; createdAt: number; source?: string }[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const shouldAutoScrollRef = useRef(true);
  const prevTranscriptLengthRef = useRef(0);

  // Handle scroll position restoration after loading more
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !isLoadingMore) return;

    // Store scroll height before new content loads
    prevScrollHeightRef.current = container.scrollHeight;
  }, [isLoadingMore]);

  // Restore scroll position after older content loads
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || prevScrollHeightRef.current === 0) return;

    // If new older content was prepended, adjust scroll to maintain position
    const newScrollHeight = container.scrollHeight;
    const heightDiff = newScrollHeight - prevScrollHeightRef.current;

    if (heightDiff > 0 && !shouldAutoScrollRef.current) {
      container.scrollTop += heightDiff;
    }

    prevScrollHeightRef.current = 0;
  }, [transcript.length]);

  // Auto-scroll to bottom when new lines are added (only if already at bottom)
  useEffect(() => {
    // Check if new content was added at the bottom
    if (transcript.length > prevTranscriptLengthRef.current && shouldAutoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevTranscriptLengthRef.current = transcript.length;
  }, [transcript]);

  // Track if user is at the bottom for auto-scroll behavior
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Auto-scroll if within 100px of bottom
    shouldAutoScrollRef.current = distanceFromBottom < 100;

    // Load more when scrolling near the top (within 200px)
    if (scrollTop < 200 && hasMore && !isLoadingMore) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-24 pb-32 max-w-3xl mx-auto w-full"
    >
      <div className="flex flex-col gap-6 min-h-full justify-end pb-4">
        {/* Load more indicator at top */}
        <div ref={topSentinelRef} className="h-1" />
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            <span className="ml-2 text-sm font-bold text-slate-400">Loading earlier transcript...</span>
          </div>
        )}
        {hasMore && !isLoadingMore && transcript.length > 0 && (
          <button
            onClick={onLoadMore}
            className="flex items-center justify-center py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Load earlier transcript
          </button>
        )}

        {transcript.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50 flex-1">
            <div className="w-20 h-20 bg-white border-2 border-ink rounded-2xl mb-4 border-dashed flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-bold text-slate-500 text-lg">Waiting for teacher to speak...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4 opacity-50 px-2 sticky top-0 z-10 bg-lavender-bg/80 backdrop-blur-sm py-2 -mx-2 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-black text-xs tracking-widest uppercase text-slate-500">Live Transcript</span>
              {transcript.length > 50 && (
                <span className="text-xs text-slate-400 ml-auto">{transcript.length} lines</span>
              )}
            </div>
            <div className="flex flex-col gap-6 px-4">
              {transcript.map((line, index) => {
                const isRecent = index === transcript.length - 1;
                return (
                  <motion.div
                    key={line._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    layout
                    className={clsx(
                      "text-left transition-all duration-500 ease-out",
                      isRecent
                        ? "opacity-100 scale-100"
                        : "opacity-40 scale-[0.98] origin-left"
                    )}
                  >
                    {line.source && isRecent && (
                      <div className="mb-2 inline-flex items-center">
                        <span className="px-2 py-1 text-[10px] font-black tracking-widest uppercase rounded-lg border-2 border-ink bg-white">
                          {line.source}
                        </span>
                      </div>
                    )}
                    <p className={clsx(
                      "font-bold leading-tight transition-all duration-500",
                      isRecent ? "text-3xl md:text-4xl text-ink" : "text-xl md:text-2xl text-slate-500"
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
  sessionId,
  studentId,
  questions,
  currentTranscriptLine,
  onClose,
  instructorName,
  instructorAvatar
}: {
  sessionId: Id<"sessions">;
  studentId: string;
  questions: {
    _id: string;
    question: string;
    answer?: string;
    isApproved?: boolean;
    translatedQuestion?: string;
    translatedAnswer?: string;
    originalLanguage?: string;
    createdAt: number;
  }[];
  currentTranscriptLine: string | null;
  onClose: () => void;
  instructorName?: string;
  instructorAvatar?: any;
}) {
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const askQuestion = useMutation(api.questions.askQuestion);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [questions]);

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAsking) return;

    setIsAsking(true);
    try {
      await askQuestion({
        sessionId,
        studentId,
        question: input.trim(),
      });
      setInput("");
    } catch (error) {
      console.error("Failed to ask question:", error);
    }
    setIsAsking(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-ink/20 backdrop-blur-[2px] z-40 flex flex-col"
    >
      {/* Main card area - centered above the ticker */}
      <div className="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden">
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: "spring", bounce: 0.12, duration: 0.45 }}
          className="bg-white border-2 border-ink rounded-[2rem] shadow-comic w-full max-w-2xl max-h-[calc(100vh-100px)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b-2 border-ink bg-coral/10 flex items-center justify-between shrink-0">
            <h2 className="font-black text-xl flex items-center gap-3">
              <div className="w-9 h-9 bg-coral rounded-xl border-2 border-ink shadow-comic-sm flex items-center justify-center">
                {instructorAvatar ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-ink bg-white">
                    <AvatarPreview avatar={instructorAvatar} size="sm" />
                  </div>
                ) : (
                  <Sparkles className="w-4 h-4 text-white fill-current" />
                )}
              </div>
              {instructorName || "AI Assistant"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-black/5 rounded-full transition-colors group"
            >
              <div className="w-5 h-5 relative flex items-center justify-center">
                <div className="absolute w-full h-0.5 bg-ink rotate-45 group-hover:bg-coral transition-colors" />
                <div className="absolute w-full h-0.5 bg-ink -rotate-45 group-hover:bg-coral transition-colors" />
              </div>
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4" ref={scrollRef}>
            {questions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 py-12">
                <MessageCircle className="w-12 h-12 opacity-20" />
                <p className="font-bold text-sm text-center">
                  Ask anything about the lecture!<br />
                  <span className="text-xs text-slate-300 font-medium">AI will answer based on what the teacher is saying.</span>
                </p>
              </div>
            ) : (
              questions.map((q) => (
                <div key={q._id} className="space-y-2">
                  {/* Question Bubble */}
                  <div className="flex justify-end">
                    <div className="bg-ink text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] shadow-sm">
                      <p className="font-bold text-sm">{q.question}</p>
                    </div>
                  </div>

                  {/* Answer Bubble */}
                  {q.answer && (
                    <div className="flex justify-start">
                      <div className={clsx(
                        "border-2 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]",
                        q.isApproved ? "bg-slate-100 border-slate-200" : "bg-yellow-50 border-yellow-300"
                      )}>
                        {q.translatedAnswer ? (
                          <div className="space-y-1">
                            <p className="font-medium text-sm text-slate-700">{q.translatedAnswer}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              Translated Answer
                            </p>
                          </div>
                        ) : (
                          <p className="font-medium text-sm text-slate-700">{q.answer}</p>
                        )}

                        {/* Teacher Follow-up */}
                        {(q.teacherFollowUp || q.translatedTeacherFollowUp) && (
                          <div className="mt-3 pt-3 border-t border-slate-200/50">
                            <div className="flex items-start gap-2">
                              <div className="bg-blue-100/50 p-1.5 rounded-lg shrink-0">
                                <MessageSquare className="w-3 h-3 text-blue-500" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Teacher Note</p>
                                <p className="text-sm text-slate-700">
                                  {q.translatedTeacherFollowUp || q.teacherFollowUp}
                                </p>
                                {q.translatedTeacherFollowUp && (
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    Translated
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {!q.isApproved && !q.teacherFollowUp && (
                          <p className="text-[10px] text-yellow-600 font-bold mt-2 flex items-center gap-1 uppercase tracking-wider">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Verifying...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

          </div>

          {/* Input Area */}
          <div className="p-4 border-t-2 border-ink bg-white shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the lecture..."
                className="flex-1 px-4 py-3.5 bg-slate-50 border-2 border-ink rounded-xl outline-none font-bold text-ink placeholder-ink/30 focus:bg-white transition-all focus:shadow-comic-sm"
              />
              <button
                type="submit"
                disabled={!input.trim() || isAsking}
                className="px-5 py-3.5 bg-coral text-white border-2 border-ink rounded-xl shadow-comic-sm btn-press font-black disabled:opacity-30 flex items-center gap-2"
              >
                {isAsking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </motion.div >
      </div >

      {/* Live Transcript Ticker - pinned to bottom */}
      < div className="shrink-0 px-4 pb-5 pt-1" >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          {currentTranscriptLine ? (
            <div className="bg-white/90 backdrop-blur-md border-2 border-ink rounded-2xl px-5 py-3 shadow-comic-sm flex items-center gap-3">
              <div className="shrink-0 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live</span>
              </div>
              <p className="font-bold text-ink text-base truncate">
                {currentTranscriptLine}
              </p>
            </div>
          ) : (
            <div className="bg-white/60 backdrop-blur-md border-2 border-dashed border-slate-300 rounded-2xl px-5 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-slate-300" />
              <p className="font-bold text-slate-400 text-sm">
                Waiting for teacher to speak...
              </p>
            </div>
          )}
        </motion.div>
      </div >
    </motion.div >
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
    if (answers.some(a => a === -1)) {
      alert("Please answer all questions");
      return;
    }
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, rotate: -2 }} animate={{ scale: 1, rotate: 0 }} className="bg-white border-2 border-ink rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-comic">
          <div className="w-20 h-20 bg-green-100 border-2 border-ink rounded-full flex items-center justify-center mx-auto mb-6">
            <ThumbsUp className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-ink mb-2">You're Awesome!</h2>
          <p className="text-slate-500 font-bold">Responses sent.</p>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-ink/20 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="bg-white border-2 border-ink rounded-[2rem] p-6 max-w-xl w-full shadow-comic my-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1 bg-mustard border-2 border-ink font-black rounded-lg text-xs uppercase tracking-wider mb-3 shadow-comic-sm">Pop Quiz</span>
          <h2 className="text-3xl font-black text-ink">Quick Check!</h2>
        </div>

        <div className="space-y-8">
          {quiz.questions.map((q: any, qi: number) => (
            <div key={qi} className="space-y-4">
              <p className="text-lg font-bold text-ink">{qi + 1}. {q.prompt}</p>
              <div className="space-y-3">
                {q.choices.map((choice: string, ci: number) => (
                  <button
                    key={ci}
                    onClick={() => handleSelectAnswer(qi, ci)}
                    className={`w-full text-left px-5 py-4 rounded-xl font-bold transition-all border-2 shadow-comic-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${answers[qi] === ci
                      ? "border-ink bg-coral text-white"
                      : "border-ink bg-white text-slate-600 hover:bg-gray-50"
                      }`}
                  >
                    <span className={`inline-block w-8 ${answers[qi] === ci ? "opacity-100" : "opacity-40"}`}>{String.fromCharCode(65 + ci)}.</span>
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || answers.some(a => a === -1)}
          className="w-full mt-8 py-4 bg-ink hover:bg-slate-800 text-white font-black text-lg rounded-2xl shadow-comic transition-all disabled:opacity-50 disabled:shadow-comic-sm btn-press"
        >
          {isSubmitting ? "Sending..." : "Submit Answers"}
        </button>
      </motion.div>
    </motion.div>
  );
}
