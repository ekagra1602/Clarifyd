import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { AvatarPreview } from "./AvatarPreview";
import {
  DICEBEAR_STYLES,
  DEFAULT_AVATAR,
  type AvatarShape,
} from "../lib/avatarOptions";

const ACCESSIBILITY_OPTIONS = [
  { id: "blind_low_vision", label: "Blind / low vision" },
  { id: "deaf_hoh", label: "Deaf / hard of hearing" },
  { id: "language_esl", label: "Language barrier / ESL" },
  { id: "dyslexia", label: "Dyslexia / reading difficulty" },
  { id: "adhd", label: "ADHD / focus support" },
] as const;

const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "zh", label: "Chinese" },
  { id: "fr", label: "French" },
  { id: "ar", label: "Arabic" },
] as const;

const LEARNING_OPTIONS = [
  { id: "short_direct", label: "Short + direct" },
  { id: "step_by_step", label: "Step-by-step" },
  { id: "examples_first", label: "Examples first" },
  { id: "more_visual", label: "More visual" },
  { id: "more_practice", label: "More practice questions" },
] as const;

const PACE_OPTIONS = [
  { id: "slower", label: "Slower" },
  { id: "normal", label: "Normal" },
  { id: "faster", label: "Faster" },
] as const;

type ProfileForm = {
  displayName: string;
  avatar: AvatarShape;
  accessibility: string[];
  languagePreference: string;
  learningPreference: string[];
  pacePreference: string;
  otherAccessibility: string;
};

const defaultForm: ProfileForm = {
  displayName: "",
  avatar: { style: DEFAULT_AVATAR.style, seed: "default" },
  accessibility: [],
  languagePreference: "en",
  learningPreference: ["step_by_step"],
  pacePreference: "normal",
  otherAccessibility: "",
};

function cycleOption<T extends { id: string }>(options: readonly T[], current: string): string {
  const i = options.findIndex((o) => o.id === current);
  const next = i < 0 ? 0 : (i + 1) % options.length;
  return options[next].id;
}

function prevOption<T extends { id: string }>(options: readonly T[], current: string): string {
  const i = options.findIndex((o) => o.id === current);
  const next = i <= 0 ? options.length - 1 : i - 1;
  return options[next].id;
}

