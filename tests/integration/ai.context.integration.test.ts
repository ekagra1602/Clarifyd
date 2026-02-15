/**
 * Integration tests for AI Context Building
 *
 * Tests the context gathering queries that provide data to the AI service.
 */
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules } from "../testUtils";

describe("AI Context Building Integration Tests", () => {
  describe("buildContextForFeature", () => {
    it("should return empty context for session with no data", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const context = await t.query(internal.ai.context.buildContextForFeature, {
        featureType: "qa_answer",
        sessionId,
      });

      expect(context.sessionId).toBe(sessionId);
      expect(context.slidesContext).toBeUndefined();
      expect(context.transcriptText).toBe("");
      expect(context.transcriptLineCount).toBe(0);
      expect(context.recentQuestions).toBeUndefined();
    });

    it("should include slides context when available", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Upload slides context
      await t.mutation(api.sessions.uploadSlides, {
        sessionId,
        slidesText: "Chapter 1: Introduction to Photosynthesis",
      });

      const context = await t.query(internal.ai.context.buildContextForFeature, {
        featureType: "qa_answer",
        sessionId,
      });

      expect(context.slidesContext).toBe("Chapter 1: Introduction to Photosynthesis");
    });

    it("should include transcript text joined in chronological order", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Add transcript lines
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "First segment.",
      });
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "Second segment.",
      });
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "Third segment.",
      });

      const context = await t.query(internal.ai.context.buildContextForFeature, {
        featureType: "qa_answer",
        sessionId,
      });

      // Should be joined in chronological order (first to third)
      expect(context.transcriptText).toBe("First segment. Second segment. Third segment.");
      expect(context.transcriptLineCount).toBe(3);
    });

    it("should return correct transcriptLineCount", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Add 5 transcript lines
      for (let i = 1; i <= 5; i++) {
        await t.mutation(api.transcripts.appendTranscriptLine, {
          sessionId,
          text: `Segment ${i}.`,
        });
      }

      const context = await t.query(internal.ai.context.buildContextForFeature, {
        featureType: "qa_answer",
        sessionId,
      });

      expect(context.transcriptLineCount).toBe(5);
    });

    describe("Feature-specific context options", () => {
      it("qa_answer should include slides and transcript, no questions", async () => {
        const t = convexTest(schema, modules);
        const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
        const { studentId } = await t.mutation(api.sessions.joinSession, { code });

        // Add slides
        await t.mutation(api.sessions.uploadSlides, {
          sessionId,
          slidesText: "Slides content",
        });

        // Add transcript
        await t.mutation(api.transcripts.appendTranscriptLine, {
          sessionId,
          text: "Transcript content.",
        });

        // Add a question
        await t.mutation(api.questions.askQuestion, {
          sessionId,
          studentId,
          question: "Test question?",
        });
        await t.finishInProgressScheduledFunctions();

        const context = await t.query(internal.ai.context.buildContextForFeature, {
          featureType: "qa_answer",
          sessionId,
        });

        expect(context.slidesContext).toBe("Slides content");
        expect(context.transcriptText).toContain("Transcript content");
        expect(context.recentQuestions).toBeUndefined();
      });

      it("quiz_generation should include slides, transcript, and questions", async () => {
        const t = convexTest(schema, modules);
        const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
        const { studentId } = await t.mutation(api.sessions.joinSession, { code });

        // Add slides
        await t.mutation(api.sessions.uploadSlides, {
          sessionId,
          slidesText: "Quiz slides",
        });

        // Add transcript
        await t.mutation(api.transcripts.appendTranscriptLine, {
          sessionId,
          text: "Quiz transcript.",
        });

        // Add a question
        await t.mutation(api.questions.askQuestion, {
          sessionId,
          studentId,
          question: "What is this?",
        });
        await t.finishInProgressScheduledFunctions();

        const context = await t.query(internal.ai.context.buildContextForFeature, {
          featureType: "quiz_generation",
          sessionId,
        });

        expect(context.slidesContext).toBe("Quiz slides");
        expect(context.transcriptText).toContain("Quiz transcript");
        expect(context.recentQuestions).toBeDefined();
        expect(context.recentQuestions).toHaveLength(1);
        expect(context.recentQuestions?.[0].question).toBe("What is this?");
      });

      it("lost_summary should include slides and transcript, no questions", async () => {
        const t = convexTest(schema, modules);
        const { sessionId } = await t.mutation(api.sessions.createSession, {});

        // Add slides
        await t.mutation(api.sessions.uploadSlides, {
          sessionId,
          slidesText: "Lost slides",
        });

        // Add transcript
        await t.mutation(api.transcripts.appendTranscriptLine, {
          sessionId,
          text: "Lost transcript.",
        });

        const context = await t.query(internal.ai.context.buildContextForFeature, {
          featureType: "lost_summary",
          sessionId,
        });

        expect(context.slidesContext).toBe("Lost slides");
        expect(context.transcriptText).toContain("Lost transcript");
        expect(context.recentQuestions).toBeUndefined();
      });

      it("question_summary should include slides and transcript, no questions in context", async () => {
        const t = convexTest(schema, modules);
        const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
        const { studentId } = await t.mutation(api.sessions.joinSession, { code });

        // Add slides
        await t.mutation(api.sessions.uploadSlides, {
          sessionId,
          slidesText: "Summary slides",
        });

        // Add transcript
        await t.mutation(api.transcripts.appendTranscriptLine, {
          sessionId,
          text: "Summary transcript.",
        });

        // Add a question (should NOT be included - fetched separately)
        await t.mutation(api.questions.askQuestion, {
          sessionId,
          studentId,
          question: "Summary question?",
        });
        await t.finishInProgressScheduledFunctions();

        const context = await t.query(internal.ai.context.buildContextForFeature, {
          featureType: "question_summary",
          sessionId,
        });

        expect(context.slidesContext).toBe("Summary slides");
        expect(context.transcriptText).toContain("Summary transcript");
        // question_summary fetches questions separately via getRecentQuestionsForSummary
        expect(context.recentQuestions).toBeUndefined();
      });
    });

    describe("Transcript limits", () => {
      it("qa_answer should have lower transcript limit than quiz_generation", async () => {
        const t = convexTest(schema, modules);
        const { sessionId } = await t.mutation(api.sessions.createSession, {});

        // Add many transcript lines
        for (let i = 1; i <= 50; i++) {
          await t.mutation(api.transcripts.appendTranscriptLine, {
            sessionId,
            text: `Segment ${i}.`,
          });
        }

        const qaContext = await t.query(internal.ai.context.buildContextForFeature, {
          featureType: "qa_answer",
          sessionId,
        });

        const quizContext = await t.query(internal.ai.context.buildContextForFeature, {
          featureType: "quiz_generation",
          sessionId,
        });

        // qa_answer limit is 30, quiz_generation is 100
        expect(qaContext.transcriptLineCount).toBeLessThanOrEqual(30);
        expect(quizContext.transcriptLineCount).toBeLessThanOrEqual(100);
      });
    });

    describe("Question limits for quiz_generation", () => {
      it("should limit recent questions to 5", async () => {
        const t = convexTest(schema, modules);
        const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
        const { studentId } = await t.mutation(api.sessions.joinSession, { code });

        // Add 10 questions
        for (let i = 1; i <= 10; i++) {
          await t.mutation(api.questions.askQuestion, {
            sessionId,
            studentId,
            question: `Question ${i}?`,
          });
          await t.finishInProgressScheduledFunctions();
        }

        const context = await t.query(internal.ai.context.buildContextForFeature, {
          featureType: "quiz_generation",
          sessionId,
        });

        // quiz_generation questionLimit is 5
        expect(context.recentQuestions).toBeDefined();
        expect(context.recentQuestions!.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe("getRecentQuestionsForSummary", () => {
    it("should return empty array when no questions", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      const questions = await t.query(internal.ai.context.getRecentQuestionsForSummary, {
        sessionId,
      });

      expect(questions).toEqual([]);
    });

    it("should return questions in chronological order", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      // Add questions
      await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId,
        question: "First question?",
      });
      await t.finishInProgressScheduledFunctions();

      await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId,
        question: "Second question?",
      });
      await t.finishInProgressScheduledFunctions();

      await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId,
        question: "Third question?",
      });
      await t.finishInProgressScheduledFunctions();

      const questions = await t.query(internal.ai.context.getRecentQuestionsForSummary, {
        sessionId,
      });

      expect(questions).toHaveLength(3);
      expect(questions[0].question).toBe("First question?");
      expect(questions[1].question).toBe("Second question?");
      expect(questions[2].question).toBe("Third question?");
    });

    it("should return question data correctly", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId,
        question: "What is photosynthesis?",
      });
      // Note: Answer generation requires API key in test environment

      const questions = await t.query(internal.ai.context.getRecentQuestionsForSummary, {
        sessionId,
      });

      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe("What is photosynthesis?");
      // Answer may or may not be present depending on whether AI action completed
    });

    it("should respect 50 question limit", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      // Add 60 questions
      for (let i = 1; i <= 60; i++) {
        await t.mutation(api.questions.askQuestion, {
          sessionId,
          studentId,
          question: `Question ${i}?`,
        });
        await t.finishInProgressScheduledFunctions();
      }

      const questions = await t.query(internal.ai.context.getRecentQuestionsForSummary, {
        sessionId,
      });

      expect(questions.length).toBeLessThanOrEqual(50);
    });

    it("should use default 30 minute time window", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      // Add a question (will be recent)
      await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId,
        question: "Recent question?",
      });
      await t.finishInProgressScheduledFunctions();

      const questions = await t.query(internal.ai.context.getRecentQuestionsForSummary, {
        sessionId,
      });

      // Question should be included (within 30 min window)
      expect(questions).toHaveLength(1);
    });

    it("should allow custom time window", async () => {
      const t = convexTest(schema, modules);
      const { sessionId, code } = await t.mutation(api.sessions.createSession, {});
      const { studentId } = await t.mutation(api.sessions.joinSession, { code });

      // Add a question
      await t.mutation(api.questions.askQuestion, {
        sessionId,
        studentId,
        question: "Test question?",
      });
      await t.finishInProgressScheduledFunctions();

      // Query with custom time window
      const questions = await t.query(internal.ai.context.getRecentQuestionsForSummary, {
        sessionId,
        timeWindowMinutes: 60,
      });

      expect(questions).toHaveLength(1);
    });
  });

  describe("Context building edge cases", () => {
    it("should handle session with only slides", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.sessions.uploadSlides, {
        sessionId,
        slidesText: "Only slides here",
      });

      const context = await t.query(internal.ai.context.buildContextForFeature, {
        featureType: "qa_answer",
        sessionId,
      });

      expect(context.slidesContext).toBe("Only slides here");
      expect(context.transcriptText).toBe("");
      expect(context.transcriptLineCount).toBe(0);
    });

    it("should handle session with only transcript", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: "Only transcript here.",
      });

      const context = await t.query(internal.ai.context.buildContextForFeature, {
        featureType: "qa_answer",
        sessionId,
      });

      expect(context.slidesContext).toBeUndefined();
      expect(context.transcriptText).toBe("Only transcript here.");
      expect(context.transcriptLineCount).toBe(1);
    });

    it("should handle very long transcript text", async () => {
      const t = convexTest(schema, modules);
      const { sessionId } = await t.mutation(api.sessions.createSession, {});

      // Add transcript with long text
      const longText = "A".repeat(5000);
      await t.mutation(api.transcripts.appendTranscriptLine, {
        sessionId,
        text: longText,
      });

      const context = await t.query(internal.ai.context.buildContextForFeature, {
        featureType: "qa_answer",
        sessionId,
      });

      expect(context.transcriptText.length).toBe(5000);
      expect(context.transcriptLineCount).toBe(1);
    });
  });
});
