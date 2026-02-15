import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Question schema for quizzes
const questionSchema = v.object({
  prompt: v.string(),
  choices: v.array(v.string()),
  correctIndex: v.number(),
  explanation: v.string(),
  conceptTag: v.string(),
});

export default defineSchema({
  // Lecture sessions with join codes
  sessions: defineTable({
    code: v.string(), // Unique, human-readable join code (e.g., "blue-tiger")
    roomName: v.optional(v.string()), // Custom name for the class/room
    status: v.union(v.literal("live"), v.literal("ended")),
    createdAt: v.number(),
    contextText: v.optional(v.string()), // Uploaded slides/context for AI
    activeQuizId: v.optional(v.id("quizzes")), // Currently active quiz

  }).index("by_code", ["code"]),

  // Transcript segments - append-only for real-time performance
  transcriptLines: defineTable({
    sessionId: v.id("sessions"),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId", "createdAt"]),

  // Quiz definitions with MCQ questions
  quizzes: defineTable({
    sessionId: v.id("sessions"),
    createdAt: v.number(),
    questions: v.array(questionSchema),
  }).index("by_session", ["sessionId", "createdAt"]),

  // Student quiz responses
  quizResponses: defineTable({
    quizId: v.id("quizzes"),
    studentId: v.string(),
    answers: v.array(v.number()), // Selected choice indices
    createdAt: v.number(),
  })
    .index("by_quiz", ["quizId"])
    .index("by_quiz_student", ["quizId", "studentId"]),

  // "I'm lost" signals for spike detection
  lostEvents: defineTable({
    sessionId: v.id("sessions"),
    studentId: v.string(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId", "createdAt"]),

  // Track joined students, their "lost" status, and presence
  students: defineTable({
    sessionId: v.id("sessions"),
    studentId: v.string(),
    isLost: v.boolean(),
    joinedAt: v.number(),
    lastSeen: v.optional(v.number()), // Heartbeat timestamp
    lostSummary: v.optional(v.string()), // AI-generated summary when student is lost
    lostSummaryAt: v.optional(v.number()), // When the summary was generated
  })
    .index("by_session", ["sessionId"])
    .index("by_session_student", ["sessionId", "studentId"]),

  // Student Q&A with AI responses
  questions: defineTable({
    sessionId: v.id("sessions"),
    studentId: v.string(),
    question: v.string(),
    answer: v.optional(v.string()), // AI-generated answer
    createdAt: v.number(),
  }).index("by_session", ["sessionId", "createdAt"]),

  // Student video generation requests (lecture context + custom prompts)
  videoRequests: defineTable({
    sessionId: v.id("sessions"),
    studentId: v.string(),
    triggerType: v.union(v.literal("transcript"), v.literal("custom_prompt")),
    studentPrompt: v.optional(v.string()),
    sourcePrompt: v.string(), // Raw prompt before Claude optimization
    optimizedPrompt: v.optional(v.string()), // Claude-converted Veo prompt
    status: v.union(
      v.literal("queued"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    provider: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    providerRequestId: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_session_student", ["sessionId", "studentId", "createdAt"])
    .index("by_status", ["status", "createdAt"]),
});
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Question schema for quizzes
const questionSchema = v.object({
  prompt: v.string(),
  choices: v.array(v.string()),
  correctIndex: v.number(),
  explanation: v.string(),
  conceptTag: v.string(),
});

export default defineSchema({
  // Lecture sessions with join codes
  sessions: defineTable({
    code: v.string(), // Unique, human-readable join code (e.g., "blue-tiger")
    roomName: v.optional(v.string()), // Custom name for the class/room
    status: v.union(v.literal("live"), v.literal("ended")),
    createdAt: v.number(),
    contextText: v.optional(v.string()), // Uploaded slides/context for AI
    activeQuizId: v.optional(v.id("quizzes")), // Currently active quiz

  }).index("by_code", ["code"]),

  // Transcript segments - append-only for real-time performance
  transcriptLines: defineTable({
    sessionId: v.id("sessions"),
    text: v.string(),
    createdAt: v.number(),
    // Optional tag to indicate where this transcript line came from (mic, zoom VTT, captions scrape, etc.)
    source: v.optional(v.string()),
  }).index("by_session", ["sessionId", "createdAt"]),

  // Quiz definitions with MCQ questions
  quizzes: defineTable({
    sessionId: v.id("sessions"),
    createdAt: v.number(),
    questions: v.array(questionSchema),
  }).index("by_session", ["sessionId", "createdAt"]),

  // Student quiz responses
  quizResponses: defineTable({
    quizId: v.id("quizzes"),
    studentId: v.string(),
    answers: v.array(v.number()), // Selected choice indices
    createdAt: v.number(),
  })
    .index("by_quiz", ["quizId"])
    .index("by_quiz_student", ["quizId", "studentId"]),

  // "I'm lost" signals for spike detection
  lostEvents: defineTable({
    sessionId: v.id("sessions"),
    studentId: v.string(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId", "createdAt"]),

  // Track joined students, their "lost" status, and presence
  students: defineTable({
    sessionId: v.id("sessions"),
    studentId: v.string(),
    isLost: v.boolean(),
    joinedAt: v.number(),
    lastSeen: v.optional(v.number()), // Heartbeat timestamp
    lostSummary: v.optional(v.string()), // AI-generated summary when student is lost
    lostSummaryAt: v.optional(v.number()), // When the summary was generated
    // Leaderboard: streak and score (optional for backwards compatibility)
    currentStreak: v.optional(v.number()),
    bestStreak: v.optional(v.number()),
    totalCorrect: v.optional(v.number()),
    totalAnswered: v.optional(v.number()),
    score: v.optional(v.number()),
    // Student profile (avatar, accessibility, preferences)
    profileComplete: v.optional(v.boolean()),
    displayName: v.optional(v.string()),
    avatar: v.optional(v.object({
      hairStyle: v.optional(v.string()),
      hairColor: v.optional(v.string()),
      eyes: v.optional(v.string()),
      skinTone: v.optional(v.string()),
      accessory: v.optional(v.string()),
    })),
    accessibility: v.optional(v.array(v.string())),
    languagePreference: v.optional(v.string()),
    learningPreference: v.optional(v.array(v.string())),
    pacePreference: v.optional(v.string()),
    otherAccessibility: v.optional(v.string()),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_student", ["sessionId", "studentId"]),

  // Student Q&A with AI responses
  questions: defineTable({
    sessionId: v.id("sessions"),
    studentId: v.string(),
    question: v.string(),
    answer: v.optional(v.string()), // AI-generated answer
    createdAt: v.number(),
  }).index("by_session", ["sessionId", "createdAt"]),
});
