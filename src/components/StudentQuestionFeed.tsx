
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Loader2, MessageCircle, Globe } from "lucide-react";


interface StudentQuestionFeedProps {
    sessionId: Id<"sessions">;
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
                    questions.map((q) => (
                        <div key={q._id} className="bg-white border-2 border-ink rounded-xl p-4 shadow-sm hover:translate-x-1 transition-transform">
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
                                    {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            {q.answer && (
                                <div className="mt-3 pl-4 border-l-4 border-coral">
                                    <p className="text-sm font-medium text-slate-600">
                                        <span className="text-coral font-extrabold mr-1">AI:</span>
                                        {q.answer}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
