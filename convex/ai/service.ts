"use node";

import { internalAction, action } from "../_generated/server";
import { v } from "convex/values";
import { internal, api } from "../_generated/api";
import {
  AIFeatureType,
  AIResponse,
  GeminiResponse,
  QuizGenerationResult,
  QuestionSummaryResult,
  LostSummaryResult,
} from "./types";
import {
  SYSTEM_PROMPTS,
  GENERATION_CONFIGS,
  FALLBACK_RESPONSES,
  buildQAPrompt,
  buildQuizGenerationPrompt,
  buildQuestionSummaryPrompt,
  buildLostSummaryPrompt,
} from "./prompts";
import { compressPrompts, compressText } from "./compression";

// ==========================================
// Gemini API Configuration
// ==========================================

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ==========================================
// Core API Call Function
// ==========================================

async function callGeminiAPI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  config: {
    temperature: number;
    maxOutputTokens: number;
    thinkingBudget: number;
    responseFormat: "json" | "text";
  }
): Promise<
  { success: true; response: GeminiResponse } | { success: false; error: string }
> {
  try {
    const generationConfig: Record<string, unknown> = {
      temperature: config.temperature,
      maxOutputTokens: config.maxOutputTokens,
    };

    // Only add thinking config if budget is allocated (and supported by model)
    if (config.thinkingBudget > 0) {
      generationConfig.thinkingConfig = {
        thinkingBudget: config.thinkingBudget,
      };
    }

    // Request JSON output for structured responses
    if (config.responseFormat === "json") {
      generationConfig.responseMimeType = "application/json";
    }

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API error:", response.status, errorBody);

      if (response.status === 429) {
        return { success: false, error: "RATE_LIMITED" };
      }
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, response: data };
  } catch (error) {
    console.error("Gemini API call failed:", error);
    return { success: false, error: String(error) };
  }
}

// ==========================================
// Response Extraction Utilities
// ==========================================

function extractTextFromResponse(response: GeminiResponse): string | null {
  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) return null;

  // Filter out thinking parts (Gemini 2.5 feature)
  const responseParts = candidate.content.parts.filter(
    (part) => part.text && !part.thought
  );

  const text = responseParts.map((part) => part.text).join("\n\n");
  return text.trim() || null;
}

function extractJSONFromResponse<T>(response: GeminiResponse): T | null {
  const text = extractTextFromResponse(response);
  if (!text) return null;

  try {
    // Try parsing directly first (for responseMimeType: application/json)
    return JSON.parse(text) as T;
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim()) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ==========================================
// Main Service Entry Point
// ==========================================

/**
 * Single entry point for all AI calls.
 * This is an internal action called by other Convex functions.
 */
export const callGemini = internalAction({
  args: {
    featureType: v.union(
      v.literal("qa_answer"),
      v.literal("quiz_generation"),
      v.literal("question_summary"),
      v.literal("lost_summary")
    ),
    sessionId: v.id("sessions"),

    // Q&A specific
    questionId: v.optional(v.id("questions")),
    questionText: v.optional(v.string()),

    // Quiz generation specific
    questionCount: v.optional(v.number()),
    difficulty: v.optional(
      v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))
    ),
    focusOnRecentMinutes: v.optional(v.number()),
    // Absolute timestamp cutoff for quiz generation (since last quiz)
    sinceTimestamp: v.optional(v.number()),

    // Question summary specific
    timeWindowMinutes: v.optional(v.number()),

    // Lost summary specific
    studentId: v.optional(v.string()),
    recentMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<AIResponse> => {
    const featureType = args.featureType as AIFeatureType;

    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY not set");
      return {
        success: false,
        featureType,
        error: {
          code: "API_KEY_MISSING",
          message: "GEMINI_API_KEY not configured",
        },
      };
    }

    // Build context based on feature type
    const aiContext = await ctx.runQuery(internal.ai.context.buildContextForFeature, {
      featureType,
      sessionId: args.sessionId,
      recentMinutes: args.recentMinutes ?? args.focusOnRecentMinutes,
      timeWindowMinutes: args.timeWindowMinutes,
      sinceTimestamp: args.sinceTimestamp,
    });

    // Get prompts and config
    const systemPrompt = SYSTEM_PROMPTS[featureType];
    const config = GENERATION_CONFIGS[featureType];

    // Build feature-specific user prompt
    let userPrompt: string;

    switch (featureType) {
      case "qa_answer":
        if (!args.questionText) {
          return {
            success: false,
            featureType,
            error: {
              code: "CONTEXT_ERROR",
              message: "questionText required for Q&A",
            },
          };
        }
        userPrompt = buildQAPrompt(args.questionText, aiContext);
        break;

      case "quiz_generation":
        userPrompt = buildQuizGenerationPrompt(
          args.questionCount ?? 3,
          args.difficulty ?? "medium",
          aiContext
        );
        break;

      case "question_summary": {
        // Get recent questions for summary
        const recentQuestions = await ctx.runQuery(
          internal.ai.context.getRecentQuestionsForSummary,
          {
            sessionId: args.sessionId,
            timeWindowMinutes: args.timeWindowMinutes ?? 30,
          }
        );

        if (recentQuestions.length === 0) {
          return {
            success: true,
            featureType,
            questionSummaryResult: {
              summary: "No questions have been asked yet.",
              themes: [],
            },
          };
        }

        userPrompt = buildQuestionSummaryPrompt(recentQuestions, aiContext);
        break;
      }

      case "lost_summary":
        userPrompt = buildLostSummaryPrompt(aiContext);
        break;
    }

    // Compress prompts before calling Gemini API
    const { compressedSystem, compressedUser } = await compressPrompts(
      featureType,
      systemPrompt,
      userPrompt
    );

    // Call Gemini API with compressed prompts
    console.log(`Calling Gemini API for ${featureType}...`);
    const apiResult = await callGeminiAPI(apiKey, compressedSystem, compressedUser, config);

    if (!apiResult.success) {
      console.error(`Gemini API error for ${featureType}:`, apiResult.error);
      const errorCode =
        apiResult.error === "RATE_LIMITED" ? "RATE_LIMITED" : "API_ERROR";
      return {
        success: false,
        featureType,
        error: { code: errorCode, message: apiResult.error },
      };
    }

    // Parse response based on feature type
    return parseResponse(featureType, apiResult.response);
  },
});

