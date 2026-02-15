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
  Trash2
} from "lucide-react";
import { TranscriptionControls } from "../components/TranscriptionControls";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export const Route = createFileRoute("/teacher/session/$sessionId")({
  component: TeacherSessionPage,
});

function TeacherSessionPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();

  // Batched query for all teacher page data (reduces 4 queries to 1)
  const pageData = useQuery(api.sessions.getTeacherPageData, {
    sessionId: sessionId as Id<"sessions">,
  });

  // Destructure for backwards compatibility
  const session = pageData?.session;
  const activeQuiz = pageData?.activeQuiz;
  const studentCount = pageData?.studentCount;
  const lostStudentCount = pageData?.lostStudentCount;

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

  // Generate QR code on client side only when modal is opened or session code changes
  // Uses dynamic import to avoid bundling qrcode in SSR (requires node:stream/web)
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
        <div className="w-12 h-12 border-4 border-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session.status === "ended") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-milk border-2 border-ink rounded-3xl p-12 shadow-comic text-center max-w-lg w-full">
          <div className="w-20 h-20 bg-soft-purple rounded-full border-2 border-ink flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black mb-4">Class Dismissed!</h1>
          <p className="text-lg font-medium text-slate-500 mb-8">Great session today.</p>

          <button
            onClick={handleDownloadNotes}
            disabled={isGeneratingNotes}
            className="w-full bg-white border-2 border-ink text-ink font-bold py-3 px-6 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 mb-4 shadow-comic-sm hover:translate-y-0.5 hover:shadow-none btn-press"
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
      // Use AI to generate quiz from recent transcript
      await generateAndLaunchQuiz({
        sessionId: sessionId as Id<"sessions">,
        questionCount: 3,
        difficulty: "medium",
      });
    } catch (error) {
      console.error("Failed to launch quiz:", error);
    }
    // Keep loading state for a bit since AI generation is async
    setTimeout(() => setIsLaunchingQuiz(false), 2000);
  };

  const handleEndSession = () => {
    setShowEndSessionModal(true);
  };

  const confirmEndSession = async () => {
    // Add a small delay for the button animation
    await new Promise(resolve => setTimeout(resolve, 150));
    await endSession({ sessionId: sessionId as Id<"sessions"> });
    await navigate({ to: "/teacher" });
  };

  return (
    <div className="min-h-screen p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Helper Header */}
        <div className="flex justify-start pb-2">
          <button onClick={handleEndSession} className="flex items-center gap-2">
            <div className="bg-ink text-white px-3 py-1 rounded-lg border-2 border-transparent hover:border-coral hover:text-coral hover:bg-white transition-all transform -rotate-2">
              <span className="text-xl font-black tracking-tight">Wait</span>
            </div>
            <span className="text-xl font-black text-ink tracking-tight transform rotate-1">What</span>
          </button>
        </div>

        {/* Top Navbar Card */}
        <div className="bg-milk border-2 border-ink rounded-2xl p-4 md:p-6 shadow-comic flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-coral text-white px-4 py-1 rounded-full border-2 border-ink font-bold transform -rotate-1 shadow-comic-sm">
              LIVE
            </div>
            <h1 className="text-2xl font-black">{session.roomName || "Classroom"}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block font-bold text-slate-500 mr-2">Join Code:</div>
            <div className="bg-mustard/20 px-4 py-2 rounded-xl border-2 border-ink border-dashed font-mono font-bold text-xl tracking-widest">
              {session.code}
            </div>
            <div className="bg-white border-2 border-ink rounded-xl px-4 py-2 shadow-comic-sm flex items-center gap-2 font-bold min-w-[100px] justify-center">
              <Users className="w-5 h-5 text-ink" />
              <span>{studentCount ?? "..."} Students</span>
            </div>
            <button
              onClick={() => setShowQrModal(true)}
              className="w-12 h-12 flex items-center justify-center bg-white border-2 border-ink rounded-xl shadow-comic-sm btn-press"
            >
              <QrCode className="text-ink w-6 h-6" />
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="w-12 h-12 flex items-center justify-center bg-white border-2 border-ink rounded-xl shadow-comic-sm btn-press"
              title="Upload Class Context"
            >
              <Paperclip className="text-ink w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Left: Confusion Meter */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-milk border-2 border-ink rounded-[2rem] p-6 shadow-comic flex flex-col items-center text-center relative overflow-hidden h-full">
              <div className="absolute top-0 inset-x-0 h-4 bg-soft-purple border-b-2 border-ink" />

              <h2 className="text-xl font-black mt-2 mb-1">Room Vibe</h2>
              <p className="text-slate-500 font-bold text-sm uppercase tracking-wide opacity-70">Confusion Level</p>

              <div className="flex-1 flex flex-col items-center justify-center relative w-full py-2">
                {/* Background Circles */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-48 h-48 bg-mustard rounded-full blur-3xl"
                  />
                </div>

                <motion.div
                  animate={{
                    scale: 1 + (lostStudentCount || 0) * 0.1,
                    rotate: (lostStudentCount || 0) * 5
                  }}
                  className={clsx(
                    "w-32 h-32 border-4 border-ink rounded-full flex items-center justify-center relative z-10 transition-colors duration-500 shadow-comic",
                    (lostStudentCount || 0) > 3 ? "bg-coral" : (lostStudentCount || 0) > 0 ? "bg-mustard" : "bg-white"
                  )}
                >
                  {/* Face Expression */}
                  {(lostStudentCount || 0) > 3 ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-4"><div className="w-3 h-3 rounded-full bg-ink" /><div className="w-3 h-3 rounded-full bg-ink" /></div>
                      <div className="w-8 h-3 bg-ink rounded-full" />
                    </div>
                  ) : (lostStudentCount || 0) > 0 ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-3"><div className="w-3 h-3 rounded-full bg-ink" /><div className="w-3 h-3 rounded-full bg-ink" /></div>
                      <div className="w-6 h-1 bg-ink" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-4"><div className="w-3 h-6 bg-ink rounded-full" /><div className="w-3 h-6 bg-ink rounded-full" /></div>
                      <div className="w-8 h-4 border-b-4 border-ink rounded-b-full" />
                    </div>
                  )}
                </motion.div>

                <div className="mt-4 flex gap-2 items-end">
                  <span className="text-4xl font-black tabular-nums leading-none">
                    {lostStudentCount ?? 0}
                  </span>
                  <span className="font-bold text-slate-500 mb-1">confused</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right: Actions */}
          <div className="lg:col-span-8 flex flex-col gap-4">

            {/* Quiz Control Card */}
            <div className="bg-mustard border-2 border-ink rounded-[2rem] p-8 shadow-comic relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 opacity-20 transform rotate-12">
                <HelpCircle className="w-64 h-64" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-black">Pop Quiz</h2>
                  <div className="bg-white px-3 py-1 rounded-lg border-2 border-ink font-bold text-sm shadow-comic-sm">
                    {activeQuiz ? "ACTIVE NOW" : "READY"}
                  </div>
                </div>

                {activeQuiz ? (
                  <div className="bg-white border-2 border-ink rounded-2xl p-6 shadow-comic-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-lg">Live Results</h3>
                      <button
                        onClick={() => closeQuiz({ sessionId: sessionId as Id<"sessions"> })}
                        className="px-4 py-2 bg-ink text-white rounded-lg font-bold hover:bg-slate-800"
                      >
                        Close Quiz
                      </button>
                    </div>
                    <QuizStatsPanel quizId={activeQuiz._id} />
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-6">
                    <p className="font-medium text-ink/80 text-lg max-w-md">
                      Generate a quick multiple-choice quiz based on the current lesson.
                    </p>
                    <button
                      onClick={handleLaunchQuiz}
                      disabled={isLaunchingQuiz}
                      className="bg-white text-ink w-full md:w-auto px-8 py-4 rounded-xl border-2 border-ink font-black text-xl shadow-comic flex items-center gap-3 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 btn-press"
                    >
                      {isLaunchingQuiz ? <Loader2 className="animate-spin" /> : <Play className="fill-current" />}
                      Launch Quiz
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Live Transcription Card */}
            <div className="bg-soft-purple/20 border-2 border-ink rounded-[2rem] p-6 shadow-comic">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-soft-purple border-2 border-ink rounded-xl flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-black">Live Transcription</h2>
              </div>
              <TranscriptionControls sessionId={sessionId as Id<"sessions">} />
            </div>

            {/* Tools Grid */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowQuestionSummary(true)}
                className="bg-white border-2 border-ink rounded-2xl p-4 shadow-comic hover:shadow-none hover:translate-y-1 hover:translate-x-1 transition-all cursor-pointer group flex items-center gap-4 w-full text-left"
              >
                <div className="w-12 h-12 bg-soft-purple border-2 border-ink rounded-xl flex items-center justify-center group-hover:-rotate-6 transition-transform shrink-0">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Question Summary</h3>
                  <p className="text-slate-500 text-sm">AI analysis of student questions</p>
                </div>
              </button>
              <button
                onClick={handleEndSession}
                className="bg-white border-2 border-ink rounded-2xl p-4 shadow-comic hover:shadow-none hover:translate-y-1 hover:translate-x-1 transition-all cursor-pointer group flex items-center gap-4 w-full"
              >
                <div className="w-12 h-12 bg-white border-2 border-ink rounded-xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm shrink-0">
                  <StopCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg text-red-600 leading-tight">End Class</h3>
                  <p className="text-red-400/80 text-sm font-medium">Close session</p>
                </div>
              </button>
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
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowQrModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-4 border-ink p-8 rounded-[2.5rem] shadow-comic max-w-sm w-full text-center relative"
            >
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors border-2 border-transparent hover:border-ink"
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="text-2xl font-black mb-2">Join Class</h3>
              <p className="text-slate-500 font-bold mb-6">Scan to join immediately</p>

              <div className="bg-white p-4 rounded-xl border-2 border-ink inline-block mb-6 shadow-sm">
                <div style={{ height: "auto", margin: "0 auto", maxWidth: 200, width: "100%" }}>
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Join Code QR"
                      className="w-full h-auto"
                    />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center bg-milk p-3 rounded-xl border-2 border-ink border-dashed">
                <span className="font-mono font-bold text-xl tracking-widest">{session.code}</span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 hover:bg-white rounded-lg transition-colors border-2 border-transparent hover:border-ink"
                  title="Copy Code"
                >
                  {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
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
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowEndSessionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20, rotate: -2 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-4 border-ink p-8 rounded-[2.5rem] shadow-comic max-w-md w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-4 bg-coral border-b-4 border-ink" />

              <div className="w-20 h-20 bg-red-100 rounded-full border-4 border-ink flex items-center justify-center mx-auto mb-6 relative">
                <StopCircle className="w-10 h-10 text-red-500" />
                <div className="absolute -right-2 -top-2 bg-ink text-white text-xs font-black px-2 py-1 rounded-lg transform rotate-12">
                  WAIT!
                </div>
              </div>

              <h3 className="text-3xl font-black mb-4 text-ink">Wrap it up?</h3>
              <p className="text-slate-500 font-bold mb-8 text-lg leading-relaxed">
                Are you sure you want to end this session? <br />
                <span className="text-coral">All students will be disconnected.</span>
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowEndSessionModal(false)}
                  className="flex-1 py-4 px-6 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:border-ink hover:text-ink hover:bg-slate-50 transition-all text-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEndSession}
                  className="flex-1 py-4 px-6 rounded-xl border-2 border-ink bg-coral text-white font-black shadow-comic-sm hover:translate-y-0.5 hover:shadow-none transition-all flex items-center justify-center gap-2 text-lg group"
                >
                  <span>End It</span>
                  <div className="bg-white/20 p-1 rounded-full group-hover:rotate-90 transition-transform">
                    <X className="w-4 h-4" />
                  </div>
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
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowQuestionSummary(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-4 border-ink p-8 rounded-[2.5rem] shadow-comic max-w-lg w-full relative"
            >
              <button
                onClick={() => setShowQuestionSummary(false)}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors border-2 border-transparent hover:border-ink"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-soft-purple border-2 border-ink rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black">Question Summary</h3>
                  <p className="text-slate-500 font-medium">AI analysis of student confusion</p>
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
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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

  // Compute the combined text based on active tab
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
    if (file.size > MAX_FILE_SIZE) {
      return `File exceeds 50MB limit`;
    }
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      return `Unsupported file type "${extension}"`;
    }
    return null;
  };

  const processFiles = async (files: File[]) => {
    // Add files to state with pending status
    const newUploadedFiles: UploadedFile[] = files.map(file => ({
      file,
      status: 'pending' as const
    }));

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    // Process each file
    for (const file of files) {
      // Validate before processing
      const validationError = validateFile(file);
      if (validationError) {
        setUploadedFiles(prev =>
          prev.map(uf =>
            uf.file === file
              ? { ...uf, status: 'error' as const, result: { text: '', fileName: file.name, error: validationError } }
              : uf
          )
        );
        continue;
      }

      try {
        // Set status to uploading
        setUploadedFiles(prev =>
          prev.map(uf =>
            uf.file === file ? { ...uf, status: 'uploading' as const } : uf
          )
        );

        // Upload to Convex storage
        const uploadUrl = await generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        const { storageId } = await uploadResponse.json();

        // Set status to parsing
        setUploadedFiles(prev =>
          prev.map(uf =>
            uf.file === file ? { ...uf, status: 'parsing' as const } : uf
          )
        );

        // Parse the file on the server
        const result = await parseUploadedFile({
          storageId,
          fileName: file.name,
        });

        setUploadedFiles(prev =>
          prev.map(uf =>
            uf.file === file
              ? {
                  ...uf,
                  status: result.error ? 'error' : 'done',
                  result: { text: result.text, fileName: file.name, error: result.error }
                }
              : uf
          )
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setUploadedFiles(prev =>
          prev.map(uf =>
            uf.file === file
              ? { ...uf, status: 'error' as const, result: { text: '', fileName: file.name, error: message } }
              : uf
          )
        );
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input so the same file can be selected again
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
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border-4 border-ink p-6 rounded-[2.5rem] shadow-comic max-w-2xl w-full relative flex flex-col max-h-[85vh]"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors border-2 border-transparent hover:border-ink"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-2xl font-black mb-1">Class Context</h3>
        <p className="text-slate-500 font-bold mb-4">Upload lecture materials or paste text to help AI understand your class.</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('upload')}
            className={clsx(
              "flex-1 py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
              activeTab === 'upload'
                ? "bg-soft-purple text-white border-2 border-ink shadow-comic-sm"
                : "bg-slate-100 text-slate-600 border-2 border-transparent hover:border-slate-200"
            )}
          >
            <Upload className="w-4 h-4" />
            Upload Files
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={clsx(
              "flex-1 py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
              activeTab === 'paste'
                ? "bg-soft-purple text-white border-2 border-ink shadow-comic-sm"
                : "bg-slate-100 text-slate-600 border-2 border-transparent hover:border-slate-200"
            )}
          >
            <FileText className="w-4 h-4" />
            Paste Text
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {activeTab === 'upload' ? (
            <>
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={clsx(
                  "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer mb-4",
                  isDragging
                    ? "border-soft-purple bg-soft-purple/10"
                    : "border-slate-300 hover:border-soft-purple hover:bg-slate-50"
                )}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept={SUPPORTED_EXTENSIONS.join(",")}
                  onChange={handleFileInput}
                  className="hidden"
                />
                <Upload className={clsx(
                  "w-10 h-10 mx-auto mb-2 transition-colors",
                  isDragging ? "text-soft-purple" : "text-slate-400"
                )} />
                <p className="font-bold text-slate-700 mb-1">
                  Drop files here or click to browse
                </p>
                <p className="text-sm text-slate-500">
                  PDF, DOCX, PPTX, TXT, MD (max 10MB each)
                </p>
              </div>

              {/* File List */}
              {uploadedFiles.length > 0 && (
                <div className="mb-4">
                  <p className="font-bold text-sm text-slate-600 mb-2">Files:</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {uploadedFiles.map((uf, i) => (
                      <div
                        key={i}
                        className={clsx(
                          "flex items-center gap-2 p-2 rounded-lg border-2",
                          uf.status === 'error'
                            ? "border-red-200 bg-red-50"
                            : uf.status === 'done'
                            ? "border-green-200 bg-green-50"
                            : "border-slate-200 bg-slate-50"
                        )}
                      >
                        {uf.status === 'pending' || uf.status === 'uploading' || uf.status === 'parsing' ? (
                          <Loader2 className="w-4 h-4 text-soft-purple animate-spin shrink-0" />
                        ) : uf.status === 'error' ? (
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        )}
                        <span className="font-medium text-sm flex-1 truncate">
                          {uf.file.name}
                        </span>
                        {(uf.status === 'uploading' || uf.status === 'parsing') && (
                          <span className="text-xs text-slate-500">
                            {uf.status === 'uploading' ? 'Uploading...' : 'Parsing...'}
                          </span>
                        )}
                        {uf.result?.error && (
                          <span className="text-xs text-red-600 truncate max-w-48" title={uf.result.error}>
                            {uf.result.error}
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(uf.file); }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              {combinedText && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <p className="font-bold text-sm text-slate-600 mb-2">Preview:</p>
                  <div className="flex-1 border-2 border-slate-200 rounded-xl p-3 overflow-y-auto bg-slate-50 min-h-[120px]">
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                      {combinedText.slice(0, 2000)}
                      {combinedText.length > 2000 && (
                        <span className="text-slate-400">... (truncated preview)</span>
                      )}
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
              className="flex-1 w-full border-2 border-ink rounded-xl p-4 font-medium resize-none overflow-y-auto focus:ring-2 focus:ring-soft-purple focus:outline-none min-h-[200px]"
            />
          )}
        </div>

        {/* Character Counter */}
        <div className={clsx(
          "text-right text-sm font-bold mt-3 mb-4",
          isOverLimit ? "text-red-500" : charCount > MAX_CONTEXT_CHARS * 0.9 ? "text-amber-500" : "text-slate-400"
        )}>
          {charCount.toLocaleString()} / {MAX_CONTEXT_CHARS.toLocaleString()} characters
          {isOverLimit && <span className="block text-xs">Content exceeds limit</span>}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-500 hover:border-ink hover:text-ink hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isOverLimit || !hasContent}
            className="px-6 py-3 rounded-xl border-2 border-ink bg-soft-purple text-white font-bold shadow-comic-sm hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

  if (!stats) return <div className="text-center py-8 font-bold text-slate-400 animate-pulse">Waiting for responses...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="text-5xl font-black">{stats.totalResponses}</div>
        <div className="text-sm font-bold text-slate-500 leading-tight">Student<br />Responses</div>
      </div>

      <div className="space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
        {stats.questions.map((q: any, i: number) => (
          <div key={i} className="pb-2">
            <p className="font-bold mb-4 text-lg">{i + 1}. {q.prompt}</p>
            <div className="flex gap-3 w-full">
              {stats.choiceDistributions[i].map((count: number, j: number) => {
                const isCorrect = j === q.correctIndex;
                const percent = stats.totalResponses > 0 ? Math.round((count / stats.totalResponses) * 100) : 0;

                return (
                  <div
                    key={j}
                    className={clsx(
                      "flex-1 min-w-0 relative h-16 rounded-xl border-2 overflow-hidden group transition-all",
                      isCorrect ? "border-green-500 bg-green-50/50" : "border-slate-200 bg-slate-50"
                    )}
                  >
                    {/* Vertical Bar Background */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${percent}%` }}
                      transition={{ type: "spring", bounce: 0, duration: 0.8 }}
                      className={clsx(
                        "absolute bottom-0 inset-x-0 opacity-20 transition-all",
                        isCorrect ? "bg-green-500" : "bg-slate-400"
                      )}
                    />

                    {/* Content */}
                    <div className="relative z-10 w-full h-full flex items-center justify-center gap-3">
                      <span className={clsx(
                        "font-black text-lg px-2.5 py-0.5 rounded-lg border-2",
                        isCorrect ? "bg-green-100 border-green-200 text-green-800" : "bg-white border-slate-200 text-slate-600"
                      )}>
                        {String.fromCharCode(65 + j)}
                        {isCorrect && <Check className="w-3.5 h-3.5 inline ml-1" />}
                      </span>
                      <span className={clsx("text-2xl font-black", isCorrect ? "text-green-900" : "text-slate-700")}>
                        {count}
                      </span>
                    </div>
                  </div>
                )
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
      const result = await getQuestionSummaryAction({
        sessionId,
        timeWindowMinutes: 30,
      });
      setSummary(result);
    } catch (err) {
      console.error("Failed to generate question summary:", err);
      setError("Failed to analyze questions. Please try again.");
    }
    setIsLoading(false);
  };

  // Auto-generate on mount
  useEffect(() => {
    generateSummary();
  }, []);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-soft-purple" />
          <span className="ml-3 font-bold text-slate-500">Analyzing questions...</span>
        </div>
      ) : error ? (
        <div className="bg-coral/10 border-2 border-coral rounded-xl p-4 text-center">
          <p className="text-coral font-bold">{error}</p>
          <button
            onClick={generateSummary}
            className="mt-3 px-4 py-2 bg-coral text-white rounded-lg font-bold hover:bg-coral/90"
          >
            Try Again
          </button>
        </div>
      ) : summary ? (
        <>
          <div className="bg-soft-purple/10 border-2 border-soft-purple/30 rounded-xl p-4">
            <p className="text-ink font-medium">{summary.summary}</p>
          </div>

          {summary.themes.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-600">Common Confusion Points:</h4>
              {summary.themes.map((theme, i) => (
                <div key={i} className="bg-milk border-2 border-ink rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg">{theme.theme}</span>
                    <span className="bg-mustard/20 px-2 py-1 rounded-lg text-sm font-bold">
                      {theme.questionCount} questions
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm">{theme.suggestedAction}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">
                No questions yet! As students ask questions, AI will analyze patterns and show you where they're confused.
              </p>
            </div>
          )}

          <button
            onClick={generateSummary}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-ink text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh Analysis
          </button>
        </>
      ) : null}
    </div>
  );
}
