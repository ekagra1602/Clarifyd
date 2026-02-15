// DiceBear avatar styles (https://www.dicebear.com/styles/)
// API: https://api.dicebear.com/7.x/[style]/svg?seed=[seed]
// Inclusive mix: Personas, Open Peeps, Adventurer + neutrals and character sets

export const DICEBEAR_STYLES = [
  { id: "personas", label: "Personas" },
  { id: "open-peeps", label: "Open Peeps" },
  { id: "adventurer", label: "Adventurer" },
  { id: "adventurer-neutral", label: "Adventurer Neutral" },
  { id: "lorelei", label: "Lorelei" },
  { id: "lorelei-neutral", label: "Lorelei Neutral" },
  { id: "avataaars", label: "Avataaars" },
  { id: "avataaars-neutral", label: "Avataaars Neutral" },
  { id: "notionists", label: "Notionists" },
  { id: "notionists-neutral", label: "Notionists Neutral" },
  { id: "micah", label: "Micah" },
  { id: "big-ears", label: "Big Ears" },
  { id: "big-ears-neutral", label: "Big Ears Neutral" },
  { id: "croodles", label: "Croodles" },
  { id: "croodles-neutral", label: "Croodles Neutral" },
  { id: "bottts", label: "Bottts" },
  { id: "fun-emoji", label: "Fun Emoji" },
] as const;

export const DEFAULT_AVATAR = {
  style: DICEBEAR_STYLES[0].id,
  seed: "default",
} as const;

export type AvatarShape = {
  style: string;
  seed: string;
};

const DICEBEAR_BASE = "https://api.dicebear.com/7.x";

export function getDiceBearUrl(style: string, seed: string): string {
  const safeStyle = DICEBEAR_STYLES.some((s) => s.id === style) ? style : DICEBEAR_STYLES[0].id;
  const safeSeed = seed && seed.trim() ? encodeURIComponent(seed.trim()) : "default";
  return `${DICEBEAR_BASE}/${safeStyle}/svg?seed=${safeSeed}`;
}
