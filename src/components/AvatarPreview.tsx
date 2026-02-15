import { getDiceBearUrl, type AvatarShape } from "../lib/avatarOptions";

type AvatarInput = AvatarShape | { style?: string; seed?: string; hairStyle?: string };

export function AvatarPreview({ avatar, size = "md" }: { avatar: AvatarInput; size?: "sm" | "md" | "lg" | "xl" }) {
  const style = avatar.style ?? "lorelei";
  const seed = avatar.seed ?? (("hairStyle" in avatar && avatar.hairStyle) ? "legacy" : "default");
  const src = getDiceBearUrl(style, seed);

  const sizeClass = {
    sm: "w-8 h-8",
    md: "w-32 h-32",
    lg: "w-48 h-48",
    xl: "w-64 h-64",
  }[size];

  return (
    <div className="flex justify-center">
      <img
        src={src}
        alt="Avatar"
        className={`${sizeClass} rounded-2xl border-2 border-ink shadow-comic-sm object-cover bg-slate-100`}
      />
    </div>
  );
}
