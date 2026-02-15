import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { FALLBACK_RESPONSES } from "./ai/service";

// Word lists for human-readable join codes
const ADJECTIVES = [
  "red", "blue", "green", "swift", "calm", "bold", "warm", "cool",
  "bright", "dark", "wild", "gentle", "happy", "quiet", "loud", "soft"
];
const NOUNS = [
  "tiger", "eagle", "river", "mountain", "forest", "ocean", "star", "moon",
  "wolf", "bear", "fox", "hawk", "storm", "flame", "frost", "wind"
];

// Generate a human-readable join code (e.g., "blue-tiger-42")
// Total combinations: 16 * 16 * 100 = 25,600 unique codes
function generateJoinCode(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}-${noun}-${num}`;
}

// Maximum attempts to generate a unique code before failing
const MAX_CODE_GENERATION_ATTEMPTS = 10;

// Create a new lecture session
export const createSession = mutation({
  args: { roomName: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Generate a unique join code with collision detection
    let code: string;
    let attempts = 0;

    do {
      code = generateJoinCode();
      const existing = await ctx.db
        .query("sessions")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();

      if (!existing) {
        break;
      }

      attempts++;
      if (attempts >= MAX_CODE_GENERATION_ATTEMPTS) {
        throw new Error(
          "Failed to generate unique join code. Please try again."
        );
      }
    } while (true);

    const sessionId = await ctx.db.insert("sessions", {
      code,
      roomName: args.roomName,
      status: "live",
      createdAt: Date.now(),
    });
    return { sessionId, code };
  },
});

// Join a session via join code
export const joinSession = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status !== "live") {
      throw new Error("Session has ended");
    }

    // Generate a unique student ID
    const studentId = `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Store student in database
    await ctx.db.insert("students", {
      sessionId: session._id,
      studentId,
      isLost: false,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    });

    return { sessionId: session._id, studentId };
  },
});

// Get the number of active students in a session
export const getStudentCount = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const students = await ctx.db
      .query("students")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Filter active students (seen in last 15 seconds)
    const now = Date.now();
    const activeStudents = students.filter(s => (s.lastSeen ?? 0) > now - 15000);
    return activeStudents.length;
  },
});

// Get the number of active, lost students
export const getLostStudentCount = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const lostStudents = await ctx.db
      .query("students")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isLost"), true))
      .collect();

    // Filter active students (seen in last 15 seconds)
    const now = Date.now();
    const activeLostStudents = lostStudents.filter(s => (s.lastSeen ?? 0) > now - 15000);
    return activeLostStudents.length;
  },
});

// Set "I'm lost" status for a student
export const setLostStatus = mutation({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.string(),
    isLost: v.boolean(),
  },
  handler: async (ctx, args) => {
    const studentRecord = await ctx.db
      .query("students")
      .withIndex("by_session_student", (q) =>
        q.eq("sessionId", args.sessionId).eq("studentId", args.studentId)
      )
      .first();

    if (studentRecord) {
      await ctx.db.patch(studentRecord._id, {
        isLost: args.isLost,
        lastSeen: Date.now(),
        // Clear summary when un-lost so it regenerates next time
        ...(args.isLost ? {} : { lostSummary: undefined, lostSummaryAt: undefined }),
      });
    } else {
      await ctx.db.insert("students", {
        sessionId: args.sessionId,
        studentId: args.studentId,
        isLost: args.isLost,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      });
    }

    if (args.isLost) {
      // Record the lost event for analytics
      await ctx.db.insert("lostEvents", {
        sessionId: args.sessionId,
        studentId: args.studentId,
        createdAt: Date.now(),
      });

      // Auto-post a question to the chat
      const questionId = await ctx.db.insert("questions", {
        sessionId: args.sessionId,
        studentId: args.studentId,
        question: "I'm feeling lost. Can you help me catch up?",
        createdAt: Date.now(),
      });

      // Trigger AI summary generation for this student (as an answer to the question)
      await ctx.scheduler.runAfter(0, internal.sessions.generateLostSummary, {
        sessionId: args.sessionId,
        studentId: args.studentId,
        questionId: questionId,
      });
    }
  },
});

