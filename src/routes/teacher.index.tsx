import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Play, Loader2, User, ChevronRight, ChevronLeft, Shuffle } from "lucide-react";
import { AvatarPreview } from "../components/AvatarPreview";
import { DICEBEAR_STYLES, DEFAULT_AVATAR } from "../lib/avatarOptions";

export const Route = createFileRoute("/teacher/")({ component: TeacherIndexPage });

function TeacherIndexPage() {
    const navigate = useNavigate();
    const createSession = useMutation(api.sessions.createSession);
    const [isCreating, setIsCreating] = useState(false);
    const [roomName, setRoomName] = useState("");
    const [instructorName, setInstructorName] = useState("");

    const [avatar, setAvatar] = useState<{ style: string; seed: string }>({
        style: DEFAULT_AVATAR.style,
        seed: `teacher-${Date.now()}`,
    });

    const handleStartSession = async () => {
        if (!instructorName.trim()) {
            alert("Please enter your name.");
            return;
        }

        setIsCreating(true);
        try {
            const result = await createSession({
                roomName: roomName || "My Class",
                instructorName: instructorName,
                instructorAvatar: avatar
            });
            await navigate({
                to: "/teacher/session/$sessionId",
                params: { sessionId: String(result.sessionId) },
            });
        } catch (error) {
            console.error("Failed to create session:", error);
        } finally {
            setIsCreating(false);
        }
    };

    const cycleStyle = (direction: 1 | -1) => {
        const currentIndex = DICEBEAR_STYLES.findIndex((s) => s.id === avatar.style);
        const nextIndex = (currentIndex + direction + DICEBEAR_STYLES.length) % DICEBEAR_STYLES.length;
        setAvatar((prev) => ({ ...prev, style: DICEBEAR_STYLES[nextIndex].id }));
    };

    const shuffleAvatar = () => {
        setAvatar((prev) => ({ ...prev, seed: `${Math.random().toString(36).slice(2)}-${Date.now()}` }));
    };

    const currentStyleLabel = DICEBEAR_STYLES.find((s) => s.id === avatar.style)?.label ?? avatar.style;

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-aurora bg-grid">
            <div className="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Left: Class Setup */}
                <div className="card-glass p-8 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

                    <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-6">
                        <Play className="w-6 h-6 text-primary-light fill-current" />
                    </div>

                    <h1 className="text-2xl font-display font-bold text-text-primary mb-1">New Session</h1>
                    <p className="text-text-muted text-sm mb-8">
                        Set up your virtual classroom
                    </p>

                    <div className="space-y-5 mb-8">
                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Your Name</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="e.g. Professor Oak"
                                    value={instructorName}
                                    onChange={(e) => setInstructorName(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-bg-input border border-border text-text-primary placeholder-text-muted font-medium outline-none focus:border-primary/50 focus:shadow-glow-sm transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Class Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Biology 101"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl bg-bg-input border border-border text-text-primary placeholder-text-muted font-medium outline-none focus:border-primary/50 focus:shadow-glow-sm transition-all"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleStartSession}
                        disabled={isCreating || !instructorName.trim()}
                        className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-primary to-primary-dark hover:opacity-90 disabled:opacity-40 text-white font-semibold rounded-xl text-base btn-press shadow-glow"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Starting...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5 fill-current" />
                                Start Session
                            </>
                        )}
                    </button>
                </div>

                {/* Right: Avatar */}
                <div className="card-glass p-8 flex flex-col justify-center items-center">
                    <h2 className="text-lg font-display font-bold text-text-primary mb-6">Your Avatar</h2>

                    <div className="bg-bg-elevated rounded-2xl p-6 mb-6 w-full max-w-[260px] border border-border">
                        <AvatarPreview avatar={avatar} size="lg" />
                    </div>

                    <div className="space-y-3 w-full max-w-[260px]">
                        <div className="flex items-center justify-between bg-bg-input rounded-xl p-2 border border-border">
                            <button
                                onClick={() => cycleStyle(-1)}
                                className="p-1.5 hover:bg-bg-elevated rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-text-muted" />
                            </button>
                            <span className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
                                {currentStyleLabel}
                            </span>
                            <button
                                onClick={() => cycleStyle(1)}
                                className="p-1.5 hover:bg-bg-elevated rounded-lg transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-text-muted" />
                            </button>
                        </div>

                        <button
                            onClick={shuffleAvatar}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-bg-input hover:bg-bg-elevated text-text-secondary font-semibold rounded-xl border border-border transition-all btn-press text-sm"
                        >
                            <Shuffle className="w-3.5 h-3.5" />
                            Shuffle
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