export function ProfileOnboardingModal({
  sessionId,
  studentId,
  initialProfile,
  isEdit = false,
  onClose,
  onSaved,
}: {
  sessionId: Id<"sessions">;
  studentId: string;
  initialProfile?: {
    displayName?: string | null;
    avatar?: { style?: string; seed?: string } | null;
    accessibility?: string[] | null;
    languagePreference?: string | null;
    learningPreference?: string[] | null;
    pacePreference?: string | null;
    otherAccessibility?: string | null;
  } | null;
  isEdit?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const upsertProfile = useMutation(api.sessions.upsertStudentProfile);

  const initialForm = useMemo((): ProfileForm => {
    const a = initialProfile?.avatar;
    return {
      displayName: initialProfile?.displayName ?? "",
      avatar: {
        style: a?.style ?? DEFAULT_AVATAR.style,
        seed: a?.seed ?? `${studentId}-${Date.now()}`,
      },
      accessibility: initialProfile?.accessibility ?? [],
      languagePreference: initialProfile?.languagePreference ?? "en",
      learningPreference: initialProfile?.learningPreference?.length
        ? initialProfile.learningPreference
        : ["step_by_step"],
      pacePreference: initialProfile?.pacePreference ?? "normal",
      otherAccessibility: initialProfile?.otherAccessibility ?? "",
    };
  }, [initialProfile]);

  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [skipLoading, setSkipLoading] = useState(false);

  const setAvatar = (key: keyof AvatarShape, value: string) => {
    setForm((f) => ({ ...f, avatar: { ...f.avatar, [key]: value } }));
  };

  const shuffleAvatar = () => {
    setForm((f) => ({
      ...f,
      avatar: { ...f.avatar, seed: `${Math.random().toString(36).slice(2)}-${Date.now()}` },
    }));
  };

  const handleSave = async () => {
    if (!form.languagePreference || form.learningPreference.length === 0) {
      alert("Please select a language and at least one learning preference.");
      return;
    }
    setSaving(true);
    try {
      await upsertProfile({
        sessionId,
        studentId,
        profileComplete: true,
        displayName: form.displayName.trim() || undefined,
        avatar: form.avatar,
        accessibility: form.accessibility.length ? form.accessibility : undefined,
        languagePreference: form.languagePreference,
        learningPreference: form.learningPreference,
        pacePreference: form.pacePreference !== "normal" ? form.pacePreference : undefined,
        otherAccessibility: form.otherAccessibility.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSkipLoading(true);
    try {
      await upsertProfile({
        sessionId,
        studentId,
        profileComplete: true,
        languagePreference: "en",
        learningPreference: ["step_by_step"],
        avatar: { style: DEFAULT_AVATAR.style, seed: studentId },
      });
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to save.");
    } finally {
      setSkipLoading(false);
    }
  };

  const toggleAccessibility = (id: string) => {
    setForm((f) => ({
      ...f,
      accessibility: f.accessibility.includes(id)
        ? f.accessibility.filter((x) => x !== id)
        : [...f.accessibility, id],
    }));
  };

  const toggleLearning = (id: string) => {
    setForm((f) => ({
      ...f,
      learningPreference: f.learningPreference.includes(id)
        ? f.learningPreference.filter((x) => x !== id)
        : [...f.learningPreference, id],
    }));
  };

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
        className="bg-white border-2 border-ink rounded-2xl shadow-comic max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b-2 border-ink bg-mustard/20 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-black text-ink">
            {isEdit ? "Edit Profile" : "Create Your Profile"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-full transition-colors group"
          >
            <div className="w-5 h-5 relative flex items-center justify-center">
              <div className="absolute w-full h-0.5 bg-ink rotate-45 group-hover:bg-coral transition-colors" />
              <div className="absolute w-full h-0.5 bg-ink -rotate-45 group-hover:bg-coral transition-colors" />
            </div>
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Avatar (DiceBear - toggle style with arrows, no labels) */}
          <div>
            <div className="bg-slate-50 border-2 border-ink/20 rounded-xl p-4">
              <AvatarPreview avatar={form.avatar} />
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setAvatar("style", prevOption(DICEBEAR_STYLES, form.avatar.style))}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-ink bg-white shadow-comic-sm hover:bg-slate-50 btn-press"
                  title="Previous style"
                >
                  <ChevronLeft className="w-5 h-5 text-ink" />
                </button>
                <button
                  type="button"
                  onClick={shuffleAvatar}
                  className="py-2 px-4 rounded-xl border-2 border-ink bg-white font-bold text-ink text-sm shadow-comic-sm hover:bg-mustard/20 btn-press"
                >
                  Shuffle (new look)
                </button>
                <button
                  type="button"
                  onClick={() => setAvatar("style", cycleOption(DICEBEAR_STYLES, form.avatar.style))}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-ink bg-white shadow-comic-sm hover:bg-slate-50 btn-press"
                  title="Next style"
                >
                  <ChevronRight className="w-5 h-5 text-ink" />
                </button>
              </div>
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="block text-sm font-bold text-ink mb-1">Display name (optional)</label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="How should we call you?"
              className="w-full px-4 py-3 border-2 border-ink rounded-xl text-ink placeholder-slate-400 outline-none focus:border-coral font-medium"
            />
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-bold text-ink mb-2">Preferred language</label>
            <select
              value={form.languagePreference}
              onChange={(e) => setForm((f) => ({ ...f, languagePreference: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-ink rounded-xl text-ink outline-none focus:border-coral font-medium bg-white"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Learning preference */}
          <div>
            <p className="text-sm font-bold text-ink mb-2">Learning style (pick at least one)</p>
            <div className="flex flex-wrap gap-2">
              {LEARNING_OPTIONS.map((o) => (
                <label
                  key={o.id}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-ink cursor-pointer hover:bg-slate-50 has-[:checked]:bg-mustard/30 has-[:checked]:border-ink"
                >
                  <input
                    type="checkbox"
                    checked={form.learningPreference.includes(o.id)}
                    onChange={() => toggleLearning(o.id)}
                    className="rounded border-2 border-ink"
                  />
                  <span className="text-sm font-bold text-ink">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Pace */}
          <div>
            <label className="block text-sm font-bold text-ink mb-2">Pace</label>
            <div className="flex flex-wrap gap-2">
              {PACE_OPTIONS.map((o) => (
                <label
                  key={o.id}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-ink cursor-pointer hover:bg-slate-50 has-[:checked]:bg-soft-purple/20 has-[:checked]:border-soft-purple"
                >
                  <input
                    type="radio"
                    name="pace"
                    checked={form.pacePreference === o.id}
                    onChange={() => setForm((f) => ({ ...f, pacePreference: o.id }))}
                    className="border-2 border-ink"
                  />
                  <span className="text-sm font-bold text-ink">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Accessibility */}
          <div>
            <p className="text-sm font-bold text-ink mb-2">Accessibility & needs (optional)</p>
            <div className="space-y-2">
              {ACCESSIBILITY_OPTIONS.map((o) => (
                <label
                  key={o.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-ink/40 cursor-pointer hover:bg-slate-50 has-[:checked]:bg-coral/10 has-[:checked]:border-coral"
                >
                  <input
                    type="checkbox"
                    checked={form.accessibility.includes(o.id)}
                    onChange={() => toggleAccessibility(o.id)}
                    className="rounded border-2 border-ink"
                  />
                  <span className="text-sm font-medium text-ink">{o.label}</span>
                </label>
              ))}
            </div>
            <input
              type="text"
              value={form.otherAccessibility}
              onChange={(e) => setForm((f) => ({ ...f, otherAccessibility: e.target.value }))}
              placeholder="Other (optional)"
              className="mt-2 w-full px-4 py-2 border-2 border-ink/40 rounded-xl text-sm text-ink placeholder-slate-400 outline-none focus:border-coral"
            />
          </div>
        </div>

        <div className="p-4 border-t-2 border-ink flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || form.learningPreference.length === 0}
            className="w-full py-3 bg-ink hover:bg-slate-800 disabled:opacity-50 text-white font-black rounded-xl border-2 border-ink shadow-comic btn-press flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Save
          </button>
          {!isEdit && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipLoading}
              className="w-full py-2 text-slate-500 font-bold text-sm hover:text-ink transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {skipLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Skip for now (use defaults)
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
