import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Play, Loader2, User, ChevronRight, ChevronLeft } from "lucide-react";
import { AvatarPreview } from "../components/AvatarPreview";

export const Route = createFileRoute("/teacher/")({ component: TeacherIndexPage });

function TeacherIndexPage() {
    const navigate = useNavigate();
    const createSession = useMutation(api.sessions.createSession);
    const [isCreating, setIsCreating] = useState(false);
    const [roomName, setRoomName] = useState("");
    const [instructorName, setInstructorName] = useState("");

    // Avatar state
    const [avatar, setAvatar] = useState({
        hairStyle: "short",
        hairColor: "black",
        eyes: "normal",
        skinTone: "light",
        accessory: "none"
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

    // Avatar customization helpers
    const options = {
        hairStyle: ["bald", "short", "medium", "long", "spiky", "afro"],
        hairColor: ["black", "brown", "blonde", "red", "gray", "white", "blue", "pink"],
        skinTone: ["light", "medium", "dark", "darker"],
        eyes: ["normal", "happy", "wink", "glasses", "sunglasses"],
        accessory: ["none", "hat", "bow", "headband"]
    };

    const cycleOption = (category: keyof typeof avatar, direction: 1 | -1) => {
        const current = avatar[category];
        const categoryOptions = options[category as keyof typeof options];
        // @ts-ignore
        const currentIndex = categoryOptions.indexOf(current);
        const nextIndex = (currentIndex + direction + categoryOptions.length) % categoryOptions.length;
        setAvatar(prev => ({ ...prev, [category]: categoryOptions[nextIndex] }));
    };

    return (
        <div className="min-h-screen bg-lavender-bg py-12 px-6 flex items-center justify-center">
            <div className="max-w-4xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Left Column: Class Details — swapped to left */}
                <div className="bg-white p-12 rounded-[2.5rem] shadow-comic border-2 border-ink text-center relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 left-0 w-full h-4 bg-soft-purple border-b-2 border-ink" />

                    <div className="inline-flex items-center justify-center w-20 h-20 bg-coral rounded-2xl border-2 border-ink shadow-comic-sm mb-6 -rotate-3 mx-auto">
                        <Play className="w-10 h-10 text-white fill-current" />
                    </div>

                    <h1 className="text-4xl font-extrabold text-ink mb-2">Teacher Console</h1>
                    <p className="text-slate-500 font-bold text-lg mb-8">
                        Setup your virtual classroom.
                    </p>

                    <div className="space-y-6 mb-8 text-left">
                        <div>
                            <label className="block font-extrabold text-ink mb-2 ml-1">Your Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="e.g. Professor Oak"
                                    value={instructorName}
                                    onChange={(e) => setInstructorName(e.target.value)}
                                    className="w-full pl-12 pr-6 py-4 rounded-xl border-2 border-ink font-bold text-lg outline-none focus:shadow-comic-sm transition-all bg-milk"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-extrabold text-ink mb-2 ml-1">Class Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Biology 101"
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="w-full px-6 py-4 rounded-xl border-2 border-ink font-bold text-lg outline-none focus:shadow-comic-sm transition-all bg-milk"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleStartSession}
                        disabled={isCreating || !instructorName.trim()}
                        className="w-full inline-flex items-center justify-center gap-3 px-8 py-5 bg-coral hover:bg-coral-dark disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-comic text-xl border-2 border-ink btn-press"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                Starting Class...
                            </>
                        ) : (
                            <>
                                <Play className="w-6 h-6 fill-current" />
                                Start Session
                            </>
                        )}
                    </button>
                </div>

                {/* Right Column: Avatar Editor — swapped to right */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-comic border-2 border-ink text-center flex flex-col justify-center">
                    <h2 className="text-2xl font-extrabold text-ink mb-6">Your Avatar</h2>

                    <div className="bg-checkered rounded-2xl p-6 mb-6 inline-block mx-auto border-2 border-ink shadow-inner w-full max-w-[280px]">
                        <AvatarPreview avatar={avatar} size="lg" />
                    </div>

                    <div className="space-y-3 max-w-xs mx-auto w-full">
                        {Object.entries(options).map(([key, _]) => (
                            <div key={key} className="flex items-center justify-between bg-lavender-bg rounded-xl p-2 border-2 border-slate-200">
                                <button
                                    onClick={() => cycleOption(key as any, -1)}
                                    className="p-1 hover:bg-white rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                                </button>
                                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <button
                                    onClick={() => cycleOption(key as any, 1)}
                                    className="p-1 hover:bg-white rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
