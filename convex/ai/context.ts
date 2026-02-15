import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { AIContext, AIFeatureType } from "./types";

// Default limits for context building
const DEFAULT_TRANSCRIPT_LIMIT = 50;
const DEFAULT_QUESTION_LIMIT = 10;

/**
 * Build AI context for a specific feature type.
 * Called internally by the AI service.
 */
export const buildContextForFeature = internalQuery({
  args: {
    featureType: v.union(
      v.literal("qa_answer"),
      v.literal("quiz_generation"),
      v.literal("question_summary"),
      v.literal("lost_summary")
    ),
    sessionId: v.id("sessions"),
    recentMinutes: v.optional(v.number()),
    timeWindowMinutes: v.optional(v.number()),
    // Absolute timestamp cutoff (takes priority over relative time windows)
    sinceTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<AIContext> => {
    const featureType = args.featureType as AIFeatureType;

    // Get session for slides context
    const session = await ctx.db.get(args.sessionId);

    // Determine context options based on feature type
    const options = getContextOptionsForFeature(
      featureType,
      args.recentMinutes,
      args.timeWindowMinutes
    );

    // Build transcript context
    let transcriptText = "";
    let transcriptLineCount = 0;

    if (options.includeTranscript) {
      let transcriptLines = await ctx.db
        .query("transcriptLines")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .order("desc")
        .take(options.transcriptLimit);

      // Apply time filter: sinceTimestamp takes priority over relative minutes window
      if (args.sinceTimestamp) {
        // Use absolute timestamp cutoff (e.g., since last quiz)
        transcriptLines = transcriptLines.filter(
          (line) => line.createdAt >= args.sinceTimestamp!
        );
      } else if (options.transcriptMinutesWindow) {
        // Fall back to relative time window
        const cutoffTime =
          Date.now() - options.transcriptMinutesWindow * 60 * 1000;
        transcriptLines = transcriptLines.filter(
          (line) => line.createdAt >= cutoffTime
        );
      }

      // Reverse to chronological order and join
      const chronologicalLines = transcriptLines.reverse();
      transcriptText = chronologicalLines.map((line) => line.text).join(" ");
      transcriptLineCount = chronologicalLines.length;
    }

    // Build recent questions context
    let recentQuestions: Array<{ question: string; answer?: string }> | undefined;

    if (options.includeQuestions) {
      const questions = await ctx.db
        .query("questions")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .order("desc")
        .take(options.questionLimit);

      recentQuestions = questions.reverse().map((q) => ({
        question: q.question,
        answer: q.answer,
      }));
    }

    return {
      sessionId: args.sessionId,
      slidesContext: options.includeSlides ? session?.contextText : undefined,
      transcriptText,
      transcriptLineCount,
      recentQuestions,
    };
  },
});

/**
 * Get recent questions for generating a summary.
 */
export const getRecentQuestionsForSummary = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    timeWindowMinutes: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<Array<{ question: string; answer?: string }>> => {
    const timeWindowMinutes = args.timeWindowMinutes ?? 30;
    const cutoffTime = Date.now() - timeWindowMinutes * 60 * 1000;

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .take(50);

    return questions.reverse().map((q) => ({
      question: q.question,
      answer: q.answer,
    }));
  },
});

// ==========================================
// Helper Functions
// ==========================================

interface ContextOptions {
  includeSlides: boolean;
  includeTranscript: boolean;
  transcriptLimit: number;
  transcriptMinutesWindow?: number;
  includeQuestions: boolean;
  questionLimit: number;
}

function getContextOptionsForFeature(
  featureType: AIFeatureType,
  recentMinutes?: number,
  timeWindowMinutes?: number
): ContextOptions {
  switch (featureType) {
    case "qa_answer":
      // Q&A: Include slides + recent transcript, no questions
      return {
        includeSlides: true,
        includeTranscript: true,
        transcriptLimit: 30,
        transcriptMinutesWindow: recentMinutes ?? 5,
        includeQuestions: false,
        questionLimit: 0,
      };

    case "quiz_generation":
      // Quiz: Rich context with slides, transcript, and recent Q&A
      return {
        includeSlides: true,
        includeTranscript: true,
        transcriptLimit: 100,
        transcriptMinutesWindow: recentMinutes ?? 5,
        includeQuestions: true,
        questionLimit: 5,
      };

    case "question_summary":
      // Summary: Slides + transcript for context, questions fetched separately
      return {
        includeSlides: true,
        includeTranscript: true,
        transcriptLimit: DEFAULT_TRANSCRIPT_LIMIT,
        transcriptMinutesWindow: timeWindowMinutes ?? 30,
        includeQuestions: false,
        questionLimit: 0,
      };

    case "lost_summary":
      // Lost: Quick context, recent 3 minutes of transcript
      return {
        includeSlides: true,
        includeTranscript: true,
        transcriptLimit: 30,
        transcriptMinutesWindow: recentMinutes ?? 3,
        includeQuestions: false,
        questionLimit: 0,
      };

    default:
      return {
        includeSlides: true,
        includeTranscript: true,
        transcriptLimit: DEFAULT_TRANSCRIPT_LIMIT,
        includeQuestions: false,
        questionLimit: DEFAULT_QUESTION_LIMIT,
      };
  }
}
