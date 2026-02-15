import {
  mutation,
  query,
  action,
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { FALLBACK_RESPONSES } from "./ai/prompts";
import { AIResponse, QuestionTheme } from "./ai/types";

// Ask a question (stores and returns ID; AI answer saved separately)
export const askQuestion = mutation({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.string(),
    question: v.string(),
  },
  handler: async (ctx, args) => {
    const questionId = await ctx.db.insert("questions", {
      sessionId: args.sessionId,
      studentId: args.studentId,
      question: args.question,
      createdAt: Date.now(),
    });

    // Schedule AI answer generation
    await ctx.scheduler.runAfter(0, internal.questions.generateAnswer, {
      questionId,
    });

    return { questionId };
  },
});

// Save AI-generated answer to a question
export const saveAnswer = mutation({
  args: {
    questionId: v.id("questions"),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.questionId, {
      answer: args.answer,
    });
  },
});

// Internal mutation to save answer (called from action)
export const saveAnswerInternal = internalMutation({
  args: {
    questionId: v.id("questions"),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.questionId, {
      answer: args.answer,
    });
  },
});

// Internal query to get a question (called from action)
export const getQuestionInternal = internalQuery({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.questionId);
  },
});

// Action to generate AI answer using unified AI service
export const generateAnswer = internalAction({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    console.log("generateAnswer action started for questionId:", args.questionId);

    // Get the question from the database
    const question = await ctx.runQuery(internal.questions.getQuestionInternal, {
      questionId: args.questionId,
    });

    if (!question) {
      console.error("Question not found:", args.questionId);
      await ctx.runMutation(internal.questions.saveAnswerInternal, {
        questionId: args.questionId,
        answer:
          "Sorry, we couldn't find your question. It may have been deleted or there was an error loading it.",
      });
      return;
    }

    // Call unified AI service
    const result = await ctx.runAction(internal.ai.service.callGemini, {
      featureType: "qa_answer",
      sessionId: question.sessionId,
      questionId: args.questionId,
      questionText: question.question,
    });

    // Save result or fallback
    const answer = result.success
      ? result.qaResult!.answer
      : FALLBACK_RESPONSES.qa_answer;

    await ctx.runMutation(internal.questions.saveAnswerInternal, {
      questionId: args.questionId,
      answer,
    });
  },
});

// Action to generate a summary of recent questions for teachers
export const generateQuestionSummary = internalAction({
  args: {
    sessionId: v.id("sessions"),
    timeWindowMinutes: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; summary: string; themes: QuestionTheme[] }> => {
    const result: AIResponse = await ctx.runAction(internal.ai.service.callGemini, {
      featureType: "question_summary",
      sessionId: args.sessionId,
      timeWindowMinutes: args.timeWindowMinutes ?? 30,
    });

    if (!result.success || !result.questionSummaryResult) {
      return {
        success: false,
        summary: "Unable to analyze questions at this time.",
        themes: [],
      };
    }

    return {
      success: true,
      ...result.questionSummaryResult,
    };
  },
});

// Public action for teachers to get question summary
export const getQuestionSummary = action({
  args: {
    sessionId: v.id("sessions"),
    timeWindowMinutes: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; summary: string; themes: QuestionTheme[] }> => {
    return await ctx.runAction(internal.questions.generateQuestionSummary, {
      sessionId: args.sessionId,
      timeWindowMinutes: args.timeWindowMinutes ?? 30,
    });
  },
});

// List recent questions for a session (real-time)
// List recent questions for a session (real-time)
// Updated to support private student chats
export const listRecentQuestions = query({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.optional(v.string()), // Optional for privacy
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(limit);

    // Filter by studentId if provided (private chat mode)
    // If not provided (teacher view), show all or handled by another query
    const filteredQuestions = args.studentId 
      ? questions.filter(q => q.studentId === args.studentId)
      : questions;

    // Return in chronological order (oldest first)
    return filteredQuestions.reverse();
  },
});

// Get a single question by ID
export const getQuestion = query({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.questionId);
  },
});
