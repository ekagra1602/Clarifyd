import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useAction } from "convex/react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import {
  Copy,
  Check,
  MessageSquare,
  HelpCircle,
  X,
  Play,
  Loader2,
  StopCircle,
  Mic,
  Users,
  QrCode,
  Sparkles,
  RefreshCw,
  Download,
  Paperclip,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Trophy,
} from "lucide-react";
import { TranscriptionControls } from "../components/TranscriptionControls";
import { LeaderboardModal } from "../components/LeaderboardModal";
import { StudentQuestionFeed } from "../components/StudentQuestionFeed";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export const Route = createFileRoute("/teacher/session/$sessionId")({
  component: TeacherSessionPage,
  ssr: false,
});

function TeacherSessionPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();

  const pageData = useQuery(api.sessions.getTeacherPageData, {
    sessionId: sessionId as Id<"sessions">,
  });

  const session = pageData?.session;
  const activeQuiz = pageData?.activeQuiz;
  const studentCount = pageData?.studentCount;

  const generateAndLaunchQuiz = useMutation(api.quizzes.generateAndLaunchQuiz);
  const closeQuiz = useMutation(api.quizzes.closeQuiz);
  const endSession = useMutation(api.sessions.endSession);

  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isLaunchingQuiz, setIsLaunchingQuiz] = useState(false);
  const [showQuestionSummary, setShowQuestionSummary] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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
      a.download = `session-notes-${session?.code ?? "classroom"}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Failed to generate notes:", error);
      alert(error.message || "Failed to generate notes. Ensure you have an API key set.");
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  useEffect(() => {
    if (showQrModal && !qrDataUrl && session?.code) {
      const url = `${window.location.origin}/join?code=${session.code}`;
      import('qrcode').then((QRCode) => {
        QRCode.toDataURL(url, { width: 256, margin: 1 }, (err, dataUrl) => {
          if (!err) setQrDataUrl(dataUrl);
        });
      });
    }
  }, [showQrModal, qrDataUrl, session?.code]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session.status === "ended") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-aurora bg-grid">
        <div className="card-glass p-10 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-secondary/15 border border-secondary/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-secondary-light" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-3">Class Dismissed</h1>
          <p className="text-text-muted mb-8">Great session today.</p>

          <button
            onClick={handleDownloadNotes}
            disabled={isGeneratingNotes}
            className="w-full card-glass-hover py-3 px-5 font-semibold text-text-primary flex items-center justify-center gap-2 mb-3 btn-press"
          >
            {isGeneratingNotes ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Notes...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Summary Notes
              </>
            )}
          </button>

          <button
            onClick={() => navigate({ to: "/teacher" })}
            className="btn-primary w-full"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchQuiz = async () => {
    setIsLaunchingQuiz(true);
    try {
      await generateAndLaunchQuiz({
        sessionId: sessionId as Id<"sessions">,
        questionCount: 3,
        difficulty: "medium",
      });
    } catch (error) {
      console.error("Failed to launch quiz:", error);
    }
    setTimeout(() => setIsLaunchingQuiz(false), 2000);
  };

  const handleEndSession = () => {
    setShowEndSessionModal(true);
  };

  const confirmEndSession = async () => {
    await new Promise(resolve => setTimeout(resolve, 150));
    await endSession({ sessionId: sessionId as Id<"sessions"> });
    await navigate({ to: "/teacher" });
  };

  return (
    <div className="min-h-screen p-5 pb-20 bg-grid">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Logo / nav */}
        <div className="flex justify-start pb-1">
          <button onClick={handleEndSession} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-display font-bold text-xs">C</span>
            </div>
            <span className="font-display font-bold text-text-primary text-base tracking-tight group-hover:text-primary-light transition-colors">clarifyd</span>
          </button>
        </div>

        {/* Top Bar */}
        <div className="card-glass px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime/15 border border-lime/20">
              <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
              <span className="text-xs font-semibold text-lime tracking-wide">LIVE</span>
            </div>
            <h1 className="text-lg font-display font-bold text-text-primary">{session.roomName || "Classroom"}</h1>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-lg bg-bg-input border border-border font-mono font-semibold text-sm text-primary-light tracking-widest">
              {session.code}
            </div>
            <div className="px-3.5 py-2 rounded-lg bg-bg-input border border-border font-semibold text-sm text-text-secondary flex items-center gap-2">
              <Users className="w-4 h-4 text-text-muted" />
              <span>{studentCount ?? "..."}</span>
            </div>
            <button
              onClick={() => setShowQrModal(true)}
              className="w-10 h-10 flex items-center justify-center bg-bg-input border border-border rounded-lg hover:bg-bg-elevated hover:border-border-hover transition-all btn-press"
            >
              <QrCode className="w-4 h-4 text-text-secondary" />
            </button>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="w-10 h-10 flex items-center justify-center bg-bg-input border border-border rounded-lg hover:bg-bg-elevated hover:border-border-hover transition-all btn-press"
              title="Leaderboard"
            >
              <Trophy className="w-4 h-4 text-warm" />
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="w-10 h-10 flex items-center justify-center bg-bg-input border border-border rounded-lg hover:bg-bg-elevated hover:border-border-hover transition-all btn-press"
              title="Upload Context"
            >
              <Paperclip className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showLeaderboard && (
            <LeaderboardModal
              sessionId={sessionId as Id<"sessions">}
              onClose={() => setShowLeaderboard(false)}
            />
          )}
        </AnimatePresence>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* Left Column */}
          <div className="lg:col-span-8 flex flex-col gap-5">

            {/* Quiz Card */}
            <div className="card-glass p-7 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <div className="absolute -right-12 -bottom-12 opacity-5">
                <HelpCircle className="w-56 h-56 text-primary" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-7">
                  <h2 className="text-xl font-display font-bold text-text-primary">Pop Quiz</h2>
                  <div className={clsx(
                    "px-3 py-1 rounded-full text-xs font-semibold border",
                    activeQuiz
                      ? "bg-lime/15 border-lime/20 text-lime"
                      : "bg-bg-input border-border text-text-muted"
                  )}>
                    {activeQuiz ? "ACTIVE" : "READY"}
                  </div>
                </div>

                {activeQuiz ? (
                  <div className="bg-bg-elevated border border-border rounded-xl p-5">
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="font-semibold text-text-primary">Live Results</h3>
                      <button
                        onClick={() => closeQuiz({ sessionId: sessionId as Id<"sessions"> })}
                        className="px-4 py-2 bg-bg-input border border-border text-text-secondary rounded-lg font-semibold text-sm hover:bg-bg-card-hover hover:border-border-hover transition-all"
                      >
                        Close Quiz
                      </button>
                    </div>
                    <QuizStatsPanel quizId={activeQuiz._id} />
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-5">
                    <p className="text-text-muted text-sm max-w-md leading-relaxed">
                      Generate a quick multiple-choice quiz from the current lesson using AI.
                    </p>
                    <button
                      onClick={handleLaunchQuiz}
                      disabled={isLaunchingQuiz}
                      className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl shadow-glow btn-press disabled:opacity-40"
                    >
                      {isLaunchingQuiz ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                      Launch Quiz
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Transcription Card */}
            <div className="card-glass p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-accent-light" />
                </div>
                <h2 className="text-lg font-display font-bold text-text-primary">Live Transcription</h2>
              </div>
              <TranscriptionControls sessionId={sessionId as Id<"sessions">} />
            </div>

            {/* Tools */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowQuestionSummary(true)}
                className="card-glass-hover p-4 flex items-center gap-4 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-warm/15 border border-warm/20 flex items-center justify-center shrink-0 group-hover:shadow-glow-sm transition-shadow">
                  <MessageSquare className="w-5 h-5 text-warm-light" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary text-sm">Question Summary</h3>
                  <p className="text-text-muted text-xs">AI analysis</p>
                </div>
              </button>
              <button
                onClick={handleEndSession}
                className="card-glass-hover p-4 flex items-center gap-4 text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center shrink-0">
                  <StopCircle className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-accent text-sm">End Class</h3>
                  <p className="text-text-muted text-xs">Close session</p>
                </div>
              </button>
            </div>

            <StudentQuestionFeed sessionId={sessionId as Id<"sessions">} />
          </div>

          {/* Right Column - just the student count summary now */}
          <div className="lg:col-span-4 flex flex-col gap-5 self-start lg:sticky lg:top-6">
            <div className="card-glass p-6 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-secondary/50 to-transparent" />

              <h2 className="text-base font-display font-bold text-text-primary mt-1 mb-1">Session Info</h2>
              <p className="text-text-muted text-xs mb-5">Real-time overview</p>

              <div className="w-full space-y-3">
                <div className="flex items-center justify-between px-4 py-3 bg-bg-elevated rounded-xl border border-border">
                  <span className="text-text-muted text-sm">Students</span>
                  <span className="font-display font-bold text-2xl text-text-primary tabular-nums">{studentCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-bg-elevated rounded-xl border border-border">
                  <span className="text-text-muted text-sm">Join Code</span>
                  <button onClick={handleCopyCode} className="flex items-center gap-2 group">
                    <span className="font-mono font-semibold text-primary-light tracking-wider">{session.code}</span>
                    {copied
                      ? <Check className="w-3.5 h-3.5 text-lime" />
                      : <Copy className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary transition-colors" />
                    }
                  </button>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-bg-elevated rounded-xl border border-border">
                  <span className="text-text-muted text-sm">Status</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
                    <span className="text-sm font-semibold text-lime">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showQrModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQrModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card-glass p-8 max-w-sm w-full text-center relative"
            >
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-bg-elevated rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>

              <h3 className="text-xl font-display font-bold text-text-primary mb-2">Join Class</h3>
              <p className="text-text-muted text-sm mb-6">Scan to join</p>

              <div className="bg-white p-4 rounded-xl inline-block mb-6">
                <div style={{ height: "auto", margin: "0 auto", maxWidth: 200, width: "100%" }}>
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Join Code QR" className="w-full h-auto" />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center bg-bg-elevated p-3 rounded-xl border border-border">
                <span className="font-mono font-semibold text-lg text-primary-light tracking-widest">{session.code}</span>
                <button onClick={handleCopyCode} className="p-1.5 hover:bg-bg-card rounded-lg transition-colors" title="Copy Code">
                  {copied ? <Check className="w-4 h-4 text-lime" /> : <Copy className="w-4 h-4 text-text-muted" />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showEndSessionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEndSessionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card-glass p-8 max-w-md w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent" />

              <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center mx-auto mb-6">
                <StopCircle className="w-8 h-8 text-accent" />
              </div>

              <h3 className="text-2xl font-display font-bold text-text-primary mb-3">End Session?</h3>
              <p className="text-text-muted mb-8 leading-relaxed">
                All students will be disconnected from the session.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndSessionModal(false)}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-bg-input border border-border font-semibold text-text-secondary hover:bg-bg-elevated hover:border-border-hover transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEndSession}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-accent text-white font-semibold shadow-glow-accent btn-press flex items-center justify-center gap-2 hover:opacity-90"
                >
                  End It
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showUploadModal && (
          <UploadContextModal
            onClose={() => setShowUploadModal(false)}
            sessionId={sessionId as Id<"sessions">}
            initialContext={session.contextText || ""}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQuestionSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQuestionSummary(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card-glass p-7 max-w-lg w-full relative"
            >
              <button
                onClick={() => setShowQuestionSummary(false)}
                className="absolute top-4 right-4 p-2 hover:bg-bg-elevated rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-light" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-text-primary">Question Summary</h3>
                  <p className="text-text-muted text-xs">AI analysis of student questions</p>
                </div>
              </div>

              <QuestionSummaryPanel sessionId={sessionId as Id<"sessions">} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MAX_CONTEXT_CHARS = 200000;
const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".txt", ".md"];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface ParseResult {
  text: string;
  fileName: string;
  error?: string;
}

interface UploadedFile {
  file: File;
  result?: ParseResult;
  status: 'pending' | 'uploading' | 'parsing' | 'done' | 'error';
}

function formatParsedContent(results: ParseResult[]): string {
  const successfulResults = results.filter(r => !r.error && r.text.trim());
  if (successfulResults.length === 0) return '';
  if (successfulResults.length === 1) return successfulResults[0].text;
  return successfulResults
    .map(r => `=== ${r.fileName} ===\n${r.text}`)
    .join('\n\n---\n\n');
}

function UploadContextModal({ onClose, sessionId, initialContext }: { onClose: () => void, sessionId: Id<"sessions">, initialContext: string }) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState(initialContext);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const uploadSlides = useMutation(api.sessions.uploadSlides);
  const generateUploadUrl = useMutation(api.sessions.generateUploadUrl);
  const parseUploadedFile = useAction(api.fileParser.parseUploadedFile);
  const [isSaving, setIsSaving] = useState(false);

  const combinedText = activeTab === 'paste'
    ? pasteText
    : formatParsedContent(uploadedFiles.filter(f => f.result).map(f => f.result!));

  const charCount = combinedText.length;
  const isOverLimit = charCount > MAX_CONTEXT_CHARS;

  const handleSave = async () => {
    if (isOverLimit) return;
    setIsSaving(true);
    await uploadSlides({ sessionId, slidesText: combinedText });
    setIsSaving(false);
    onClose();
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return `File exceeds 50MB limit`;
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!SUPPORTED_EXTENSIONS.includes(extension)) return `Unsupported file type "${extension}"`;
    return null;
  };

  const processFiles = async (files: File[]) => {
    const newUploadedFiles: UploadedFile[] = files.map(file => ({ file, status: 'pending' as const }));
    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setUploadedFiles(prev => prev.map(uf =>
          uf.file === file ? { ...uf, status: 'error' as const, result: { text: '', fileName: file.name, error: validationError } } : uf
        ));
        continue;
      }
      try {
        setUploadedFiles(prev => prev.map(uf => uf.file === file ? { ...uf, status: 'uploading' as const } : uf));
        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
        if (!uploadResponse.ok) throw new Error("Failed to upload file");
        const { storageId } = await uploadResponse.json();
        setUploadedFiles(prev => prev.map(uf => uf.file === file ? { ...uf, status: 'parsing' as const } : uf));
        const result = await parseUploadedFile({ storageId, fileName: file.name });
        setUploadedFiles(prev => prev.map(uf =>
          uf.file === file ? { ...uf, status: result.error ? 'error' : 'done', result: { text: result.text, fileName: file.name, error: result.error } } : uf
        ));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setUploadedFiles(prev => prev.map(uf =>
          uf.file === file ? { ...uf, status: 'error' as const, result: { text: '', fileName: file.name, error: message } } : uf
        ));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) processFiles(files);
    e.target.value = '';
  };

  const removeFile = (fileToRemove: File) => {
    setUploadedFiles(prev => prev.filter(uf => uf.file !== fileToRemove));
  };

  const successfulFiles = uploadedFiles.filter(f => f.status === 'done' && f.result && !f.result.error);
  const hasContent = activeTab === 'paste' ? pasteText.trim().length > 0 : successfulFiles.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card-glass p-6 max-w-2xl w-full relative flex flex-col max-h-[85vh]"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-bg-elevated rounded-lg transition-colors">
          <X className="w-5 h-5 text-text-muted" />
        </button>

        <h3 className="text-lg font-display font-bold text-text-primary mb-1">Class Context</h3>
        <p className="text-text-muted text-sm mb-5">Upload materials to help AI understand your class.</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('upload')}
            className={clsx(
              "flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
              activeTab === 'upload'
                ? "bg-primary/15 text-primary-light border border-primary/25"
                : "bg-bg-input text-text-muted border border-border hover:border-border-hover"
            )}
          >
            <Upload className="w-3.5 h-3.5" /> Upload Files
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={clsx(
              "flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
              activeTab === 'paste'
                ? "bg-primary/15 text-primary-light border border-primary/25"
                : "bg-bg-input text-text-muted border border-border hover:border-border-hover"
            )}
          >
            <FileText className="w-3.5 h-3.5" /> Paste Text
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {activeTab === 'upload' ? (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={clsx(
                  "border border-dashed rounded-xl p-6 text-center transition-all cursor-pointer mb-4",
                  isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-bg-elevated"
                )}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input id="file-input" type="file" multiple accept={SUPPORTED_EXTENSIONS.join(",")} onChange={handleFileInput} className="hidden" />
                <Upload className={clsx("w-8 h-8 mx-auto mb-2 transition-colors", isDragging ? "text-primary" : "text-text-muted")} />
                <p className="font-semibold text-text-secondary text-sm mb-1">Drop files here or click to browse</p>
                <p className="text-xs text-text-muted">PDF, DOCX, PPTX, TXT, MD (max 50MB each)</p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mb-4">
                  <p className="font-semibold text-xs text-text-secondary mb-2 uppercase tracking-wider">Files</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((uf, i) => (
                      <div key={i} className={clsx(
                        "flex items-center gap-2 p-2.5 rounded-lg border",
                        uf.status === 'error' ? "border-accent/30 bg-accent/5" : uf.status === 'done' ? "border-lime/30 bg-lime/5" : "border-border bg-bg-elevated"
                      )}>
                        {uf.status === 'pending' || uf.status === 'uploading' || uf.status === 'parsing' ? (
                          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                        ) : uf.status === 'error' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-accent shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-lime shrink-0" />
                        )}
                        <span className="font-medium text-xs flex-1 truncate text-text-secondary">{uf.file.name}</span>
                        {(uf.status === 'uploading' || uf.status === 'parsing') && (
                          <span className="text-[10px] text-text-muted">{uf.status === 'uploading' ? 'Uploading...' : 'Parsing...'}</span>
                        )}
                        {uf.result?.error && <span className="text-[10px] text-accent truncate max-w-48" title={uf.result.error}>{uf.result.error}</span>}
                        <button onClick={(e) => { e.stopPropagation(); removeFile(uf.file); }} className="p-1 hover:bg-bg-card rounded transition-colors shrink-0">
                          <Trash2 className="w-3.5 h-3.5 text-text-muted" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {combinedText && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <p className="font-semibold text-xs text-text-secondary mb-2 uppercase tracking-wider">Preview</p>
                  <div className="flex-1 border border-border rounded-xl p-3 overflow-y-auto bg-bg-elevated min-h-[100px]">
                    <pre className="text-xs text-text-muted whitespace-pre-wrap font-sans">
                      {combinedText.slice(0, 2000)}
                      {combinedText.length > 2000 && <span className="text-text-muted/50">... (truncated)</span>}
                    </pre>
                  </div>
                </div>
              )}
            </>
          ) : (
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste lecture notes, slide text, or summaries here..."
              className="flex-1 w-full bg-bg-input border border-border rounded-xl p-4 font-medium text-sm text-text-primary placeholder-text-muted resize-none overflow-y-auto focus:border-primary/50 focus:shadow-glow-sm outline-none transition-all min-h-[200px]"
            />
          )}
        </div>

        <div className={clsx(
          "text-right text-xs font-medium mt-3 mb-4",
          isOverLimit ? "text-accent" : charCount > MAX_CONTEXT_CHARS * 0.9 ? "text-warm" : "text-text-muted"
        )}>
          {charCount.toLocaleString()} / {MAX_CONTEXT_CHARS.toLocaleString()} characters
          {isOverLimit && <span className="block text-[10px]">Content exceeds limit</span>}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-bg-input border border-border font-semibold text-sm text-text-muted hover:bg-bg-elevated hover:border-border-hover transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isOverLimit || !hasContent}
            className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-glow-sm btn-press disabled:opacity-40"
          >
            {isSaving ? "Saving..." : "Save Context"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function QuizStatsPanel({ quizId }: { quizId: Id<"quizzes"> }) {
  const stats = useQuery(api.quizzes.getQuizStats, { quizId });

  if (!stats) return <div className="text-center py-8 text-text-muted text-sm animate-pulse">Waiting for responses...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="text-4xl font-display font-bold text-text-primary">{stats.totalResponses}</div>
        <div className="text-xs text-text-muted leading-tight">Student<br />Responses</div>
      </div>

      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
        {stats.questions.map((q: any, i: number) => (
          <div key={i} className="pb-2">
            <p className="font-semibold text-text-primary mb-3 text-sm">{i + 1}. {q.prompt}</p>
            <div className="flex gap-2.5 w-full">
              {stats.choiceDistributions[i].map((count: number, j: number) => {
                const isCorrect = j === q.correctIndex;
                const percent = stats.totalResponses > 0 ? Math.round((count / stats.totalResponses) * 100) : 0;

                return (
                  <div
                    key={j}
                    className={clsx(
                      "flex-1 min-w-0 relative h-14 rounded-xl border overflow-hidden transition-all",
                      isCorrect ? "border-lime/30 bg-lime/5" : "border-border bg-bg-elevated"
                    )}
                  >
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${percent}%` }}
                      transition={{ type: "spring", bounce: 0, duration: 0.8 }}
                      className={clsx("absolute bottom-0 inset-x-0 opacity-20", isCorrect ? "bg-lime" : "bg-text-muted")}
                    />
                    <div className="relative z-10 w-full h-full flex items-center justify-center gap-2">
                      <span className={clsx(
                        "font-bold text-sm px-2 py-0.5 rounded-md",
                        isCorrect ? "text-lime" : "text-text-muted"
                      )}>
                        {String.fromCharCode(65 + j)}
                        {isCorrect && <Check className="w-3 h-3 inline ml-0.5" />}
                      </span>
                      <span className={clsx("text-xl font-bold", isCorrect ? "text-text-primary" : "text-text-secondary")}>
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionSummaryPanel({ sessionId }: { sessionId: Id<"sessions"> }) {
  const [summary, setSummary] = useState<{
    success: boolean;
    summary: string;
    themes: Array<{ theme: string; questionCount: number; suggestedAction: string }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuestionSummaryAction = useAction(api.questions.getQuestionSummary);

  const generateSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getQuestionSummaryAction({ sessionId, timeWindowMinutes: 30 });
      setSummary(result);
    } catch (err) {
      console.error("Failed to generate question summary:", err);
      setError("Failed to analyze questions. Please try again.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    generateSummary();
  }, []);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-text-muted text-sm">Analyzing questions...</span>
        </div>
      ) : error ? (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 text-center">
          <p className="text-accent text-sm font-medium">{error}</p>
          <button onClick={generateSummary} className="mt-3 px-4 py-2 bg-accent text-white rounded-lg font-semibold text-sm hover:opacity-90">
            Try Again
          </button>
        </div>
      ) : summary ? (
        <>
          <div className="bg-primary/10 border border-primary/15 rounded-xl p-4">
            <p className="text-text-secondary text-sm">{summary.summary}</p>
          </div>

          {summary.themes.length > 0 ? (
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Common Themes</h4>
              {summary.themes.map((theme, i) => (
                <div key={i} className="bg-bg-elevated border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-text-primary text-sm">{theme.theme}</span>
                    <span className="bg-warm/15 text-warm-light px-2 py-0.5 rounded-md text-xs font-semibold">
                      {theme.questionCount} questions
                    </span>
                  </div>
                  <p className="text-text-muted text-xs">{theme.suggestedAction}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-bg-elevated border border-dashed border-border rounded-xl p-6 text-center">
              <MessageSquare className="w-8 h-8 text-text-muted/30 mx-auto mb-3" />
              <p className="text-text-muted text-sm">No questions yet. Patterns will appear as students ask questions.</p>
            </div>
          )}

          <button
            onClick={generateSummary}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-bg-input border border-border text-text-secondary rounded-xl font-semibold text-sm hover:bg-bg-elevated hover:border-border-hover transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Analysis
          </button>
        </>
      ) : null}
    </div>
  );
}
