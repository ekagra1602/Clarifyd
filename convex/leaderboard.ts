import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Leaderboard scoring: streak multiplier and score computation.
 * Single place to tune formula.
 */
export function streakMultiplier(streak: number): number {
  return Math.min(1.5, 0.1 * streak);
}

export function computeScore(totalCorrect: number, currentStreak: number): number {
  return totalCorrect * (1 + streakMultiplier(currentStreak));
}

export const getLeaderboard = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const students = await ctx.db
      .query("students")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const withDefaults = students.map((s) => ({
      ...s,
      currentStreak: s.currentStreak ?? 0,
      bestStreak: s.bestStreak ?? 0,
      totalCorrect: s.totalCorrect ?? 0,
      totalAnswered: s.totalAnswered ?? 0,
      score: s.score ?? 0,
    }));

    withDefaults.sort((a, b) => {
      if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
      if (b.totalCorrect !== a.totalCorrect) return b.totalCorrect - a.totalCorrect;
      return b.score - a.score;
    });

    return withDefaults.map((s, i) => ({
      rank: i + 1,
      studentId: s.studentId,
      currentStreak: s.currentStreak,
      bestStreak: s.bestStreak,
      totalCorrect: s.totalCorrect,
      totalAnswered: s.totalAnswered,
      score: Math.round(s.score * 10) / 10,
    }));
  },
});
