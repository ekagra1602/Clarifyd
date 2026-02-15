/**
 * Quiz-related utility functions
 */

/**
 * Generate sessionStorage key for tracking submitted quizzes
 */
export function getSubmittedQuizKey(quizId: string): string {
  return `quiz-submitted-${quizId}`;
}

/**
 * Initialize an answer array with -1 (unanswered) values
 */
export function initializeAnswerArray(questionCount: number): number[] {
  return new Array(questionCount).fill(-1);
}

/**
 * Check if all questions have been answered (no -1 values)
 */
export function allQuestionsAnswered(answers: number[]): boolean {
  return answers.every((a) => a !== -1);
}

/**
 * Check if a specific answer is selected for a question
 */
export function isAnswerSelected(answers: number[], questionIndex: number): boolean {
  return answers[questionIndex] !== -1;
}

/**
 * Convert choice index to letter (0 -> A, 1 -> B, etc.)
 */
export function choiceIndexToLetter(index: number): string {
  return String.fromCharCode(65 + index);
}
