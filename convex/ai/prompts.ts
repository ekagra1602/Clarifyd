import { AIContext, AIFeatureType } from "./types";

// ==========================================
// System Prompts
// ==========================================

export const SYSTEM_PROMPTS: Record<AIFeatureType, string> = {
  qa_answer: `You are a helpful teaching assistant for a live lecture.
Your role is to help students understand the material being taught.
Keep answers clear, concise (2-3 sentences), and educational.
Base your answers on the lecture context provided when available.`,

  quiz_generation: `You are an educational assessment expert.
Generate multiple-choice questions to test student understanding of lecture material.
Questions should:
- Test comprehension, not just recall
- Have one clearly correct answer
- Include plausible distractors
- Cover key concepts from the recent lecture content
Output valid JSON only, no additional text or markdown.`,

  question_summary: `You are an educational analytics assistant.
Analyze student questions to identify patterns of confusion.
Group similar questions into themes and provide actionable insights for the teacher.
Output valid JSON only, no additional text or markdown.`,

  lost_summary: `You are a supportive teaching assistant.
A student has indicated they are lost during the lecture.
Provide a brief, encouraging summary of what was just covered.
Focus on the key concepts and offer a clear path forward.
Keep it concise (3-4 sentences max) and supportive in tone.`,
};

// ==========================================
// Generation Config Presets
// ==========================================

export const GENERATION_CONFIGS: Record<
  AIFeatureType,
  {
    temperature: number;
    maxOutputTokens: number;
    thinkingBudget: number;
    responseFormat: "json" | "text";
  }
> = {
  qa_answer: {
    temperature: 0.7,
    maxOutputTokens: 2000,
    thinkingBudget: 0,
    responseFormat: "text",
  },
  quiz_generation: {
    temperature: 0.8,
    maxOutputTokens: 2000,
    thinkingBudget: 1024,
    responseFormat: "json",
  },
  question_summary: {
    temperature: 0.5,
    maxOutputTokens: 1000,
    thinkingBudget: 512,
    responseFormat: "json",
  },
  lost_summary: {
    temperature: 0.6,
    maxOutputTokens: 2000,
    thinkingBudget: 1024,
    responseFormat: "text",
  },
};

// ==========================================
// Context Formatting
// ==========================================

export function formatContextForPrompt(context: AIContext): string {
  const parts: string[] = [];

  if (context.slidesContext) {
    parts.push(`## Lecture Slides/Notes:\n${context.slidesContext}`);
  }

  if (context.transcriptText && context.transcriptLineCount > 0) {
    parts.push(
      `## Recent Transcript (${context.transcriptLineCount} segments):\n${context.transcriptText}`
    );
  }

  if (context.recentQuestions && context.recentQuestions.length > 0) {
    const qaPairs = context.recentQuestions
      .map(
        (q, i) =>
          `Q${i + 1}: ${q.question}${q.answer ? `\nA${i + 1}: ${q.answer}` : ""}`
      )
      .join("\n\n");
    parts.push(`## Recent Q&A:\n${qaPairs}`);
  }

  return parts.length > 0
    ? `=== LECTURE CONTEXT ===\n\n${parts.join("\n\n")}\n\n=== END CONTEXT ===`
    : "";
}

// ==========================================
// Feature-Specific Prompt Builders
// ==========================================

export function buildQAPrompt(
  questionText: string,
  context: AIContext
): string {
  const contextSection = formatContextForPrompt(context);

  return `${contextSection}

Student Question: "${questionText}"

Provide a clear, concise, and helpful answer based on the lecture context above. If the context doesn't contain relevant information, provide a general educational response.`;
}

export function buildQuizGenerationPrompt(
  questionCount: number,
  difficulty: "easy" | "medium" | "hard",
  context: AIContext
): string {
  const contextSection = formatContextForPrompt(context);

  return `${contextSection}

Generate ${questionCount} multiple-choice questions at ${difficulty} difficulty level based on the lecture content above.

Output as a JSON object with this exact structure:
{
  "questions": [
    {
      "prompt": "Question text here?",
      "choices": ["First option", "Second option", "Third option", "Fourth option"],
      "correctIndex": 0,
      "explanation": "Why the correct answer is correct",
      "conceptTag": "Brief concept label"
    }
  ]
}`;
}

export function buildQuestionSummaryPrompt(
  questions: Array<{ question: string; answer?: string }>,
  context: AIContext
): string {
  const contextSection = formatContextForPrompt(context);
  const questionsList = questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n");

  return `${contextSection}

Student Questions (${questions.length} total):
${questionsList}

Analyze these questions and identify patterns of confusion among students.

Output as a JSON object with this exact structure:
{
  "summary": "Overall summary of what students are struggling with (1-2 sentences)",
  "themes": [
    {
      "theme": "Concept or topic name",
      "questionCount": 3,
      "suggestedAction": "What the teacher could do to address this"
    }
  ]
}`;
}

export function buildLostSummaryPrompt(context: AIContext): string {
  const contextSection = formatContextForPrompt(context);

  return `${contextSection}

A student has clicked "I'm lost" to indicate they need help catching up.

Provide a brief, encouraging summary of what was just covered in the lecture.
Include 2-3 key points they should focus on.
Keep the tone supportive and the content concise.`;
}

// ==========================================
// Fallback Responses
// ==========================================

export const FALLBACK_RESPONSES: Record<AIFeatureType, string> = {
  qa_answer:
    "I'm sorry, I couldn't generate an answer right now. Please try again or ask your teacher.",
  quiz_generation:
    "Unable to generate quiz questions. Please try again in a moment.",
  question_summary: "Unable to analyze questions at this time.",
  lost_summary:
    "The lecture has been covering important material. Please ask your teacher for a quick summary of what was just discussed.",
};
