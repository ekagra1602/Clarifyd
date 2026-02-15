/**
 * Unit tests for AI prompt utilities
 */
import { describe, it, expect } from "vitest";
import type { Id } from "../_generated/dataModel";
import {
  formatContextForPrompt,
  buildQAPrompt,
  buildQuizGenerationPrompt,
  buildQuestionSummaryPrompt,
  buildLostSummaryPrompt,
  SYSTEM_PROMPTS,
  GENERATION_CONFIGS,
  FALLBACK_RESPONSES,
} from "./prompts";
import type { AIContext, AIFeatureType } from "./types";

// Helper to create a minimal AIContext
function createContext(overrides: Partial<AIContext> = {}): AIContext {
  return {
    sessionId: "session-1" as Id<"sessions">,
    transcriptText: "",
    transcriptLineCount: 0,
    ...overrides,
  };
}

describe("formatContextForPrompt", () => {
  it("should return empty string for empty context", () => {
    const context = createContext();
    const result = formatContextForPrompt(context);
    expect(result).toBe("");
  });

  it("should include slides context when available", () => {
    const context = createContext({
      slidesContext: "Chapter 1: Introduction to Biology",
    });
    const result = formatContextForPrompt(context);
    expect(result).toContain("## Lecture Slides/Notes:");
    expect(result).toContain("Chapter 1: Introduction to Biology");
  });

  it("should include transcript when available", () => {
    const context = createContext({
      transcriptText: "Today we will learn about photosynthesis.",
      transcriptLineCount: 5,
    });
    const result = formatContextForPrompt(context);
    expect(result).toContain("## Recent Transcript (5 segments):");
    expect(result).toContain("Today we will learn about photosynthesis.");
  });

  it("should not include transcript section when empty", () => {
    const context = createContext({
      transcriptText: "",
      transcriptLineCount: 0,
    });
    const result = formatContextForPrompt(context);
    expect(result).not.toContain("## Recent Transcript");
  });

  it("should include recent questions when available", () => {
    const context = createContext({
      recentQuestions: [
        { question: "What is photosynthesis?", answer: "It is a process..." },
        { question: "Why is it important?" },
      ],
    });
    const result = formatContextForPrompt(context);
    expect(result).toContain("## Recent Q&A:");
    expect(result).toContain("Q1: What is photosynthesis?");
    expect(result).toContain("A1: It is a process...");
    expect(result).toContain("Q2: Why is it important?");
    // Question without answer should not have A2
    expect(result).not.toContain("A2:");
  });

  it("should combine all context types with proper formatting", () => {
    const context = createContext({
      slidesContext: "Slides content here",
      transcriptText: "Transcript content here",
      transcriptLineCount: 10,
      recentQuestions: [{ question: "Test question?", answer: "Test answer" }],
    });
    const result = formatContextForPrompt(context);
    expect(result).toContain("=== LECTURE CONTEXT ===");
    expect(result).toContain("=== END CONTEXT ===");
    expect(result).toContain("## Lecture Slides/Notes:");
    expect(result).toContain("## Recent Transcript (10 segments):");
    expect(result).toContain("## Recent Q&A:");
  });
});

describe("buildQAPrompt", () => {
  it("should include the question text", () => {
    const context = createContext();
    const result = buildQAPrompt("What is the capital of France?", context);
    expect(result).toContain('Student Question: "What is the capital of France?"');
  });

  it("should include context when available", () => {
    const context = createContext({
      slidesContext: "European Geography",
      transcriptText: "We are discussing France today.",
      transcriptLineCount: 1,
    });
    const result = buildQAPrompt("What is the capital?", context);
    expect(result).toContain("European Geography");
    expect(result).toContain("We are discussing France today.");
  });

  it("should provide instruction for contextless answers", () => {
    const context = createContext();
    const result = buildQAPrompt("Random question?", context);
    expect(result).toContain("provide a general educational response");
  });
});

describe("buildQuizGenerationPrompt", () => {
  it("should include question count", () => {
    const context = createContext();
    const result = buildQuizGenerationPrompt(5, "medium", context);
    expect(result).toContain("Generate 5 multiple-choice questions");
  });

  it("should include difficulty level", () => {
    const context = createContext();
    const result = buildQuizGenerationPrompt(3, "hard", context);
    expect(result).toContain("hard difficulty level");
  });

  it("should include JSON structure example", () => {
    const context = createContext();
    const result = buildQuizGenerationPrompt(3, "easy", context);
    expect(result).toContain('"questions"');
    expect(result).toContain('"prompt"');
    expect(result).toContain('"choices"');
    expect(result).toContain('"correctIndex"');
    expect(result).toContain('"explanation"');
    expect(result).toContain('"conceptTag"');
  });

  it("should include context for grounding", () => {
    const context = createContext({
      transcriptText: "Biology lecture content",
      transcriptLineCount: 5,
    });
    const result = buildQuizGenerationPrompt(3, "medium", context);
    expect(result).toContain("Biology lecture content");
  });
});