// ==========================================
// Response Parsing
// ==========================================

function parseResponse(
  featureType: AIFeatureType,
  response: GeminiResponse
): AIResponse {
  switch (featureType) {
    case "qa_answer": {
      const answer = extractTextFromResponse(response);
      if (!answer) {
        return {
          success: false,
          featureType,
          error: { code: "PARSE_ERROR", message: "Could not extract answer text" },
        };
      }
      return { success: true, featureType, qaResult: { answer } };
    }

    case "quiz_generation": {
      const parsed = extractJSONFromResponse<QuizGenerationResult>(response);
      if (!parsed?.questions || !Array.isArray(parsed.questions)) {
        console.error("Invalid quiz JSON structure:", extractTextFromResponse(response));
        return {
          success: false,
          featureType,
          error: { code: "PARSE_ERROR", message: "Invalid quiz JSON structure" },
        };
      }
      return { success: true, featureType, quizResult: parsed };
    }

    case "question_summary": {
      const parsed = extractJSONFromResponse<QuestionSummaryResult>(response);
      if (!parsed?.summary) {
        console.error("Invalid summary JSON structure:", extractTextFromResponse(response));
        return {
          success: false,
          featureType,
          error: { code: "PARSE_ERROR", message: "Invalid summary JSON structure" },
        };
      }
      return { success: true, featureType, questionSummaryResult: parsed };
    }

    case "lost_summary": {
      const text = extractTextFromResponse(response);
      if (!text) {
        return {
          success: false,
          featureType,
          error: { code: "PARSE_ERROR", message: "Could not extract summary text" },
        };
      }
      // Parse structured lost summary from text response
      const result: LostSummaryResult = {
        summary: text,
        keyPoints: [],
        suggestedReview: "",
      };
      return { success: true, featureType, lostSummaryResult: result };
    }
  }
}

// Re-export fallback responses for use by other modules
export { FALLBACK_RESPONSES };

// ==========================================
// Public Actions
// ==========================================

/**
 * Generate session summary notes for download.
 * This is a public action that can be called from the frontend.
 */
export const generateSessionNotes = action({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    // Fetch context using the sessions query
    const data = await ctx.runQuery(api.sessions.getSessionContext, {
      sessionId: args.sessionId,
    });

    if (!data) {
      throw new Error("Session not found");
    }

    const { uploadedContext, transcript } = data;

    if (!uploadedContext && !transcript) {
      throw new Error(
        "No context available to generate notes. Please upload slides or ensure transcription is active."
      );
    }

    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured in Convex dashboard.");
    }

    const systemPrompt = `You are an expert educational assistant that creates comprehensive study notes.`;

    const userPrompt = `
Here is the context for a class session:

--- TEACHER SLIDES / CONTEXT ---
${uploadedContext || "(No uploaded context)"}

--- TRANSCRIPT ---
${transcript || "(No transcript available)"}

Please generate a comprehensive, high-level summary of this session in Markdown format.
Include:
- Key Topics Covered
- Important Definitions
- Summary of Discussions
- Action Items / Homework (if mentioned)

Format with clear headers and bullet points.
`;

    // Compress prompts before calling Gemini API (if enabled)
    const globalEnabled = process.env.COMPRESSION_ENABLED !== "false";
    let compressedSystem = systemPrompt;
    let compressedUser = userPrompt;

    if (globalEnabled) {
      const [systemResult, userResult] = await Promise.all([
        compressText(systemPrompt, 0.3),
        compressText(userPrompt, 0.3),
      ]);

      if (systemResult.success) {
        compressedSystem = systemResult.compressedText;
      }
      if (userResult.success) {
        compressedUser = userResult.compressedText;
      }

      // Log compression stats if any succeeded
      if (systemResult.success || userResult.success) {
        const totalInput =
          (systemResult.success ? systemResult.stats.inputTokens : 0) +
          (userResult.success ? userResult.stats.inputTokens : 0);
        const totalOutput =
          (systemResult.success ? systemResult.stats.outputTokens : 0) +
          (userResult.success ? userResult.stats.outputTokens : 0);
        console.log("[Compression] generateSessionNotes:", {
          inputTokens: totalInput,
          outputTokens: totalOutput,
          ratio: totalInput > 0 ? ((totalOutput / totalInput) * 100).toFixed(1) + "%" : "N/A",
        });
      }
    }

    const result = await callGeminiAPI(apiKey, compressedSystem, compressedUser, {
      temperature: 0.7,
      maxOutputTokens: 4000,
      thinkingBudget: 2048,
      responseFormat: "text",
    });

    if (!result.success) {
      console.error("Gemini API Error:", result.error);
      throw new Error("Failed to generate notes with AI. Please try again later.");
    }

    const text = extractTextFromResponse(result.response);
    if (!text) {
      throw new Error("Failed to extract notes from AI response.");
    }

    return text;
  },
});
