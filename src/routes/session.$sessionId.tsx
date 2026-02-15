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
  CheckCircle2, // Used in "I'm Lost" button success state
  MessageCircle, // Used in Q&A button
  Users, // Used in header
  Download // Used in notes download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

// ... imports kept same, ensuring used icons are available ...
// Assuming imports are sufficient or will be auto-fixed, but let's check existing imports.
// We need: MessageCircle, Users, CheckCircle2, AlertCircle, Send, Loader2, etc. (Already there)
// Adding X for close button if not present? It's not in the original imports. 
// I'll stick to using existing imports or add X if needed. The original had "rotate-45" divs for close.

export const Route = createFileRoute("/session/$sessionId")({
  component: StudentSessionPage,
});

function StudentSessionPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);
  const [isQAOpen, setIsQAOpen] = useState(false);
  const keepAlive = useMutation(api.sessions.keepAlive);

  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const generateSessionNotesAction = useAction(api.ai.service.generateSessionNotes);
  // const askQuestion = useMutation(api.questions.askQuestion); // Unused

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
    // Try local storage first, fallback to session storage
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
  // Use paginated transcript for windowed loading with infinite scroll
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

    // Always toggle status
    await setLostStatus({
      sessionId: sessionId as Id<"sessions">,
      studentId,
      isLost: !isCurrentlyLost,
    });

    // If becoming lost, open chat (the backend will auto-post the question and generate summary)
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full transition-all duration-300">

        {/* Header - Absolute Top Right */}
        <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
          {/* Room Name - Hidden on small screens or when chat is open if constrained */}
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
            onClick={() => setIsQAOpen(!isQAOpen)}
            className={clsx(
              "h-14 px-6 rounded-2xl border-2 border-ink shadow-comic font-bold text-ink flex items-center gap-3 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-slate-100",
              isQAOpen ? "bg-coral text-white active:bg-coral-dark" : "bg-white"
            )}
          >
            <MessageCircle className="w-6 h-6" />
            <span>{isQAOpen ? "Close Chat" : "Ask Question"}</span>
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

      {/* Chat Sidebar */}
      <AnimatePresence>
        {isQAOpen && studentId && (
          <ChatSidebar
            sessionId={sessionId as Id<"sessions">}
            studentId={studentId}
            questions={recentQuestions ?? []}
            onClose={() => setIsQAOpen(false)}
          />
        )}

      </AnimatePresence>

    </div>
  );
}

function TranscriptView({
  transcript,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  transcript: { _id: string; text: string; createdAt: number }[];
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
                const isRecent = index === transcript.length - 1; // Only the most recent line is "active"
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

function ChatSidebar({
  sessionId,
  studentId,
  questions,
  onClose,
}: {
  sessionId: Id<"sessions">;
  studentId: string;
  questions: {
    _id: string;
    question: string;
    answer?: string;
    createdAt: number;
  }[];
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const askQuestion = useMutation(api.questions.askQuestion);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [questions]);

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
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: "auto", opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className="w-full sm:w-96 bg-white border-l-2 border-ink h-full shadow-comic-lg z-30 flex flex-col shrink-0 overflow-hidden"
    >
      <div className="w-[100vw] sm:w-96 h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b-2 border-ink bg-soft-purple/10 flex items-center justify-between">
          <h3 className="font-black text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-soft-purple fill-current" />
            AI Assistant
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors group">
            <div className="w-5 h-5 relative flex items-center justify-center">
              <div className="absolute w-full h-0.5 bg-ink rotate-45 group-hover:bg-coral transition-colors" />
              <div className="absolute w-full h-0.5 bg-ink -rotate-45 group-hover:bg-coral transition-colors" />
            </div>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-dots" ref={scrollRef}>
          {questions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <MessageCircle className="w-12 h-12 opacity-20" />
              <p className="font-bold text-sm">Ask anything about the lecture!</p>
            </div>
          ) : (
            questions.map((q) => (
              <div key={q._id} className="space-y-2">
                {/* Student Question */}
                <div className="flex justify-end">
                  <div className="bg-coral text-white px-4 py-2 rounded-2xl rounded-tr-sm text-sm font-bold border-2 border-ink shadow-comic-sm max-w-[85%]">
                    {q.question}
                  </div>
                </div>

                {/* AI Answer */}
                <div className="flex justify-start">
                  {q.answer ? (
                    <div className="bg-white border-2 border-ink text-ink px-4 py-3 rounded-2xl rounded-tl-sm text-sm font-medium shadow-comic-sm max-w-[90%]">
                      <Sparkles className="w-3 h-3 text-soft-purple mb-1 fill-current" />
                      {q.answer}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold pl-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t-2 border-ink bg-white">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border-2 border-ink rounded-xl outline-none font-bold text-ink placeholder-ink/30 focus:bg-white transition-all focus:shadow-comic-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || isAsking}
              className="absolute right-2 top-2 bottom-2 aspect-square bg-ink text-white rounded-lg flex items-center justify-center disabled:opacity-20 transition-all hover:bg-coral active:scale-95"
            >
              {isAsking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
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
