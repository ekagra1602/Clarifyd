import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { motion } from "framer-motion";
import clsx from "clsx";
import { X, Trophy } from "lucide-react";

type LeaderboardEntry = {
  rank: number;
  studentId: string;
  currentStreak: number;
  bestStreak: number;
  totalCorrect: number;
  totalAnswered: number;
  score: number;
};

function displayName(studentId: string): string {
  const suffix = studentId.replace(/^student-\d+-/, "");
  return suffix ? `Student ${suffix.slice(0, 6)}` : "Student";
}

export function LeaderboardModal({
  sessionId,
  currentStudentId,
  onClose,
}: {
  sessionId: Id<"sessions">;
  currentStudentId?: string | null;
  onClose: () => void;
}) {
  const leaderboard = useQuery(api.leaderboard.getLeaderboard, { sessionId });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="card-glass max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-lg font-display font-bold text-text-primary flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-warm" />
            Leaderboard
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-bg-elevated rounded-lg transition-colors">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {!leaderboard ? (
            <div className="py-8 text-center text-text-muted text-sm">Loading...</div>
          ) : leaderboard.length === 0 ? (
            <div className="py-8 text-center text-text-muted text-sm">No students yet.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2.5 pr-2 font-semibold text-text-muted text-xs">#</th>
                  <th className="pb-2.5 pr-2 font-semibold text-text-muted text-xs">Name</th>
                  <th className="pb-2.5 pr-2 font-semibold text-text-muted text-xs text-center">Streak</th>
                  <th className="pb-2.5 pr-2 font-semibold text-text-muted text-xs text-center">Correct</th>
                  <th className="pb-2.5 font-semibold text-text-muted text-xs text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row: LeaderboardEntry) => (
                  <tr
                    key={row.studentId}
                    className={clsx(
                      "border-b border-border/50",
                      row.studentId === currentStudentId && "bg-primary/5"
                    )}
                  >
                    <td className="py-2.5 pr-2 font-semibold text-text-secondary text-sm">{row.rank}</td>
                    <td className="py-2.5 pr-2 font-medium text-text-primary text-sm">
                      {displayName(row.studentId)}
                      {row.studentId === currentStudentId && (
                        <span className="ml-1 text-[10px] font-semibold text-primary-light">(you)</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-2 text-center">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-warm/15 border border-warm/20 font-semibold text-xs text-warm-light">
                        {row.currentStreak}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-center font-medium text-text-secondary text-sm">
                      {row.totalCorrect}
                      {row.totalAnswered > 0 && (
                        <span className="text-text-muted text-[10px] ml-0.5">/ {row.totalAnswered}</span>
                      )}
                    </td>
                    <td className="py-2.5 font-bold text-text-primary text-sm text-right">{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
