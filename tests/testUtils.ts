/**
 * Shared utilities for Convex integration tests
 */
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import type { Id } from "../convex/_generated/dataModel";

// Import all Convex modules for testing (including ai/ directory)
export const modules = import.meta.glob("../convex/**/*.ts");

/**
 * Create a new test context with fresh database
 */
export function createTestContext() {
  return convexTest(schema, modules);
}

/**
 * Sample AI context for testing
 */
export const sampleAIContext = {
  sessionId: "session-1" as Id<"sessions">,
  slidesContext: "Lecture about photosynthesis and plant biology.",
  transcriptText: "Today we will learn about how plants convert sunlight into energy.",
  transcriptLineCount: 10,
  recentQuestions: [
    { question: "What is photosynthesis?", answer: "Photosynthesis is the process by which plants convert light into energy." },
    { question: "Why do plants need sunlight?" },
  ],
};

/**
 * Sample question summary result
 */
export const sampleQuestionSummary = {
  summary: "Students are confused about the chemical reactions in photosynthesis.",
  themes: [
    {
      theme: "Photosynthesis Process",
      questionCount: 3,
      suggestedAction: "Review the diagram showing light-dependent reactions",
    },
    {
      theme: "Plant Anatomy",
      questionCount: 2,
      suggestedAction: "Show cross-section of a leaf",
    },
  ],
};

/**
 * Sample lost summary result
 */
export const sampleLostSummary = {
  summary: "We just covered the basics of cellular respiration and how it relates to photosynthesis.",
  keyPoints: [
    "Plants use sunlight to produce glucose",
    "Chloroplasts are the site of photosynthesis",
    "Oxygen is released as a byproduct",
  ],
  suggestedReview: "Review chapter 2, section on light-dependent reactions",
};

/**
 * Sample quiz questions for testing
 */
export const sampleQuizQuestions = [
  {
    prompt: "What is 2+2?",
    choices: ["3", "4", "5", "6"],
    correctIndex: 1,
    explanation: "Basic arithmetic: 2+2=4",
    conceptTag: "arithmetic",
  },
  {
    prompt: "What color is the sky?",
    choices: ["Red", "Green", "Blue", "Yellow"],
    correctIndex: 2,
    explanation: "The sky appears blue due to Rayleigh scattering",
    conceptTag: "science",
  },
  {
    prompt: "Which planet is closest to the sun?",
    choices: ["Venus", "Mercury", "Earth", "Mars"],
    correctIndex: 1,
    explanation: "Mercury is the closest planet to the sun",
    conceptTag: "astronomy",
  },
];

/**
 * Single question for simple tests
 */
export const singleQuestion = {
  prompt: "Test question",
  choices: ["A", "B", "C", "D"],
  correctIndex: 0,
  explanation: "Test explanation",
  conceptTag: "test",
};
