import { Id } from "../_generated/dataModel";

// ==========================================
// Feature Types
// ==========================================

export type AIFeatureType =
  | "qa_answer"
  | "quiz_generation"
  | "question_summary"
  | "lost_summary";

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

export interface AIResponse {
  success: boolean;
  featureType: AIFeatureType;
  qaResult?: QAResult;
  quizResult?: QuizGenerationResult;
  questionSummaryResult?: QuestionSummaryResult;
  lostSummaryResult?: LostSummaryResult;
  error?: {
    code: "API_KEY_MISSING" | "API_ERROR" | "PARSE_ERROR" | "CONTEXT_ERROR" | "RATE_LIMITED";
    message: string;
  };
}

// ==========================================
// Gemini API Types
// ==========================================

export interface GeminiPart {
  text?: string;
  thought?: boolean;
}

export interface GeminiCandidate {
  content?: {
    parts?: GeminiPart[];
  };
  finishReason?: string;
}

export interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

export interface GeminiGenerationConfig {
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
