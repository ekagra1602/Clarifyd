import { mutation, query, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { AIResponse } from "./ai/types";

/**
 * Quiz Functions
 *
 * Quiz generation is powered by the unified AI service (convex/ai/service.ts).
 * Teachers can generate quizzes from recent transcript content.
 */

// Feature flag: when true, quiz generation uses content since last quiz
// Set to false to revert to 5-minute window behavior
const USE_SINCE_LAST_QUIZ = true;

// Default time window in minutes (used for first quiz or when feature flag is disabled)
const DEFAULT_QUIZ_TIME_WINDOW_MINUTES = 5;

// Launch a new quiz with provided questions (questions are required)
export const launchQuiz = mutation({
  args: {
    sessionId: v.id("sessions"),
    questions: v.array(
      v.object({
        prompt: v.string(),
        choices: v.array(v.string()),
        correctIndex: v.number(),
        explanation: v.string(),
        conceptTag: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.questions.length === 0) {
      throw new Error("Quiz must have at least one question");
    }

    const quizId = await ctx.db.insert("quizzes", {
      sessionId: args.sessionId,
      createdAt: Date.now(),
      questions: args.questions,
    });

    // Set as active quiz on session
    await ctx.db.patch(args.sessionId, {
      activeQuizId: quizId,
    });

    return { quizId };
  },
});

// Submit quiz responses
// Returns { success: true } on success, or { success: false, reason: "already_submitted" } if already submitted
export const submitQuiz = mutation({
  args: {
    quizId: v.id("quizzes"),
    studentId: v.string(),
    answers: v.array(v.number()),
  },
  handler: async (ctx, args): Promise<{ success: true } | { success: false; reason: "already_submitted" }> => {
    // Check if student already submitted using compound index for O(1) lookup
    const existing = await ctx.db
      .query("quizResponses")
      .withIndex("by_quiz_student", (q) =>
        q.eq("quizId", args.quizId).eq("studentId", args.studentId)
      )
      .first();

    if (existing) {
      return { success: false, reason: "already_submitted" };
    }

    await ctx.db.insert("quizResponses", {
      quizId: args.quizId,
      studentId: args.studentId,
      answers: args.answers,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Get active quiz for a session
export const getActiveQuiz = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session?.activeQuizId) {
      return null;
    }
    return await ctx.db.get(session.activeQuizId);
  },
});

// Get quiz statistics (real-time)
export const getQuizStats = query({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) {
      throw new Error("Quiz not found");
    }

    const responses = await ctx.db
      .query("quizResponses")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();

    const totalResponses = responses.length;
    const questionCount = quiz.questions.length;

    // Calculate per-question accuracy and choice distributions
    const perQuestionAccuracy: number[] = [];
    const choiceDistributions: number[][] = [];

    for (let i = 0; i < questionCount; i++) {
      const question = quiz.questions[i];
      const choiceCount = question.choices.length;
      const distribution = new Array(choiceCount).fill(0);
      let correct = 0;

      for (const response of responses) {
        const answer = response.answers[i];
        if (answer !== undefined && answer >= 0 && answer < choiceCount) {
          distribution[answer]++;
          if (answer === question.correctIndex) {
            correct++;
          }
        }
      }

      perQuestionAccuracy.push(totalResponses > 0 ? correct / totalResponses : 0);
      choiceDistributions.push(distribution);
    }

    return {
      totalResponses,
      perQuestionAccuracy,
      choiceDistributions,
      questions: quiz.questions,
    };
  },
});

// Close active quiz
export const closeQuiz = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      activeQuizId: undefined,
    });
  },
});

// Check if a student has already submitted a quiz
// Used by frontend to avoid showing quiz modal for already-submitted quizzes
export const hasStudentSubmitted = query({
  args: {
    quizId: v.id("quizzes"),
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("quizResponses")
      .withIndex("by_quiz_student", (q) =>
        q.eq("quizId", args.quizId).eq("studentId", args.studentId)
      )
      .first();

    return existing !== null;
  },
});

// Internal mutation to launch quiz with generated questions (called from action)
export const launchQuizInternal = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    questions: v.array(
      v.object({
        prompt: v.string(),
        choices: v.array(v.string()),
        correctIndex: v.number(),
        explanation: v.string(),
        conceptTag: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.questions.length === 0) {
      throw new Error("Quiz must have at least one question");
    }

    const quizId = await ctx.db.insert("quizzes", {
      sessionId: args.sessionId,
      createdAt: Date.now(),
      questions: args.questions,
    });

    // Set as active quiz on session
    await ctx.db.patch(args.sessionId, {
      activeQuizId: quizId,
    });

    return { quizId };
  },
});

// Get the most recent quiz for a session (for "since last quiz" feature)
export const getLastQuizForSession = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("quizzes")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
  },
});

// Internal action to generate quiz using AI
export const generateQuiz = internalAction({
  args: {
    sessionId: v.id("sessions"),
    questionCount: v.optional(v.number()),
    difficulty: v.optional(
      v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))
    ),
    focusOnRecentMinutes: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: true; quizId: string } | { success: false; error?: string }> => {
    // Determine transcript cutoff: since last quiz or fallback to time window
    let sinceTimestamp: number | undefined;

    if (USE_SINCE_LAST_QUIZ) {
      const lastQuiz = await ctx.runQuery(internal.quizzes.getLastQuizForSession, {
        sessionId: args.sessionId,
      });

      if (lastQuiz) {
        // Use content since the last quiz was created
        sinceTimestamp = lastQuiz.createdAt;
        console.log(`[Quiz] Using content since last quiz at ${new Date(sinceTimestamp).toISOString()}`);
      } else {
        // First quiz in session - fall back to default time window
        console.log(`[Quiz] First quiz in session, using ${DEFAULT_QUIZ_TIME_WINDOW_MINUTES}-minute window`);
      }
    }

    const result: AIResponse = await ctx.runAction(internal.ai.service.callGemini, {
      featureType: "quiz_generation",
      sessionId: args.sessionId,
      questionCount: args.questionCount ?? 3,
      difficulty: args.difficulty ?? "medium",
      focusOnRecentMinutes: args.focusOnRecentMinutes ?? DEFAULT_QUIZ_TIME_WINDOW_MINUTES,
      sinceTimestamp,
    });

    if (!result.success || !result.quizResult) {
      console.error("Quiz generation failed:", result.error);
      return { success: false, error: result.error?.message };
    }

    // Create and launch the quiz
    const quizResult: { quizId: string } = await ctx.runMutation(
      internal.quizzes.launchQuizInternal,
      {
        sessionId: args.sessionId,
        questions: result.quizResult.questions,
      }
    );

    return { success: true, quizId: quizResult.quizId };
  },
});

// Public mutation to trigger AI quiz generation
// Schedules the async quiz generation action
export const generateAndLaunchQuiz = mutation({
  args: {
    sessionId: v.id("sessions"),
    questionCount: v.optional(v.number()),
    difficulty: v.optional(
      v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))
    ),
  },
  handler: async (ctx, args) => {
    // Schedule the AI quiz generation
    await ctx.scheduler.runAfter(0, internal.quizzes.generateQuiz, {
      sessionId: args.sessionId,
      questionCount: args.questionCount,
      difficulty: args.difficulty,
    });

    return { scheduled: true };
  },
});