// Heartbeat to keep student active
export const keepAlive = mutation({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    const student = await ctx.db
      .query("students")
      .withIndex("by_session_student", (q) =>
        q.eq("sessionId", args.sessionId).eq("studentId", args.studentId)
      )
      .first();

    if (student) {
      await ctx.db.patch(student._id, {
        lastSeen: Date.now(),
      });
    }
  },
});

// Get current state for a student
export const getStudentState = query({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    const student = await ctx.db
      .query("students")
      .withIndex("by_session_student", (q) =>
        q.eq("sessionId", args.sessionId).eq("studentId", args.studentId)
      )
      .first();

    return student;
  },
});

// Get session by ID
export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

// Get session by join code
export const getSessionByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});

// Upload slides/context for AI
export const uploadSlides = mutation({
  args: {
    sessionId: v.id("sessions"),
    slidesText: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      contextText: args.slidesText,
    });
  },
});

// Generate upload URL for file uploads
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// End a session
export const endSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "ended",
      activeQuizId: undefined,
    });
  },
});

// Internal mutation to save lost summary (called from action)
export const saveLostSummary = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const studentRecord = await ctx.db
      .query("students")
      .withIndex("by_session_student", (q) =>
        q.eq("sessionId", args.sessionId).eq("studentId", args.studentId)
      )
      .first();

    if (studentRecord) {
      await ctx.db.patch(studentRecord._id, {
        lostSummary: args.summary,
        lostSummaryAt: Date.now(),
      });
    }
  },
});

// Internal action to generate lost summary using AI
// TODO: Could add auto-summary every 15 seconds instead of per-student
// This would reduce API calls and show same summary to all lost students
export const generateLostSummary = internalAction({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.string(),
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runAction(internal.ai.service.callGemini, {
      featureType: "lost_summary",
      sessionId: args.sessionId,
      studentId: args.studentId,
      recentMinutes: 3,
    });

    const summary = (result.success && result.lostSummaryResult)
      ? result.lostSummaryResult.summary
      : FALLBACK_RESPONSES.lost_summary;

    // Save as answer to the question
    await ctx.runMutation(internal.questions.saveAnswerInternal, {
      questionId: args.questionId,
      answer: summary,
    });
  },
});

// Get full session context (slides + transcript) for AI generation
export const getSessionContext = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const transcriptLines = await ctx.db
      .query("transcriptLines")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const transcriptText = transcriptLines.map((line) => line.text).join("\n");

    return {
      uploadedContext: session.contextText || "",
      transcript: transcriptText,
    };
  },
});

// Batched query for teacher page - combines session, student counts, and active quiz
export const getTeacherPageData = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    // Fetch session
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Fetch all students for this session (single DB query)
    const students = await ctx.db
      .query("students")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Calculate counts from the same data
    const now = Date.now();
    const activeStudents = students.filter(s => (s.lastSeen ?? 0) > now - 15000);
    const studentCount = activeStudents.length;
    const lostStudentCount = activeStudents.filter(s => s.isLost).length;

    // Fetch active quiz if exists
    let activeQuiz = null;
    if (session.activeQuizId) {
      activeQuiz = await ctx.db.get(session.activeQuizId);
    }

    return {
      session,
      studentCount,
      lostStudentCount,
      activeQuiz,
    };
  },
});

// Batched query for student page - combines session, transcript, quiz, student state, and counts
export const getStudentPageData = query({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Fetch session
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Fetch transcript (most recent 200 lines in desc order, then reverse)
    const transcriptLines = await ctx.db
      .query("transcriptLines")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(200);
    const transcript = transcriptLines.reverse();

    // Fetch active quiz if exists
    let activeQuiz = null;
    if (session.activeQuizId) {
      activeQuiz = await ctx.db.get(session.activeQuizId);
    }

    // Fetch all students for counts
    const students = await ctx.db
      .query("students")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const now = Date.now();
    const activeStudents = students.filter(s => (s.lastSeen ?? 0) > now - 15000);
    const studentCount = activeStudents.length;

    // Fetch student state if studentId provided
    let studentState = null;
    const studentIdParam = args.studentId;
    if (studentIdParam) {
      studentState = await ctx.db
        .query("students")
        .withIndex("by_session_student", (q) =>
          q.eq("sessionId", args.sessionId).eq("studentId", studentIdParam)
        )
        .first();
    }

    return {
      session,
      transcript,
      activeQuiz,
      studentCount,
      studentState,
    };
  },
});
