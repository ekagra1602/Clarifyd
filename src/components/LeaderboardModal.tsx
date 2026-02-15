import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { motion } from "framer-motion";
import clsx from "clsx";

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
      className="fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white border-2 border-ink rounded-2xl shadow-comic max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b-2 border-ink bg-mustard/20 flex items-center justify-between">
          <h2 className="text-xl font-black text-ink">Leaderboard</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-full transition-colors group"
          >
            <div className="w-5 h-5 relative flex items-center justify-center">
              <div className="absolute w-full h-0.5 bg-ink rotate-45 group-hover:bg-coral transition-colors" />
              <div className="absolute w-full h-0.5 bg-ink -rotate-45 group-hover:bg-coral transition-colors" />
            </div>
          </button>
        </div>
        <div className="overflow-y-auto p-4 custom-scrollbar">
          {!leaderboard ? (
            <div className="py-8 text-center text-slate-500 font-bold">Loading...</div>
          ) : leaderboard.length === 0 ? (
            <div className="py-8 text-center text-slate-500 font-bold">No students yet.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="pb-2 pr-2 font-black text-ink text-sm">#</th>
                  <th className="pb-2 pr-2 font-black text-ink text-sm">Name</th>
                  <th className="pb-2 pr-2 font-black text-ink text-sm text-center">Streak</th>
                  <th className="pb-2 pr-2 font-black text-ink text-sm text-center">Correct</th>
                  <th className="pb-2 font-black text-ink text-sm text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row: LeaderboardEntry) => (
                  <tr
                    key={row.studentId}
                    className={clsx(
                      "border-b border-slate-200",
                      row.studentId === currentStudentId && "bg-coral/10 border-coral/30"
                    )}
                  >
                    <td className="py-2.5 pr-2 font-bold text-ink">{row.rank}</td>
                    <td className="py-2.5 pr-2 font-medium text-ink">
                      {displayName(row.studentId)}
                      {row.studentId === currentStudentId && (
                        <span className="ml-1 text-xs font-bold text-coral">(you)</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-2 text-center">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-mustard/30 border border-ink/20 font-bold text-sm">
                        🔥 {row.currentStreak}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-center font-medium text-ink">
                      {row.totalCorrect}
                      {row.totalAnswered > 0 && (
                        <span className="text-slate-500 text-xs ml-0.5">/ {row.totalAnswered}</span>
                      )}
                    </td>
                    <td className="py-2.5 font-bold text-ink text-right">{row.score}</td>
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