describe("buildQuestionSummaryPrompt", () => {
  it("should list all questions with numbers", () => {
    const questions = [
      { question: "What is X?", answer: "X is..." },
      { question: "How does Y work?" },
      { question: "Why is Z important?" },
    ];
    const context = createContext();
    const result = buildQuestionSummaryPrompt(questions, context);
    expect(result).toContain("1. What is X?");
    expect(result).toContain("2. How does Y work?");
    expect(result).toContain("3. Why is Z important?");
  });

  it("should include question count", () => {
    const questions = [
      { question: "Q1?" },
      { question: "Q2?" },
    ];
    const context = createContext();
    const result = buildQuestionSummaryPrompt(questions, context);
    expect(result).toContain("Student Questions (2 total):");
  });

  it("should include JSON structure for themes", () => {
    const questions = [{ question: "Test?" }];
    const context = createContext();
    const result = buildQuestionSummaryPrompt(questions, context);
    expect(result).toContain('"summary"');
    expect(result).toContain('"themes"');
    expect(result).toContain('"theme"');
    expect(result).toContain('"questionCount"');
    expect(result).toContain('"suggestedAction"');
  });
});

describe("buildLostSummaryPrompt", () => {
  it("should mention student clicked 'I'm lost'", () => {
    const context = createContext();
    const result = buildLostSummaryPrompt(context);
    expect(result).toContain('clicked "I\'m lost"');
  });

  it("should request brief summary", () => {
    const context = createContext();
    const result = buildLostSummaryPrompt(context);
    expect(result).toContain("brief");
    expect(result).toContain("encouraging");
  });

  it("should include lecture context", () => {
    const context = createContext({
      transcriptText: "Recent lecture about mitochondria",
      transcriptLineCount: 3,
    });
    const result = buildLostSummaryPrompt(context);
    expect(result).toContain("Recent lecture about mitochondria");
  });
});

describe("SYSTEM_PROMPTS", () => {
  const featureTypes: AIFeatureType[] = [
    "qa_answer",
    "quiz_generation",
    "question_summary",
    "lost_summary",
  ];

  featureTypes.forEach((featureType) => {
    it(`should have a system prompt for ${featureType}`, () => {
      expect(SYSTEM_PROMPTS[featureType]).toBeDefined();
      expect(typeof SYSTEM_PROMPTS[featureType]).toBe("string");
      expect(SYSTEM_PROMPTS[featureType].length).toBeGreaterThan(0);
    });
  });

  it("qa_answer prompt should mention teaching assistant", () => {
    expect(SYSTEM_PROMPTS.qa_answer.toLowerCase()).toContain("teaching assistant");
  });

  it("quiz_generation prompt should mention multiple-choice", () => {
    expect(SYSTEM_PROMPTS.quiz_generation.toLowerCase()).toContain("multiple-choice");
  });

  it("question_summary prompt should mention patterns", () => {
    expect(SYSTEM_PROMPTS.question_summary.toLowerCase()).toContain("patterns");
  });

  it("lost_summary prompt should mention supportive", () => {
    expect(SYSTEM_PROMPTS.lost_summary.toLowerCase()).toContain("supportive");
  });
});

describe("GENERATION_CONFIGS", () => {
  const featureTypes: AIFeatureType[] = [
    "qa_answer",
    "quiz_generation",
    "question_summary",
    "lost_summary",
  ];

  featureTypes.forEach((featureType) => {
    it(`should have config for ${featureType}`, () => {
      const config = GENERATION_CONFIGS[featureType];
      expect(config).toBeDefined();
      expect(typeof config.temperature).toBe("number");
      expect(typeof config.maxOutputTokens).toBe("number");
      expect(typeof config.thinkingBudget).toBe("number");
      expect(["json", "text"]).toContain(config.responseFormat);
    });
  });

  it("qa_answer should have no thinking budget (fast response)", () => {
    expect(GENERATION_CONFIGS.qa_answer.thinkingBudget).toBe(0);
  });

  it("quiz_generation should have thinking budget (quality questions)", () => {
    expect(GENERATION_CONFIGS.quiz_generation.thinkingBudget).toBeGreaterThan(0);
  });

  it("quiz_generation should use JSON format", () => {
    expect(GENERATION_CONFIGS.quiz_generation.responseFormat).toBe("json");
  });

  it("question_summary should use JSON format", () => {
    expect(GENERATION_CONFIGS.question_summary.responseFormat).toBe("json");
  });

  it("lost_summary should use text format", () => {
    expect(GENERATION_CONFIGS.lost_summary.responseFormat).toBe("text");
  });
});

describe("FALLBACK_RESPONSES", () => {
  const featureTypes: AIFeatureType[] = [
    "qa_answer",
    "quiz_generation",
    "question_summary",
    "lost_summary",
  ];

  featureTypes.forEach((featureType) => {
    it(`should have fallback for ${featureType}`, () => {
      expect(FALLBACK_RESPONSES[featureType]).toBeDefined();
      expect(typeof FALLBACK_RESPONSES[featureType]).toBe("string");
      expect(FALLBACK_RESPONSES[featureType].length).toBeGreaterThan(0);
    });
  });

  it("fallback responses should be user-friendly", () => {
    // Should not contain technical error messages
    Object.values(FALLBACK_RESPONSES).forEach((response) => {
      expect(response.toLowerCase()).not.toContain("error");
      expect(response.toLowerCase()).not.toContain("exception");
      expect(response.toLowerCase()).not.toContain("failed");
    });
  });
});
