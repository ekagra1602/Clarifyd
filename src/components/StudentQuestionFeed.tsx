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
        await approveAnswer({ questionId: q._id, answer: q.answer });
    };

    const handleSaveFollowUp = async () => {
        if (!followUpText.trim()) return;
        await addFollowUp({ questionId: q._id, followUp: followUpText });
        setIsAddingFollowUp(false);
        setFollowUpText("");
    };

    return (
        <div className="bg-bg-elevated border border-border rounded-xl p-4 hover:border-border-hover transition-all">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    {q.translatedQuestion ? (
                        <div className="space-y-2">
                            <p className="font-semibold text-text-primary text-sm leading-snug">{q.translatedQuestion}</p>
                            <div className="flex items-center gap-2 text-xs text-text-muted bg-bg-input px-2 py-1 rounded-lg border border-border w-fit">
                                <Globe className="w-3 h-3" />
                                <span>From {q.originalLanguage}:</span>
                                <span className="italic text-text-secondary">"{q.question}"</span>
                            </div>
                        </div>
                    ) : (
                        <p className="font-semibold text-text-primary text-sm leading-snug">{q.question}</p>
                    )}
                </div>
                <span className="text-[10px] font-medium text-text-muted whitespace-nowrap bg-bg-input px-2 py-1 rounded-md">
                    {new Date(q.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
            </div>

            {q.answer && (
                <div className={clsx(
                    "mt-3 pl-3 border-l-2",
                    q.isApproved ? "border-lime/40" : "border-warm/40"
                )}>
                    <div className="space-y-2">
                        <p className="text-xs text-text-muted">
                            <span className={clsx("font-semibold mr-1", q.isApproved ? "text-lime" : "text-warm")}>
                                {q.isApproved ? "AI Answer" : "AI Answer (Pending):"}
                            </span>
                            <span className="text-text-secondary">{q.answer}</span>
                        </p>

                        {q.teacherFollowUp && (
                            <div className="bg-primary/5 p-2.5 rounded-lg border border-primary/10 text-sm">
                                <p className="text-[10px] font-semibold mb-1 uppercase tracking-wider text-primary-light">Your Follow-up</p>
                                <p className="text-text-secondary text-xs">{q.teacherFollowUp}</p>
                            </div>
                        )}

                        <div className="flex gap-2 pt-1">
                            {!q.isApproved && (
                                <button onClick={handleApprove}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-lime/15 text-lime rounded-lg text-[10px] font-semibold hover:bg-lime/25 transition-colors"
                                >
                                    <Check className="w-3 h-3" /> Approve
                                </button>
                            )}
                            {!isAddingFollowUp && !q.teacherFollowUp && (
                                <button onClick={() => setIsAddingFollowUp(true)}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-bg-input text-text-muted rounded-lg text-[10px] font-semibold hover:bg-bg-elevated transition-colors"
                                >
                                    <MessageSquare className="w-3 h-3" /> Follow-up
                                </button>
                            )}
                        </div>

                        {isAddingFollowUp && (
                            <div className="mt-2 space-y-2">
                                <textarea value={followUpText} onChange={(e) => setFollowUpText(e.target.value)}
                                    placeholder="Add clarification..."
                                    className="w-full p-2.5 bg-bg-input border border-border rounded-lg text-xs text-text-primary font-medium placeholder-text-muted focus:border-primary/40 focus:outline-none resize-none"
                                    rows={2} autoFocus />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setIsAddingFollowUp(false)}
                                        className="px-2.5 py-1 rounded-lg text-text-muted hover:text-text-secondary text-[10px] font-semibold">
                                        Cancel
                                    </button>
                                    <button onClick={handleSaveFollowUp} disabled={!followUpText.trim()}
                                        className="px-2.5 py-1 rounded-lg bg-primary text-white text-[10px] font-semibold hover:opacity-90 flex items-center gap-1 disabled:opacity-40">
                                        Save
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
    const questions = useQuery(api.questions.listRecentQuestions, { sessionId, limit: 50 });

    if (questions === undefined) {
        return (
            <div className="flex items-center justify-center p-8 card-glass">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="card-glass p-6 flex flex-col h-[480px]">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 border border-secondary/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-secondary-light" />
                </div>
                <div>
                    <h2 className="text-base font-display font-bold text-text-primary">Student Questions</h2>
                    <p className="text-text-muted text-xs">{questions.length} questions</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                {questions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-muted gap-2">
                        <MessageCircle className="w-10 h-10 opacity-15" />
                        <p className="text-sm">No questions yet.</p>
                    </div>
                ) : (
                    questions.map((q) => <QuestionItem key={q._id} q={q} />)
                )}
            </div>
        </div>
    );
}
