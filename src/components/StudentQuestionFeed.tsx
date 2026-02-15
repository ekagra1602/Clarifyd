
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Loader2, MessageCircle, Globe, Check, MessageSquare } from "lucide-react";
import clsx from "clsx";

interface StudentQuestionFeedProps {
    sessionId: Id<"sessions">;
}

function QuestionItem({ q }: { q: any }) {
    const approveAnswer = useMutation(api.questions.approveAnswer);
    const addFollowUp = useMutation(api.questions.addTeacherFollowUp);
    const [isAddingFollowUp, setIsAddingFollowUp] = useState(false);
    const [followUpText, setFollowUpText] = useState("");

    const handleApprove = async () => {
        await approveAnswer({
            questionId: q._id,
            answer: q.answer,
        });
    };

    const handleSaveFollowUp = async () => {
        if (!followUpText.trim()) return;
        await addFollowUp({
            questionId: q._id,
            followUp: followUpText,
        });
        setIsAddingFollowUp(false);
        setFollowUpText("");
    };

    return (
        <div className="bg-white border-2 border-ink rounded-xl p-4 shadow-sm hover:translate-x-1 transition-transform">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    {q.translatedQuestion ? (
                        <div className="space-y-2">
                            <p className="font-bold text-lg leading-tight">{q.translatedQuestion}</p>
                            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 w-fit">
                                <Globe className="w-3 h-3" />
                                <span>Translated from {q.originalLanguage}:</span>
                                <span className="italic">"{q.question}"</span>
                            </div>
                        </div>
                    ) : (
                        <p className="font-bold text-lg leading-tight">{q.question}</p>
                    )}
                </div>
                <span className="text-xs font-bold text-slate-400 whitespace-nowrap bg-slate-100 px-2 py-1 rounded-lg">
                    {new Date(q.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
            </div>

            {q.answer && (
                <div className={clsx(
                    "mt-3 pl-4 border-l-4",
                    q.isApproved ? "border-green-500" : "border-yellow-400"
                )}>
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-600">
                            <span className={clsx(
                                "font-black mr-1",
                                q.isApproved ? "text-green-600" : "text-yellow-600"
                            )}>
                                {q.isApproved ? "AI Answer" : "AI Answer (Pending Review):"}
                            </span>
                            {q.answer}
                        </p>

                        {q.teacherFollowUp && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800 text-sm">
                                <p className="font-bold text-xs mb-1 uppercase tracking-wider text-blue-400">Your Follow-up</p>
                                {q.teacherFollowUp}
                            </div>
                        )}

                        <div className="flex gap-2 pt-1">
                            {!q.isApproved && (
                                <button
                                    onClick={handleApprove}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 transition-colors"
                                >
                                    <Check className="w-3 h-3" />
                                    Approve
                                </button>
                            )}

                            {!isAddingFollowUp && !q.teacherFollowUp && (
                                <button
                                    onClick={() => setIsAddingFollowUp(true)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                                >
                                    <MessageSquare className="w-3 h-3" />
                                    Add Follow-up
                                </button>
                            )}
                        </div>

                        {isAddingFollowUp && (
                            <div className="mt-2 space-y-2">
                                <textarea
                                    value={followUpText}
                                    onChange={(e) => setFollowUpText(e.target.value)}
                                    placeholder="Add clarification or context..."
                                    className="w-full p-2 border-2 border-slate-200 rounded-lg text-sm font-medium focus:border-ink focus:outline-none resize-none"
                                    rows={2}
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => setIsAddingFollowUp(false)}
                                        className="px-3 py-1 rounded-lg text-slate-500 hover:bg-slate-100 text-xs font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveFollowUp}
                                        disabled={!followUpText.trim()}
                                        className="px-3 py-1 rounded-lg bg-ink text-white hover:bg-slate-700 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                                    >
                                        Save Follow-up
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function StudentQuestionFeed({ sessionId }: StudentQuestionFeedProps) {
    const questions = useQuery(api.questions.listRecentQuestions, {
        sessionId,
        limit: 50,
    });

    if (questions === undefined) {
        return (
            <div className="flex items-center justify-center p-8 bg-milk border-2 border-ink rounded-[2rem] shadow-comic">
                <Loader2 className="w-8 h-8 animate-spin text-ink" />
            </div>
        );
    }

    return (
        <div className="bg-milk border-2 border-ink rounded-[2rem] p-6 shadow-comic flex flex-col h-[500px]">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-soft-purple border-2 border-ink rounded-xl flex items-center justify-center shadow-sm transform rotate-2">
                    <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-extrabold">Student Questions</h2>
                    <p className="text-slate-500 font-bold text-sm">{questions.length} questions asked</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {questions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                        <MessageCircle className="w-12 h-12 opacity-20" />
                        <p className="font-bold">No questions yet.</p>
                    </div>
                ) : (
                    questions.map((q) => <QuestionItem key={q._id} q={q} />)
                )}
            </div>
        </div>
    );
}
