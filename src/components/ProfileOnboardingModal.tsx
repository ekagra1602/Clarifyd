import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import clsx from "clsx";
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="card-glass max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-lg font-display font-bold text-text-primary">
            {isEdit ? "Edit Profile" : "Create Your Profile"}
          </h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-bg-elevated rounded-lg transition-colors">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          {/* Avatar */}
          <div>
            <div className="bg-bg-elevated border border-border rounded-xl p-4">
              <AvatarPreview avatar={form.avatar} />
              <div className="flex items-center justify-center gap-3 mt-4">
                <button type="button"
                  onClick={() => setAvatar("style", prevOption(DICEBEAR_STYLES, form.avatar.style))}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-bg-input border border-border hover:bg-bg-card-hover transition-colors btn-press"
                >
                  <ChevronLeft className="w-4 h-4 text-text-muted" />
                </button>
                <button type="button" onClick={shuffleAvatar}
                  className="py-2 px-4 rounded-lg bg-bg-input border border-border font-semibold text-text-secondary text-xs hover:bg-bg-card-hover transition-colors btn-press"
                >
                  Shuffle
                </button>
                <button type="button"
                  onClick={() => setAvatar("style", cycleOption(DICEBEAR_STYLES, form.avatar.style))}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-bg-input border border-border hover:bg-bg-card-hover transition-colors btn-press"
                >
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </button>
              </div>
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Display name (optional)</label>
            <input type="text" value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="How should we call you?"
              className="w-full px-4 py-3 bg-bg-input border border-border rounded-xl text-text-primary placeholder-text-muted outline-none focus:border-primary/40 font-medium text-sm transition-all" />
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider">Preferred language</label>
            <select value={form.languagePreference}
              onChange={(e) => setForm((f) => ({ ...f, languagePreference: e.target.value }))}
              className="w-full px-4 py-3 bg-bg-input border border-border rounded-xl text-text-primary outline-none focus:border-primary/40 font-medium text-sm"
            >
              {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>

          {/* Learning preference */}
          <div>
            <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Learning style</p>
            <div className="flex flex-wrap gap-2">
              {LEARNING_OPTIONS.map((o) => (
                <label key={o.id}
                  className={clsx(
                    "inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-medium",
                    form.learningPreference.includes(o.id)
                      ? "bg-primary/15 border-primary/25 text-primary-light"
                      : "bg-bg-input border-border text-text-muted hover:border-border-hover"
                  )}
                >
                  <input type="checkbox"
                    checked={form.learningPreference.includes(o.id)}
                    onChange={() => toggleLearning(o.id)}
                    className="sr-only" />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          {/* Pace */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Pace</label>
            <div className="flex flex-wrap gap-2">
              {PACE_OPTIONS.map((o) => (
                <label key={o.id}
                  className={clsx(
                    "inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-medium",
                    form.pacePreference === o.id
                      ? "bg-secondary/15 border-secondary/25 text-secondary-light"
                      : "bg-bg-input border-border text-text-muted hover:border-border-hover"
                  )}
                >
                  <input type="radio" name="pace"
                    checked={form.pacePreference === o.id}
                    onChange={() => setForm((f) => ({ ...f, pacePreference: o.id }))}
                    className="sr-only" />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          {/* Accessibility */}
          <div>
            <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Accessibility (optional)</p>
            <div className="space-y-2">
              {ACCESSIBILITY_OPTIONS.map((o) => (
                <label key={o.id}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-xs font-medium",
                    form.accessibility.includes(o.id)
                      ? "bg-accent/10 border-accent/20 text-accent-light"
                      : "bg-bg-input border-border text-text-muted hover:border-border-hover"
                  )}
                >
                  <input type="checkbox"
                    checked={form.accessibility.includes(o.id)}
                    onChange={() => toggleAccessibility(o.id)}
                    className="sr-only" />
                  {o.label}
                </label>
              ))}
            </div>
            <input type="text" value={form.otherAccessibility}
              onChange={(e) => setForm((f) => ({ ...f, otherAccessibility: e.target.value }))}
              placeholder="Other (optional)"
              className="mt-2 w-full px-4 py-2.5 bg-bg-input border border-border rounded-xl text-xs text-text-primary placeholder-text-muted outline-none focus:border-primary/40 transition-all" />
          </div>
        </div>

        <div className="p-4 border-t border-border flex flex-col gap-2 shrink-0">
          <button type="button" onClick={handleSave}
            disabled={saving || form.learningPreference.length === 0}
            className="w-full py-3 bg-gradient-to-r from-primary to-primary-dark text-white font-semibold rounded-xl shadow-glow btn-press flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save
          </button>
          {!isEdit && (
            <button type="button" onClick={handleSkip} disabled={skipLoading}
              className="w-full py-2 text-text-muted font-medium text-xs hover:text-text-secondary transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {skipLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Skip for now
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
