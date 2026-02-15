// Avatar option ids and labels for profile/onboarding

export const HAIR_STYLES = [
  { id: "short", label: "Short" },
  { id: "long", label: "Long" },
  { id: "curly", label: "Curly" },
  { id: "ponytail", label: "Ponytail" },
  { id: "bun", label: "Bun" },
  { id: "bob", label: "Bob" },
] as const;

export const HAIR_COLORS = [
  { id: "black", label: "Black", hex: "#1a1a1a" },
  { id: "brown", label: "Brown", hex: "#5c4033" },
  { id: "blonde", label: "Blonde", hex: "#d4a84b" },
  { id: "red", label: "Red", hex: "#a52a2a" },
  { id: "gray", label: "Gray", hex: "#6b7280" },
] as const;

export const EYES_OPTIONS = [
  { id: "default", label: "Default" },
  { id: "wide", label: "Wide" },
  { id: "narrow", label: "Narrow" },
  { id: "smile", label: "Smile" },
] as const;

export const SKIN_TONES = [
  { id: "light", label: "Light", hex: "#f5d0c4" },
  { id: "medium", label: "Medium", hex: "#e8b89a" },
  { id: "tan", label: "Tan", hex: "#c98b5e" },
  { id: "dark", label: "Dark", hex: "#8d5524" },
] as const;

export const ACCESSORIES = [
  { id: "none", label: "None" },
  { id: "glasses", label: "Glasses" },
] as const;

export const DEFAULT_AVATAR = {
  hairStyle: HAIR_STYLES[0].id,
  hairColor: HAIR_COLORS[0].id,
  eyes: EYES_OPTIONS[0].id,
  skinTone: SKIN_TONES[0].id,
  accessory: ACCESSORIES[0].id,
} as const;

export type AvatarShape = {
  hairStyle: string;
  hairColor: string;
  eyes: string;
  skinTone: string;
  accessory: string;
};
