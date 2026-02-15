import { Id } from "../_generated/dataModel";

// ==========================================
// Feature Types
// ==========================================

export type AIFeatureType =
  | "qa_answer"
  | "quiz_generation"
  | "question_summary"
  | "lost_summary"
  | "translate_question";

// ==========================================
// Context Types
// ==========================================

export interface AIContext {
  sessionId: Id<"sessions">;
  slidesContext?: string;
  transcriptText: string;
  transcriptLineCount: number;
  recentQuestions?: Array<{
    question: string;
    answer?: string;
  }>;
  // TODO: Add optional studentProfile (languagePreference, accessibility, learningPreference, pacePreference)
  // from sessions.getStudentState for personalization: output language, verbosity, captions/audio emphasis.
}

// ==========================================
// Feature-Specific Payloads
// ==========================================

export interface QAPayload {
  questionId: Id<"questions">;
  questionText: string;
}

export interface QuizGenerationPayload {
  questionCount: number;
  difficulty: "easy" | "medium" | "hard";
  focusOnRecentMinutes: number;
}

export interface QuestionSummaryPayload {
  timeWindowMinutes: number;
}

export interface LostSummaryPayload {
  studentId: string;
  recentMinutes: number;
}

// ==========================================
// Feature-Specific Results
// ==========================================

export interface QAResult {
  answer: string;
}

export interface QuizQuestion {
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  conceptTag: string;
}

export interface QuizGenerationResult {
  questions: QuizQuestion[];
}

export interface QuestionTheme {
  theme: string;
  questionCount: number;
  suggestedAction: string;
}

export interface QuestionSummaryResult {
  summary: string;
  themes: QuestionTheme[];
}

export interface LostSummaryResult {
  summary: string;
  keyPoints: string[];
  suggestedReview: string;
}

// ==========================================
// Unified Response Type
// ==========================================

export interface TranslateResult {
  translatedText: string;
  originalLanguage: string;
}

export interface AIResponse {
  success: boolean;
  featureType: AIFeatureType;
  qaResult?: QAResult;
  quizResult?: QuizGenerationResult;
  questionSummaryResult?: QuestionSummaryResult;
  lostSummaryResult?: LostSummaryResult;
  translateResult?: TranslateResult;
  error?: {
    code: "API_KEY_MISSING" | "API_ERROR" | "PARSE_ERROR" | "CONTEXT_ERROR" | "RATE_LIMITED";
    message: string;
  };
}

// ==========================================
// Claude API Types
// ==========================================

export interface ClaudeContentBlock {
  type: string;
  text?: string;
}

export interface ClaudeResponse {
  id?: string;
  type?: string;
  role?: string;
  content?: ClaudeContentBlock[];
  stop_reason?: string | null;
}

export interface ClaudeGenerationConfig {
  temperature: number;
  maxOutputTokens: number;
  thinkingConfig?: {
    thinkingBudget: number;
  };
  responseMimeType?: string;
}

// ==========================================
// Compression Types (Token Company API)
// ==========================================

export interface CompressionConfig {
  enabled: boolean;
  aggressiveness: number; // 0.0-1.0, default 0.3
}

export interface CompressionStats {
  inputTokens: number;
  outputTokens: number;
  compressionTimeMs: number;
  compressionRatio: number;
}

export type CompressionResult =
  | { success: true; compressedText: string; stats: CompressionStats }
  | { success: false; error: string };
