import { describe, it, expect } from 'vitest';

// Quiz stats calculation logic (extracted for testing)
interface QuizQuestion {
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  conceptTag: string;
}

interface QuizResponse {
  answers: number[];
}

function calculateQuizStats(questions: QuizQuestion[], responses: QuizResponse[]) {
  const totalResponses = responses.length;
  const questionCount = questions.length;
  const perQuestionAccuracy: number[] = [];
  const choiceDistributions: number[][] = [];

  for (let i = 0; i < questionCount; i++) {
    const question = questions[i];
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
  };
}

describe('calculateQuizStats', () => {
  const sampleQuestions: QuizQuestion[] = [
    {
      prompt: 'What is 2+2?',
      choices: ['3', '4', '5', '6'],
      correctIndex: 1,
      explanation: 'Basic math',
      conceptTag: 'arithmetic',
    },
    {
      prompt: 'What color is the sky?',
      choices: ['Red', 'Blue', 'Green'],
      correctIndex: 1,
      explanation: 'Basic knowledge',
      conceptTag: 'general',
    },
  ];

  it('should return zero stats for no responses', () => {
    const stats = calculateQuizStats(sampleQuestions, []);

    expect(stats.totalResponses).toBe(0);
    expect(stats.perQuestionAccuracy).toEqual([0, 0]);
    expect(stats.choiceDistributions).toEqual([[0, 0, 0, 0], [0, 0, 0]]);
  });

  it('should calculate 100% accuracy when all answers are correct', () => {
    const responses: QuizResponse[] = [
      { answers: [1, 1] },
      { answers: [1, 1] },
      { answers: [1, 1] },
    ];
    const stats = calculateQuizStats(sampleQuestions, responses);

    expect(stats.totalResponses).toBe(3);
    expect(stats.perQuestionAccuracy).toEqual([1, 1]);
  });

  it('should calculate 0% accuracy when all answers are wrong', () => {
    const responses: QuizResponse[] = [
      { answers: [0, 0] },
      { answers: [2, 2] },
    ];
    const stats = calculateQuizStats(sampleQuestions, responses);

    expect(stats.totalResponses).toBe(2);
    expect(stats.perQuestionAccuracy).toEqual([0, 0]);
  });

  it('should calculate partial accuracy correctly', () => {
    const responses: QuizResponse[] = [
      { answers: [1, 1] }, // both correct
      { answers: [0, 1] }, // first wrong, second correct
      { answers: [1, 0] }, // first correct, second wrong
      { answers: [0, 0] }, // both wrong
    ];
    const stats = calculateQuizStats(sampleQuestions, responses);

    expect(stats.totalResponses).toBe(4);
    expect(stats.perQuestionAccuracy[0]).toBe(0.5); // 2/4 correct
    expect(stats.perQuestionAccuracy[1]).toBe(0.5); // 2/4 correct
  });

  it('should calculate choice distributions correctly', () => {
    const responses: QuizResponse[] = [
      { answers: [0, 0] },
      { answers: [0, 1] },
      { answers: [1, 1] },
      { answers: [1, 2] },
    ];
    const stats = calculateQuizStats(sampleQuestions, responses);

    // Question 1: 2 chose index 0, 2 chose index 1, 0 chose indices 2,3
    expect(stats.choiceDistributions[0]).toEqual([2, 2, 0, 0]);
    // Question 2: 1 chose index 0, 2 chose index 1, 1 chose index 2
    expect(stats.choiceDistributions[1]).toEqual([1, 2, 1]);
  });

  it('should handle invalid answer indices gracefully', () => {
    const responses: QuizResponse[] = [
      { answers: [1, 1] },
      { answers: [-1, 10] }, // invalid indices
      { answers: [1, 1] },
    ];
    const stats = calculateQuizStats(sampleQuestions, responses);

    // Invalid answers should be ignored in distribution
    expect(stats.totalResponses).toBe(3);
    // Only 2 valid answers for each question
    expect(stats.perQuestionAccuracy[0]).toBeCloseTo(2/3);
    expect(stats.perQuestionAccuracy[1]).toBeCloseTo(2/3);
  });
});
