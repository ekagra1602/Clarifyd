import { Page, Route } from "@playwright/test";

// Mock quiz generation response
export const mockQuizResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              questions: [
                {
                  prompt: "What is the main topic discussed in the lecture?",
                  choices: [
                    "Option A - First choice",
                    "Option B - Second choice",
                    "Option C - Third choice",
                    "Option D - Fourth choice",
                  ],
                  correctIndex: 1,
                  explanation: "This is the correct answer because...",
                  conceptTag: "main-concept",
                },
                {
                  prompt: "Which of the following statements is correct?",
                  choices: [
                    "Statement 1",
                    "Statement 2",
                    "Statement 3",
                    "Statement 4",
                  ],
                  correctIndex: 2,
                  explanation: "Explanation for the answer",
                  conceptTag: "secondary-concept",
                },
                {
                  prompt: "What is the key takeaway from this section?",
                  choices: [
                    "Takeaway A",
                    "Takeaway B",
                    "Takeaway C",
                    "Takeaway D",
                  ],
                  correctIndex: 0,
                  explanation: "This represents the core concept",
                  conceptTag: "key-takeaway",
                },
              ],
            }),
          },
        ],
      },
    },
  ],
};

// Mock Q&A response
export const mockQAResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: "Based on the lecture content, the answer to your question is that this concept relates to the fundamental principles we discussed earlier. The key point is that understanding this helps you grasp the broader topic.",
          },
        ],
      },
    },
  ],
};

// Mock lost summary response
export const mockLostSummaryResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: "Here is a summary to help you catch up: We have been discussing the key concepts of the lecture. The main points covered so far include the introduction to the topic and its practical applications.",
          },
        ],
      },
    },
  ],
};

// Mock question summary response
export const mockQuestionSummaryResponse = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: JSON.stringify({
              themes: [
                {
                  topic: "Core Concepts",
                  count: 3,
                  summary: "Students asked about fundamental principles",
                },
              ],
              suggestions: ["Consider reviewing the basics"],
            }),
          },
        ],
      },
    },
  ],
};

export async function mockGeminiAPI(
  page: Page,
  responseType: "quiz" | "qa" | "lost" | "summary" = "qa"
) {
  const responses = {
    quiz: mockQuizResponse,
    qa: mockQAResponse,
    lost: mockLostSummaryResponse,
    summary: mockQuestionSummaryResponse,
  };

  await page.route(
    "**/generativelanguage.googleapis.com/**",
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responses[responseType]),
      });
    }
  );
}

export async function mockGeminiAPIError(page: Page, statusCode = 500) {
  await page.route(
    "**/generativelanguage.googleapis.com/**",
    async (route: Route) => {
      await route.fulfill({
        status: statusCode,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "API Error" } }),
      });
    }
  );
}
